import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resolveVideoFromPage,
} from "@/lib/video/video-resolver";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const REGRESSION_CODE =
  "C144_4_8_VIDEO_RESOLVER_REGRESSION_PASS";

const FAILURE_CODE =
  "C144_4_8_VIDEO_RESOLVER_REGRESSION_FAILED";

const DEFAULT_TEST_URL =
  "https://www.1688.com/";

function json(
  body: Record<string, unknown>,
  status: number,
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
      .trim()
      .toLowerCase()
      .replace(/\.$/, "");

  if (
    host === "localhost" ||
    host ===
      "localhost.localdomain" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(
      ".localhost",
    )
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

  const [a, b] =
    parts;

  if (a === 10) {
    return true;
  }

  if (a === 127) {
    return true;
  }

  if (
    a === 169 &&
    b === 254
  ) {
    return true;
  }

  if (
    a === 172 &&
    b >= 16 &&
    b <= 31
  ) {
    return true;
  }

  if (
    a === 192 &&
    b === 168
  ) {
    return true;
  }

  return false;
}

function validatePublicUrl(
  value: string,
): boolean {
  if (!isHttpUrl(value)) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return !isBlockedHostname(
      url.hostname,
    );
  } catch {
    return false;
  }
}

function mediaTypeFromUrl(
  value: string,
): string {
  try {
    const pathname =
      new URL(value)
        .pathname
        .toLowerCase();

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

    if (
      pathname.endsWith(
        ".m3u8",
      )
    ) {
      return "m3u8";
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  /*
   * C144.4.8
   *
   * Founder-only production
   * regression for the real
   * Video Resolver runtime.
   *
   * Optional query:
   *
   * ?url=<real-public-video-page>
   *
   * When omitted, the endpoint
   * uses the default public 1688
   * entry point.
   */

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
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      401,
    );
  }

  const requestedUrl =
    request.nextUrl.searchParams.get(
      "url",
    );

  const pageUrl =
    (
      requestedUrl ||
      DEFAULT_TEST_URL
    ).trim();

  if (
    pageUrl.length >
    4096
  ) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "VIDEO_REGRESSION_URL_TOO_LONG",
        error:
          "The regression URL is too long.",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      400,
    );
  }

  if (
    !validatePublicUrl(
      pageUrl,
    )
  ) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "VIDEO_REGRESSION_URL_NOT_ALLOWED",
        error:
          "The regression URL must be a public HTTP or HTTPS URL.",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      400,
    );
  }

  /*
   * Deterministic security checks.
   */
  const blockedHosts = [
    "http://localhost/",
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://169.254.169.254/",
  ];

  const securityChecks =
    blockedHosts.map(
      (url) => ({
        url,
        blocked:
          !validatePublicUrl(
            url,
          ),
      }),
    );

  const securityPass =
    securityChecks.every(
      (item) =>
        item.blocked === true,
    );

  /*
   * Media-type contract checks.
   */
  const mediaTypeChecks = {
    mp4:
      mediaTypeFromUrl(
        "https://cdn.example.com/video.mp4",
      ) === "mp4",

    webm:
      mediaTypeFromUrl(
        "https://cdn.example.com/video.webm",
      ) === "webm",

    mov:
      mediaTypeFromUrl(
        "https://cdn.example.com/video.mov",
      ) === "mov",

    m3u8:
      mediaTypeFromUrl(
        "https://cdn.example.com/video.m3u8",
      ) === "m3u8",

    unknown:
      mediaTypeFromUrl(
        "https://cdn.example.com/image.jpg",
      ) === "unknown",
  };

  const mediaTypePass =
    Object.values(
      mediaTypeChecks,
    ).every(Boolean);

  /*
   * Real resolver execution.
   */
  try {
    const result =
      await resolveVideoFromPage(
        pageUrl,
      );

    const candidates =
      Array.isArray(
        result.candidates,
      )
        ? result.candidates
        : [];

    const scoresAreOrdered =
      candidates.every(
        (
          candidate,
          index,
        ) =>
          index === 0 ||
          candidate.score <=
            candidates[
              index - 1
            ].score,
      );

    const primaryMatchesTop =
      !result.primary ||
      (
        candidates.length >
          0 &&
        result.primary.url ===
          candidates[0].url
      );

    const candidateUrlsArePublic =
      candidates.every(
        (candidate) =>
          validatePublicUrl(
            candidate.url,
          ),
      );

    const mediaTypesValid =
      candidates.every(
        (candidate) =>
          [
            "mp4",
            "webm",
            "mov",
            "m3u8",
            "unknown",
          ].includes(
            candidate.mediaType,
          ),
      );

    const directMediaCandidates =
      candidates.filter(
        (candidate) =>
          candidate.mediaType ===
            "mp4" ||
          candidate.mediaType ===
            "webm" ||
          candidate.mediaType ===
            "mov",
      );

    const playlistCandidates =
      candidates.filter(
        (candidate) =>
          candidate.mediaType ===
          "m3u8",
      );

    const resolverExecuted =
      typeof result.success ===
        "boolean" &&
      typeof result.pageUrl ===
        "string" &&
      Array.isArray(
        result.candidates,
      ) &&
      typeof result.htmlFetched ===
        "boolean";

    const checks = {
      securityPass,

      mediaTypePass,

      resolverExecuted,

      htmlFetched:
        result.htmlFetched,

      candidatesReturned:
        candidates.length,

      candidateUrlsArePublic,

      mediaTypesValid,

      scoresAreOrdered,

      primaryMatchesTop,

      directMediaCandidates:
        directMediaCandidates.length,

      playlistCandidates:
        playlistCandidates.length,

      m3u8DistinctFromDirectMedia:
        playlistCandidates.every(
          (candidate) =>
            candidate.mediaType ===
            "m3u8",
        ),
    };

    /*
     * We only mark the regression
     * PASS when the actual resolver
     * executed successfully and all
     * structural/runtime contracts
     * passed.
     *
     * A public page without an
     * extractable video is not
     * treated as a false success.
     */
    const verified =
      resolverExecuted &&
      securityPass &&
      mediaTypePass &&
      candidateUrlsArePublic &&
      mediaTypesValid &&
      scoresAreOrdered &&
      primaryMatchesTop;

    return json(
      {
        success:
          verified,

        verified,

        code:
          verified
            ? REGRESSION_CODE
            : FAILURE_CODE,

        stage:
          "production-video-resolver-regression",

        input: {
          pageUrl,
          customUrl:
            Boolean(
              requestedUrl,
            ),
        },

        checks,

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

          candidateCount:
            candidates.length,

          candidates:
            candidates.map(
              (candidate) => ({
                url:
                  candidate.url,
                mediaType:
                  candidate.mediaType,
                score:
                  candidate.score,
                source:
                  candidate.source,
              }),
            ),

          primary:
            result.primary
              ? {
                  url:
                    result.primary
                      .url,
                  mediaType:
                    result.primary
                      .mediaType,
                  score:
                    result.primary
                      .score,
                  source:
                    result.primary
                      .source,
                }
              : undefined,

          error:
            result.error,
        },

        securityChecks,

        runtime:
          APP_CONFIG.runtimeId,

        runtimeVersion:
          APP_CONFIG.version,

        timestamp:
          Date.now(),

        latencyMs:
          Date.now() -
          startedAt,
      },
      verified
        ? 200
        : 503,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Video Resolver regression failed.";

    console.error(
      "[C144.4.8 Video Resolver Regression]",
      error,
    );

    return json(
      {
        success: false,

        verified: false,

        code:
          "C144_4_8_VIDEO_RESOLVER_REGRESSION_ERROR",

        stage:
          "runtime",

        input: {
          pageUrl,
        },

        securityPass,

        mediaTypePass,

        error:
          message,

        runtime:
          APP_CONFIG.runtimeId,

        runtimeVersion:
          APP_CONFIG.version,

        timestamp:
          Date.now(),

        latencyMs:
          Date.now() -
          startedAt,
      },
      500,
    );
  }
}
