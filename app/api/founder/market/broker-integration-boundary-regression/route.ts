import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAccess,
} from "@/lib/auth/founder";

import {
  evaluateBrokerIntegrationBoundary,
} from "@/lib/runtime/market/broker-integration-boundary-engine";

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

  const order = {
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
      "C153 deterministic broker boundary regression",
  };

  /*
   * Scenario 1:
   * Before paper-trading verification
   * and human review.
   */
  const beforePaper =
    evaluateBrokerIntegrationBoundary(
      {
        order,

        paperTradingVerified:
          false,

        humanReviewApproved:
          false,

        provider:
          "unconfigured",

        connectionVerified:
          false,

        executionRequested:
          true,
      },
    );

  /*
   * Scenario 2:
   * Provider is declared, but no actual
   * connection has been verified.
   */
  const configuredButUnverified =
    evaluateBrokerIntegrationBoundary(
      {
        order,

        paperTradingVerified:
          true,

        humanReviewApproved:
          true,

        provider:
          "custom",

        connectionVerified:
          false,

        executionRequested:
          true,
      },
    );

  /*
   * Scenario 3:
   * Caller attempts to bypass the
   * connection gate by claiming the
   * broker is connected.
   */
  const claimedConnection =
    evaluateBrokerIntegrationBoundary(
      {
        order,

        paperTradingVerified:
          true,

        humanReviewApproved:
          true,

        provider:
          "custom",

        connectionVerified:
          true,

        executionRequested:
          true,
      },
    );

  const checks: Check[] = [
    check(
      "PAPER_GATE_REQUIRED",
      beforePaper.blockedReasons.includes(
        "PAPER_TRADING_NOT_VERIFIED",
      ),
      "Broker boundary blocks before verified paper trading.",
    ),

    check(
      "HUMAN_REVIEW_GATE",
      beforePaper.blockedReasons.includes(
        "HUMAN_REVIEW_REQUIRED",
      ),
      "Broker boundary blocks without explicit human review.",
    ),

    check(
      "PROVIDER_CONFIGURATION_GATE",
      beforePaper.blockedReasons.includes(
        "BROKER_PROVIDER_NOT_CONFIGURED",
      ),
      "No broker provider is configured by default.",
    ),

    check(
      "CONNECTION_VERIFICATION_GATE",
      configuredButUnverified.blockedReasons.includes(
        "BROKER_CONNECTION_NOT_VERIFIED",
      ),
      "Provider configuration alone does not establish a verified connection.",
    ),

    check(
      "EXECUTION_ADAPTER_GATE",
      configuredButUnverified.blockedReasons.includes(
        "EXECUTION_ADAPTER_NOT_IMPLEMENTED",
      ),
      "C153 has no real broker execution adapter.",
    ),

    check(
      "LIVE_EXECUTION_DISABLED",
      configuredButUnverified.blockedReasons.includes(
        "LIVE_EXECUTION_DISABLED",
      ),
      "C153 keeps live execution disabled.",
    ),

    check(
      "CALLER_CLAIM_NOT_TRUSTED",
      claimedConnection.broker
        .connectionVerified ===
        false,
      "Caller-supplied connectionVerified=true cannot establish a broker connection.",
    ),

    check(
      "BROKER_NOT_CONNECTED",
      claimedConnection.broker
        .connectionStatus !==
        "connected",
      "Runtime never reports a caller-claimed broker as connected.",
    ),

    check(
      "NO_LIVE_ORDER",
      claimedConnection.execution
        .liveOrderPlaced ===
        false,
      "No live broker order was placed.",
    ),

    check(
      "NO_TRADING_EXECUTION",
      claimedConnection.execution
        .tradingExecuted ===
        false,
      "No real trading execution occurred.",
    ),

    check(
      "NO_PLANNER_DISPATCH",
      claimedConnection.execution
        .plannerDispatched ===
        false,
      "Planner was not dispatched.",
    ),

    check(
      "NOT_BROKER_READY",
      claimedConnection
        .readyForBrokerExecution ===
        false,
      "C153 cannot declare broker execution readiness.",
    ),

    check(
      "FOUNDER_ONLY_BOUNDARY",
      claimedConnection
        .safetyBoundary
        .founderOnly ===
        true,
      "Regression route requires Founder Session.",
    ),

    check(
      "AUTOMATIC_EXECUTION_DISABLED",
      claimedConnection
        .safetyBoundary
        .automaticExecutionAllowed ===
        false,
      "Automatic execution remains disabled.",
    ),

    check(
      "SEQUENCE_INTEGRITY",
      claimedConnection
        .methodology
        .requiredSequence
        .join(" → ") ===
        "Research → Selection → Valuation → Backtest → Paper Trade → Human Review → Live Trading Boundary → Broker Integration Boundary → Execution Readiness → Live Trade",
      "C153 preserves the staged research-to-live sequence.",
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
    beforePaper.success &&
    configuredButUnverified.success &&
    claimedConnection.success &&
    claimedConnection.execution
      .liveOrderPlaced ===
      false &&
    claimedConnection.execution
      .tradingExecuted ===
      false &&
    claimedConnection.broker
      .connectionVerified ===
      false &&
    claimedConnection
      .readyForBrokerExecution ===
      false;

  return NextResponse.json(
    {
      success:
        verified,

      verified,

      code:
        verified
          ? "C153_1_1_BROKER_INTEGRATION_BOUNDARY_REGRESSION_PASS"
          : "C153_1_1_BROKER_INTEGRATION_BOUNDARY_REGRESSION_PARTIAL",

      stage:
        "C153.1.1",

      upstream:
        "C153",

      mode:
        "broker-boundary-no-execution",

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
          beforePaper,

        configuredButConnectionUnverified:
          configuredButUnverified,

        callerClaimedConnection:
          claimedConnection,
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
        "C153 defines and verifies a controlled broker-integration boundary. It does not connect a broker, store broker credentials, or place live orders.",

      nextStage:
        "C154",

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
