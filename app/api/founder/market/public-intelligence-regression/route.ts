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
     * Call the real public endpoint.
     *
     * Deliberately DO NOT forward:
     * - Authorization
     * - x-aios-founder-key
     *
     * This verifies the actual public
     * boundary instead of only testing
     * the underlying runtime directly.
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
      (await response.json()) as Record<
        string,
        unknown
      >;

    const checks: RegressionCheck[] =
      [
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
            "EVIDENCE_RUNTIME_CODE",

          passed:
            data.code ===
              "C147_2_WEB_EVIDENCE_FALLBACK" ||
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
            "VERIFICATION_METADATA",

          passed:
            Boolean(
              data.verification &&
                typeof data.verification ===
                  "object",
            ),

          detail:
            "Market verification metadata is present.",
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
            "C147.21+C147.2",

          generatedAt:
            new Date().toISOString(),

          latencyMs:
            Date.now() -
            startedAt,
        },

        principles: [
          "Public Market Intelligence uses the existing read-only Market Runtime.",
          "Founder authentication is not required by the public endpoint.",
          "Internal anonymous identity is maintained by an HttpOnly cookie.",
          "Internal userId is not returned to the public client.",
          "Market evidence verification remains visible.",
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
