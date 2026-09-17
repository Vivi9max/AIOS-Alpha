import type {
  VideoMediaType,
} from "@/lib/video/video-resolver";

const PROCESSING_TIMEOUT_MS = 20_000;
const PROCESSING_PROBE_BYTES = 8 * 1024 * 1024;

export interface VideoProcessingTrack {
  type: "video" | "audio" | "unknown";
  codec?: string;
  codecName?: string;
  width?: number;
  height?: number;
  timescale?: number;
  durationSeconds?: number;
  sampleCount?: number;
}

export interface VideoProcessingRuntimeResult {
  success: boolean;
  code: string;

  mediaUrl: string;
  mediaType: VideoMediaType | string;

  httpStatus?: number;
  contentType?: string;
  contentLength?: number;

  bytesRead: number;
  rangeSupported: boolean;

  container?: string;

  durationSeconds?: number;
  width?: number;
  height?: number;

  videoCodec?: string;
  audioCodec?: string;

  frameRate?: number;

  videoTrackCount: number;
  audioTrackCount: number;

  tracks: VideoProcessingTrack[];

  metadata?: {
    majorBrand?: string;
    brands?: string[];
    movieTimescale?: number;
    movieDuration?: number;
    hasFtyp?: boolean;
    hasMoov?: boolean;
  };

  error?: string;
}

