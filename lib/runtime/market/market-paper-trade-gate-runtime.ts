import {
  runMarketDecisionWorkspace,
} from "./market-decision-workspace-runtime";

import {
  paperTradeMarket,
} from "./paper-trading-engine";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketPaperTradeGateRequest,
  MarketPaperTradeGateResult,
} from "./market-paper-trade-gate-types";

function buildDecisionId(
  symbol: string,
  market: MarketRegion,
): string {
  return [
    "C157",
    market,
    symbol
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9._-]/g,
        "-",
      ),
  ].join(":");
}

function blockedResult(
  request: MarketPaperTradeGateRequest,
  code:
    | "C158_MARKET_PAPER_TRADE_GATE_BLOCKED"
    | "C158_MARKET_PAPER_TRADE_GATE_INSUFFICIENT",
  state:
    | "blocked"
    | "insufficient",
  reason: string,
  startedAt: number,
): MarketPaperTradeGateResult {
  return {
    success: false,

    code,

    state,

    symbol:
      request.symbol,

    market:
      request.market,

    humanDecisionConfirmed:
      request.humanDecisionConfirmed,

    decisionWorkspace: {
      decisionId:
        buildDecisionId(
          request.symbol,
          request.market,
        ),

      state: null,

      reviewStatus: null,

      materialChange:
        false,

      evidenceVerified:
        false,

      sourceCount:
        0,

      independentDomains:
        0,

      evidenceGaps: [
        reason,
      ],

      invalidationConditions: [],
    },

    paperTrading: {
      executed:
        false,

      result:
        null,
    },

    boundary: {
      humanDecisionRequired:
        true,

      recommendationGenerated:
        false,

      decisionAutomaticallyGenerated:
        false,

      taskCreated:
        false,

      plannerDispatched:
        false,

      brokerConnected:
        false,

      liveOrderPlaced:
        false,

      tradingExecuted:
        false,
    },

    upstream: {
      decisionWorkspace:
        "C157.1",

      paperTrading:
        "C151",

      liveTradingBoundary:
        "C152",
    },

    pipeline: [
      "C157 Decision Workspace",
      "Human Decision Confirmation",
      "C158 Paper Trade Gate",
      "C151 Paper Trading",
      "C152 Live Trading Boundary",
    ],

    principles: [
      "C158 never creates a human decision automatically.",
      "A paper trade requires explicit human confirmation.",
      "C158 does not generate buy, sell or hold instructions.",
      "C158 does not create Planner tasks.",
      "C158 does not connect to a broker.",
      "C158 does not place live orders.",
    ],

    disclaimer:
      `Paper trading was blocked: ${reason}`,

    generatedAt:
      new Date().toISOString(),

    latencyMs:
      Date.now() -
      startedAt,
  };
}

