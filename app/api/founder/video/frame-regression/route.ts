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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SOURCE_URL =
  "https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/multiple-video-formats.html";

const PASS_CODE =
  "C144_7_7_VIDEO_FRAME_REGRESSION_PASS";

const FAIL_CODE =
  "C144_7_7_VIDEO_FRAME_REGRESSION_FAILED";

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
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
          sourceUrl,
          resolver,
          checks: {
            auth: true,
            resolverSuccess:
              resolver.success === true,
            primaryVideoFound:
              Boolean(selectedUrl),
            decoderAvailable: false,
            mediaReadable: false,
            processingSuccess: false,
            frameExtractionAttempted:
              false,
            framesDecoded: false,
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
            "C144_7_7_VIDEO_FRAME_DECODER_UNAVAILABLE",
          message:
            "No usable FFmpeg decoder is available in the deployed runtime.",
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
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
              resolver.success === true,
            primaryVideoFound: true,
            decoderAvailable: false,
            mediaReadable: false,
            processingSuccess: false,
            frameExtractionAttempted:
              false,
            framesDecoded: false,
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
            "Video media access or processing failed before frame extraction.",
          runtime: "aios-alpha",
          runtimeVersion: "0.5",
          timestamp: Date.now(),
          latencyMs:
            Date.now() - startedAt,
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
              resolver.success === true,
            primaryVideoFound: true,
            decoderAvailable: true,
            mediaReadable:
              media.success,
            processingSuccess:
              processing.success,
            frameExtractionAttempted:
              false,
            framesDecoded: false,
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
        .framesDecoded === true;

    const dimensionsDetected =
      frames.visualEvidence
        .dimensionsDetected ===
      true;

    const imagesExtracted =
      frames.visualEvidence
        .imagesExtracted === true;

    const finalRegressionPass =
      resolver.success === true &&
      Boolean(selectedUrl) &&
      decoder.available === true &&
      media.success === true &&
      processing.success === true &&
      frames.success === true &&
      framesDecoded &&
      imagesExtracted;

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
            ? "Video frame extraction runtime regression passed."
            : "Video frame extraction runtime regression failed.",
        runtime: "aios-alpha",
        runtimeVersion: "0.5",
        timestamp: Date.now(),
        latencyMs:
          Date.now() - startedAt,

        sourceUrl,
        selectedUrl,
        mediaType:
          selectedMediaType ??
          "unknown",

        candidateCount:
          resolver.candidates.length,

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

        frames,

        checks: {
          auth: true,
          resolverSuccess:
            resolver.success === true,
          primaryVideoFound:
            Boolean(selectedUrl),
          decoderAvailable:
            decoder.available === true,
          mediaReadable:
            media.success === true,
          processingSuccess:
            processing.success === true,
          frameExtractionAttempted:
            true,
          framesDecoded,
          imagesExtracted,
          dimensionsDetected,
          semanticUnderstandingReady:
            frames.visualEvidence
              .semanticUnderstandingReady ===
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
          "C144_7_7_VIDEO_FRAME_RUNTIME_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Video frame regression failed.",
        runtime: "aios-alpha",
        runtimeVersion: "0.5",
        timestamp: Date.now(),
        latencyMs:
          Date.now() - startedAt,
        sourceUrl,
        checks: {
          auth: true,
          resolverSuccess: false,
          primaryVideoFound: false,
          decoderAvailable: false,
          mediaReadable: false,
          processingSuccess: false,
          frameExtractionAttempted:
            false,
          framesDecoded: false,
          imagesExtracted: false,
          dimensionsDetected: false,
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
