import {
  getMarketResearchInvalidationLedger,
  getMarketResearchInvalidationLedgerIndex,
} from "./market-research-invalidation-ledger-runtime";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketResearchInvalidationLedgerHistoryRequest,
  MarketResearchInvalidationLedgerHistoryResult,
  MarketResearchInvalidationLedgerHistoryItem,
} from "./market-research-invalidation-ledger-history-types";

function normalizeSymbol(
  value: unknown,
): string {
  return typeof value === "string"
    ? value
        .trim()
        .toUpperCase()
        .slice(0, 32)
    : "";
}

function normalizeMarket(
  value: unknown,
): MarketRegion | null {
  if (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  ) {
    return value;
  }

  return null;
}

function normalizeLimit(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 20;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(value),
      100,
    ),
  );
}

function boundary() {
  return {
    automaticInvalidationEvaluation:
      false as const,

    decisionAutomaticallyGenerated:
      false as const,

    decisionRecorded:
      false as const,

    taskCreated:
      false as const,

    plannerDispatched:
      false as const,

    brokerConnected:
      false as const,

    liveOrderPlaced:
      false as const,

    tradingExecuted:
      false as const,
  };
}

function principles(): string[] {
  return [
    "C161.2 reads the persistent C161.1 Ledger Index.",
    "History lookup never scans Redis or Memory storage.",
    "Each index entry is resolved through the existing C161.1 Ledger read boundary.",
    "History is descriptive and traceable, not predictive.",
    "Historical invalidation conditions are preserved exactly as stored.",
    "Human review remains mandatory.",
    "No invalidation condition is automatically evaluated.",
    "No recommendation is generated.",
    "No decision is recorded.",
    "No Planner task is created.",
    "No broker is connected.",
    "No live trading is executed.",
  ];
}

export async function runMarketResearchInvalidationLedgerHistory(
  request:
    MarketResearchInvalidationLedgerHistoryRequest = {},
): Promise<MarketResearchInvalidationLedgerHistoryResult> {
  const startedAt =
    Date.now();

  const symbol =
    normalizeSymbol(
      request.symbol,
    );

  const market =
    normalizeMarket(
      request.market,
    );

  const limit =
    normalizeLimit(
      request.limit,
    );

  const index =
    await getMarketResearchInvalidationLedgerIndex();

  let entries =
    index.entries;

  if (symbol) {
    entries =
      entries.filter(
        (entry) =>
          entry.symbol ===
          symbol,
      );
  }

  if (market) {
    entries =
      entries.filter(
        (entry) =>
          entry.market ===
          market,
      );
  }

  entries =
    [...entries]
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt,
          ),
      )
      .slice(0, limit);

  const items:
    MarketResearchInvalidationLedgerHistoryItem[] =
    [];

  for (
    const entry of entries
  ) {
    const ledger =
      await getMarketResearchInvalidationLedger(
        entry.ledgerId,
      );

    if (!ledger) {
      continue;
    }

    items.push({
      ledgerId:
        entry.ledgerId,

      symbol:
        ledger.symbol,

      market:
        ledger.market,

      status:
        ledger.status,

      sourceGeneratedAt:
        ledger.sourceGeneratedAt,

      createdAt:
        ledger.createdAt,

      updatedAt:
        ledger.updatedAt,

      ledger,
    });
  }

  const code =
    items.length > 0
      ? "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_PASS"
      : entries.length === 0
        ? "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_EMPTY"
        : "C161_2_RESEARCH_INVALIDATION_LEDGER_HISTORY_INSUFFICIENT";

  return {
    success:
      items.length > 0,

    code,

    symbol:
      symbol || null,

    market,

    total:
      items.length,

    items,

    index: {
      version: 1,

      entryCount:
        index.entries.length,

      updatedAt:
        index.updatedAt,
    },

    humanReviewRequired:
      true,

    boundary:
      boundary(),

    runtime: {
      name:
        "market-research-invalidation-ledger-history-runtime",

      version:
        "C161.2",

      upstream:
        "C161.1",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles:
      principles(),

    disclaimer:
      "C161.2 provides persistent traceability for C161.1 research invalidation ledgers. It does not automatically evaluate invalidation conditions, generate recommendations, record decisions, dispatch Planner work, or execute trading.",
  };
}
