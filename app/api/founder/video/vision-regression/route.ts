import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resolveVideoFromPage,
} from "@/lib/video/video-resolver";

import {
  executeRuntimeVideoMedia,
} from "@/lib/runtime/video-media-runtime";

import {
  executeRuntimeVideoProcessing,
} from "@/lib/runtime/video-processing-runtime";

import {
  executeVideoDecoderHealth,
} from "@/lib/runtime/video-decoder-runtime";

import {
  executeRuntimeVideoFrames,
} from "@/lib/runtime/video-frame-runtime";

import {
  executeRuntimeVideoEvidence,
} from "@/lib/runtime/video-evidence-runtime";

import {
  buildVideoVisualEvidence,
} from "@/lib/runtime/video-visual-evidence-runtime";

import {
  executeRuntimeVideoVision,
} from "@/lib/runtime/video-vision-runtime";

import {
  APP_CONFIG,
} from "@/lib/config/app";

export const runtime = "nodejs";

export const dynamic =
  "force-dynamic";

const DEFAULT_SOURCE_URL =
  "https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/multiple-video-formats.html";

const PASS_CODE =
  "C144_9_VIDEO_VISION_REGRESSION_PASS";

const FAIL_CODE =
  "C144_9_VIDEO_VISION_REGRESSION_FAILED";

