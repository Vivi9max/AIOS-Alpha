import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketRadarRuntime,
} from "@/lib/runtime/market/market-radar-runtime";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type RegressionResult = {
  success: boolean;

  code: string;

  stage: string;

  passed: number;

  failed: number;

  total: number;

  checks: Check[];

  runtimeMs: number;
};

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const universe = [
  {
    symbol: "NVDA",
    market: "us" as const,
  },

  {
    symbol: "0700.HK",
    market: "hk" as const,
  },

  {
    symbol: "600519.SH",
    market: "cn" as const,
  },
];

async function runRegression(): Promise<RegressionResult> {
  const startedAt =
    Date.now();

  const checks: Check[] = [];

  let result;

  try {
    result =
      await runMarketRadarRuntime(
        {
          universe,

          includeNoChange:
            true,

          includeNoHistory:
            true,

          includeBlocked:
            true,

          query:
            null,
        },
      );

    checks.push({
      name:
        "RADAR_RUNTIME_COMPLETED",

      passed:
        result.success === true ||
        result.code ===
          "C154_MARKET_RADAR_INSUFFICIENT",

      detail:
        `C154 code=${result.code}.`,
    });

    checks.push({
      name:
        "UNIVERSE_EVALUATED",

      passed:
        result.radar
          .universeSize ===
        universe.length,

      detail:
        `Universe=${result.radar.universeSize}; expected=${universe.length}.`,
    });

    checks.push({
      name:
        "SIGNALS_STRUCTURED",

      passed:
        Array.isArray(
          result.radar.signals,
        ),

      detail:
        `Signals=${result.radar.signals.length}.`,
    });

    checks.push({
      name:
        "SOURCE_VERSION_ALIGNED",

      passed:
        result.radar.signals.every(
          (signal) =>
            signal.sourceVersion ===
            "C147.12",
        ),

      detail:
        "Radar signals remain traceable to the existing market change-detection source.",
    });

    checks.push({
      name:
        "NO_TRADING_EXECUTION",

      passed:
        result.tradingExecuted ===
          false &&
        result.plannerDispatched ===
          false,

      detail:
        "C154 does not dispatch Planner or trading execution.",
    });

    checks.push({
      name:
        "NO_MUTATION",

      passed:
        result.mutationPerformed ===
        false,

      detail:
        "C154 remains read-only.",
    });

    checks.push({
      name:
        "HUMAN_REVIEW_BOUNDARY",

      passed:
        result.humanDecisionRequired ===
        true,

      detail:
        "Human decision remains required.",
    });

    checks.push({
      name:
        "NO_INVESTMENT_RECOMMENDATION",

      passed:
        result.disclaimer.includes(
          "does not generate buy, sell, hold",
        ),

      detail:
        "Radar disclaimer preserves the decision-support boundary.",
    });
  } catch (error) {
    checks.push({
      name:
        "RADAR_RUNTIME_EXCEPTION",

      passed:
        false,

      detail:
        error instanceof Error
          ? error.message
          : "Unknown runtime exception.",
    });
  }

  const passed =
    checks.filter(
      (check) =>
        check.passed,
    ).length;

  const failed =
    checks.length -
    passed;

  return {
    success:
      failed === 0,

    code:
      failed === 0
        ? "C154_MARKET_RADAR_REGRESSION_PASS"
        : "C154_MARKET_RADAR_REGRESSION_PARTIAL",

    stage:
      "C154.1.1",

    passed,

    failed,

    total:
      checks.length,

    checks,

    runtimeMs:
      Date.now() -
      startedAt,
  };
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
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

  try {
    const result =
      await runRegression();

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C154_MARKET_RADAR_REGRESSION_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "C154 regression failed.",
      },
      {
        status: 500,
      },
    );
  }
}
