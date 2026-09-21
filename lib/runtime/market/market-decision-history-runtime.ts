import {
  storage,
  getStorageMode,
} from "@/lib/server-storage";

import {
  runMarketDecisionRecord,
} from "./market-decision-record-runtime";

import {
  runMarketReassessment,
} from "./market-reassessment-runtime";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionRecord,
} from "./market-decision-record-types";

import type {
  MarketDecisionHistory,
  MarketDecisionHistoryEntry,
  MarketDecisionHistoryItem,
  MarketDecisionHistoryRequest,
  MarketDecisionHistoryResult,
} from "./market-decision-history-types";

const HISTORY_PREFIX =
  "aios:market:decision-history:v1:";

const DEFAULT_MAX_HISTORY_ENTRIES =
  20;

function normalizeSymbol(
  symbol: string,
): string {
  return symbol
    .trim()
    .toUpperCase();
}

function historyKey(
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

function historyId(
  symbol: string,
  market: MarketRegion,
): string {
  const normalized =
    normalizeSymbol(symbol)
      .replace(
        /[^A-Z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      );

  return [
    "C1479",
    market,
    normalized,
  ].join("-");
}

function normalizeUniverse(
  universe:
    | MarketDecisionHistoryRequest["universe"]
    | undefined,
): Array<{
  symbol: string;
  market: MarketRegion;
}> {
  if (
    !Array.isArray(universe)
  ) {
    return [];
  }

  const seen =
    new Set<string>();

  return universe
    .filter(
      (
        item,
      ): item is {
        symbol: string;
        market: MarketRegion;
      } =>
        Boolean(
          item &&
            typeof item.symbol ===
              "string" &&
            item.symbol.trim() &&
            (
              item.market === "us" ||
              item.market === "hk" ||
              item.market === "cn"
            ),
        ),
    )
    .map(
      (item) => ({
        symbol:
          item.symbol.trim(),

        market:
          item.market,
      }),
    )
    .filter(
      (item) => {
        const key =
          [
            item.market,
            normalizeSymbol(
              item.symbol,
            ),
          ].join(":");

        if (
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        return true;
      },
    );
}

async function loadHistory(
  symbol: string,
  market: MarketRegion,
): Promise<
  MarketDecisionHistory | null
> {
  return storage.get<
    MarketDecisionHistory
  >(
    historyKey(
      symbol,
      market,
    ),
  );
}

async function saveHistory(
  history: MarketDecisionHistory,
): Promise<void> {
  await storage.set(
    historyKey(
      history.symbol,
      history.market,
    ),
    history,
  );
}

export async function resetMarketDecisionHistory(
  symbol: string,
  market: MarketRegion,
): Promise<void> {
  await storage.delete(
    historyKey(
      symbol,
      market,
    ),
  );
}

function buildHistoryItem(
  currentRecord: MarketDecisionRecord,
  previousRecord:
    | MarketDecisionRecord
    | null,
  reassessment:
    | MarketDecisionHistoryItem["reassessment"],
  version: number,
  historyLength: number,
): MarketDecisionHistoryItem {
  return {
    symbol:
      currentRecord.symbol,

    market:
      currentRecord.market,

    version,

    previousRecordId:
      previousRecord?.recordId ??
      null,

    currentRecordId:
      currentRecord.recordId,

    historyLength,

    currentRecord,

    previousRecord,

    reassessment,

    firstObservation:
      previousRecord === null,

    humanDecisionRequired:
      true,
  };
}

async function persistRecord(
  currentRecord: MarketDecisionRecord,
  maxHistoryEntries: number,
): Promise<MarketDecisionHistoryItem> {
  const existing =
    await loadHistory(
      currentRecord.symbol,
      currentRecord.market,
    );

  const previousRecord =
    existing
      ?.entries[
        existing.entries.length -
          1
      ]
      ?.record ??
    null;

  const reassessment =
    previousRecord
      ? runMarketReassessment({
          previousRecord,
          currentRecord,
        }).reassessment
      : null;

  const nextVersion =
    (existing?.version ?? 0) +
    1;

  const entry:
    MarketDecisionHistoryEntry =
    {
      version:
        nextVersion,

      record:
        currentRecord,

      reassessment,

      savedAt:
        new Date().toISOString(),
    };

  const limit =
    Math.max(
      1,
      Math.min(
        maxHistoryEntries,
        100,
      ),
    );

  const entries = [
    ...(existing?.entries ?? []),
    entry,
  ].slice(-limit);

  const history:
    MarketDecisionHistory =
    {
      historyId:
        existing?.historyId ??
        historyId(
          currentRecord.symbol,
          currentRecord.market,
        ),

      symbol:
        currentRecord.symbol,

      market:
        currentRecord.market,

      version:
        nextVersion,

      entries,

      latestRecordId:
        currentRecord.recordId,

      updatedAt:
        new Date().toISOString(),
    };

  await saveHistory(
    history,
  );

  return buildHistoryItem(
    currentRecord,
    previousRecord,
    reassessment,
    nextVersion,
    entries.length,
  );
}

export async function runMarketDecisionHistory(
  request:
    MarketDecisionHistoryRequest,
): Promise<MarketDecisionHistoryResult> {
  const startedAt =
    Date.now();

  const universe =
    normalizeUniverse(
      request?.universe,
    );

  const maxHistoryEntries =
    request?.maxHistoryEntries ??
    DEFAULT_MAX_HISTORY_ENTRIES;

  if (
    universe.length ===
    0
  ) {
    return {
      success: false,

      code:
        "C147_9_DECISION_HISTORY_INSUFFICIENT",

      universeSize: 0,

      evaluatedCount: 0,

      firstObservationCount: 0,

      reassessedCount: 0,

      blockedCount: 0,

      items: [],

      principles: [
        "Decision history requires at least one valid market instrument.",
        "Historical records are keyed by market and security identity.",
        "Human review remains mandatory.",
      ],

      humanDecisionRequired:
        true,

      storage: {
        mode:
          getStorageMode(),

        persistent:
          getStorageMode() ===
          "redis",
      },

      runtime: {
        name:
          "market-decision-history-runtime",

        version:
          "C147.9",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      disclaimer:
        "Decision history preserves structured research records and reassessment events. It does not provide personalized investment advice or execute trades.",
    };
  }

  const decisionRecordResult =
    await runMarketDecisionRecord({
      universe,

      includeExcluded:
        true,

      includeInsufficientData:
        true,

      query:
        request?.query ??
        null,
    });

  const items:
    MarketDecisionHistoryItem[] =
    [];

  for (
    const record of
      decisionRecordResult.records
  ) {
    items.push(
      await persistRecord(
        record,
        maxHistoryEntries,
      ),
    );
  }

  const firstObservationCount =
    items.filter(
      (item) =>
        item.firstObservation,
    ).length;

  const reassessedCount =
    items.filter(
      (item) =>
        Boolean(
          item.reassessment,
        ),
    ).length;

  const blockedCount =
    items.filter(
      (item) =>
        item.currentRecord
          .reviewStatus ===
        "blocked",
    ).length;

  let code:
    | "C147_9_DECISION_HISTORY_PASS"
    | "C147_9_DECISION_HISTORY_PARTIAL"
    | "C147_9_DECISION_HISTORY_INSUFFICIENT";

  if (
    items.length ===
    0
  ) {
    code =
      "C147_9_DECISION_HISTORY_INSUFFICIENT";
  } else if (
    blockedCount >
    0
  ) {
    code =
      "C147_9_DECISION_HISTORY_PARTIAL";
  } else {
    code =
      "C147_9_DECISION_HISTORY_PASS";
  }

  return {
    success:
      code !==
      "C147_9_DECISION_HISTORY_INSUFFICIENT",

    code,

    universeSize:
      universe.length,

    evaluatedCount:
      items.length,

    firstObservationCount,

    reassessedCount,

    blockedCount,

    items,

    principles: [
      "Decision history preserves prior decision records instead of replacing them.",
      "History continuity is isolated by market and security identity.",
      "Each new observation can be reassessed against the immediately preceding record.",
      "C147.8 reassessment remains the source of change classification.",
      "Material changes and invalidation risk remain visible.",
      "Historical storage does not create a ranking or prediction.",
      "Human review remains mandatory.",
      "No buy, sell, hold, target price, probability, or automated trading action is generated.",
    ],

    humanDecisionRequired:
      true,

    storage: {
      mode:
        getStorageMode(),

      persistent:
        getStorageMode() ===
        "redis",
    },

    runtime: {
      name:
        "market-decision-history-runtime",

      version:
        "C147.9",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    disclaimer:
      "This continuity layer stores structured market decision records and links consecutive observations through C147.8 reassessment. It does not rank securities, predict outcomes, provide personalized investment advice, or execute trades.",
  };
}
