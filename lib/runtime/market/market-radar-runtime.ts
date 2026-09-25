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
  "C154 Market Radar continuously organizes verified market-change events into a research-monitoring layer. It does not generate buy, sell, hold, target-price, probability, personalized investment advice, autonomous portfolio actions, or trading execution.";

function normalizeSymbol(
  symbol: string,
): string {
  return symbol
    .trim()
    .toUpperCase();
}

function priorityForEvent(
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

function signalTitle(
  event: MarketChangeEvent,
): string {
  switch (
    event.eventType
  ) {
    case "market-decision-reassessment-required":
      return "Material market change requires review";

    case "market-decision-no-change":
      return "No material market change detected";

    case "market-decision-no-history":
      return "Market history unavailable";

    case "market-decision-blocked":
      return "Market decision state blocked";

    default:
      return "Market change detected";
  }
}

function signalDescription(
  event: MarketChangeEvent,
): string {
  const changed =
    event.whatChanged.length > 0
      ? event.whatChanged.join(
          " | ",
        )
      : "No detailed change description available.";

  const why =
    event.whyItMatters.length > 0
      ? event.whyItMatters.join(
          " | ",
        )
      : "Human review is required before interpretation.";

  return [
    changed,
    why,
  ].join(" ");
}

function buildSignal(
  event: MarketChangeEvent,
): MarketRadarSignal {
  return {
    signalId:
      `radar-${event.eventId}`,

    type:
      event.materialChange
        ? "market-change"
        : event.eventType ===
            "market-decision-blocked"
          ? "risk-review"
          : "event-review",

    priority:
      priorityForEvent(
        event,
      ),

    symbol:
      normalizeSymbol(
        event.symbol,
      ),

    market:
      event.market,

    title:
      signalTitle(event),

    description:
      signalDescription(
        event,
      ),

    materialChange:
      event.materialChange,

    humanReviewRequired:
      true,

    sourceEventId:
      event.eventId,

    sourceVersion:
      event.sourceVersion,

    detectedAt:
      event.createdAt,
  };
}

function shouldInclude(
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

function determineState(
  signals: MarketRadarSignal[],
): "stable" | "active" | "attention" | "blocked" | "insufficient" {
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

  const eventRuntime =
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
    eventRuntime.events.filter(
      (event) =>
        shouldInclude(
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

  const state =
    determineState(
      signals,
    );

  const latencyMs =
    Date.now() -
    startedAt;

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
        eventRuntime.universeSize,

      evaluatedCount:
        eventRuntime.evaluatedCount,

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
      "C154 consumes the existing C147.13 Market Change Event Runtime.",
      "C147.12 remains the source of truth for market change detection.",
      "C147.13 remains the source of truth for structured market-change events.",
      "C154 does not duplicate market decision detection.",
      "C154 does not mutate market decision history.",
      "C154 does not create Tasks.",
      "C154 does not dispatch Planner work.",
      "C154 does not execute trading.",
      "C154 does not rank securities.",
      "C154 does not generate buy, sell, hold, target-price, or probability recommendations.",
      "Human review remains mandatory.",
    ],

    disclaimer:
      DISCLAIMER,
  };
}
