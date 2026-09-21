import {
  createHash,
} from "crypto";

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
} from "./market-decision-history-types";

import type {
  MarketDecisionObservation,
  MarketDecisionObservationRequest,
  MarketDecisionObservationResult,
} from "./market-decision-observation-types";

const HISTORY_PREFIX =
  "aios:market:decision-history:v1:";

const DISCLAIMER =
  "C147.11 separates market observation from history mutation. Identical observations do not create new versions. New observations may create a new historical version only through the explicit mutation path. Human review remains mandatory. No ranking, prediction, personalized investment advice, or automated trading is performed.";

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

async function loadHistory(
  symbol: string,
  market: MarketRegion,
): Promise<MarketDecisionHistory | null> {
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

function stableValue(
  value: unknown,
): unknown {
  if (
    Array.isArray(value)
  ) {
    return value.map(
      stableValue,
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const source =
      value as Record<
        string,
        unknown
      >;

    return Object.keys(source)
      .sort()
      .reduce<
        Record<
          string,
          unknown
        >
      >(
        (
          result,
          key,
        ) => {
          if (
            key ===
            "generatedAt"
          ) {
            return result;
          }

          result[key] =
            stableValue(
              source[key],
            );

          return result;
        },
        {},
      );
  }

  return value;
}

export function buildObservationFingerprint(
  record: MarketDecisionRecord,
): string {
  const normalized =
    stableValue(
      record,
    );

  return createHash(
    "sha256",
  )
    .update(
      JSON.stringify(
        normalized,
      ),
    )
    .digest("hex");
}

function getEntryFingerprint(
  entry:
    MarketDecisionHistoryEntry,
): string {
  const stored =
    (
      entry as
        MarketDecisionHistoryEntry & {
          observationFingerprint?: string;
        }
    )
      .observationFingerprint;

  if (
    typeof stored ===
    "string" &&
    stored.length > 0
  ) {
    return stored;
  }

  return buildObservationFingerprint(
    entry.record,
  );
}

function emptyResult(
  mode:
    | "observe"
    | "mutate",
  code:
    | "C147_11_OBSERVATION_INSUFFICIENT"
    | "C147_11_MUTATION_BLOCKED",
  startedAt: number,
): MarketDecisionObservationResult {
  return {
    success: false,

    code,

    mode,

    mutated: false,

    versionCreated: null,

    observation: null,

    storage: {
      mode:
        getStorageMode(),

      persistent:
        getStorageMode() ===
        "redis",
    },

    humanDecisionRequired:
      true,

    runtime: {
      name:
        "market-decision-observation-runtime",

      version:
        "C147.11",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles: [
      "Observation and mutation are separate operations.",
      "Invalid security identity blocks mutation.",
      "Human review remains mandatory.",
    ],

    disclaimer:
      DISCLAIMER,
  };
}

async function observeRecord(
  record: MarketDecisionRecord,
): Promise<MarketDecisionObservation> {
  const symbol =
    normalizeSymbol(
      record.symbol,
    );

  const market =
    record.market;

  const history =
    await loadHistory(
      symbol,
      market,
    );

  const latest =
    history?.entries[
      history.entries.length -
        1
    ] ?? null;

  const fingerprint =
    buildObservationFingerprint(
      record,
    );

  const previousFingerprint =
    latest
      ? getEntryFingerprint(
          latest,
        )
      : null;

  const isNewObservation =
    previousFingerprint ===
    null ||
    previousFingerprint !==
      fingerprint;

  return {
    symbol,

    market,

    record,

    observationFingerprint:
      fingerprint,

    previousFingerprint,

    isNewObservation,

    wouldMutate:
      isNewObservation,

    previousVersion:
      history?.version ??
      0,

    currentVersion:
      history?.version ??
      0,

    mutationReason:
      isNewObservation
        ? history
          ? "new-observation"
          : "no-history"
        : "same-observation",

    reassessmentAvailable:
      Boolean(
        latest,
      ),
  };
}

async function resolveObservationRecord(
  request:
    MarketDecisionObservationRequest,
): Promise<
  MarketDecisionRecord | null
> {
  if (
    request?.record
  ) {
    return request.record;
  }

  if (
    !Array.isArray(
      request?.universe,
    )
  ) {
    return null;
  }

  const universe =
    request.universe
      .filter(
        (item) =>
          Boolean(
            item &&
            typeof item.symbol ===
              "string" &&
            item.symbol.trim() &&
            isValidMarket(
              item.market,
            ),
          ),
      );

  if (
    universe.length === 0
  ) {
    return null;
  }

  const result =
    await runMarketDecisionRecord({
      universe,

      includeExcluded:
        true,

      includeInsufficientData:
        true,

      query:
        null,
    });

  return (
    result.records[0] ??
    null
  );
}

async function mutateObservation(
  record: MarketDecisionRecord,
): Promise<{
  observation:
    MarketDecisionObservation;

  mutated:
    boolean;

  versionCreated:
    number | null;

  reassessment:
    ReturnType<
      typeof runMarketReassessment
    >["reassessment"];
}> {
  const observation =
    await observeRecord(
      record,
    );

  if (
    !observation.isNewObservation
  ) {
    return {
      observation,

      mutated: false,

      versionCreated:
        null,

      reassessment:
        null,
    };
  }

  const history =
    await loadHistory(
      record.symbol,
      record.market,
    );

  const previous =
    history?.entries[
      history.entries.length -
        1
    ]?.record ??
    null;

  const reassessment =
    previous
      ? runMarketReassessment({
          previousRecord:
            previous,

          currentRecord:
            record,
        }).reassessment
      : null;

  const nextVersion =
    (history?.version ??
      0) +
    1;

  const entry =
    {
      version:
        nextVersion,

      record,

      reassessment,

      savedAt:
        new Date().toISOString(),

      observationFingerprint:
        observation.observationFingerprint,
    } as MarketDecisionHistoryEntry & {
      observationFingerprint: string;
    };

  const entries = [
    ...(history?.entries ??
      []),
    entry,
  ].slice(-100);

  const nextHistory:
    MarketDecisionHistory =
    {
      historyId:
        history?.historyId ??
        `C14711-${record.market}-${normalizeSymbol(record.symbol)}`,

      symbol:
        normalizeSymbol(
          record.symbol,
        ),

      market:
        record.market,

      version:
        nextVersion,

      entries,

      latestRecordId:
        record.recordId,

      updatedAt:
        new Date().toISOString(),
    };

  await saveHistory(
    nextHistory,
  );

  observation.currentVersion =
    nextVersion;

  observation.previousVersion =
    history?.version ??
    0;

  observation.mutationReason =
    history
      ? "new-observation"
      : "no-history";

  return {
    observation,

    mutated: true,

    versionCreated:
      nextVersion,

    reassessment,
  };
}

export async function runMarketDecisionObservation(
  request:
    MarketDecisionObservationRequest,
): Promise<MarketDecisionObservationResult> {
  const startedAt =
    Date.now();

  const mode =
    request?.mode ===
    "mutate"
      ? "mutate"
      : "observe";

  const record =
    await resolveObservationRecord(
      request,
    );

  if (
    !record ||
    !record.symbol ||
    !isValidMarket(
      record.market,
    )
  ) {
    return emptyResult(
      mode,
      mode === "observe"
        ? "C147_11_OBSERVATION_INSUFFICIENT"
        : "C147_11_MUTATION_BLOCKED",
      startedAt,
    );
  }

  if (
    request?.symbol &&
    normalizeSymbol(
      request.symbol,
    ) !==
      normalizeSymbol(
        record.symbol,
      )
  ) {
    return emptyResult(
      mode,
      "C147_11_MUTATION_BLOCKED",
      startedAt,
    );
  }

  if (
    request?.market &&
    request.market !==
      record.market
  ) {
    return emptyResult(
      mode,
      "C147_11_MUTATION_BLOCKED",
      startedAt,
    );
  }

  if (
    mode ===
    "observe"
  ) {
    const observation =
      await observeRecord(
        record,
      );

    return {
      success: true,

      code:
        "C147_11_OBSERVATION_PASS",

      mode,

      mutated: false,

      versionCreated:
        null,

      observation,

      storage: {
        mode:
          getStorageMode(),

        persistent:
          getStorageMode() ===
          "redis",
      },

      humanDecisionRequired:
        true,

      runtime: {
        name:
          "market-decision-observation-runtime",

        version:
          "C147.11",

        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,
      },

      principles: [
        "Observation is read-only.",
        "Observation does not create a history version.",
        "Observation fingerprints ignore generatedAt-only changes.",
        "Previous history is used only for comparison.",
        "C147.8 remains the reassessment engine.",
        "Human review remains mandatory.",
        "No ranking or trading action is generated.",
      ],

      disclaimer:
        DISCLAIMER,
    };
  }

  if (
    record.reviewStatus ===
      "blocked" ||
    record.state ===
      "insufficient-data"
  ) {
    return emptyResult(
      mode,
      "C147_11_MUTATION_BLOCKED",
      startedAt,
    );
  }

  const mutation =
    await mutateObservation(
      record,
    );

  return {
    success: true,

    code:
      mutation.mutated
        ? "C147_11_MUTATION_PASS"
        : "C147_11_MUTATION_NOOP",

    mode,

    mutated:
      mutation.mutated,

    versionCreated:
      mutation.versionCreated,

    observation:
      mutation.observation,

    storage: {
      mode:
        getStorageMode(),

      persistent:
        getStorageMode() ===
        "redis",
    },

    humanDecisionRequired:
      true,

    runtime: {
      name:
        "market-decision-observation-runtime",

      version:
        "C147.11",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles: [
      "Mutation is explicit.",
      "Identical observations are idempotent and do not create a new version.",
      "Only a genuinely new observation creates a history version.",
      "C147.8 reassessment is attached only when a previous observation exists.",
      "Security identity is bound to market and symbol.",
      "Human review remains mandatory.",
      "No ranking, prediction, or automated trading is generated.",
    ],

    disclaimer:
      DISCLAIMER,
  };
}
