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

const TEST_UNIVERSE = [
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

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

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
    return NextResponse.json(
      {
        success: false,

        verified: false,

        code:
          "FOUNDER_AUTH_REQUIRED",

        message:
          "Founder authentication is required.",
      },
      {
        status: 401,
      },
    );
  }

  const checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }> = [];

  try {
    const result =
      await runMarketRadarRuntime(
        {
          universe:
            TEST_UNIVERSE,

          includeNoChange:
            true,

          includeNoHistory:
            true,

          includeBlocked:
            true,
        },
      );

    checks.push({
      name:
        "RUNTIME_COMPLETED",

      passed:
        result.success === true ||
        result.code ===
          "C154_MARKET_RADAR_INSUFFICIENT",

      detail:
        `Runtime code: ${result.code}`,
    });

    checks.push({
      name:
        "THREE_MARKET_UNIVERSE",

      passed:
        result.radar
          .universeSize === 3,

      detail:
        `Universe=${result.radar.universeSize}`,
    });

    checks.push({
      name:
        "US_MARKET_PRESENT",

      passed:
        result.radar.signals.some(
          (signal) =>
            signal.symbol ===
              "NVDA" &&
            signal.market ===
              "us",
        ),

      detail:
        "NVDA / US signal trace exists when upstream produces an event.",
    });

    checks.push({
      name:
        "HK_MARKET_PRESENT",

      passed:
        result.radar.signals.some(
          (signal) =>
            signal.symbol ===
              "0700.HK" &&
            signal.market ===
              "hk",
        ),

      detail:
        "0700.HK / HK signal trace exists when upstream produces an event.",
    });

    checks.push({
      name:
        "CN_MARKET_PRESENT",

      passed:
        result.radar.signals.some(
          (signal) =>
            signal.symbol ===
              "600519.SH" &&
            signal.market ===
              "cn",
        ),

      detail:
        "600519.SH / CN signal trace exists when upstream produces an event.",
    });

    checks.push({
      name:
        "UPSTREAM_TRACEABILITY",

      passed:
        result.radar.signals.every(
          (signal) =>
            signal.sourceVersion ===
            "C147.12",
        ),

      detail:
        "Every emitted signal remains traceable to C147.12.",
    });

    checks.push({
      name:
        "NO_MUTATION",

      passed:
        result.mutationPerformed ===
        false,

      detail:
        "Market decision history was not mutated.",
    });

    checks.push({
      name:
        "NO_TASK",

      passed:
        result.taskCreated ===
        false,

      detail:
        "No Task was created.",
    });

    checks.push({
      name:
        "NO_PLANNER",

      passed:
        result.plannerDispatched ===
        false,

      detail:
        "Planner was not dispatched.",
    });

    checks.push({
      name:
        "NO_TRADING",

      passed:
        result.tradingExecuted ===
        false,

      detail:
        "Trading was not executed.",
    });

    checks.push({
      name:
        "HUMAN_REVIEW",

      passed:
        result.humanDecisionRequired ===
        true,

      detail:
        "Human decision remains mandatory.",
    });

    checks.push({
      name:
        "RESEARCH_BOUNDARY",

      passed:
        result.disclaimer.includes(
          "does not generate buy, sell, hold",
        ),

      detail:
        "Investment recommendation boundary is preserved.",
    });

    const passed =
      checks.filter(
        (check) =>
          check.passed,
      ).length;

    const failed =
      checks.length -
      passed;

    return NextResponse.json(
      {
        success:
          failed === 0,

        verified:
          failed === 0,

        code:
          failed === 0
            ? "C154_MARKET_RADAR_REGRESSION_PASS"
            : "C154_MARKET_RADAR_REGRESSION_PARTIAL",

        stage:
          "C154.1.1",

        total:
          checks.length,

        passed,

        failed,

        checks,

        runtimeMs:
          Date.now() -
          startedAt,

        upstream:
          "C147.13",

        generatedAt:
          new Date().toISOString(),
      },
      {
        status:
          failed === 0
            ? 200
            : 207,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        verified: false,

        code:
          "C154_MARKET_RADAR_REGRESSION_ERROR",

        stage:
          "C154.1.1",

        error:
          error instanceof Error
            ? error.message
            : "Unknown regression error.",

        runtimeMs:
          Date.now() -
          startedAt,
      },
      {
        status: 500,
      },
    );
  }
}