function runtimeIdentity() {
  return {
    runtime:
      APP_CONFIG.runtimeId,

    runtimeVersion:
      APP_CONFIG.version,

    release:
      APP_CONFIG.release,
  };
}

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      ...body,
      ...runtimeIdentity(),
      timestamp:
        Date.now(),
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function isHttpUrl(
  value: string,
): boolean {
  try {
    const parsed =
      new URL(value);

    return (
      parsed.protocol ===
        "http:" ||
      parsed.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (
    !isFounderRequest(
      request,
    )
  ) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        message:
          "Founder authentication is required.",
        latencyMs:
          Date.now() -
          startedAt,
      },
      401,
    );
  }

  const sourceUrl = (
    request.nextUrl
      .searchParams
      .get("url") ??
    DEFAULT_SOURCE_URL
  ).trim();

  if (
    !isHttpUrl(
      sourceUrl,
    )
  ) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "INVALID_SOURCE_URL",
        message:
          "A valid HTTP(S) source page URL is required.",
        latencyMs:
          Date.now() -
          startedAt,
      },
      400,
    );
  }

  try {
    const resolver =
      await resolveVideoFromPage(
        sourceUrl,
      );

    const primary =
      resolver.primary;

    const selectedUrl =
      primary?.url;

    const selectedMediaType =
      primary?.mediaType;

    if (
      !resolver.success ||
      !selectedUrl
    ) {
      return json(
        {
          success: false,
          verified: false,
          code: FAIL_CODE,
          message:
            "Video resolver did not return a usable primary video.",
          latencyMs:
            Date.now() -
            startedAt,
          sourceUrl,
          resolver,
          checks: {
            auth: true,
            resolverSuccess:
              resolver.success ===
              true,
            primaryVideoFound:
              Boolean(
                selectedUrl,
              ),
            decoderAvailable:
              false,
            mediaReadable:
              false,
            processingSuccess:
              false,
            evidenceSamplingSuccess:
              false,
            frameExtractionAttempted:
              false,
            framesDecoded:
              false,
            imagesExtracted:
              false,
            dimensionsDetected:
              false,
            visualEvidenceSuccess:
              false,
            visionReady:
              false,
            visionModelSuccess:
              false,
            semanticUnderstandingReady:
              false,
            finalRegressionPass:
              false,
          },
        },
        422,
      );
    }

    const decoder =
      await executeVideoDecoderHealth();

    if (
      !decoder.available ||
      !decoder.decoder
    ) {
      return json(
        {
          success: false,
          verified: false,
          code:
            "C144_9_VIDEO_DECODER_UNAVAILABLE",
          message:
            "No usable FFmpeg decoder is available in the deployed runtime.",
          latencyMs:
            Date.now() -
            startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ??
            "unknown",
          resolver,
          decoder,
          checks: {
            auth: true,
            resolverSuccess:
              resolver.success ===
              true,
            primaryVideoFound:
              true,
            decoderAvailable:
              false,
            mediaReadable:
              false,
            processingSuccess:
              false,
            evidenceSamplingSuccess:
              false,
            frameExtractionAttempted:
              false,
            framesDecoded:
              false,
            imagesExtracted:
              false,
            dimensionsDetected:
              false,
            visualEvidenceSuccess:
              false,
            visionReady:
              false,
            visionModelSuccess:
              false,
            semanticUnderstandingReady:
              false,
            finalRegressionPass:
              false,
          },
        },
        422,
      );
    }

    const media =
      await executeRuntimeVideoMedia(
        selectedUrl,
        selectedMediaType ??
          "unknown",
      );

    const processing =
      await executeRuntimeVideoProcessing(
        selectedUrl,
        selectedMediaType ??
          "unknown",
      );

    if (
      !media.success ||
      !processing.success
    ) {
      return json(
        {
          success: false,
          verified: false,
          code: FAIL_CODE,
          message:
            "Video media access or processing failed.",
          latencyMs:
            Date.now() -
            startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ??
            "unknown",
          resolver,
          decoder,
          media,
          processing,
          checks: {
            auth: true,
            resolverSuccess:
              resolver.success ===
              true,
            primaryVideoFound:
              true,
            decoderAvailable:
              true,
            mediaReadable:
              media.success,
            processingSuccess:
              processing.success,
            evidenceSamplingSuccess:
              false,
            frameExtractionAttempted:
              false,
            framesDecoded:
              false,
            imagesExtracted:
              false,
            dimensionsDetected:
              false,
            visualEvidenceSuccess:
              false,
            visionReady:
              false,
            visionModelSuccess:
              false,
            semanticUnderstandingReady:
              false,
            finalRegressionPass:
              false,
          },
        },
        422,
      );
    }

    const evidence =
      await executeRuntimeVideoEvidence(
        selectedUrl,
        selectedMediaType ??
          "unknown",
        {
          durationSeconds:
            processing.durationSeconds,

          contentLength:
            media.contentLength,
        },
      );

    if (
      !evidence.success
    ) {
      return json(
        {
          success: false,
          verified: false,
          code: FAIL_CODE,
          message:
            "Video evidence sampling failed.",
          latencyMs:
            Date.now() -
            startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ??
            "unknown",
          resolver,
          decoder,
          media,
          processing,
          evidence,
          checks: {
            auth: true,
            resolverSuccess:
              true,
            primaryVideoFound:
              true,
            decoderAvailable:
              true,
            mediaReadable:
              true,
            processingSuccess:
              true,
            evidenceSamplingSuccess:
              false,
            frameExtractionAttempted:
              false,
            framesDecoded:
              false,
            imagesExtracted:
              false,
            dimensionsDetected:
              false,
            visualEvidenceSuccess:
              false,
            visionReady:
              false,
            visionModelSuccess:
              false,
            semanticUnderstandingReady:
              false,
            finalRegressionPass:
              false,
          },
        },
        422,
      );
    }

    const frames =
      await executeRuntimeVideoFrames(
        selectedUrl,
        selectedMediaType ??
          "unknown",
        {
          durationSeconds:
            processing.durationSeconds,

          decoderPath:
            decoder.decoder.path,
        },
      );

    const framesDecoded =
      frames.successfulFrameCount >
        0 &&
      frames.visualEvidence
        .framesDecoded ===
        true;

    const imagesExtracted =
      frames.visualEvidence
        .imagesExtracted ===
      true;

    const dimensionsDetected =
      frames.visualEvidence
        .dimensionsDetected ===
      true;

    if (
      !frames.success ||
      !framesDecoded ||
      !imagesExtracted
    ) {
      return json(
        {
          success: false,
          verified: false,
          code: FAIL_CODE,
          message:
            "Video frame extraction failed.",
          latencyMs:
            Date.now() -
            startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ??
            "unknown",
          resolver,
          decoder,
          media,
          processing,
          evidence,
          frames,
          checks: {
            auth: true,
            resolverSuccess:
              true,
            primaryVideoFound:
              true,
            decoderAvailable:
              true,
            mediaReadable:
              true,
            processingSuccess:
              true,
            evidenceSamplingSuccess:
              true,
            frameExtractionAttempted:
              true,
            framesDecoded,
            imagesExtracted,
            dimensionsDetected,
            visualEvidenceSuccess:
              false,
            visionReady:
              false,
            visionModelSuccess:
              false,
            semanticUnderstandingReady:
              false,
            finalRegressionPass:
              false,
          },
        },
        422,
      );
    }

    const visualEvidence =
      buildVideoVisualEvidence(
        frames.frames,
      );

    if (
      !visualEvidence.success ||
      !visualEvidence.evidence
        .visionReady
    ) {
      return json(
        {
          success: false,
          verified: false,
          code: FAIL_CODE,
          message:
            "Video visual evidence is not ready for Vision analysis.",
          latencyMs:
            Date.now() -
            startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ??
            "unknown",
          resolver,
          decoder,
          media,
          processing,
          evidence,
          frames,
          visualEvidence,
          checks: {
            auth: true,
            resolverSuccess:
              true,
            primaryVideoFound:
              true,
            decoderAvailable:
              true,
            mediaReadable:
              true,
            processingSuccess:
              true,
            evidenceSamplingSuccess:
              true,
            frameExtractionAttempted:
              true,
            framesDecoded,
            imagesExtracted,
            dimensionsDetected,
            visualEvidenceSuccess:
              visualEvidence.success,
            visionReady:
              visualEvidence.evidence
                .visionReady,
            visionModelSuccess:
              false,
            semanticUnderstandingReady:
              false,
            finalRegressionPass:
              false,
          },
        },
        422,
      );
    }

    const vision =
      await executeRuntimeVideoVision(
        "请分析这个视频，并按照时间顺序描述你实际看到的内容。区分视觉事实与推断。",
        visualEvidence,
      );

    const finalRegressionPass =
      resolver.success ===
        true &&
      Boolean(
        selectedUrl,
      ) &&
      decoder.available ===
        true &&
      media.success ===
        true &&
      processing.success ===
        true &&
      evidence.success ===
        true &&
      frames.success ===
        true &&
      framesDecoded &&
      imagesExtracted &&
      dimensionsDetected &&
      visualEvidence.success ===
        true &&
      visualEvidence.evidence
        .visionReady ===
        true &&
      vision.success ===
        true &&
      vision.semanticUnderstandingReady ===
        true;

    return json(
      {
        success:
          finalRegressionPass,

        verified:
          finalRegressionPass,

        code:
          finalRegressionPass
            ? PASS_CODE
            : FAIL_CODE,

        message:
          finalRegressionPass
            ? "Video Vision Model integration regression passed."
            : "Video Vision Model integration regression failed.",

        latencyMs:
          Date.now() -
          startedAt,

        sourceUrl,

        selectedUrl,

        mediaType:
          selectedMediaType ??
          "unknown",

        candidateCount:
          resolver.candidates.length,

        resolver,

        decoder,

        media: {
          success:
            media.success,

          code:
            media.code,

          statusCode:
            media.statusCode,

          contentType:
            media.contentType,

          contentLength:
            media.contentLength,

          bytesRead:
            media.bytesRead,

          rangeSupported:
            media.rangeSupported,

          container:
            media.container,

          majorBrand:
            media.majorBrand,

          moovFound:
            media.moovFound,
        },

        processing: {
          success:
            processing.success,

          code:
            processing.code,

          durationSeconds:
            processing.durationSeconds,

          width:
            processing.width,

          height:
            processing.height,

          frameRate:
            processing.frameRate,

          videoCodec:
            processing.videoCodec,

          audioCodec:
            processing.audioCodec,

          videoTrackCount:
            processing.videoTrackCount,

          audioTrackCount:
            processing.audioTrackCount,
        },

        evidence: {
          success:
            evidence.success,

          code:
            evidence.code,

          sampleCount:
            evidence.sampleCount,

          successfulSampleCount:
            evidence.successfulSampleCount,

          totalBytesRead:
            evidence.totalBytesRead,

          sampleTimesSeconds:
            evidence.timeline
              ?.sampleTimesSeconds ??
            [],

          byteRangesVerified:
            evidence.evidence
              .byteRangesVerified,

          temporalSamplingPlanned:
            evidence.evidence
              .temporalSamplingPlanned,
        },

        frames: {
          success:
            frames.success,

          code:
            frames.code,

          frameCount:
            frames.frameCount,

          successfulFrameCount:
            frames.successfulFrameCount,

          totalBytesRead:
            frames.totalBytesRead,

          framesDecoded,

          imagesExtracted,

          dimensionsDetected,
        },

        visualEvidence: {
          success:
            visualEvidence.success,

          code:
            visualEvidence.code,

          frameCount:
            visualEvidence.frameCount,

          usableFrameCount:
            visualEvidence
              .usableFrameCount,

          totalImageBytes:
            visualEvidence
              .totalImageBytes,

          imagesAvailable:
            visualEvidence.evidence
              .imagesAvailable,

          checksumsAvailable:
            visualEvidence.evidence
              .checksumsAvailable,

          dimensionsAvailable:
            visualEvidence.evidence
              .dimensionsAvailable,

          timelineAvailable:
            visualEvidence.evidence
              .timelineAvailable,

          visionReady:
            visualEvidence.evidence
              .visionReady,

          semanticUnderstandingReady:
            visualEvidence.evidence
              .semanticUnderstandingReady,
        },

        vision: {
          success:
            vision.success,

          code:
            vision.code,

          provider:
            vision.provider,

          model:
            vision.model,

          frameCount:
            vision.frameCount,

          analyzedFrameCount:
            vision.analyzedFrameCount,

          semanticUnderstandingReady:
            vision.semanticUnderstandingReady,

          content:
            vision.content,

          error:
            vision.error,
        },

        checks: {
          auth: true,

          resolverSuccess:
            resolver.success ===
            true,

          primaryVideoFound:
            Boolean(
              selectedUrl,
            ),

          decoderAvailable:
            decoder.available ===
            true,

          mediaReadable:
            media.success ===
            true,

          processingSuccess:
            processing.success ===
            true,

          evidenceSamplingSuccess:
            evidence.success ===
            true,

          frameExtractionAttempted:
            true,

          framesDecoded,

          imagesExtracted,

          dimensionsDetected,

          visualEvidenceSuccess:
            visualEvidence.success ===
            true,

          visionReady:
            visualEvidence.evidence
              .visionReady ===
            true,

          visionModelSuccess:
            vision.success ===
            true,

          semanticUnderstandingReady:
            vision.semanticUnderstandingReady ===
            true,

          finalRegressionPass,
        },
      },
      finalRegressionPass
        ? 200
        : 422,
    );
  } catch (error) {
    return json(
      {
        success: false,

        verified: false,

        code:
          "C144_9_VIDEO_VISION_RUNTIME_ERROR",

        message:
          error instanceof Error
            ? error.message
            : "Video Vision regression failed.",

        latencyMs:
          Date.now() -
          startedAt,

        sourceUrl,

        checks: {
          auth: true,
          resolverSuccess: false,
          primaryVideoFound: false,
          decoderAvailable: false,
          mediaReadable: false,
          processingSuccess: false,
          evidenceSamplingSuccess:
            false,
          frameExtractionAttempted:
            false,
          framesDecoded: false,
          imagesExtracted: false,
          dimensionsDetected: false,
          visualEvidenceSuccess:
            false,
          visionReady: false,
          visionModelSuccess:
            false,
          semanticUnderstandingReady:
            false,
          finalRegressionPass:
            false,
        },
      },
      500,
    );
  }
}
