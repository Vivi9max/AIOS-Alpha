import {
  runMarketPaperTradeGate,
} from "./market-paper-trade-gate-runtime";

export async function runMarketPaperTradeGateRegression() {
  const startedAt =
    Date.now();

  const checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }> = [];

  /*
   * Explicit human confirmation is intentionally
   * supplied here.
   *
   * This regression does NOT ask AIOS to decide
   * whether the trade should exist.
   *
   * The purpose is to verify the boundary:
   *
   * Human confirmation
   * → C158
   * → C151 simulation
   * → no C152/live execution.
   */

  const result =
    await runMarketPaperTradeGate({
      symbol:
        "AAPL",

      market:
        "us",

      humanDecisionConfirmed:
        true,

      order: {
        symbol:
          "AAPL",

        market:
          "us",

        side:
          "buy",

        quantity:
          10,

        price:
          100,

        timestamp:
          "2026-01-02T10:00:00.000Z",

        reason:
          "C158 deterministic human-confirmed paper simulation",
      },

      initialCapital:
        100000,

      feeBps:
        5,

      slippageBps:
        5,

      query:
        "C158 deterministic regression",
    });

  checks.push({
    name:
      "RUNTIME_COMPLETED",

    passed:
      result.success ===
        true,

    detail:
      `C158 code=${result.code}`,
  });

  checks.push({
    name:
      "HUMAN_CONFIRMATION_REQUIRED",

    passed:
      result.humanDecisionConfirmed ===
        true,

    detail:
      `humanDecisionConfirmed=${String(
        result.humanDecisionConfirmed,
      )}`,
  });

  checks.push({
    name:
      "C157_UPSTREAM",

    passed:
      result.upstream
        .decisionWorkspace ===
      "C157.1",

    detail:
      "C157.1 Decision Workspace is upstream.",
  });

  checks.push({
    name:
      "C151_UPSTREAM",

    passed:
      result.upstream
        .paperTrading ===
      "C151",

    detail:
      "C151 remains the paper-trading engine.",
  });

  checks.push({
    name:
      "PAPER_EXECUTED",

    passed:
      result.paperTrading
        .executed ===
      true,

    detail:
      `paperExecuted=${String(
        result.paperTrading.executed,
      )}`,
  });

  checks.push({
    name:
      "NO_RECOMMENDATION",

    passed:
      result.boundary
        .recommendationGenerated ===
        false,

    detail:
      "No investment recommendation was generated.",
  });

  checks.push({
    name:
      "NO_AUTOMATIC_DECISION",

    passed:
      result.boundary
        .decisionAutomaticallyGenerated ===
        false,

    detail:
      "Decision was not automatically generated.",
  });

  checks.push({
    name:
      "NO_TASK",

    passed:
      result.boundary
        .taskCreated ===
      false,

    detail:
      "No Task was created.",
  });

  checks.push({
    name:
      "NO_PLANNER",

    passed:
      result.boundary
        .plannerDispatched ===
      false,

    detail:
      "Planner was not dispatched.",
  });

  checks.push({
    name:
      "BROKER_DISCONNECTED",

    passed:
      result.boundary
        .brokerConnected ===
      false,

    detail:
      "Broker remains disconnected.",
  });

  checks.push({
    name:
      "NO_LIVE_ORDER",

    passed:
      result.boundary
        .liveOrderPlaced ===
      false,

    detail:
      "No live order was placed.",
  });

  checks.push({
    name:
      "NO_LIVE_TRADING",

    passed:
      result.boundary
        .tradingExecuted ===
      false,

    detail:
      "No live trading was executed.",
  });

  checks.push({
    name:
      "C151_RESULT_PRESENT",

    passed:
      result.paperTrading
        .result !== null,

    detail:
      "C151 paper-trading result is present.",
  });

  /*
   * Verify the negative boundary:
   * without explicit human confirmation,
   * C158 must never enter C151.
   */
  const blocked =
    await runMarketPaperTradeGate({
      symbol:
        "AAPL",

      market:
        "us",

      humanDecisionConfirmed:
        false,

      order: {
        symbol:
          "AAPL",

        market:
          "us",

        side:
          "buy",

        quantity:
          10,

        price:
          100,
      },
    });

  checks.push({
    name:
      "NO_CONFIRMATION_BLOCKS_GATE",

    passed:
      blocked.success ===
        false &&
      blocked.paperTrading
        .executed ===
        false,

    detail:
      `blocked=${String(
        !blocked.success,
      )}; paperExecuted=${String(
        blocked.paperTrading.executed,
      )}`,
  });

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
        ? "C158_MARKET_PAPER_TRADE_GATE_REGRESSION_PASS"
        : "C158_MARKET_PAPER_TRADE_GATE_REGRESSION_FAIL",

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
