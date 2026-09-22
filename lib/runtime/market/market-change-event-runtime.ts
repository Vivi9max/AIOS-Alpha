import {
  runMarketDecisionChangeDetection,
} from "./market-decision-change-detection-runtime";

import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionChangeDetectionItem,
} from "./market-decision-change-detection-types";

import type {
  MarketChangeEvent,
  MarketChangeEventRuntimeRequest,
  MarketChangeEventRuntimeResult,
  MarketChangeEventPriority,
  MarketChangeEventType,
} from "./market-change-event-types";

const DISCLAIMER =
  "C147.13 converts the existing C147.12 market change-detection result into structured runtime events. It is read-only: it does not mutate decision history, create tasks, dispatch Planner work, rank securities, predict outcomes, provide personalized investment advice, or execute trades.";

function normalizeSymbol(
  symbol: string,
): string {
  return symbol
    .trim()
    .toUpperCase();
}

function createEventId(
  item: MarketDecisionChangeDetectionItem,
): string {
  return [
    "market-change-event",
    item.market,
    normalizeSymbol(item.symbol),
    item.currentRecordId,
    item.currentVersion,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("-");
}

function mapEventType(
  item: MarketDecisionChangeDetectionItem,
): MarketChangeEventType {
  switch (item.action) {
    case "reassessment-required":
      return "market-decision-reassessment-required";

    case "no-material-change":
      return "market-decision-no-change";

    case "no-history":
      return "market-decision-no-history";

    case "blocked":
      return "market-decision-blocked";

    default:
      return "market-decision-changed";
  }
}

function mapPriority(
  item: MarketDecisionChangeDetectionItem,
): MarketChangeEventPriority {
  if (item.action === "blocked") {
    return "blocked";
  }

  if (
    item.action ===
    "reassessment-required"
  ) {
    return "high";
  }

  return "normal";
}

function buildEvent(
  item: MarketDecisionChangeDetectionItem,
): MarketChangeEvent {
  const reassessment =
    item.reassessment;

  return {
    eventId:
      createEventId(item),

    eventType:
      mapEventType(item),

    priority:
      mapPriority(item),

    symbol:
      normalizeSymbol(
        item.symbol,
      ),

    market:
      item.market,

    action:
      item.action,

    observationChanged:
      item.observationChanged,

    materialChange:
      item.materialChange,

    previousVersion:
      item.previousVersion,

    currentVersion:
      item.currentVersion,

    previousRecordId:
      item.previousRecordId,

    currentRecordId:
      item.currentRecordId,

    observationFingerprint:
      item.observationFingerprint,

    previousFingerprint:
      item.previousFingerprint,

    reassessmentId:
      reassessment?.reassessmentId ??
      null,

    whatChanged:
      reassessment?.whatChanged ??
      [],

    whyItMatters:
      reassessment?.whyItMatters ??
      [],

    whatRequiresHumanReview:
      reassessment?.whatRequiresHumanReview ??
      [
        "Human review is required before any decision or action.",
      ],

    humanDecisionRequired:
      true,

    sourceRuntime:
      "market-decision-change-detection-runtime",

    sourceVersion:
      "C147.12",

    createdAt:
      new Date().toISOString(),
  };
}

function shouldEmitEvent(
  item: MarketDecisionChangeDetectionItem,
): boolean {
  /*
   * C147.13 intentionally emits an event
   * for every evaluated state.
   *
   * This preserves the distinction between:
   *
   * - no history
   * - no material change
   * - material reassessment
   * - blocked
   *
   * The downstream Planner is responsible for
   * deciding whether an event becomes work.
   */
  return true;
}

export async function runMarketChangeEventRuntime(
  request:
    MarketChangeEventRuntimeRequest,
): Promise<MarketChangeEventRuntimeResult> {
  const startedAt =
    Date.now();

  const detection =
    await runMarketDecisionChangeDetection({
      universe:
        Array.isArray(
          request?.universe,
        )
          ? request.universe
          : [],

      query:
        request?.query ??
        null,

      includeExcluded:
        request?.includeExcluded ??
        true,

      includeInsufficientData:
        request?.includeInsufficientData ??
        true,
    });

  const events =
    detection.items
      .filter(shouldEmitEvent)
      .map(buildEvent);

  const materialEventCount =
    events.filter(
      (event) =>
        event.materialChange,
    ).length;

  const noChangeCount =
    events.filter(
      (event) =>
        event.eventType ===
        "market-decision-no-change",
    ).length;

  const noHistoryCount =
    events.filter(
      (event) =>
        event.eventType ===
        "market-decision-no-history",
    ).length;

  const blockedCount =
    events.filter(
      (event) =>
        event.eventType ===
        "market-decision-blocked",
    ).length;

  const code =
    events.length === 0
      ? "C147_13_MARKET_CHANGE_EVENT_INSUFFICIENT"
      : blockedCount > 0
        ? "C147_13_MARKET_CHANGE_EVENT_PARTIAL"
        : "C147_13_MARKET_CHANGE_EVENT_PASS";

  return {
    success:
      events.length > 0,

    code,

    universeSize:
      detection.universeSize,

    evaluatedCount:
      detection.evaluatedCount,

    eventCount:
      events.length,

    materialEventCount,

    noChangeCount,

    noHistoryCount,

    blockedCount,

    events,

    mutationPerformed:
      false,

    taskCreated:
      false,

    plannerDispatched:
      false,

    tradingExecuted:
      false,

    humanDecisionRequired:
      true,

    sourceRuntime: {
      name:
        "market-change-event-runtime",

      version:
        "C147.13",

      upstream:
        "C147.12",

      generatedAt:
        new Date().toISOString(),

      latencyMs:
        Date.now() -
        startedAt,
    },

    principles: [
      "C147.13 consumes the existing C147.12 runtime rather than duplicating market decision logic.",
      "C147.12 remains the single source of truth for change detection.",
      "C147.8 remains the single source of truth for reassessment.",
      "C147.11 remains the explicit market-history mutation path.",
      "C147.13 does not write market decision history.",
      "C147.13 does not create Tasks.",
      "C147.13 does not dispatch Planner work.",
      "C147.13 does not execute trading.",
      "Material changes remain subject to human review.",
      "No securities are ranked.",
      "No buy, sell, hold, target price, or probability recommendation is generated.",
      "No automated portfolio action is performed.",
    ],

    disclaimer:
      DISCLAIMER,
  };
}
