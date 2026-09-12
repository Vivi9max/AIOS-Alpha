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
  requiresWebIntelligence,
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const REGRESSION_PROMPT =
  "What is the latest major news about OpenAI today? Verify the current information using reliable external web sources.";

function normalizeHostname(
  hostname: string,
): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function normalizeSourceDomain(
  hostname: string,
): string {
  const normalized =
    normalizeHostname(
      hostname,
    );

  const parts =
    normalized
      .split(".")
      .filter(Boolean);

  if (parts.length <= 2) {
    return normalized;
  }

  const compoundPublicSuffixes =
    new Set([
      "co.uk",
      "org.uk",
      "ac.uk",
      "gov.uk",
      "com.cn",
      "net.cn",
      "org.cn",
      "gov.cn",
      "com.hk",
      "net.hk",
      "org.hk",
      "gov.hk",
      "com.jp",
      "net.jp",
      "org.jp",
      "co.jp",
      "go.jp",
    ]);

  const suffix =
    parts
      .slice(-2)
      .join(".");

  if (
    compoundPublicSuffixes.has(
      suffix,
    ) &&
    parts.length >= 3
  ) {
    return parts
      .slice(-3)
      .join(".");
  }

  return parts
    .slice(-2)
    .join(".");
}

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

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  /*
   * C143.6
   *
   * Founder-only production regression
   * for the real Web Intelligence path.
   *
   * This endpoint never exposes the
   * Brave API key.
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

  const apiKeyConfigured =
    Boolean(
      process.env
        .BRAVE_SEARCH_API_KEY?.trim(),
    );

  if (!apiKeyConfigured) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "BRAVE_SEARCH_API_KEY_MISSING",
        message:
          "BRAVE_SEARCH_API_KEY is not configured.",
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
      503,
    );
  }

  const intentDetected =
    requiresWebIntelligence(
      REGRESSION_PROMPT,
    );

  if (!intentDetected) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "WEB_INTELLIGENCE_NOT_TRIGGERED",
        message:
          "The regression prompt did not trigger Web Intelligence.",
        prompt:
          REGRESSION_PROMPT,
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

  try {
    const evidence =
      await retrieveWebEvidence(
        REGRESSION_PROMPT,
      );

    const sourceDomains =
      Array.from(
        new Set(
          evidence.sourceHosts
            .map(
              normalizeSourceDomain,
            )
            .filter(Boolean),
        ),
      );

    const verified =
      evidence.success &&
      evidence.verified &&
      evidence.sourceCount >= 2 &&
      sourceDomains.length >= 2;

    const checks = {
      apiKeyConfigured: true,

      intentDetected,

      evidenceReturned:
        evidence.success,

      minimumEvidence:
        evidence.sourceCount >= 2,

      independentDomains:
        sourceDomains.length >= 2,

      verified:
        evidence.verified,

      finalRegressionPass:
        verified,
    };

    return json(
      {
        success: verified,

        verified,

        code:
          verified
            ? "C143_6_WEB_INTELLIGENCE_REGRESSION_PASS"
            : "C143_6_WEB_INTELLIGENCE_REGRESSION_FAILED",

        stage:
          "production-web-regression",

        prompt:
          REGRESSION_PROMPT,

        checks,

        sourceCount:
          evidence.sourceCount,

        sourceHosts:
          evidence.sourceHosts,

        sourceDomains,

        evidence:
          evidence.evidence,

        error:
          evidence.error,

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
        : "Web Intelligence regression failed.";

    console.error(
      "[C143.6 Web Intelligence Regression]",
      error,
    );

    return json(
      {
        success: false,

        verified: false,

        code:
          "C143_6_WEB_INTELLIGENCE_REGRESSION_ERROR",

        stage:
          "runtime",

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