function isHttpUrl(
  value: string,
): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isBlockedHostname(
  hostname: string,
): boolean {
  const host =
    hostname
      .toLowerCase()
      .replace(/\.$/, "");

  if (
    host === "localhost" ||
    host === "localhost.localdomain" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  const ipv4 = host.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );

  if (!ipv4) {
    return false;
  }

  const parts =
    ipv4
      .slice(1)
      .map(Number);

  if (
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function assertSafeUrl(
  value: string,
): void {
  if (!isHttpUrl(value)) {
    throw new Error(
      "Only HTTP and HTTPS media URLs are supported.",
    );
  }

  const url = new URL(value);

  if (
    isBlockedHostname(
      url.hostname,
    )
  ) {
    throw new Error(
      "The requested media URL is not allowed.",
    );
  }
}

function ascii(
  bytes: Uint8Array,
  offset: number,
  length: number,
): string {
  if (
    offset < 0 ||
    offset >= bytes.length
  ) {
    return "";
  }

  return Array.from(
    bytes.slice(
      offset,
      Math.min(
        offset + length,
        bytes.length,
      ),
    ),
  )
    .map((value) =>
      value >= 32 &&
      value <= 126
        ? String.fromCharCode(value)
        : ".",
    )
    .join("");
}

function uint32(
  bytes: Uint8Array,
  offset: number,
): number {
  if (
    offset < 0 ||
    offset + 4 > bytes.length
  ) {
    return 0;
  }

  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function uint64(
  bytes: Uint8Array,
  offset: number,
): number {
  const high =
    uint32(
      bytes,
      offset,
    );

  const low =
    uint32(
      bytes,
      offset + 4,
    );

  return (
    high * 0x100000000 +
    low
  );
}

function fixed1616(
  bytes: Uint8Array,
  offset: number,
): number {
  return (
    uint32(
      bytes,
      offset,
    ) / 65536
  );
}

interface Mp4Box {
  type: string;
  start: number;
  size: number;
  headerSize: number;
  payloadStart: number;
  payloadEnd: number;
}

function parseBoxes(
  bytes: Uint8Array,
  start: number,
  end: number,
): Mp4Box[] {
  const boxes: Mp4Box[] = [];

  let offset = start;

  while (
    offset + 8 <= end &&
    offset + 8 <= bytes.length
  ) {
    const size32 =
      uint32(
        bytes,
        offset,
      );

    const type =
      ascii(
        bytes,
        offset + 4,
        4,
      );

    if (!type) {
      break;
    }

    let size =
      size32;

    let headerSize = 8;

    if (size32 === 1) {
      if (
        offset + 16 > end
      ) {
        break;
      }

      size =
        uint64(
          bytes,
          offset + 8,
        );

      headerSize = 16;
    }

    if (size32 === 0) {
      size =
        end - offset;
    }

    if (
      size < headerSize ||
      offset + size > end
    ) {
      break;
    }

    boxes.push({
      type,
      start: offset,
      size,
      headerSize,
      payloadStart:
        offset + headerSize,
      payloadEnd:
        offset + size,
    });

    offset += size;
  }

  return boxes;
}

function children(
  bytes: Uint8Array,
  box: Mp4Box,
): Mp4Box[] {
  return parseBoxes(
    bytes,
    box.payloadStart,
    box.payloadEnd,
  );
}

function findChild(
  bytes: Uint8Array,
  box: Mp4Box,
  type: string,
): Mp4Box | undefined {
  return children(
    bytes,
    box,
  ).find(
    (child) =>
      child.type === type,
  );
}

function findDescendant(
  bytes: Uint8Array,
  box: Mp4Box,
  type: string,
): Mp4Box | undefined {
  const direct =
    findChild(
      bytes,
      box,
      type,
    );

  if (direct) {
    return direct;
  }

  for (
    const child of children(
      bytes,
      box,
    )
  ) {
    const nested =
      findDescendant(
        bytes,
        child,
        type,
      );

    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function parseFtyp(
  bytes: Uint8Array,
  box: Mp4Box,
): {
  majorBrand?: string;
  brands: string[];
} {
  const brands: string[] = [];

  const majorBrand =
    ascii(
      bytes,
      box.payloadStart,
      4,
    );

  if (majorBrand) {
    brands.push(
      majorBrand,
    );
  }

  let offset =
    box.payloadStart + 8;

  while (
    offset + 4 <=
    box.payloadEnd
  ) {
    const brand =
      ascii(
        bytes,
        offset,
        4,
      );

    if (
      brand &&
      !brands.includes(
        brand,
      )
    ) {
      brands.push(
        brand,
      );
    }

    offset += 4;
  }

  return {
    majorBrand,
    brands,
  };
}

function parseMvhd(
  bytes: Uint8Array,
  box: Mp4Box,
): {
  timescale?: number;
  duration?: number;
} {
  const version =
    bytes[box.payloadStart];

  if (version === 1) {
    return {
      timescale:
        uint32(
          bytes,
          box.payloadStart + 20,
        ),
      duration:
        uint64(
          bytes,
          box.payloadStart + 24,
        ),
    };
  }

  return {
    timescale:
      uint32(
        bytes,
        box.payloadStart + 12,
      ),
    duration:
      uint32(
        bytes,
        box.payloadStart + 16,
      ),
  };
}

function parseMdhd(
  bytes: Uint8Array,
  box: Mp4Box,
): {
  timescale?: number;
  duration?: number;
} {
  const version =
    bytes[box.payloadStart];

  if (version === 1) {
    return {
      timescale:
        uint32(
          bytes,
          box.payloadStart + 20,
        ),
      duration:
        uint64(
          bytes,
          box.payloadStart + 24,
        ),
    };
  }

  return {
    timescale:
      uint32(
        bytes,
        box.payloadStart + 12,
      ),
    duration:
      uint32(
        bytes,
        box.payloadStart + 16,
      ),
  };
}

function parseTkhd(
  bytes: Uint8Array,
  box: Mp4Box,
): {
  width?: number;
  height?: number;
} {
  const version =
    bytes[box.payloadStart];

  if (version === 1) {
    return {
      width:
        fixed1616(
          bytes,
          box.payloadStart + 88,
        ),
      height:
        fixed1616(
          bytes,
          box.payloadStart + 92,
        ),
    };
  }

  return {
    width:
      fixed1616(
        bytes,
        box.payloadStart + 76,
      ),
    height:
      fixed1616(
        bytes,
        box.payloadStart + 80,
      ),
  };
}

function parseHdlr(
  bytes: Uint8Array,
  box: Mp4Box,
): string {
  return ascii(
    bytes,
    box.payloadStart + 8,
    4,
  );
}

function parseStsd(
  bytes: Uint8Array,
  box: Mp4Box,
): {
  codec?: string;
  codecName?: string;
} {
  const entryCount =
    uint32(
      bytes,
      box.payloadStart + 4,
    );

  if (
    entryCount < 1
  ) {
    return {};
  }

  const entryStart =
    box.payloadStart + 8;

  if (
    entryStart + 8 >
    box.payloadEnd
  ) {
    return {};
  }

  const codec =
    ascii(
      bytes,
      entryStart + 4,
      4,
    );

  if (!codec) {
    return {};
  }

  const codecNames: Record<
    string,
    string
  > = {
    avc1: "H.264 / AVC",
    avc3: "H.264 / AVC",
    hvc1: "H.265 / HEVC",
    hev1: "H.265 / HEVC",
    av01: "AV1",
    vp09: "VP9",
    mp4v: "MPEG-4 Visual",
    mp4a: "AAC",
    "ac-3": "AC-3",
    "ec-3": "E-AC-3",
    opus: "Opus",
  };

  return {
    codec,
    codecName:
      codecNames[codec],
  };
}

function parseStts(
  bytes: Uint8Array,
  box: Mp4Box,
): {
  sampleCount: number;
  totalDuration: number;
} {
  const entryCount =
    uint32(
      bytes,
      box.payloadStart + 4,
    );

  let offset =
    box.payloadStart + 8;

  let sampleCount = 0;
  let totalDuration = 0;

  for (
    let index = 0;
    index < entryCount;
    index += 1
  ) {
    if (
      offset + 8 >
      box.payloadEnd
    ) {
      break;
    }

    const count =
      uint32(
        bytes,
        offset,
      );

    const duration =
      uint32(
        bytes,
        offset + 4,
      );

    sampleCount += count;

    totalDuration +=
      count * duration;

    offset += 8;
  }

  return {
    sampleCount,
    totalDuration,
  };
}

function parseMp4(
  bytes: Uint8Array,
): Omit<
  VideoProcessingRuntimeResult,
  "mediaUrl" | "mediaType"
> {
  const topLevel =
    parseBoxes(
      bytes,
      0,
      bytes.length,
    );

  const ftyp =
    topLevel.find(
      (box) =>
        box.type === "ftyp",
    );

  const moov =
    topLevel.find(
      (box) =>
        box.type === "moov",
    );

  if (!moov) {
    return {
      success: false,
      code:
        "C144_5_VIDEO_PROCESSING_MOOV_NOT_FOUND",
      bytesRead:
        bytes.length,
      rangeSupported: true,
      container: "mp4",
      videoTrackCount: 0,
      audioTrackCount: 0,
      tracks: [],
      metadata: {
        hasFtyp:
          Boolean(ftyp),
        hasMoov: false,
      },
      error:
        "MP4 moov atom was not found in the processing probe range.",
    };
  }

  const ftypData =
    ftyp
      ? parseFtyp(
          bytes,
          ftyp,
        )
      : {
          brands: [],
        };

  const mvhd =
    findChild(
      bytes,
      moov,
      "mvhd",
    );

  const movie =
    mvhd
      ? parseMvhd(
          bytes,
          mvhd,
        )
      : {};

  const tracks =
    children(
      bytes,
      moov,
    ).filter(
      (box) =>
        box.type === "trak",
    );

  const parsedTracks:
    VideoProcessingTrack[] = [];

  for (
    const track of tracks
  ) {
    const mdia =
      findChild(
        bytes,
        track,
        "mdia",
      );

    if (!mdia) {
      continue;
    }

    const hdlr =
      findChild(
        bytes,
        mdia,
        "hdlr",
      );

    const handler =
      hdlr
        ? parseHdlr(
            bytes,
            hdlr,
          )
        : "";

    const mdhd =
      findChild(
        bytes,
        mdia,
        "mdhd",
      );

    const media =
      mdhd
        ? parseMdhd(
            bytes,
            mdhd,
          )
        : {};

    const minf =
      findChild(
        bytes,
        mdia,
        "minf",
      );

    const stbl =
      minf
        ? findChild(
            bytes,
            minf,
            "stbl",
          )
        : undefined;

    const stsd =
      stbl
        ? findChild(
            bytes,
            stbl,
            "stsd",
          )
        : undefined;

    const stts =
      stbl
        ? findChild(
            bytes,
            stbl,
            "stts",
          )
        : undefined;

    const codec =
      stsd
        ? parseStsd(
            bytes,
            stsd,
          )
        : {};

    const timing =
      stts
        ? parseStts(
            bytes,
            stts,
          )
        : undefined;

    const tkhd =
      findChild(
        bytes,
        track,
        "tkhd",
      );

    const dimensions =
      tkhd
        ? parseTkhd(
            bytes,
            tkhd,
          )
        : {};

    const type =
      handler === "vide"
        ? "video"
        : handler === "soun"
          ? "audio"
          : "unknown";

    const durationSeconds =
      media.timescale &&
      media.duration
        ? media.duration /
          media.timescale
        : undefined;

    parsedTracks.push({
      type,
      codec:
        codec.codec,
      codecName:
        codec.codecName,
      width:
        type === "video"
          ? dimensions.width
          : undefined,
      height:
        type === "video"
          ? dimensions.height
          : undefined,
      timescale:
        media.timescale,
      durationSeconds,
      sampleCount:
        timing?.sampleCount,
    });
  }

  const videoTracks =
    parsedTracks.filter(
      (track) =>
        track.type === "video",
    );

  const audioTracks =
    parsedTracks.filter(
      (track) =>
        track.type === "audio",
    );

  const primaryVideo =
    videoTracks[0];

  const primaryAudio =
    audioTracks[0];

  const durationSeconds =
    movie.timescale &&
    movie.duration
      ? movie.duration /
        movie.timescale
      : parsedTracks
          .map(
            (track) =>
              track.durationSeconds,
          )
          .filter(
            (
              value,
            ): value is number =>
              value !== undefined,
          )
          .sort(
            (a, b) =>
              b - a,
          )[0];

  let frameRate:
    | number
    | undefined;

  if (
    primaryVideo?.sampleCount &&
    primaryVideo.durationSeconds &&
    primaryVideo.durationSeconds > 0
  ) {
    frameRate =
      primaryVideo.sampleCount /
      primaryVideo.durationSeconds;
  }

  return {
    success: true,
    code:
      "C144_5_VIDEO_PROCESSING_PASS",
    bytesRead:
      bytes.length,
    rangeSupported: true,
    container: "mp4",
    durationSeconds,
    width:
      primaryVideo?.width,
    height:
      primaryVideo?.height,
    videoCodec:
      primaryVideo?.codecName ??
      primaryVideo?.codec,
    audioCodec:
      primaryAudio?.codecName ??
      primaryAudio?.codec,
    frameRate,
    videoTrackCount:
      videoTracks.length,
    audioTrackCount:
      audioTracks.length,
    tracks: parsedTracks,
    metadata: {
      majorBrand:
        ftypData.majorBrand,
      brands:
        ftypData.brands,
      movieTimescale:
        movie.timescale,
      movieDuration:
        movie.duration,
      hasFtyp:
        Boolean(ftyp),
      hasMoov: true,
    },
  };
}

async function fetchMedia(
  mediaUrl: string,
): Promise<Response> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      PROCESSING_TIMEOUT_MS,
    );

  try {
    return await fetch(
      mediaUrl,
      {
        method: "GET",
        headers: {
          Range:
            `bytes=0-${PROCESSING_PROBE_BYTES - 1}`,
          Accept:
            "video/*,application/octet-stream,*/*",
        },
        redirect: "follow",
        signal:
          controller.signal,
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeContentType(
  value: string | null,
): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function contentLength(
  value: string | null,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  ) &&
    parsed >= 0
    ? parsed
    : undefined;
}

export async function executeRuntimeVideoProcessing(
  mediaUrl: string,
  mediaType:
    | VideoMediaType
    | string = "unknown",
): Promise<VideoProcessingRuntimeResult> {
  try {
    assertSafeUrl(
      mediaUrl,
    );

    const response =
      await fetchMedia(
        mediaUrl,
      );

    const responseType =
      normalizeContentType(
        response.headers.get(
          "content-type",
        ),
      );

    const length =
      contentLength(
        response.headers.get(
          "content-length",
        ),
      );

    const rangeSupported =
      response.status === 206 ||
      Boolean(
        response.headers.get(
          "content-range",
        ),
      );

    if (!response.ok) {
      return {
        success: false,
        code:
          "C144_5_VIDEO_PROCESSING_HTTP_FAILED",
        mediaUrl,
        mediaType,
        httpStatus:
          response.status,
        contentType:
          responseType,
        contentLength:
          length,
        bytesRead: 0,
        rangeSupported,
        videoTrackCount: 0,
        audioTrackCount: 0,
        tracks: [],
        error:
          `Video processing request returned HTTP ${response.status}.`,
      };
    }

    const buffer =
      new Uint8Array(
        await response.arrayBuffer(),
      );

    const bytes =
      buffer.slice(
        0,
        Math.min(
          buffer.length,
          PROCESSING_PROBE_BYTES,
        ),
      );

    if (
      bytes.length === 0
    ) {
      return {
        success: false,
        code:
          "C144_5_VIDEO_PROCESSING_EMPTY",
        mediaUrl,
        mediaType,
        httpStatus:
          response.status,
        contentType:
          responseType,
        contentLength:
          length,
        bytesRead: 0,
        rangeSupported,
        videoTrackCount: 0,
        audioTrackCount: 0,
        tracks: [],
        error:
          "The media endpoint returned no readable bytes.",
      };
    }

    const isMp4 =
      bytes.length >= 12 &&
      ascii(
        bytes,
        4,
        4,
      ) === "ftyp";

    if (!isMp4) {
      return {
        success: true,
        code:
          "C144_5_VIDEO_PROCESSING_UNSUPPORTED_CONTAINER",
        mediaUrl,
        mediaType,
        httpStatus:
          response.status,
        contentType:
          responseType,
        contentLength:
          length,
        bytesRead:
          bytes.length,
        rangeSupported,
        container:
          mediaType === "m3u8"
            ? "hls"
            : mediaType,
        videoTrackCount: 0,
        audioTrackCount: 0,
        tracks: [],
        error:
          "Media was readable, but detailed processing for this container is not implemented yet.",
      };
    }

    const parsed =
      parseMp4(
        bytes,
      );

    return {
      ...parsed,
      mediaUrl,
      mediaType,
      httpStatus:
        response.status,
      contentType:
        responseType,
      contentLength:
        length,
      bytesRead:
        bytes.length,
      rangeSupported,
    };
  } catch (error) {
    return {
      success: false,
      code:
        "C144_5_VIDEO_PROCESSING_ERROR",
      mediaUrl,
      mediaType,
      bytesRead: 0,
      rangeSupported: false,
      videoTrackCount: 0,
      audioTrackCount: 0,
      tracks: [],
      error:
        error instanceof Error
          ? error.message
          : "Video processing runtime failed.",
    };
  }
}