export async function runMarketPaperTradeGate(
  request: MarketPaperTradeGateRequest,
): Promise<MarketPaperTradeGateResult> {
  const startedAt =
    Date.now();

  const symbol =
    request.symbol
      .trim()
      .toUpperCase();

  if (!symbol) {
    return blockedResult(
      request,
      "C158_MARKET_PAPER_TRADE_GATE_INSUFFICIENT",
      "insufficient",
      "A valid market symbol is required.",
      startedAt,
    );
  }

  if (
    !request.humanDecisionConfirmed
  ) {
    return blockedResult(
      request,
      "C158_MARKET_PAPER_TRADE_GATE_BLOCKED",
      "blocked",
      "Explicit human decision confirmation is required before paper trading.",
      startedAt,
    );
  }

  if (
    request.order.symbol
      .trim()
      .toUpperCase() !==
    symbol
  ) {
    return blockedResult(
      request,
      "C158_MARKET_PAPER_TRADE_GATE_BLOCKED",
      "blocked",
      "The paper-trade order symbol must match the reviewed Decision Workspace symbol.",
      startedAt,
    );
  }

  if (
    request.order.market !==
    request.market
  ) {
    return blockedResult(
      request,
      "C158_MARKET_PAPER_TRADE_GATE_BLOCKED",
      "blocked",
      "The paper-trade order market must match the reviewed Decision Workspace market.",
      startedAt,
    );
  }

  if (
    !Number.isFinite(
      request.order.quantity,
    ) ||
    request.order.quantity <= 0
  ) {
    return blockedResult(
      request,
      "C158_MARKET_PAPER_TRADE_GATE_INSUFFICIENT",
      "insufficient",
      "Paper-trade quantity must be greater than zero.",
      startedAt,
    );
  }

  /*
   * C157 is the authoritative research/decision
   * workspace immediately upstream of C158.
   *
   * C158 does NOT infer a trade from this result.
   * It only verifies that the explicitly confirmed
   * human action corresponds to an existing research
   * workspace.
   */
  const workspace =
    await runMarketDecisionWorkspace({
      universe: [
        {
          symbol,
          market:
            request.market,
        },
      ],

      query:
        request.query ?? null,
    });

  const item =
    workspace.snapshot.workspaces[0];

  if (!item) {
    return blockedResult(
      request,
      "C158_MARKET_PAPER_TRADE_GATE_INSUFFICIENT",
      "insufficient",
      "No matching C157 Decision Workspace was produced.",
      startedAt,
    );
  }

  /*
   * A blocked research case cannot cross the
   * paper-trade gate.
   */
  if (
    item.state ===
      "blocked" ||
    item.state ===
      "insufficient"
  ) {
    const result =
      blockedResult(
        request,
        "C158_MARKET_PAPER_TRADE_GATE_BLOCKED",
        "blocked",
        `C157 workspace state is ${item.state}. Paper trading gate remains closed.`,
        startedAt,
      );

    result.decisionWorkspace = {
      decisionId:
        item.decisionId,

      state:
        item.state,

      reviewStatus:
        item.reviewStatus,

      materialChange:
        item.materialChange,

      evidenceVerified:
        item.evidence.verified,

      sourceCount:
        item.evidence.sourceCount,

      independentDomains:
        item.evidence
          .independentDomains,

      evidenceGaps:
        item.evidenceGaps,

      invalidationConditions:
        item.invalidationConditions,
    };

    return result;
  }

  /*
   * C158 deliberately does not require a positive
   * research conclusion.
   *
   * The human has explicitly supplied the order.
   * C158 only checks that the research workspace
   * exists and has not been hard-blocked.
   */
  const paper =
    await paperTradeMarket({
      candidates: [
        {
          symbol,
          market:
            request.market,
        },
      ],

      orders: [
        {
          ...request.order,

          symbol,

          market:
            request.market,
        },
      ],

      initialCapital:
        request.initialCapital,

      feeBps:
        request.feeBps,

      slippageBps:
        request.slippageBps,

      query:
        request.query ?? null,

      bars:
        null,
    });

  const success =
    paper.success;

  return {
    success,

    code:
      success
        ? "C158_MARKET_PAPER_TRADE_GATE_PASS"
        : "C158_MARKET_PAPER_TRADE_GATE_PARTIAL",

    state:
      success
        ? "approved-for-paper"
        : "review-required",

    symbol,

    market:
      request.market,

    humanDecisionConfirmed:
      true,

    decisionWorkspace: {
      decisionId:
        item.decisionId,

      state:
        item.state,

      reviewStatus:
        item.reviewStatus,

      materialChange:
        item.materialChange,

      evidenceVerified:
        item.evidence.verified,

      sourceCount:
        item.evidence.sourceCount,

      independentDomains:
        item.evidence
          .independentDomains,

      evidenceGaps:
        item.evidenceGaps,

      invalidationConditions:
        item.invalidationConditions,
    },

    paperTrading: {
      executed:
        true,

      result:
        paper,
    },

    boundary: {
      humanDecisionRequired:
        true,

      recommendationGenerated:
        false,

      decisionAutomaticallyGenerated:
        false,

      taskCreated:
        false,

      plannerDispatched:
        false,

      brokerConnected:
        false,

      liveOrderPlaced:
        false,

      tradingExecuted:
        false,
    },

    upstream: {
      decisionWorkspace:
        "C157.1",

      paperTrading:
        "C151",

      liveTradingBoundary:
        "C152",
    },

    pipeline: [
      "C157 Decision Workspace",
      "Human Decision Confirmation",
      "C158 Paper Trade Gate",
      "C151 Paper Trading",
      "C152 Live Trading Boundary",
    ],

    principles: [
      "C158 requires explicit human confirmation.",
      "C157 research output is not converted into an automatic order.",
      "The submitted order originates from the human request.",
      "C151 remains the only paper-trading execution engine.",
      "C152 remains the live-trading boundary.",
      "No recommendation is generated.",
      "No Planner task is created.",
      "No broker order is placed.",
      "No live trading is executed.",
    ],

    disclaimer:
      "C158 only validates and routes an explicitly human-confirmed simulation order into the existing C151 paper-trading engine. It does not generate investment recommendations or execute live trading.",

    generatedAt:
      new Date().toISOString(),

    latencyMs:
      Date.now() -
      startedAt,
  };
}
