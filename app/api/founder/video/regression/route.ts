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
    typeof value === "string" &&
    (
      ALLOWED_MEDIA_TYPES as readonly string[]
    ).includes(value)
  );
}
function isSafeResolvedUrl(
  value: unknown,
): boolean {
  if (
    typeof value !== "string" ||
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
  const sourceUrl = (
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
          sourceUrlValid:
            false,
          mediaTypeDetection:
            false,
          resolverExecuted:
            false,
          resolverReturned:
            false,
          candidateFound:
            false,
          primaryCandidate:
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
    const candidates =
      Array.isArray(
        result.candidates,
      )
        ? result.candidates
        : [];
    const candidateCount =
      candidates.length;
    const candidateFound =
      candidateCount > 0;
    const primary =
      result.primary;
    const primaryCandidate =
      Boolean(
        primary &&
        typeof primary ===
          "object",
      );
    const selectedUrl =
      primary?.url;
    const selectedMediaType =
      primary?.mediaType;
    const mediaTypeDetection =
      isAllowedMediaType(
        selectedMediaType,
      );
    const safeUrlValidation =
      isSafeResolvedUrl(
        selectedUrl,
      );
    const resolverSuccess =
      result.success === true;
    const finalRegressionPass =
      resolverExecuted &&
      resolverReturned &&
      candidateFound &&
      primaryCandidate &&
      mediaTypeDetection &&
      safeUrlValidation &&
      resolverSuccess;
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
          selectedMediaType ??
          "unknown",
        candidateCount,
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
        checks: {
          auth: true,
          sourceUrlValid:
            true,
          mediaTypeDetection:
            mediaTypeDetection,
          resolverExecuted:
            resolverExecuted,
          resolverReturned:
            resolverReturned,
          candidateFound:
            candidateFound,
          primaryCandidate:
            primaryCandidate,
          safeUrlValidation:
            safeUrlValidation,
          resolverSuccess:
            resolverSuccess,
          finalRegressionPass:
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
          "C144_4_8_1_VIDEO_RESOLVER_RUNTIME_ERROR",
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
          sourceUrlValid:
            true,
          mediaTypeDetection:
            false,
          resolverExecuted:
            true,
          resolverReturned:
            false,
          candidateFound:
            false,
          primaryCandidate:
            false,
          safeUrlValidation:
            false,
          resolverSuccess:
            false,
          finalRegressionPass:
            false,
        },
      },
      500,
    );
  }
}
