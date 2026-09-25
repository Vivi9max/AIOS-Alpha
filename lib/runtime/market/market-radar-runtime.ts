import {
  runMarketChangeEventRuntime,
} from "./market-change-event-runtime";

import type {
  MarketChangeEvent,
} from "./market-change-event-types";

import type {
  MarketRadarPriority,
  MarketRadarRuntimeRequest,
  MarketRadarRuntimeResult,
  MarketRadarSignal,
} from "./market-radar-types";

const DISCLAIMER =
  "C154 Market Radar is a research-monitoring layer built on the existing C147 market intelligence runtime. It detects and organizes market-change events but does not generate buy, sell, hold, target-price, personalized investment advice, autonomous portfolio actions, Planner work, or trading execution.";

function normalizeSymbol(
  symbol: string,
): string {
  return symbol
    .trim()
    .toUpperCase();
}

function getPriority(
  event: MarketChangeEvent,
): MarketRadarPriority {
  if (
    event.priority ===
    "blocked"
  ) {
    return "critical";
  }

  if (
    event.priority ===
    "high"
  ) {
    return "high";
  }

  if (
    event.materialChange
  ) {
    return "high";
  }

  return "normal";
}

function getSignalType(
  event: MarketChangeEvent,
): MarketRadarSignal["type"] {
  if (
    event.eventType ===
    "market-decision-blocked"
  ) {
    return "risk-review";
  }

  if (
    event.eventType ===
    "market-decision-no-history"
  ) {
    return "data-quality";
  }

  if (
    event.eventType ===
    "market-decision-reassessment-required"
  ) {
    return "market-change";
  }

  return "event-review";
}

function getTitle(
  event: MarketChangeEvent,
): string {
  switch (
    event.eventType
  ) {
    case "market-decision-reassessment-required":
      return "Material market change detected";

    case "market-decision-changed":
      return "Market observation changed";

    case "market-decision-no-change":
      return "No material market change";

    case "market-decision-no-history":
      return "Insufficient market history";

    case "market-decision-blocked":
      return "Market decision blocked";

    default:
      return "Market event detected";
  }
}

function getDescription(
  event: MarketChangeEvent,
): string {
  const changes =
    event.whatChanged.length > 0
      ? event.whatChanged.join(
          " · ",
        )
      : "No detailed observation change was supplied.";

  const implications =
    event.whyItMatters.length > 0
      ? event.whyItMatters.join(
          " · ",
        )
      : "Human review is required before interpretation.";

  return `${changes} ${implications}`;
}

function buildSignal(
  event: MarketChangeEvent,
): MarketRadarSignal {
  return {
    signalId:
      `c154-radar-${event.eventId}`,

    symbol:
      normalizeSymbol(
        event.symbol,
      ),

    market:
      event.market,

    type:
      getSignalType(event),

    priority:
      getPriority(event),

    title:
      getTitle(event),

    description:
      getDescription(event),

    materialChange:
      event.materialChange,

    observationChanged:
      event.observationChanged,

    sourceEventId:
      event.eventId,

    sourceVersion:
      event.sourceVersion,

    humanDecisionRequired:
      true,

    humanReviewRequired:
      true,

    detectedAt:
      event.createdAt,
  };
}

function includeEvent(
  event: MarketChangeEvent,
  request: MarketRadarRuntimeRequest,
): boolean {
  if (
    event.eventType ===
      "market-decision-no-change" &&
    request.includeNoChange === false
  ) {
    return false;
  }

  if (
    event.eventType ===
      "market-decision-no-history" &&
    request.includeNoHistory === false
  ) {
    return false;
  }

  if (
    event.eventType ===
      "market-decision-blocked" &&
    request.includeBlocked === false
  ) {
    return false;
  }

  return true;
}

function resolveState(
  signals: MarketRadarSignal[],
): MarketRadarRuntimeResult["radar"]["state"] {
  if (
    signals.length === 0
  ) {
    return "insufficient";
  }

  if (
    signals.some(
      (signal) =>
        signal.priority ===
        "critical",
    )
  ) {
    return "blocked";
  }

  if (
    signals.some(
      (signal) =>
        signal.priority ===
        "high",
    )
  ) {
    return "attention";
  }

  if (
    signals.some(
      (signal) =>
        signal.materialChange,
    )
  ) {
    return "active";
  }

  return "stable";
}

export async function runMarketRadarRuntime(
  request:
    MarketRadarRuntimeRequest,
): Promise<MarketRadarRuntimeResult> {
  const startedAt =
    Date.now();

  const universe =
    Array.isArray(
      request?.universe,
    )
      ? request.universe
      : [];

  const upstream =
    await runMarketChangeEventRuntime(
      {
        universe,

        query:
          request?.query ??
          null,

        includeExcluded:
          true,

        includeInsufficientData:
          true,
      },
    );

  const events =
    upstream.events.filter(
      (event) =>
        includeEvent(
          event,
          request,
        ),
    );

  const signals =
    events.map(
      buildSignal,
    );

  const materialEventCount =
    events.filter(
      (event) =>
        event.materialChange,
    ).length;

  const highPriorityCount =
    signals.filter(
      (signal) =>
        signal.priority ===
          "high" ||
        signal.priority ===
          "critical",
    ).length;

  const blockedCount =
    events.filter(
      (event) =>
        event.eventType ===
        "market-decision-blocked",
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

  const latencyMs =
    Date.now() -
    startedAt;

  const state =
    resolveState(
      signals,
    );

  const code =
    events.length === 0
      ? "C154_MARKET_RADAR_INSUFFICIENT"
      : blockedCount > 0
        ? "C154_MARKET_RADAR_PARTIAL"
        : "C154_MARKET_RADAR_PASS";

  return {
    success:
      events.length > 0,

    code,

    radar: {
      state,

      universeSize:
        upstream.universeSize,

      evaluatedCount:
        upstream.evaluatedCount,

      eventCount:
        events.length,

      materialEventCount,

      highPriorityCount,

      blockedCount,

      noChangeCount,

      noHistoryCount,

      signals,

      generatedAt:
        new Date().toISOString(),

      latencyMs,
    },

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

    humanReviewRequired:
      true,

    runtime: {
      name:
        "market-radar-runtime",

      version:
        "C154.1",

      upstream:
        "C147.13",

      generatedAt:
        new Date().toISOString(),

      latencyMs,
    },

    principles: [
      "C154 consumes C147.13 rather than duplicating market-change detection.",
      "C147.12 remains the source of truth for market change detection.",
      "C147.13 remains the source of truth for structured market-change events.",
      "C154 is read-only.",
      "C154 does not mutate market decision history.",
      "C154 does not create Tasks.",
      "C154 does not dispatch Planner work.",
      "C154 does not execute trades.",
      "C154 does not rank securities.",
      "C154 does not generate buy, sell, hold, target-price, or probability recommendations.",
      "Every material signal remains subject to human review.",
    ],

    disclaimer:
      DISCLAIMER,
  };
}
