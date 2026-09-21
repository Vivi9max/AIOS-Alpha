import {
  storage,
  getStorageMode,
} from "@/lib/server-storage";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionHistory,
  MarketDecisionHistoryEntry,
} from "./market-decision-history-types";

import type {
  MarketDecisionHistoryQueryRequest,
  MarketDecisionHistoryQueryResult,
  MarketDecisionHistoryTimelineEntry,
} from "./market-decision-history-query-types";

const HISTORY_PREFIX =
  "aios:market:decision-history:v1:";

function normalizeSymbol(
  symbol: string,
): string {
  return symbol
    .trim()
    .toUpperCase();
}

function buildHistoryKey(
  symbol: string,
  market: MarketRegion,
): string {
  return [
    HISTORY_PREFIX,
    market,
    ":",
    normalizeSymbol(symbol),
  ].join("");
}

function isValidMarket(
  value: unknown,
): value is MarketRegion {
  return (
    value === "us" ||
    value === "hk" ||
    value === "cn"
  );
}

function normalizeLimit(
  value: number | undefined,
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

function mapTimelineEntry(
  entry: MarketDecisionHistoryEntry,
  includeReassessment: boolean,
): MarketDecisionHistoryTimelineEntry {
  return {
    version:
      entry.version,

    recordId:
      entry.record.recordId,

    symbol:
      entry.record.symbol,

    market:
      entry.record.market,

    state:
      entry.record.state,

    reviewStatus:
      entry.record.reviewStatus,

    generatedAt:
      entry.record.generatedAt,

    savedAt:
      entry.savedAt,

    reassessment:
      includeReassessment
        ? entry.reassessment
        : null,

    humanDecisionRequired:
      true,
  };
}

export async function runMarketDecisionHistoryQuery(
  request:
    MarketDecisionHistoryQueryRequest,
): Promise<MarketDecisionHistoryQueryResult> {
  const startedAt =
    Date.now();

  const symbol =
    typeof request?.symbol ===
      "string"
      ? normalizeSymbol(
          request.symbol,
        )
      : "";

  const market =
    request?.market;

  const includeReassessment =
    request?.includeReassessment !==
    false;

  const limit =
    normalizeLimit(
      request?.limit,
    );

  const emptyResult = (
    code:
      | "C147_10_HISTORY_QUERY_EMPTY"
      | "C147_10_HISTORY_QUERY_INSUFFICIENT",
  ): MarketDecisionHistoryQueryResult => ({
    success:
      code ===
      "C147_10_HISTORY_QUERY_EMPTY",

    code,

    historyFound:
      false,

    historyId:
      null,

    symbol,

    market:
      isValidMarket(
        market,
      )
        ? market
        : "us",

    currentVersion:
      0,

    totalVersions:
      0,

    entries: [],

    latestRecordId:
      null,

    storage: {
      mode:
        getStorageMode(),

      persistent:
        getStorageMode() ===
        "redis",
    },

    humanDecisionRequired:
      true,

    readOnly:
      true,

    runtime: {
      name:
        "market-decision-history-query-runtime",

      version:
        "C147.10",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "This endpoint is read-only. It retrieves persisted market decision history and does not create a new market decision, reassessment, order, ranking, or prediction.",
  });

  if (
    !symbol ||
    !isValidMarket(
      market,
    )
  ) {
    return emptyResult(
      "C147_10_HISTORY_QUERY_INSUFFICIENT",
    );
  }

  const key =
    buildHistoryKey(
      symbol,
      market,
    );

  const history =
    await storage.get<
      MarketDecisionHistory
    >(key);

  if (
    !history ||
    !Array.isArray(
      history.entries,
    )
  ) {
    return emptyResult(
      "C147_10_HISTORY_QUERY_EMPTY",
    );
  }

  const entries =
    history.entries
      .slice(-limit)
      .map(
        (entry) =>
          mapTimelineEntry(
            entry,
            includeReassessment,
          ),
      );

  return {
    success:
      true,

    code:
      "C147_10_HISTORY_QUERY_PASS",

    historyFound:
      true,

    historyId:
      history.historyId,

    symbol:
      history.symbol,

    market:
      history.market,

    currentVersion:
      history.version,

    totalVersions:
      history.entries.length,

    entries,

    latestRecordId:
      history.latestRecordId,

    storage: {
      mode:
        getStorageMode(),

      persistent:
        getStorageMode() ===
        "redis",
    },

    humanDecisionRequired:
      true,

    readOnly:
      true,

    runtime: {
      name:
        "market-decision-history-query-runtime",

      version:
        "C147.10",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "This endpoint reads persisted decision history only. It does not create a new version, alter stored records, rank securities, predict outcomes, provide personalized investment advice, or execute trades.",
  };
}
