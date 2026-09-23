import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type RegressionCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      code:
        "FOUNDER_AUTH_REQUIRED",
      error:
        "Founder authentication required.",
    },
    {
      status: 401,
    },
  );
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  return value !== null &&
    typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  const startedAt =
    Date.now();

  try {
    /*
     * IMPORTANT:
     *
     * This request intentionally does NOT
     * forward Founder authentication.
     */
    const response =
      await fetch(
        new URL(
          "/api/market/intelligence",
          request.url,
        ),
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              symbol:
                "AAPL",
              market:
                "us",
            }),

          cache:
            "no-store",
        },
      );

    const data =
      asRecord(
        await response.json(),
      );

    const snapshot =
      asRecord(
        data.snapshot,
      );

    const verification =
      asRecord(
        data.verification,
      );

    const provider =
      asRecord(
        data.provider,
      );

    const freshness =
      asRecord(
        verification.freshness,
      );

    const providerReason =
      typeof provider.reason ===
      "string"
        ? provider.reason
        : "none";

    const runtimeError =
      typeof data.error ===
      "string"
        ? data.error
        : "none";

    const checks:
      RegressionCheck[] = [
        {
          name:
            "PUBLIC_HTTP_ACCESS",

          passed:
            response.status !==
              401 &&
            response.status !==
              403,

          detail:
            `Public endpoint returned HTTP ${response.status} without Founder headers.`,
        },

        {
          name:
            "REAL_MARKET_RUNTIME",

          passed:
            data.success ===
              true,

          detail:
            `success=${String(
              data.success,
            )}.`,
        },

        {
          name:
            "STRUCTURED_PROVIDER",

          passed:
            provider.provider ===
              "alltick" &&
            provider.configured ===
              true &&
            provider.available ===
              true &&
            verification.structuredDataAvailable ===
              true &&
            verification.structuredDataVerified ===
              true,

          detail:
            [
              `provider=${String(
                provider.provider,
              )}`,

              `configured=${String(
                provider.configured,
              )}`,

              `available=${String(
                provider.available,
              )}`,

              `structuredAvailable=${String(
                verification.structuredDataAvailable,
              )}`,

              `structuredVerified=${String(
                verification.structuredDataVerified,
              )}`,

              `reason=${providerReason}`,
            ].join("; "),
        },

        {
          name:
            "LIVE_QUOTE_AVAILABLE",

          passed:
            snapshot.liveQuoteAvailable ===
              true &&
            snapshot.dataQuality ===
              "live" &&
            snapshot.quoteQuality ===
              "live",

          detail:
            `liveQuoteAvailable=${String(
              snapshot.liveQuoteAvailable,
            )}; dataQuality=${String(
              snapshot.dataQuality,
            )}; quoteQuality=${String(
              snapshot.quoteQuality,
            )}.`,
        },

        {
          name:
            "AS_OF_TIMESTAMP",

          passed:
            typeof snapshot.asOf ===
              "string" &&
            Number.isFinite(
              new Date(
                String(
                  snapshot.asOf,
                ),
              ).getTime(),
            ),

          detail:
            `asOf=${String(
              snapshot.asOf ??
                "none",
            )}.`,
        },

        {
          name:
            "FRESHNESS_METADATA",

          passed:
            typeof freshness.freshness ===
              "string" &&
            typeof freshness.referenceTime ===
              "string" &&
            typeof freshness.ageMinutes ===
              "number",

          detail:
            `freshness=${String(
              freshness.freshness,
            )}; ageMinutes=${String(
              freshness.ageMinutes,
            )}.`,
        },

        {
          name:
            "MARKET_COVERAGE",

          passed:
            Array.isArray(
              provider.supportsMarkets,
            ) &&
            ["us", "hk", "cn"].every(
              (market) =>
                (
                  provider.supportsMarkets as unknown[]
                ).includes(market),
            ),

          detail:
            `supportsMarkets=${JSON.stringify(
              provider.supportsMarkets ??
                [],
            )}.`,
        },

        {
          name:
            "HISTORICAL_OHLCV",

          passed:
            Array.isArray(
              snapshot.bars,
            ) &&
            (
              snapshot.bars as unknown[]
            ).length > 0 &&
            snapshot.historicalQuality ===
              "historical",

          detail:
            `bars=${String(
              Array.isArray(
                snapshot.bars,
              )
                ? snapshot.bars.length
                : 0,
            )}; historicalQuality=${String(
              snapshot.historicalQuality,
            )}.`,
        },

        {
          name:
            "EVIDENCE_RUNTIME_CODE",

          passed:
            data.code ===
              "C147_2_STRUCTURED_MARKET_DATA_PASS",

          detail:
            `Runtime code=${String(
              data.code ??
                "none",
            )}.`,
        },

        {
          name:
            "PUBLIC_BOUNDARY",

          passed:
            data.publicBoundary ===
              "C147.21",

          detail:
            `publicBoundary=${String(
              data.publicBoundary ??
                "none",
            )}.`,
        },

        {
          name:
            "IDENTITY_NOT_EXPOSED",

          passed:
            !Object.prototype.hasOwnProperty.call(
              data,
              "userId",
            ),

          detail:
            "Internal anonymous userId is not returned to the public client.",
        },

        {
          name:
            "NO_AUTOMATED_EXECUTION",

          passed:
            !Object.prototype.hasOwnProperty.call(
              data,
              "automatedExecutionStarted",
            ) &&
            !Object.prototype.hasOwnProperty.call(
              data,
              "plannerDispatched",
            ) &&
            !Object.prototype.hasOwnProperty.call(
              data,
              "tradingExecuted",
            ),

          detail:
            "Public response exposes no automated execution, Planner or trading result.",
        },

        {
          name:
            "IDENTITY_COOKIE",

          passed:
            Boolean(
              response.headers.get(
                "set-cookie",
              ),
            ),

          detail:
            "Anonymous Alpha identity cookie was issued server-side.",
        },
      ];

    const failed =
      checks.filter(
        (check) =>
          !check.passed,
      ).length;

    return NextResponse.json(
      {
        success:
          failed === 0,

        code:
          failed === 0
            ? "C147_21_1_PUBLIC_MARKET_INTELLIGENCE_REGRESSION_PASS"
            : "C147_21_1_PUBLIC_MARKET_INTELLIGENCE_REGRESSION_PARTIAL",

        stage:
          "C147.21.1",

        passed:
          checks.length -
          failed,

        failed,

        total:
          checks.length,

        checks,

        /*
         * NEW:
         *
         * Diagnostic information is intentionally
         * safe for Founder Console.
         *
         * API key is NEVER returned.
         */
        structuredProviderDiagnostics: {
          provider:
            provider.provider ??
            null,

          configured:
            provider.configured ??
            false,

          available:
            provider.available ??
            false,

          supportsQuote:
            provider.supportsQuote ??
            false,

          supportsRealtime:
            provider.supportsRealtime ??
            false,

          supportsHistorical:
            provider.supportsHistorical ??
            false,

          supportsMarkets:
            provider.supportsMarkets ??
            [],

          reason:
            providerReason,

          runtimeError,
        },

        liveMarketVerification: {
          provider:
            provider.provider ??
            null,

          liveQuoteAvailable:
            snapshot.liveQuoteAvailable ??
            false,

          dataQuality:
            snapshot.dataQuality ??
            "insufficient",

          quoteQuality:
            snapshot.quoteQuality ??
            null,

          historicalQuality:
            snapshot.historicalQuality ??
            null,

          asOf:
            snapshot.asOf ??
            null,

          freshness:
            freshness.freshness ??
            "unknown",

          ageMinutes:
            freshness.ageMinutes ??
            null,

          supportsMarkets:
            provider.supportsMarkets ??
            [],
        },

        safetyBoundary: {
          founderAuthRequired:
            false,

          humanReviewMutation:
            false,

          plannerDispatched:
            false,

          tradingExecuted:
            false,
        },

        runtime: {
          name:
            "public-market-intelligence-regression-runtime",

          version:
            "C147.21.1",

          upstream:
            "C147.21+C147.2+C147.22",

          generatedAt:
            new Date().toISOString(),

          latencyMs:
            Date.now() -
            startedAt,
        },

        principles: [
          "Public Market Intelligence uses the read-only Market Runtime.",
          "AllTick is the structured realtime-first provider.",
          "Web Intelligence is fallback evidence and cannot claim live quotes.",
          "Internal anonymous identity is maintained by an HttpOnly cookie.",
          "Internal userId is not returned to the public client.",
          "No Planner dispatch occurs.",
          "No automated trading occurs.",
          "Human-review persistence remains outside the public boundary.",
        ],

        disclaimer:
          "C147.21.1 validates the public Market Intelligence boundary. It does not rank securities, predict returns, provide personalized investment advice, or execute trades.",
      },
    );
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C147_21_1_PUBLIC_MARKET_INTELLIGENCE_REGRESSION_ERROR",

        stage:
          "C147.21.1",

        error:
          error instanceof Error
            ? error.message
            : "C147.21.1 regression failed.",
      },
      {
        status:
          500,
      },
    );
  }
}
