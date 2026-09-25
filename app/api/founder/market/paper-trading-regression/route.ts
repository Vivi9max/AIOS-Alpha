import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireFounderAccess,
} from "@/lib/auth/founder";

import {
  paperTradeMarket,
} from "@/lib/runtime/market/paper-trading-engine";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface RegressionCheck {
  name: string;
  passed: boolean;
  detail: string;
}

function check(
  name: string,
  passed: boolean,
  detail: string,
): RegressionCheck {
  return {
    name,
    passed,
    detail,
  };
}

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  const access =
    requireFounderAccess(
      request,
    );

  if (
    !access.authorized
  ) {
    return access.response;
  }

  const checks: RegressionCheck[] =
    [];

  try {
    /*
     * C151.1.1 uses explicit deterministic
     * simulation prices.
     *
     * This deliberately avoids depending on
     * AllTick realtime availability.
     *
     * Test sequence:
     *
     * 1. Buy 100 AAPL at 100.
     * 2. Sell 40 AAPL at 110.
     * 3. Attempt to sell 100 AAPL at 110.
     *
     * The third order must be rejected because
     * only 60 shares remain.
     */
    const result =
      await paperTradeMarket({
        candidates: [
          {
            symbol:
              "AAPL",

            market:
              "us",

            name:
              "C151 deterministic regression candidate",
          },
        ],

        orders: [
          {
            symbol:
              "AAPL",

            market:
              "us",

            side:
              "buy",

            quantity:
              100,

            price:
              100,

            timestamp:
              "2026-01-02T10:00:00.000Z",

            reason:
              "C151.1.1 deterministic buy test",
          },

          {
            symbol:
              "AAPL",

            market:
              "us",

            side:
              "sell",

            quantity:
              40,

            price:
              110,

            timestamp:
              "2026-01-02T11:00:00.000Z",

            reason:
              "C151.1.1 deterministic partial exit test",
          },

          {
            symbol:
              "AAPL",

            market:
              "us",

            side:
              "sell",

            quantity:
              100,

            price:
              110,

            timestamp:
              "2026-01-02T12:00:00.000Z",

            reason:
              "C151.1.1 deterministic insufficient-position test",
          },
        ],

        initialCapital:
          100000,

        feeBps:
          10,

        slippageBps:
          20,

        query:
          "C151.1.1 deterministic paper trading regression",

        bars:
          null,
      });

    const filled =
      result.trades.filter(
        (trade) =>
          trade.status ===
          "filled",
      );

    const rejected =
      result.trades.filter(
        (trade) =>
          trade.status ===
          "rejected",
      );

    const position =
      result.account.positions.find(
        (item) =>
          item.symbol ===
          "AAPL.US",
      );

    const explicitPricing =
      result.candidates.every(
        (candidate) =>
          candidate.data.priceSource ===
          "explicit-order",
      );

    const allSimulationTrades =
      result.trades.every(
        (trade) =>
          trade.status ===
            "filled" ||
          trade.status ===
            "rejected",
      );

    const frictionApplied =
      result.metrics.totalFees >
        0 &&
      result.metrics.totalSlippage >
        0;

    const equityChanged =
      Number.isFinite(
        result.account.equity,
      ) &&
      result.account.equity !==
        result.account.initialCapital;

    const positionQuantityCorrect =
      position !== null &&
      position.quantity ===
        60;

    const rejectionCorrect =
      rejected.length ===
        1 &&
      rejected[0]?.rejectionReason
        ?.toLowerCase()
        .includes(
          "position",
        ) === true;

    const executionCountCorrect =
      filled.length ===
        2 &&
      rejected.length ===
        1;

    const equityCurvePresent =
      result.equityCurve.length ===
      3;

    const safety =
      result.safetyBoundary;

    checks.push(
      check(
        "DETERMINISTIC_PRICE_SOURCE",
        explicitPricing,
        explicitPricing
          ? "All regression orders used explicit deterministic simulation prices."
          : "At least one regression order did not use the explicit-order pricing path.",
      ),
    );

    checks.push(
      check(
        "BUY_SELL_EXECUTION",
        executionCountCorrect,
        `Filled=${filled.length}; Rejected=${rejected.length}; expected 2 filled + 1 rejected.`,
      ),
    );

    checks.push(
      check(
        "POSITION_ACCOUNTING",
        positionQuantityCorrect,
        `Remaining AAPL.US quantity=${position?.quantity ?? "none"}; expected 60 after buying 100 and selling 40.`,
      ),
    );

    checks.push(
      check(
        "INSUFFICIENT_POSITION_REJECTION",
        rejectionCorrect,
        rejectionCorrect
          ? "The third sell order was rejected because the virtual position was insufficient."
          : "The insufficient-position order did not produce the expected rejection.",
      ),
    );

    checks.push(
      check(
        "FEES_AND_SLIPPAGE",
        frictionApplied,
        `Fees=${result.metrics.totalFees}; Slippage=${result.metrics.totalSlippage}.`,
      ),
    );

    checks.push(
      check(
        "EQUITY_ACCOUNTING",
        equityChanged,
        `Initial equity=${result.account.initialCapital}; final equity=${result.account.equity}.`,
      ),
    );

    checks.push(
      check(
        "EQUITY_CURVE",
        equityCurvePresent,
        `Equity curve points=${result.equityCurve.length}; expected 3.`,
      ),
    );

    checks.push(
      check(
        "TRADE_STATE_INTEGRITY",
        allSimulationTrades,
        "All generated trades remain within the virtual filled/rejected state model.",
      ),
    );

    checks.push(
      check(
        "BROKER_DISCONNECTED",
        safety.brokerConnected ===
          false,
        `brokerConnected=${String(
          safety.brokerConnected,
        )}`,
      ),
    );

    checks.push(
      check(
        "NO_LIVE_ORDER",
        safety.liveOrderPlaced ===
          false,
        `liveOrderPlaced=${String(
          safety.liveOrderPlaced,
        )}`,
      ),
    );

    checks.push(
      check(
        "NO_TRADING_EXECUTION",
        safety.tradingExecuted ===
          false,
        `tradingExecuted=${String(
          safety.tradingExecuted,
        )}`,
      ),
    );

    checks.push(
      check(
        "NO_PLANNER_DISPATCH",
        safety.plannerDispatched ===
          false,
        `plannerDispatched=${String(
          safety.plannerDispatched,
        )}`,
      ),
    );

    checks.push(
      check(
        "HUMAN_REVIEW_GATE",
        safety.humanReviewRequiredBeforeLiveTrading ===
          true,
        `humanReviewRequiredBeforeLiveTrading=${String(
          safety.humanReviewRequiredBeforeLiveTrading,
        )}`,
      ),
    );

    checks.push(
      check(
        "FOUNDER_ONLY_BOUNDARY",
        safety.founderOnly ===
          true,
        `founderOnly=${String(
          safety.founderOnly,
        )}`,
      ),
    );

    checks.push(
      check(
        "SIMULATION_ONLY_BOUNDARY",
        safety.simulationOnly ===
          true,
        `simulationOnly=${String(
          safety.simulationOnly,
        )}`,
      ),
    );

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
      result.success &&
      result.code ===
        "C151_PAPER_TRADING_PASS";

    return NextResponse.json(
      {
        success:
          verified,

        code:
          verified
            ? "C151_1_1_PAPER_TRADING_REGRESSION_PASS"
            : "C151_1_1_PAPER_TRADING_REGRESSION_PARTIAL",

        stage:
          "C151.1.1",

        verified,

        passed,

        failed,

        total:
          checks.length,

        verificationMode:
          "deterministic-paper-execution",

        source:
          "explicit-order-price",

        upstream:
          "C151",

        engineCode:
          result.code,

        requestedOrders:
          result.requestedOrders,

        filledOrders:
          result.filledOrders,

        rejectedOrders:
          result.rejectedOrders,

        initialCapital:
          result.account.initialCapital,

        finalCash:
          result.account.cash,

        finalEquity:
          result.account.equity,

        remainingPosition:
          position
            ? {
                symbol:
                  position.symbol,

                quantity:
                  position.quantity,

                averageEntryPrice:
                  position.averageEntryPrice,

                lastPrice:
                  position.lastPrice,

                realizedPnl:
                  position.realizedPnl,

                unrealizedPnl:
                  position.unrealizedPnl,

                totalPnl:
                  position.totalPnl,
              }
            : null,

        totalFees:
          result.metrics.totalFees,

        totalSlippage:
          result.metrics.totalSlippage,

        equityCurvePoints:
          result.equityCurve.length,

        checks,

        safetyBoundary:
          {
            founderAuthRequired:
              true,

            founderOnly:
              true,

            simulationOnly:
              true,

            brokerConnected:
              false,

            tradingExecuted:
              false,

            liveOrderPlaced:
              false,

            plannerDispatched:
              false,

            humanReviewRequiredBeforeLiveTrading:
              true,
          },

        principle:
          "C151 is a virtual execution environment only. A passing regression proves simulation accounting and safety boundaries, not broker connectivity or live trading readiness.",

        nextStage:
          "C152",

        latencyMs:
          Date.now() -
          startedAt,

        generatedAt:
          new Date().toISOString(),
      },
      {
        status:
          verified
            ? 200
            : 422,

        headers: {
          "Cache-Control":
            "no-store",

          "Content-Type":
            "application/json; charset=utf-8",
        },
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
          "C151_1_1_PAPER_TRADING_REGRESSION_ERROR",

        stage:
          "C151.1.1",

        verified:
          false,

        passed:
          0,

        failed:
          1,

        total:
          1,

        verificationMode:
          "deterministic-paper-execution",

        error:
          error instanceof Error
            ? error.message
            : "C151.1.1 paper trading regression failed.",

        safetyBoundary: {
          founderAuthRequired:
            true,

          founderOnly:
            true,

          simulationOnly:
            true,

          brokerConnected:
            false,

          tradingExecuted:
            false,

          liveOrderPlaced:
            false,

          plannerDispatched:
            false,

          humanReviewRequiredBeforeLiveTrading:
            true,
        },

        latencyMs:
          Date.now() -
          startedAt,

        generatedAt:
          new Date().toISOString(),
      },
      {
        status: 500,
      },
    );
  }
}
