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
  "C147.12 detects changes between the latest persisted market decision observation and the current decision record. It does not mutate history, rank securities, predict outcomes, provide personalized investment advice, or execute trades. Explicit mutation remains a separate operation.";
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
function latestRecord(
  history: MarketDecisionHistory | null,
): MarketDecisionRecord | null {
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
    ]?.record ?? null
  );
}
function latestFingerprint(
  history: MarketDecisionHistory | null,
): string | null {
  if (
    !history ||
    !Array.isArray(history.entries) ||
    history.entries.length === 0
  ) {
    return null;
  }
  const latest =
    history.entries[
      history.entries.length - 1
    ];
  const stored =
    latest.observationFingerprint;
  if (
    typeof stored === "string" &&
    stored.length > 0
  ) {
    return stored;
  }
  return buildObservationFingerprint(
    latest.record,
  );
}
function hasMaterialChange(
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
    "material-change"
  ) {
    return true;
  }
  if (
    reassessment.changeType ===
      "assessment-change" ||
    reassessment.changeType ===
      "invalidation-risk"
  ) {
    return true;
  }
  if (
    Array.isArray(
      reassessment.materialChanges,
    ) &&
    reassessment.materialChanges.length > 0
  ) {
    return true;
  }
  return false;
}
function buildBaseItem(
  currentRecord: MarketDecisionRecord,
  history: MarketDecisionHistory | null,
  previous: MarketDecisionRecord | null,
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
      previous?.recordId ?? null,
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
  const storageMode =
    getStorageMode();
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
        "Explicit mutation remains a separate C147.11 operation.",
        "Human review remains mandatory.",
      ],
      humanDecisionRequired:
        true,
      storage: {
        mode: storageMode,
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
    const previous =
      latestRecord(
        history,
      );
    const previousFingerprint =
      latestFingerprint(
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
    if (!previous) {
      items.push(
        buildBaseItem(
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
        buildBaseItem(
          currentRecord,
          history,
          previous,
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
        buildBaseItem(
          currentRecord,
          history,
          previous,
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
        previousRecord:
          previous,
        currentRecord,
      });
    const reassessment =
      reassessmentRuntime.reassessment;
    const materialChange =
      hasMaterialChange(
        reassessment,
      );
    items.push(
      buildBaseItem(
        currentRecord,
        history,
        previous,
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
      "Current decision records are generated through the existing C147.7 Decision Record runtime.",
      "Observation fingerprints reuse the C147.11 stable fingerprint mechanism.",
      "generatedAt-only changes do not trigger a new observation.",
      "The latest persisted observation is the comparison baseline.",
      "Changed observations are reassessed through the existing C147.8 reassessment engine.",
      "Only material reassessment changes produce reassessment-required.",
      "Change detection never writes history.",
      "Explicit mutation remains a separate C147.11 operation.",
      "Human review remains mandatory.",
      "No security is ranked.",
      "No buy, sell, hold, target price, or probability recommendation is generated.",
      "No automated order or portfolio execution is performed.",
    ],
    humanDecisionRequired:
      true,
    storage: {
      mode: storageMode,
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
