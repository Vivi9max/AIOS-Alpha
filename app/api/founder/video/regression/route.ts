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
  APP_CONFIG,
} from "@/lib/config/app";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const DEFAULT_SOURCE_URL =
  "https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/multiple-video-formats.html";

const PASS_CODE =
  "C144_4_8_1_VIDEO_RESOLVER_REGRESSION_PASS";

const FAIL_CODE =
  "C144_4_8_1_VIDEO_RESOLVER_REGRESSION_FAILED";

const ALLOWED_MEDIA_TYPES = [
  "mp4",
  "webm",
  "mov",
  "m3u8",
] as const;

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

function runtimeMeta() {
  return {
    runtime:
      APP_CONFIG.runtimeId,

    runtimeVersion:
      APP_CONFIG.version,

    release:
      APP_CONFIG.release,
  };
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

function isAllowedMediaType(
  value: unknown,
): boolean {
  return (
    typeof value ===
      "string" &&
    (
      ALLOWED_MEDIA_TYPES as readonly string[]
    ).includes(value)
  );
}

function isSafeResolvedUrl(
  value: unknown,
): boolean {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return false;
  }

  return isHttpUrl(
    value.trim(),
  );
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

        ...runtimeMeta(),

        timestamp:
          Date.now(),

        latencyMs:
          Date.now() -
          startedAt,
      },
      401,
    );
  }

  const sourceUrl = (
    request.nextUrl.searchParams.get(
      "url",
    ) ??
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

        ...runtimeMeta(),

        timestamp:
          Date.now(),

        latencyMs:
          Date.now() -
          startedAt,

        checks: {
          auth: true,
          sourceUrlValid: false,
          mediaTypeDetection: false,
          resolverExecuted: false,
          resolverReturned: false,
          candidateFound: false,
          primaryCandidate: false,
          safeUrlValidation: false,
          finalRegressionPass: false,
        },
      },
      400,
    );
  }

  try {
    const result =
      await resolveVideoFromPage(
        sourceUrl,
      );

    const candidates =
      Array.isArray(
        result.candidates,
      )
        ? result.candidates
        : [];

    const primary =
      result.primary;

    const selectedUrl =
      primary?.url;

    const selectedMediaType =
      primary?.mediaType;

    const checks = {
      auth: true,

      sourceUrlValid:
        true,

      mediaTypeDetection:
        isAllowedMediaType(
          selectedMediaType,
        ),

      resolverExecuted:
        true,

      resolverReturned:
        result !== null &&
        typeof result ===
          "object",

      candidateFound:
        candidates.length > 0,

      primaryCandidate:
        Boolean(
          primary &&
          typeof primary ===
            "object",
        ),

      safeUrlValidation:
        isSafeResolvedUrl(
          selectedUrl,
        ),

      resolverSuccess:
        result.success === true,

      finalRegressionPass:
        result.success === true &&
        candidates.length > 0 &&
        Boolean(primary) &&
        isAllowedMediaType(
          selectedMediaType,
        ) &&
        isSafeResolvedUrl(
          selectedUrl,
        ),
    };

    const latencyMs =
      Date.now() -
      startedAt;

    return json(
      {
        success:
          checks.finalRegressionPass,

        verified:
          checks.finalRegressionPass,

        code:
          checks.finalRegressionPass
            ? PASS_CODE
            : FAIL_CODE,

        message:
          checks.finalRegressionPass
            ? "Video Resolver runtime regression passed."
            : "Video Resolver runtime regression failed.",

        ...runtimeMeta(),

        timestamp:
          Date.now(),

        latencyMs,

        sourceUrl,

        mediaType:
          selectedMediaType ??
          "unknown",

        candidateCount:
          candidates.length,

        selectedUrl,

        primary,

        candidates,

        resolver: {
          success:
            result.success,

          pageUrl:
            result.pageUrl,

          canonicalUrl:
            result.canonicalUrl,

          title:
            result.title,

          htmlFetched:
            result.htmlFetched,

          statusCode:
            result.statusCode,

          error:
            result.error,

          resolvedAt:
            result.resolvedAt,
        },

        checks,
      },
      checks.finalRegressionPass
        ? 200
        : 422,
    );
  } catch (error) {
    return json(
      {
        success: false,
        verified: false,

        code:
          "C144_4_8_1_VIDEO_RESOLVER_RUNTIME_ERROR",

        message:
          error instanceof Error
            ? error.message
            : "Video Resolver regression failed.",

        ...runtimeMeta(),

        timestamp:
          Date.now(),

        latencyMs:
          Date.now() -
          startedAt,

        sourceUrl,

        checks: {
          auth: true,
          sourceUrlValid: true,
          mediaTypeDetection: false,
          resolverExecuted: true,
          resolverReturned: false,
          candidateFound: false,
          primaryCandidate: false,
          safeUrlValidation: false,
          resolverSuccess: false,
          finalRegressionPass: false,
        },
      },
      500,
    );
  }
}
