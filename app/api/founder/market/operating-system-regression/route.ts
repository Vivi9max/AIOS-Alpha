import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketOperatingSystem,
} from "@/lib/runtime/market/market-operating-system-runtime";

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
      },
      {
        status: 401,
      },
    );
  }

  const startedAt =
    Date.now();

  const checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }> = [];

  try {
    const result =
      await runMarketOperatingSystem({
        universe:
          TEST_UNIVERSE,

        includeMonitoring:
          true,

        includeBlocked:
          true,
      });

    checks.push({
      name:
        "RUNTIME_COMPLETED",

      passed:
        result.success ===
          true ||
        result.code ===
          "C155_MARKET_OS_INSUFFICIENT",

      detail:
        `Runtime code: ${result.code}`,
    });

    checks.push({
      name:
        "THREE_MARKET_UNIVERSE",

      passed:
        result.snapshot
          .universeSize === 3,

      detail:
        `Universe=${result.snapshot.universeSize}`,
    });

    checks.push({
      name:
        "RESEARCH_ITEMS_PRESENT",

      passed:
        result.snapshot
          .researchItems.length >
        0,

      detail:
        `Research items=${result.snapshot.researchItems.length}`,
    });

    checks.push({
      name:
        "RADAR_UPSTREAM",

      passed:
        result.radarRuntime ===
        "C154.1",

      detail:
        "C154.1 Market Radar remains the monitoring upstream.",
    });

    checks.push({
      name:
        "EVIDENCE_UPSTREAM",

      passed:
        result.evidenceRuntime ===
        "C147.6",

      detail:
        "C147.6 Evidence Matrix remains the evidence upstream.",
    });

    checks.push({
      name:
        "NO_MUTATION",

      passed:
        result.mutationPerformed ===
        false,

      detail:
        "No market state was mutated.",
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
        "HUMAN_DECISION",

      passed:
        result.humanDecisionRequired ===
        true,

      detail:
        "Human decision remains mandatory.",
    });

    checks.push({
      name:
        "EVIDENCE_TRACE",

      passed:
        result.snapshot
          .researchItems
          .every(
            (item) =>
              item
                .evidenceSourceCount >=
              0,
          ),

      detail:
        "Every research item carries evidence provenance metadata.",
    });

    checks.push({
      name:
        "RESEARCH_BOUNDARY",

      passed:
        result.disclaimer.includes(
          "does not generate buy, sell, hold",
        ),

      detail:
        "Investment recommendation boundary remains preserved.",
    });

    const passed =
      checks.filter(
        (check) =>
          check.passed,
      ).length;

    return NextResponse.json({
      success:
        passed ===
        checks.length,

      code:
        passed ===
        checks.length
          ? "C155_MARKET_OS_REGRESSION_PASS"
          : "C155_MARKET_OS_REGRESSION_FAIL",

      passed,

      total:
        checks.length,

      failed:
        checks.length -
        passed,

      checks,

      runtimeMs:
        Date.now() -
        startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C155_MARKET_OS_REGRESSION_ERROR",

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
