import {
storage,
getStorageMode,
} from “@/lib/server-storage”;

import {
runMarketDecisionRecord,
} from “./market-decision-record-runtime”;

import {
runMarketReassessment,
} from “./market-reassessment-runtime”;

import {
buildObservationFingerprint,
} from “./market-decision-observation-runtime”;

import type {
MarketRegion,
} from “./market-types”;

import type {
MarketDecisionRecord,
} from “./market-decision-record-types”;

import type {
MarketDecisionHistory,
} from “./market-decision-history-types”;

import type {
MarketDecisionChangeDetectionRequest,
MarketDecisionChangeDetectionItem,
MarketDecisionChangeDetectionResult,
} from “./market-decision-change-detection-types”;

const HISTORY_PREFIX =
“aios:market:decision-history:v1:”;

const DISCLAIMER =
“C147.12 detects changes between the latest persisted market decision observation and the current decision record. It does not mutate history, rank securities, predict outcomes, provide personalized investment advice, or execute trades. Explicit mutation remains a separate operation.”;

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
value === “us” ||
value === “hk” ||
value === “cn”
);
}

function buildHistoryKey(
symbol: string,
market: MarketRegion,
): string {
return [
HISTORY_PREFIX,
market,
“:”,
normalizeSymbol(symbol),
].join(””);
}

async function loadHistory(
symbol: string,
market: MarketRegion,
): Promise<MarketDecisionHistory | null> {
return storage.get<
MarketDecisionHistory

(
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
typeof stored === “string” &&
stored.length > 0
) {
return stored;
}

return buildObservationFingerprint(
latest.record,
);
}

function hasMaterialChange(
reassessment: ReturnType<
typeof runMarketReassessment

[“reassessment”],
): boolean {
if (!reassessment) {
return false;
}

if (
reassessment.changeType ===
“insufficient-data”
) {
return false;
}

if (
reassessment.changeType ===
“material-change”
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

export async function runMarketDecisionChangeDetection(
request:
MarketDecisionChangeDetectionRequest,
): Promise {
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
“string” &&
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
  mutationPerformed: false,
  items: [],
  principles: [
    "Change detection requires at least one valid market instrument.",
    "Change detection is read-only.",
    "Explicit mutation remains a separate C147.11 operation.",
    "Human review remains mandatory.",
  ],
  humanDecisionRequired: true,
  storage: {
    mode:
      getStorageMode(),
    persistent:
      getStorageMode() ===
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
  previousFingerprint ===
    null ||
  previousFingerprint !==
    currentFingerprint;
if (!previous) {
  items.push({
    symbol,
    market,
    action:
      currentRecord.reviewStatus ===
        "blocked" ||
      currentRecord.state ===
        "insufficient-data"
        ? "blocked"
        : "no-history",
    observationFingerprint:
      currentFingerprint,
    previousFingerprint:
      null,
    previousVersion:
      history?.version ??
      0,
    currentVersion:
      history?.version ??
      0,
    observationChanged: true,
    materialChange: false,
    previousRecordId:
      null,
    currentRecordId:
      currentRecord.recordId,
    currentRecord,
    reassessment:
      null,
    humanDecisionRequired:
      true,
    mutationPerformed:
      false,
  });
  continue;
}
if (
  currentRecord.reviewStatus ===
    "blocked" ||
  currentRecord.state ===
    "insufficient-data"
) {
  items.push({
    symbol,
    market,
    action:
      "blocked",
    observationFingerprint:
      currentFingerprint,
    previousFingerprint,
    previousVersion:
      history?.version ??
      0,
    currentVersion:
      history?.version ??
      0,
    observationChanged,
    materialChange:
      false,
    previousRecordId:
      previous.recordId,
    currentRecordId:
      currentRecord.recordId,
    currentRecord,
    reassessment:
      null,
    humanDecisionRequired:
      true,
    mutationPerformed:
      false,
  });
  continue;
}
if (
  !observationChanged
) {
  items.push({
    symbol,
    market,
    action:
      "no-material-change",
    observationFingerprint:
      currentFingerprint,
    previousFingerprint,
    previousVersion:
      history?.version ??
      0,
    currentVersion:
      history?.version ??
      0,
    observationChanged:
      false,
    materialChange:
      false,
    previousRecordId:
      previous.recordId,
    currentRecordId:
      currentRecord.recordId,
    currentRecord,
    reassessment:
      null,
    humanDecisionRequired:
      true,
    mutationPerformed:
      false,
  });
  continue;
}
const reassessment =
  runMarketReassessment({
    previousRecord:
      previous,
    currentRecord,
  }).reassessment;
const materialChange =
  hasMaterialChange(
    reassessment,
  );
items.push({
  symbol,
  market,
  action:
    materialChange
      ? "reassessment-required"
      : "no-material-change",
  observationFingerprint:
    currentFingerprint,
  previousFingerprint,
  previousVersion:
    history?.version ??
    0,
  currentVersion:
    history?.version ??
    0,
  observationChanged:
    true,
  materialChange,
  previousRecordId:
    previous.recordId,
  currentRecordId:
    currentRecord.recordId,
  currentRecord,
  reassessment,
  humanDecisionRequired:
    true,
  mutationPerformed:
    false,
});

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
“reassessment-required”,
).length;

const noMaterialChangeCount =
items.filter(
(item) =>
item.action ===
“no-material-change”,
).length;

const noHistoryCount =
items.filter(
(item) =>
item.action ===
“no-history”,
).length;

const blockedCount =
items.filter(
(item) =>
item.action ===
“blocked”,
).length;

const code =
items.length === 0
? “C147_12_CHANGE_DETECTION_INSUFFICIENT”
: blockedCount > 0
? “C147_12_CHANGE_DETECTION_PARTIAL”
: “C147_12_CHANGE_DETECTION_PASS”;

return {
success:
code !==
“C147_12_CHANGE_DETECTION_INSUFFICIENT”,

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
  "A changed observation is reassessed through the existing C147.8 reassessment engine.",
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
  mode:
    getStorageMode(),
  persistent:
    getStorageMode() ===
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
