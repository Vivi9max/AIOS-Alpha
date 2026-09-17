import type {
  VideoMediaType,
} from "@/lib/video/video-resolver";

const EVIDENCE_TIMEOUT_MS = 15_000;
const SAMPLE_BYTES = 64 * 1024;
const MAX_SAMPLES = 5;
const MAX_TOTAL_BYTES =
  SAMPLE_BYTES * MAX_SAMPLES;

export interface VideoEvidenceSample {
  index: number;
  timestampSeconds?: number;
  ratio: number;

  startByte: number;
  endByte: number;

  bytesRead: number;

  httpStatus?: number;
  contentRange?: string;

  success: boolean;

  checksum: string;

  error?: string;
}

export interface VideoEvidenceRuntimeResult {
  success: boolean;
  code: string;

  mediaUrl: string;
  mediaType: VideoMediaType | string;

  sampleCount: number;
  successfulSampleCount: number;

  totalBytesRead: number;

  samples: VideoEvidenceSample[];

  timeline?: {
    durationSeconds?: number;
    sampleTimesSeconds: number[];
  };

  evidence: {
    source: "runtime-media-sampling";

    byteRangesVerified: boolean;

    temporalSamplingPlanned: boolean;

    visualFramesDecoded: boolean;

    audioDecoded: boolean;

    semanticUnderstandingReady: boolean;
  };

  error?: string;
}

