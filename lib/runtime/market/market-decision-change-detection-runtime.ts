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
import {
  buildObservationFingerprint,
} from "./market-decision-observation-runtime";
import type {
  MarketRegion,
} from "./market-types";
import type {
  MarketDecisionRecord,
} from "./market-decision-record-types";
import type {
  MarketDecisionHistory,
} from "./market-decision-history-types";
import type {
  MarketReassessmentResult,
} from "./market-reassessment-types";
import type {
  MarketDecisionChangeDetectionRequest,
  MarketDecisionChangeDetectionItem,
  MarketDecisionChangeDetectionResult,
} from "./market-decision-change-detection-types";
const HISTORY_PREFIX =
  "aios:market:decision-history:v1:";
const DISCLAIMER =
  "C147.12 detects changes between the latest persisted market decision observation and the current decision record. It is read-only and does not mutate history, rank securities, predict outcomes, provide personalized investment advice, or execute trades.";
function normalizeSymbol(
  symbol: string,
): string {
  return symbol
    .trim()
    .toUpperCase();
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
function buildHistoryKey(
  symbol: string,
  market: MarketRegion,
): string {
  return (
    HISTORY_PREFIX +
    market +
    ":" +
    normalizeSymbol(symbol)
  );
}
async function loadHistory(
  symbol: string,
  market: MarketRegion,
): Promise<MarketDecisionHistory | null> {
  return storage.get<MarketDecisionHistory>(
    buildHistoryKey(
      symbol,
      market,
    ),
  );
}
function getLatestEntry(
  history: MarketDecisionHistory | null,
) {
  if (
    !history ||
    !Array.isArray(history.entries) ||
    history.entries.length === 0
  ) {
    return null;
  }
  return (
    history.entries[
      history.entries.length - 1
    ] ?? null
  );
}
function getLatestRecord(
  history: MarketDecisionHistory | null,
): MarketDecisionRecord | null {
  return (
    getLatestEntry(history)
      ?.record ?? null
  );
}
function getLatestFingerprint(
  history: MarketDecisionHistory | null,
): string | null {
  const entry =
    getLatestEntry(history);
  if (!entry) {
    return null;
  }
  const stored =
    entry.observationFingerprint;
  if (
    typeof stored === "string" &&
    stored.length > 0
  ) {
    return stored;
  }
  return buildObservationFingerprint(
    entry.record,
  );
}
/**
 * C147.12
 *
 * Interpret the REAL C147.8 reassessment
 * union without introducing a new changeType.
 *
 * Real C147.8 values:
 * - no-material-change
 * - assessment-change
 * - invalidation-risk
 * - insufficient-data
 */
function isMaterialReassessment(
  reassessment:
    MarketReassessmentResult | null,
): boolean {
  if (!reassessment) {
    return false;
  }
  if (
    reassessment.changeType ===
    "insufficient-data"
  ) {
    return false;
  }
  if (
    reassessment.changeType ===
    "invalidation-risk"
  ) {
    return true;
  }
  if (
    reassessment.changeType ===
    "assessment-change"
  ) {
    return (
      reassessment.materialChanges.length >
        0 ||
      reassessment.changedWatchMetrics.length >
        0 ||
      reassessment.whatChanged.length >
        0 ||
      reassessment.triggeredInvalidationConditions.length >
        0
    );
  }
  return false;
}
function buildItem(
  currentRecord: MarketDecisionRecord,
  history: MarketDecisionHistory | null,
  previousRecord: MarketDecisionRecord | null,
  previousFingerprint: string | null,
  currentFingerprint: string,
  action:
    | "no-history"
    | "no-material-change"
    | "reassessment-required"
    | "blocked",
  observationChanged: boolean,
  materialChange: boolean,
  reassessment:
    MarketReassessmentResult | null,
): MarketDecisionChangeDetectionItem {
  return {
    symbol:
      normalizeSymbol(
        currentRecord.symbol,
      ),
    market:
      currentRecord.market,
    action,
    observationFingerprint:
      currentFingerprint,
    previousFingerprint,
    previousVersion:
      history?.version ?? 0,
    currentVersion:
      history?.version ?? 0,
    observationChanged,
    materialChange,
    previousRecordId:
      previousRecord?.recordId ??
      null,
    currentRecordId:
      currentRecord.recordId,
    currentRecord,
    reassessment,
    humanDecisionRequired:
      true,
    mutationPerformed:
      false,
  };
}
export async function runMarketDecisionChangeDetection(
  request:
    MarketDecisionChangeDetectionRequest,
): Promise<MarketDecisionChangeDetectionResult> {
  const startedAt =
    Date.now();
  const storageMode =
    getStorageMode();
  const universe =
    Array.isArray(
      request?.universe,
    )
      ? request.universe.filter(
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
                isValidMarket(
                  item.market,
                ),
            ),
        )
      : [];
  if (
    universe.length === 0
  ) {
    return {
      success: false,
      code:
        "C147_12_CHANGE_DETECTION_INSUFFICIENT",
      universeSize: 0,
      evaluatedCount: 0,
      changedCount: 0,
      reassessmentRequiredCount: 0,
      noMaterialChangeCount: 0,
      noHistoryCount: 0,
      blockedCount: 0,
      mutationPerformed:
        false,
      items: [],
      principles: [
        "At least one valid market instrument is required.",
        "Change detection is read-only.",
        "The C147.11 mutation path is not called.",
        "Human review remains mandatory.",
      ],
      humanDecisionRequired:
        true,
      storage: {
        mode:
          storageMode,
        persistent:
          storageMode ===
          "redis",
      },
      runtime: {
        name:
          "market-decision-change-detection-runtime",
        version:
          "C147.12",
        generatedAt:
          new Date().toISOString(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      disclaimer:
        DISCLAIMER,
    };
  }
  const decisionResult =
    await runMarketDecisionRecord({
      universe,
      includeExcluded:
        request?.includeExcluded ??
        true,
      includeInsufficientData:
        request?.includeInsufficientData ??
        true,
      query:
        request?.query ??
        null,
    });
  const items:
    MarketDecisionChangeDetectionItem[] =
    [];
  for (
    const currentRecord of
      decisionResult.records
  ) {
    const symbol =
      normalizeSymbol(
        currentRecord.symbol,
      );
    const market =
      currentRecord.market;
    const history =
      await loadHistory(
        symbol,
        market,
      );
    const previousRecord =
      getLatestRecord(
        history,
      );
    const previousFingerprint =
      getLatestFingerprint(
        history,
      );
    const currentFingerprint =
      buildObservationFingerprint(
        currentRecord,
      );
    const observationChanged =
      previousFingerprint === null ||
      previousFingerprint !==
        currentFingerprint;
    const blocked =
      currentRecord.reviewStatus ===
        "blocked" ||
      currentRecord.state ===
        "insufficient-data";
    if (!previousRecord) {
      items.push(
        buildItem(
          currentRecord,
          history,
          null,
          null,
          currentFingerprint,
          blocked
            ? "blocked"
            : "no-history",
          true,
          false,
          null,
        ),
      );
      continue;
    }
    if (blocked) {
      items.push(
        buildItem(
          currentRecord,
          history,
          previousRecord,
          previousFingerprint,
          currentFingerprint,
          "blocked",
          observationChanged,
          false,
          null,
        ),
      );
      continue;
    }
    if (!observationChanged) {
      items.push(
        buildItem(
          currentRecord,
          history,
          previousRecord,
          previousFingerprint,
          currentFingerprint,
          "no-material-change",
          false,
          false,
          null,
        ),
      );
      continue;
    }
    const reassessmentRuntime =
      runMarketReassessment({
        previousRecord,
        currentRecord,
      });
    const reassessment =
      reassessmentRuntime.reassessment;
    const materialChange =
      isMaterialReassessment(
        reassessment,
      );
    items.push(
      buildItem(
        currentRecord,
        history,
        previousRecord,
        previousFingerprint,
        currentFingerprint,
        materialChange
          ? "reassessment-required"
          : "no-material-change",
        true,
        materialChange,
        reassessment,
      ),
    );
  }
  const changedCount =
    items.filter(
      (item) =>
        item.observationChanged,
    ).length;
  const reassessmentRequiredCount =
    items.filter(
      (item) =>
        item.action ===
        "reassessment-required",
    ).length;
  const noMaterialChangeCount =
    items.filter(
      (item) =>
        item.action ===
        "no-material-change",
    ).length;
  const noHistoryCount =
    items.filter(
      (item) =>
        item.action ===
        "no-history",
    ).length;
  const blockedCount =
    items.filter(
      (item) =>
        item.action ===
        "blocked",
    ).length;
  const code =
    items.length === 0
      ? "C147_12_CHANGE_DETECTION_INSUFFICIENT"
      : blockedCount > 0
        ? "C147_12_CHANGE_DETECTION_PARTIAL"
        : "C147_12_CHANGE_DETECTION_PASS";
  return {
    success:
      code !==
      "C147_12_CHANGE_DETECTION_INSUFFICIENT",
    code,
    universeSize:
      universe.length,
    evaluatedCount:
      items.length,
    changedCount,
    reassessmentRequiredCount,
    noMaterialChangeCount,
    noHistoryCount,
    blockedCount,
    mutationPerformed:
      false,
    items,
    principles: [
      "Current records come from the existing C147.7 Decision Record runtime.",
      "Observation fingerprints reuse the existing C147.11 fingerprint mechanism.",
      "generatedAt-only differences are ignored by the fingerprint mechanism.",
      "The latest persisted history entry is the comparison baseline.",
      "Changed observations are evaluated through the existing C147.8 reassessment engine.",
      "C147.8 assessment-change and invalidation-risk states are interpreted using the real C147.8 result fields.",
      "insufficient-data does not produce a reassessment-required action.",
      "C147.12 never writes market decision history.",
      "C147.11 explicit mutation remains separate.",
      "Human review remains mandatory.",
      "No securities are ranked.",
      "No buy, sell, hold, target price, or probability recommendation is generated.",
      "No automated order or portfolio execution is performed.",
    ],
    humanDecisionRequired:
      true,
    storage: {
      mode:
        storageMode,
      persistent:
        storageMode ===
        "redis",
    },
    runtime: {
      name:
        "market-decision-change-detection-runtime",
      version:
        "C147.12",
      generatedAt:
        new Date().toISOString(),
      latencyMs:
        Date.now() -
        startedAt,
    },
    disclaimer:
      DISCLAIMER,
  };
}
