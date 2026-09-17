import {
  createHash,
} from "node:crypto";

export interface VideoVisualFrameInput {
  index: number;
  timestampSeconds: number;
  ratio: number;
  mimeType?: string;
  bytesRead: number;
  width?: number;
  height?: number;
  checksum?: string;
  imageBase64?: string;
}

export interface VideoVisualEvidenceResult {
  success: boolean;
  code: string;

  frameCount: number;
  usableFrameCount: number;

  totalImageBytes: number;

  frames: Array<{
    index: number;
    timestampSeconds: number;
    ratio: number;
    mimeType: string;
    bytesRead: number;
    width?: number;
    height?: number;
    checksum?: string;
    imageDataAvailable: boolean;
  }>;

  evidence: {
    imagesAvailable: boolean;
    checksumsAvailable: boolean;
    dimensionsAvailable: boolean;
    timelineAvailable: boolean;
    visionReady: boolean;
    semanticUnderstandingReady: boolean;
  };

  error?: string;
}

const MAX_FRAMES = 5;

const MAX_TOTAL_IMAGE_BYTES =
  2 * 1024 * 1024;

const MAX_FRAME_IMAGE_BYTES =
  512 * 1024;

function sha256(
  value: string,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function normalizeBase64(
  value: string,
): string {
  return value
    .replace(
      /^data:[^;]+;base64,/i,
      "",
    )
    .trim();
}

function isValidBase64(
  value: string,
): boolean {
  if (!value) {
    return false;
  }

  if (
    value.length % 4 !==
    0
  ) {
    return false;
  }

  return /^[A-Za-z0-9+/]+={0,2}$/.test(
    value,
  );
}

export function buildVideoVisualEvidence(
  frames: VideoVisualFrameInput[],
): VideoVisualEvidenceResult {
  const boundedFrames =
    frames.slice(
      0,
      MAX_FRAMES,
    );

  if (
    boundedFrames.length ===
    0
  ) {
    return {
      success: false,
      code:
        "C144_8_VIDEO_VISUAL_EVIDENCE_EMPTY",
      frameCount: 0,
      usableFrameCount: 0,
      totalImageBytes: 0,
      frames: [],
      evidence: {
        imagesAvailable: false,
        checksumsAvailable: false,
        dimensionsAvailable: false,
        timelineAvailable: false,
        visionReady: false,
        semanticUnderstandingReady: false,
      },
      error:
        "No extracted video frames were provided.",
    };
  }

  let totalImageBytes = 0;

  const evidenceFrames =
    boundedFrames.map(
      (frame) => {
        let imageDataAvailable =
          false;

        let imageBytes = 0;

        if (
          frame.imageBase64
        ) {
          const normalized =
            normalizeBase64(
              frame.imageBase64,
            );

          if (
            isValidBase64(
              normalized,
            )
          ) {
            const decoded =
              Buffer.from(
                normalized,
                "base64",
              );

            imageBytes =
              decoded.length;

            if (
              imageBytes <=
              MAX_FRAME_IMAGE_BYTES
            ) {
              imageDataAvailable =
                true;
            }
          }
        }

        totalImageBytes +=
          imageBytes;

        return {
          index:
            frame.index,

          timestampSeconds:
            frame.timestampSeconds,

          ratio:
            frame.ratio,

          mimeType:
            frame.mimeType ??
            "image/jpeg",

          bytesRead:
            frame.bytesRead,

          width:
            frame.width,

          height:
            frame.height,

          checksum:
            frame.checksum,

          imageDataAvailable,
        };
      },
    );

  if (
    totalImageBytes >
    MAX_TOTAL_IMAGE_BYTES
  ) {
    return {
      success: false,
      code:
        "C144_8_VIDEO_VISUAL_EVIDENCE_LIMIT",
      frameCount:
        boundedFrames.length,
      usableFrameCount: 0,
      totalImageBytes,
      frames:
        evidenceFrames,
      evidence: {
        imagesAvailable: false,
        checksumsAvailable:
          false,
        dimensionsAvailable:
          false,
        timelineAvailable:
          false,
        visionReady: false,
        semanticUnderstandingReady:
          false,
      },
      error:
        `Visual evidence exceeds ${MAX_TOTAL_IMAGE_BYTES} byte limit.`,
    };
  }

  const usableFrameCount =
    evidenceFrames.filter(
      (frame) =>
        frame.imageDataAvailable,
    ).length;

  const imagesAvailable =
    usableFrameCount > 0;

  const checksumsAvailable =
    evidenceFrames.every(
      (frame) =>
        Boolean(
          frame.checksum,
        ),
    );

  const dimensionsAvailable =
    evidenceFrames.every(
      (frame) =>
        Boolean(
          frame.width &&
            frame.height,
        ),
    );

  const timelineAvailable =
    evidenceFrames.every(
      (frame) =>
        Number.isFinite(
          frame.timestampSeconds,
        ),
    );

  return {
    success:
      imagesAvailable,

    code:
      imagesAvailable
        ? "C144_8_VIDEO_VISUAL_EVIDENCE_PASS"
        : "C144_8_VIDEO_VISUAL_EVIDENCE_PARTIAL",

    frameCount:
      boundedFrames.length,

    usableFrameCount,

    totalImageBytes,

    frames:
      evidenceFrames,

    evidence: {
      imagesAvailable,

      checksumsAvailable,

      dimensionsAvailable,

      timelineAvailable,

      visionReady:
        imagesAvailable,

      semanticUnderstandingReady:
        false,
    },

    error:
      imagesAvailable
        ? undefined
        : "No usable extracted frame images are available.",
  };
}

export function buildVisualFrameDataUrl(
  mimeType: string,
  imageBase64: string,
): string {
  const normalized =
    normalizeBase64(
      imageBase64,
    );

  return `data:${mimeType};base64,${normalized}`;
}

export function calculateVisualFrameChecksum(
  imageBase64: string,
): string {
  return sha256(
    normalizeBase64(
      imageBase64,
    ),
  );
}
