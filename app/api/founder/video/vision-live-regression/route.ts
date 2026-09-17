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

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const DEFAULT_SOURCE_URL =
  "https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/multiple-video-formats.html";

const PASS_CODE =
  "C144_9_6_VIDEO_VISION_LIVE_PASS";

const FAIL_CODE =
  "C144_9_6_VIDEO_VISION_LIVE_FAILED";

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isHttpUrl(
  value: string,
): boolean {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function baseChecks() {
  return {
    auth: true,
    resolverSuccess: false,
    primaryVideoFound: false,
    decoderAvailable: false,
    mediaReadable: false,
    processingSuccess: false,
    evidenceSamplingSuccess: false,
    frameExtractionAttempted: false,
    framesDecoded: false,
    imagesExtracted: false,
    dimensionsDetected: false,
    visualEvidenceSuccess: false,
    visionReady: false,
    visionModelSuccess: false,
    semanticUnderstandingReady: false,
    finalRegressionPass: false,
  };
}

export async function GET(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,
        verified: false,
        code: "FOUNDER_AUTH_REQUIRED",
        message:
          "Founder authentication is required.",
        runtime: "aios-alpha",
        runtimeVersion: "0.5",
        timestamp: Date.now(),
        latencyMs:
          Date.now() - startedAt,
      },
      401,
    );
  }

  const sourceUrl = (
    request.nextUrl.searchParams.get("url") ??
    DEFAULT_SOURCE_URL
  ).trim();

  if (!isHttpUrl(sourceUrl)) {
    return json(
      {
        success: false,
        verified: false,
        code: "INVALID_SOURCE_URL",
        message:
          "A valid HTTP(S) source page URL is required.",
        runtime: "aios-alpha",
        runtimeVersion: "0.5",
        timestamp: Date.now(),
        latencyMs:
          Date.now() - startedAt,
      },
      400,
    );
  }

  const checks = baseChecks();

  try {
    /*
     * C144.9.6
     *
     * REAL LIVE VISION REGRESSION
     *
     * Founder Auth
     * → Video Resolver
     * → Primary Video
     * → FFmpeg Decoder
     * → Actual Media
     * → Metadata / Track Processing
     * → Evidence Sampling
     * → Frame Extraction
     * → Visual Evidence
     * → OpenAI Vision API
     * → Semantic Understanding
     */

    const resolver =
      await resolveVideoFromPage(
        sourceUrl,
      );

    checks.resolverSuccess =
      resolver.success === true;

    const primary =
      resolver.primary;

    const selectedUrl =
      primary?.url;

    const selectedMediaType =
      primary?.mediaType;

    checks.primaryVideoFound =
      Boolean(selectedUrl);

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
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
          sourceUrl,
          resolver,
          checks,
        },
        422,
      );
    }

    const decoder =
      await executeVideoDecoderHealth();

    checks.decoderAvailable =
      decoder.available === true &&
      Boolean(decoder.decoder);

    if (
      !decoder.available ||
      !decoder.decoder
    ) {
      return json(
        {
          success: false,
          verified: false,
          code:
            "C144_9_6_VIDEO_DECODER_UNAVAILABLE",
          message:
            "No usable FFmpeg decoder is available.",
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ?? "unknown",
          resolver,
          decoder,
          checks,
        },
        422,
      );
    }

    const media =
      await executeRuntimeVideoMedia(
        selectedUrl,
        selectedMediaType ?? "unknown",
      );

    checks.mediaReadable =
      media.success === true;

    const processing =
      await executeRuntimeVideoProcessing(
        selectedUrl,
        selectedMediaType ?? "unknown",
      );

    checks.processingSuccess =
      processing.success === true;

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
            "Actual media access or processing failed.",
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ?? "unknown",
          resolver,
          decoder,
          media,
          processing,
          checks,
        },
        422,
      );
    }

    const evidence =
      await executeRuntimeVideoEvidence(
        selectedUrl,
        selectedMediaType ?? "unknown",
        {
          durationSeconds:
            processing.durationSeconds,
          contentLength:
            media.contentLength,
        },
      );

    checks.evidenceSamplingSuccess =
      evidence.success === true;

    if (!evidence.success) {
      return json(
        {
          success: false,
          verified: false,
          code: FAIL_CODE,
          message:
            "Video evidence sampling failed.",
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ?? "unknown",
          resolver,
          decoder,
          media,
          processing,
          evidence,
          checks,
        },
        422,
      );
    }

    const frames =
      await executeRuntimeVideoFrames(
        selectedUrl,
        selectedMediaType ?? "unknown",
        {
          durationSeconds:
            processing.durationSeconds,
          decoderPath:
            decoder.decoder.path,
        },
      );

    checks.frameExtractionAttempted = true;

    checks.framesDecoded =
      frames.successfulFrameCount > 0 &&
      frames.visualEvidence.framesDecoded ===
        true;

    checks.imagesExtracted =
      frames.visualEvidence.imagesExtracted ===
      true;

    checks.dimensionsDetected =
      frames.visualEvidence.dimensionsDetected ===
      true;

    if (
      !frames.success ||
      !checks.framesDecoded ||
      !checks.imagesExtracted
    ) {
      return json(
        {
          success: false,
          verified: false,
          code: FAIL_CODE,
          message:
            "Video frame extraction failed.",
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ?? "unknown",
          resolver,
          decoder,
          media,
          processing,
          evidence,
          frames,
          checks,
        },
        422,
      );
    }

    const visualEvidence =
      buildVideoVisualEvidence(
        frames.frames,
      );

    checks.visualEvidenceSuccess =
      visualEvidence.success === true;

    checks.visionReady =
      visualEvidence.evidence.visionReady ===
      true;

    if (
      !visualEvidence.success ||
      !checks.visionReady
    ) {
      return json(
        {
          success: false,
          verified: false,
          code: FAIL_CODE,
          message:
            "Visual evidence is not ready for Vision analysis.",
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
          sourceUrl,
          selectedUrl,
          mediaType:
            selectedMediaType ?? "unknown",
          resolver,
          decoder,
          media,
          processing,
          evidence,
          frames,
          visualEvidence,
          checks,
        },
        422,
      );
    }

    /*
     * IMPORTANT:
     *
     * This is the actual external Vision request.
     *
     * It is NOT a configuration check.
     * It is NOT a mock.
     * It is NOT a readiness probe.
     *
     * executeRuntimeVideoVision()
     * must reach the configured provider and
     * return actual model output.
     */

    const vision =
      await executeRuntimeVideoVision(
        "请分析这个视频的5个关键时间点。请按照时间顺序描述你实际看到的内容，明确区分：1. 可直接观察到的视觉事实；2. 根据画面做出的推断。重点识别产品、人物动作、包装、展示方式、字幕、价格或其他商业信息。如果画面中没有明确证据，不要自行补充。请用简洁中文回答。",
        visualEvidence,
      );

    checks.visionModelSuccess =
      vision.success === true;

    checks.semanticUnderstandingReady =
      vision.semanticUnderstandingReady ===
      true;

    const finalRegressionPass =
      checks.resolverSuccess &&
      checks.primaryVideoFound &&
      checks.decoderAvailable &&
      checks.mediaReadable &&
      checks.processingSuccess &&
      checks.evidenceSamplingSuccess &&
      checks.frameExtractionAttempted &&
      checks.framesDecoded &&
      checks.imagesExtracted &&
      checks.dimensionsDetected &&
      checks.visualEvidenceSuccess &&
      checks.visionReady &&
      checks.visionModelSuccess &&
      checks.semanticUnderstandingReady;

    checks.finalRegressionPass =
      finalRegressionPass;

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
            ? "C144.9.6 live Vision regression passed."
            : "C144.9.6 live Vision regression failed.",
        runtime: "aios-alpha",
        runtimeVersion: "0.5",
        timestamp: Date.now(),
        latencyMs:
          Date.now() - startedAt,

        sourceUrl,

        selectedUrl,

        mediaType:
          selectedMediaType ?? "unknown",

        candidateCount:
          resolver.candidates.length,

        resolver: {
          success:
            resolver.success,
          primaryFound:
            Boolean(selectedUrl),
          candidateCount:
            resolver.candidates.length,
        },

        decoder: {
          available:
            decoder.available,
          name:
            decoder.decoder?.name,
          version:
            decoder.decoder?.version,
          source:
            decoder.decoder?.source,
          path:
            decoder.decoder?.path,
        },

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
  evidence.timeline?.sampleTimesSeconds ??
  [],
          byteRangesVerified:
            evidence.byteRangesVerified,
          temporalSamplingPlanned:
            evidence.temporalSamplingPlanned,
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
          framesDecoded:
            frames.visualEvidence.framesDecoded,
          imagesExtracted:
            frames.visualEvidence.imagesExtracted,
          dimensionsDetected:
            frames.visualEvidence.dimensionsDetected,
        },

        visualEvidence: {
          success:
            visualEvidence.success,
          code:
            visualEvidence.code,
          frameCount:
            visualEvidence.frameCount,
          usableFrameCount:
            visualEvidence.usableFrameCount,
          totalImageBytes:
            visualEvidence.totalImageBytes,
          visionReady:
            visualEvidence.evidence.visionReady,
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

        checks,
      },
    );
  } catch (error) {
    return json(
      {
        success: false,
        verified: false,
        code: FAIL_CODE,
        message:
          "C144.9.6 live Vision regression threw an unexpected runtime error.",
        runtime: "aios-alpha",
        runtimeVersion: "0.5",
        timestamp: Date.now(),
        latencyMs:
          Date.now() - startedAt,
        error:
          error instanceof Error
            ? error.message
            : String(error),
        checks,
      },
      500,
    );
  }
}
