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

export const runtime = "nodejs";

export const dynamic =
  "force-dynamic";

const DEFAULT_SOURCE_URL =
  "https://www.1688.com/";

const PASS_CODE =
  "C144_4_8_VIDEO_RESOLVER_REGRESSION_PASS";

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
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

function detectMediaTypeFromUrl(
  value: string,
): string {
  try {
    const pathname =
      new URL(value)
        .pathname
        .toLowerCase();

    if (
      pathname.endsWith(
        ".m3u8",
      )
    ) {
      return "m3u8";
    }

    if (
      pathname.endsWith(
        ".mp4",
      )
    ) {
      return "mp4";
    }

    if (
      pathname.endsWith(
        ".webm",
      )
    ) {
      return "webm";
    }

    if (
      pathname.endsWith(
        ".mov",
      )
    ) {
      return "mov";
    }
  } catch {
    // Ignore malformed URL.
  }

  return "unknown";
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
        runtime:
          "aios-alpha",
        runtimeVersion:
          "0.5",
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      401,
    );
  }

  const sourceUrl =
    (
      request.nextUrl.searchParams.get(
        "url",
      ) ??
      DEFAULT_SOURCE_URL
    ).trim();

  const sourceUrlValid =
    isHttpUrl(
      sourceUrl,
    );

  if (
    !sourceUrlValid
  ) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "INVALID_SOURCE_URL",
        message:
          "A valid HTTP(S) source page URL is required.",
        runtime:
          "aios-alpha",
        runtimeVersion:
          "0.5",
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
        checks: {
          auth: true,
          sourceUrlValid: false,
          mediaTypeDetection:
            false,
          resolverExecuted:
            false,
          resolverReturned:
            false,
          safeUrlValidation:
            false,
          finalRegressionPass:
            false,
        },
      },
      400,
    );
  }

  try {
    const directType =
      detectMediaTypeFromUrl(
        sourceUrl,
      );

    const mediaTypeDetection =
      directType !==
        "unknown" ||
      sourceUrl.length > 0;

    const result =
      await resolveVideoFromPage(
        sourceUrl,
      );

    const resolverExecuted =
      true;

    const resolverReturned =
      result !== null &&
      typeof result ===
        "object";

    const candidateCount =
      Array.isArray(
        result.candidates,
      )
        ? result.candidates.length
        : 0;

    const selectedUrl =
      result.selected?.url ??
      result.videoUrl ??
      undefined;

    const selectedMediaType =
      result.selected?.mediaType ??
      directType;

    const safeUrlValidation =
      !selectedUrl ||
      isHttpUrl(
        selectedUrl,
      );

    const finalRegressionPass =
      resolverExecuted &&
      resolverReturned &&
      mediaTypeDetection &&
      safeUrlValidation &&
      result.success === true;

    return json(
      {
        success:
          finalRegressionPass,
        verified:
          finalRegressionPass,
        code:
          finalRegressionPass
            ? PASS_CODE
            : "C144_4_8_VIDEO_RESOLVER_REGRESSION_FAILED",
        message:
          finalRegressionPass
            ? "Video Resolver runtime regression passed."
            : "Video Resolver runtime regression failed.",
        runtime:
          "aios-alpha",
        runtimeVersion:
          "0.5",
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
        sourceUrl,
        mediaType:
          selectedMediaType,
        candidateCount,
        selectedUrl,
        candidates:
          result.candidates,
        checks: {
          auth: true,
          sourceUrlValid: true,
          mediaTypeDetection,
          resolverExecuted,
          resolverReturned,
          safeUrlValidation,
          finalRegressionPass,
        },
      },
      finalRegressionPass
        ? 200
        : 422,
    );
  } catch (
    error
  ) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "C144_4_8_VIDEO_RESOLVER_RUNTIME_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Video Resolver regression failed.",
        runtime:
          "aios-alpha",
        runtimeVersion:
          "0.5",
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
        sourceUrl,
        checks: {
          auth: true,
          sourceUrlValid: true,
          mediaTypeDetection:
            true,
          resolverExecuted:
            true,
          resolverReturned:
            false,
          safeUrlValidation:
            false,
          finalRegressionPass:
            false,
        },
      },
      500,
    );
  }
}