function isHttpUrl(
  value: string,
): boolean {
  try {
    const url =
      new URL(value);

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
    host ===
      "localhost.localdomain" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  const ipv4 =
    host.match(
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
    (a === 172 &&
      b >= 16 &&
      b <= 31) ||
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

  const url =
    new URL(value);

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

function checksum(
  bytes: Uint8Array,
): string {
  let hash =
    2166136261;

  for (
    const byte of bytes
  ) {
    hash ^=
      byte;

    hash =
      Math.imul(
        hash,
        16777619,
      ) >>> 0;
  }

  return hash
    .toString(16)
    .padStart(8, "0");
}

async function fetchRange(
  mediaUrl: string,
  startByte: number,
  endByte: number,
): Promise<VideoEvidenceSample> {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      EVIDENCE_TIMEOUT_MS,
    );

  try {
    const response =
      await fetch(
        mediaUrl,
        {
          method: "GET",

          headers: {
            Range:
              `bytes=${startByte}-${endByte}`,

            Accept:
              "video/*,application/octet-stream,*/*",
          },

          redirect: "follow",

          signal:
            controller.signal,
        },
      );

    if (
      !response.ok
    ) {
      return {
        index: 0,

        ratio: 0,

        startByte,

        endByte,

        bytesRead: 0,

        httpStatus:
          response.status,

        contentRange:
          response.headers.get(
            "content-range",
          ) ?? undefined,

        success: false,

        checksum: "",

        error:
          `HTTP ${response.status}`,
      };
    }

    if (
      !response.body
    ) {
      const bytes =
        new Uint8Array(
          await response.arrayBuffer(),
        );

      const bounded =
        bytes.slice(
          0,
          SAMPLE_BYTES,
        );

      return {
        index: 0,

        ratio: 0,

        startByte,

        endByte,

        bytesRead:
          bounded.length,

        httpStatus:
          response.status,

        contentRange:
          response.headers.get(
            "content-range",
          ) ?? undefined,

        success:
          bounded.length > 0,

        checksum:
          checksum(bounded),

        error:
          bounded.length > 0
            ? undefined
            : "Empty response body.",
      };
    }

    const reader =
      response.body.getReader();

    const chunks:
      Uint8Array[] = [];

    let total = 0;

    try {
      while (
        total < SAMPLE_BYTES
      ) {
        const result =
          await reader.read();

        if (
          result.done
        ) {
          break;
        }

        const remaining =
          SAMPLE_BYTES -
          total;

        const chunk =
          result.value.slice(
            0,
            remaining,
          );

        if (
          chunk.length > 0
        ) {
          chunks.push(
            chunk,
          );

          total +=
            chunk.length;
        }

        if (
          chunk.length <
            result.value.length ||
          total >=
            SAMPLE_BYTES
        ) {
          await reader.cancel();
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    const bytes =
      new Uint8Array(
        total,
      );

    let offset = 0;

    for (
      const chunk of chunks
    ) {
      bytes.set(
        chunk,
        offset,
      );

      offset +=
        chunk.length;
    }

    return {
      index: 0,

      ratio: 0,

      startByte,

      endByte,

      bytesRead:
        bytes.length,

      httpStatus:
        response.status,

      contentRange:
        response.headers.get(
          "content-range",
        ) ?? undefined,

      success:
        bytes.length > 0,

      checksum:
        checksum(bytes),

      error:
        bytes.length > 0
          ? undefined
          : "Empty response body.",
    };
  } catch (error) {
    return {
      index: 0,

      ratio: 0,

      startByte,

      endByte,

      bytesRead: 0,

      success: false,

      checksum: "",

      error:
        error instanceof Error
          ? error.message
          : "Video evidence sample failed.",
    };
  } finally {
    clearTimeout(
      timer,
    );
  }
}

function buildRatios(): number[] {
  return [
    0,
    0.25,
    0.5,
    0.75,
    0.95,
  ].slice(
    0,
    MAX_SAMPLES,
  );
}

export async function executeRuntimeVideoEvidence(
  mediaUrl: string,

  mediaType:
    | VideoMediaType
    | string = "unknown",

  options?: {
    durationSeconds?: number;
    contentLength?: number;
  },
): Promise<VideoEvidenceRuntimeResult> {
  try {
    assertSafeUrl(
      mediaUrl,
    );

    const durationSeconds =
      options?.durationSeconds !==
        undefined &&
      Number.isFinite(
        options.durationSeconds,
      ) &&
      options.durationSeconds >= 0
        ? options.durationSeconds
        : undefined;

    const contentLength =
      options?.contentLength !==
        undefined &&
      Number.isFinite(
        options.contentLength,
      ) &&
      options.contentLength > 0
        ? Math.floor(
            options.contentLength,
          )
        : undefined;

    if (
      !contentLength
    ) {
      return {
        success: false,

        code:
          "C144_6_VIDEO_EVIDENCE_CONTENT_LENGTH_REQUIRED",

        mediaUrl,

        mediaType,

        sampleCount: 0,

        successfulSampleCount: 0,

        totalBytesRead: 0,

        samples: [],

        evidence: {
          source:
            "runtime-media-sampling",

          byteRangesVerified:
            false,

          temporalSamplingPlanned:
            durationSeconds !==
            undefined,

          visualFramesDecoded:
            false,

          audioDecoded:
            false,

          semanticUnderstandingReady:
            false,
        },

        error:
          "Video evidence sampling requires a known media content length.",
      };
    }

    const ratios =
      buildRatios();

    const samples:
      VideoEvidenceSample[] =
        [];

    for (
      let index = 0;
      index < ratios.length;
      index += 1
    ) {
      const ratio =
        ratios[index];

      const maxStart =
        Math.max(
          0,
          contentLength -
            SAMPLE_BYTES,
        );

      const startByte =
        Math.min(
          maxStart,
          Math.floor(
            contentLength *
              ratio,
          ),
        );

      const endByte =
        Math.min(
          contentLength - 1,
          startByte +
            SAMPLE_BYTES -
            1,
        );

      const sample =
        await fetchRange(
          mediaUrl,
          startByte,
          endByte,
        );

      sample.index =
        index;

      sample.ratio =
        ratio;

      sample.timestampSeconds =
        durationSeconds !==
          undefined
          ? Number(
              (
                durationSeconds *
                ratio
              ).toFixed(3),
            )
          : undefined;

      samples.push(
        sample,
      );
    }

    const successfulSampleCount =
      samples.filter(
        (sample) =>
          sample.success,
      ).length;

    const totalBytesRead =
      samples.reduce(
        (
          sum,
          sample,
        ) =>
          sum +
          sample.bytesRead,
        0,
      );

    const byteRangesVerified =
      successfulSampleCount > 0;

    const success =
      successfulSampleCount ===
      samples.length;

    return {
      success,

      code:
        success
          ? "C144_6_VIDEO_EVIDENCE_SAMPLING_PASS"
          : "C144_6_VIDEO_EVIDENCE_SAMPLING_PARTIAL",

      mediaUrl,

      mediaType,

      sampleCount:
        samples.length,

      successfulSampleCount,

      totalBytesRead:
        Math.min(
          totalBytesRead,
          MAX_TOTAL_BYTES,
        ),

      samples,

      timeline: {
        durationSeconds,

        sampleTimesSeconds:
          samples
            .map(
              (sample) =>
                sample.timestampSeconds,
            )
            .filter(
              (
                value,
              ): value is number =>
                value !==
                undefined,
            ),
      },

      evidence: {
        source:
          "runtime-media-sampling",

        byteRangesVerified,

        temporalSamplingPlanned:
          durationSeconds !==
          undefined,

        visualFramesDecoded:
          false,

        audioDecoded:
          false,

        semanticUnderstandingReady:
          false,
      },

      error:
        success
          ? undefined
          : "One or more bounded media samples could not be read.",
    };
  } catch (error) {
    return {
      success: false,

      code:
        "C144_6_VIDEO_EVIDENCE_SAMPLING_ERROR",

      mediaUrl,

      mediaType,

      sampleCount: 0,

      successfulSampleCount: 0,

      totalBytesRead: 0,

      samples: [],

      evidence: {
        source:
          "runtime-media-sampling",

        byteRangesVerified:
          false,

        temporalSamplingPlanned:
          false,

        visualFramesDecoded:
          false,

        audioDecoded:
          false,

        semanticUnderstandingReady:
          false,
      },

      error:
        error instanceof Error
          ? error.message
          : "Video evidence runtime failed.",
    };
  }
}
