import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAccess,
} from "@/lib/auth/founder";

import {
  evaluateLiveTradingBoundary,
} from "@/lib/runtime/market/live-trading-boundary-engine";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface Check {
  name: string;

  passed: boolean;

  detail: string;
}

function check(
  name: string,
  passed: boolean,
  detail: string,
): Check {
  return {
    name,
    passed,
    detail,
  };
}

export async function GET(
  request: NextRequest,
) {
  const access =
    requireFounderAccess(
      request,
    );

  if (
    !access.authorized
  ) {
    return access.response;
  }

  const start =
    Date.now();

  const baseOrder = {
    symbol:
      "AAPL.US",

    market:
      "us" as const,

    side:
      "buy" as const,

    quantity:
      10,

    limitPrice:
      200,

    reason:
      "C152 deterministic live-boundary regression",
  };

  /*
   * Scenario 1:
   * Attempt to cross the boundary
   * without C151 verification or
   * human review.
   */
  const blocked =
    evaluateLiveTradingBoundary({
      order:
        baseOrder,

      paperTradingVerified:
        false,

      humanReviewApproved:
        false,

      brokerConnected:
        false,

      liveExecutionRequested:
        true,
    });

  /*
   * Scenario 2:
   * C151 verified + human review,
   * but broker is disconnected.
   */
  const approvedButDisconnected =
    evaluateLiveTradingBoundary({
      order:
        baseOrder,

      paperTradingVerified:
        true,

      humanReviewApproved:
        true,

      brokerConnected:
        false,

      liveExecutionRequested:
        true,
    });

  /*
   * Scenario 3:
   * Explicitly attempt to bypass the
   * broker boundary by claiming the
   * broker is connected.
   *
   * C152 must still reject the claim.
   */
  const explicitAttempt =
    evaluateLiveTradingBoundary({
      order:
        baseOrder,

      paperTradingVerified:
        true,

      humanReviewApproved:
        true,

      brokerConnected:
        true,

      liveExecutionRequested:
        true,
    });

  const checks: Check[] = [
    check(
      "PAPER_GATE_REQUIRED",
      blocked.blockedReasons.includes(
        "PAPER_TRADING_NOT_VERIFIED",
      ),
      "Live boundary blocks when C151 paper trading is not verified.",
    ),

    check(
      "HUMAN_REVIEW_GATE",
      blocked.blockedReasons.includes(
        "HUMAN_REVIEW_REQUIRED",
      ),
      "Live boundary blocks until explicit human review approval.",
    ),

    check(
      "BROKER_CONNECTION_REQUIRED",
      approvedButDisconnected.blockedReasons.includes(
        "BROKER_NOT_CONNECTED",
      ),
      "Live boundary blocks when no broker connection exists.",
    ),

    check(
      "EXECUTION_ADAPTER_GATE",
      explicitAttempt.blockedReasons.includes(
        "LIVE_EXECUTION_ADAPTER_NOT_IMPLEMENTED",
      ),
      "C152 has no live broker execution adapter.",
    ),

    check(
      "NO_LIVE_ORDER",
      explicitAttempt.execution
        .liveOrderPlaced ===
        false,
      "No live broker order was placed.",
    ),

    check(
      "NO_TRADING_EXECUTION",
      explicitAttempt.execution
        .tradingExecuted ===
        false,
      "No real trading execution occurred.",
    ),

    check(
      "NO_PLANNER_DISPATCH",
      explicitAttempt.execution
        .plannerDispatched ===
        false,
      "Planner was not dispatched.",
    ),

    check(
      "BROKER_DISCONNECTED",
      explicitAttempt.gates
        .brokerConnected ===
        false,
      "Runtime never treats caller claims as an actual broker connection.",
    ),

    check(
      "BROKER_ADAPTER_UNAVAILABLE",
      explicitAttempt.gates
        .brokerAdapterAvailable ===
        false,
      "No broker execution adapter is available in C152.",
    ),

    check(
      "NOT_LIVE_READY",
      explicitAttempt
        .readyForLiveExecution ===
        false,
      "C152 cannot declare live execution ready.",
    ),

    check(
      "FOUNDER_ONLY_BOUNDARY",
      explicitAttempt
        .safetyBoundary
        .founderOnly ===
        true,
      "Regression route requires Founder Session.",
    ),

    check(
      "AUTOMATIC_EXECUTION_DISABLED",
      explicitAttempt
        .safetyBoundary
        .automaticExecutionAllowed ===
        false,
      "Automatic live execution is disabled.",
    ),

    check(
      "SEQUENCE_INTEGRITY",
      explicitAttempt
        .methodology
        .requiredSequence
        .join(" → ") ===
        "Research → Selection → Valuation → Backtest → Paper Trade → Human Review → Live Trading Boundary → Live Trade",
      "C152 preserves the staged research-to-live sequence.",
    ),
  ];

  const passed =
    checks.filter(
      (item) =>
        item.passed,
    ).length;

  const failed =
    checks.length -
    passed;

  const verified =
    failed === 0 &&
    blocked.success &&
    approvedButDisconnected.success &&
    explicitAttempt.success &&
    explicitAttempt.execution
      .liveOrderPlaced ===
      false &&
    explicitAttempt.gates
      .brokerConnected ===
      false &&
    explicitAttempt.readyForLiveExecution ===
      false;

  return NextResponse.json(
    {
      success:
        verified,

      verified,

      code:
        verified
          ? "C152_1_1_LIVE_TRADING_BOUNDARY_REGRESSION_PASS"
          : "C152_1_1_LIVE_TRADING_BOUNDARY_REGRESSION_PARTIAL",

      stage:
        "C152.1.1",

      upstream:
        "C152",

      mode:
        "live-boundary-no-execution",

      latencyMs:
        Date.now() -
        start,

      passed,

      failed,

      total:
        checks.length,

      checks,

      scenarios: {
        blockedBeforePaperVerification:
          blocked,

        blockedWithoutBroker:
          approvedButDisconnected,

        explicitLiveAttempt:
          explicitAttempt,
      },

      safetyBoundary: {
        founderOnly:
          true,

        simulationRequiredBeforeLive:
          true,

        humanReviewRequired:
          true,

        brokerConnected:
          false,

        tradingExecuted:
          false,

        liveOrderPlaced:
          false,

        plannerDispatched:
          false,

        automaticExecutionAllowed:
          false,
      },

      principle:
        "C152 defines and verifies the human-reviewed live-trading boundary. It does not connect a broker or place live orders.",

      nextStage:
        "C153",

      generatedAt:
        new Date().toISOString(),
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store",

        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}
