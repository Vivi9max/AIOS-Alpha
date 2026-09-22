import {
  createPersistentTask,
  findDuplicateActiveTask,
} from "@/lib/task/server-store";
import {
  runMarketChangeEventRuntime,
} from "./market-change-event-runtime";
import type {
  MarketChangeEvent,
} from "./market-change-event-types";
import type {
  MarketChangeEventTaskBridgeRequest,
  MarketChangeEventTaskBridgeItem,
  MarketChangeEventTaskBridgeResult,
} from "./market-change-event-task-bridge-types";
const DISCLAIMER =
  "C147.14 converts only material market-change events into persistent human-review Tasks. It does not autonomously decide, execute trading, dispatch Planner development work, or provide personalized investment advice.";
function normalizeSymbol(
  symbol: string,
): string {
  return symbol
    .trim()
    .toUpperCase();
}
function buildTaskTitle(
  event: MarketChangeEvent,
): string {
  return (
    `Market review required: ${normalizeSymbol(event.symbol)} ` +
    `(${event.market}) v${event.currentVersion}`
  );
}
function buildTaskDescription(
  event: MarketChangeEvent,
): string {
  const changed =
    event.whatChanged.length > 0
      ? event.whatChanged.join(
          " | ",
        )
      : "Material decision-state change detected.";
  const why =
    event.whyItMatters.length > 0
      ? event.whyItMatters.join(
          " | ",
        )
      : "Human review is required.";
  const review =
    event.whatRequiresHumanReview.length > 0
      ? event.whatRequiresHumanReview.join(
          " | ",
        )
      : "Review the evidence and reassessment before any decision.";
  return [
    "Source: C147.13 Market Change Event Runtime.",
    `Event ID: ${event.eventId}`,
    `Event Type: ${event.eventType}`,
    `Symbol: ${normalizeSymbol(event.symbol)}`,
    `Market: ${event.market}`,
    `Current Version: ${event.currentVersion}`,
    `Previous Version: ${event.previousVersion}`,
    `Previous Record ID: ${event.previousRecordId ?? "none"}`,
    `Current Record ID: ${event.currentRecordId}`,
    `Reassessment ID: ${event.reassessmentId ?? "none"}`,
    `Observation Changed: ${String(event.observationChanged)}`,
    `Material Change: ${String(event.materialChange)}`,
    `What Changed: ${changed}`,
    `Why It Matters: ${why}`,
    `Human Review: ${review}`,
    "",
    "Safety boundary:",
    "This Task is for human review only.",
    "No automated trading action is authorized.",
    "No Planner development dispatch is authorized by this bridge.",
    "No personalized buy, sell, hold, target-price, or probability recommendation is generated.",
  ].join("\n");
}
function buildNoTaskItem(
  event: MarketChangeEvent,
  action:
    | "no-task-required"
    | "blocked",
  reason: string,
): MarketChangeEventTaskBridgeItem {
  return {
    symbol:
      normalizeSymbol(
        event.symbol,
      ),
    market:
      event.market,
    eventId:
      event.eventId,
    eventType:
      event.eventType,
    action,
    materialChange:
      event.materialChange,
    currentVersion:
      event.currentVersion,
    reassessmentId:
      event.reassessmentId,
    taskId:
      null,
    taskTitle:
      null,
    humanDecisionRequired:
      true,
    automatedExecutionStarted:
      false,
    plannerDispatched:
      false,
    tradingExecuted:
      false,
    reason,
  };
}
async function bridgeEvent(
  event: MarketChangeEvent,
): Promise<MarketChangeEventTaskBridgeItem> {
  if (
    event.eventType ===
      "market-decision-blocked"
  ) {
    return buildNoTaskItem(
      event,
      "blocked",
      "Blocked market decision state requires separate human review and is not converted into an executable Task.",
    );
  }
  if (
    event.eventType !==
      "market-decision-reassessment-required" ||
    event.materialChange !== true
  ) {
    return buildNoTaskItem(
      event,
      "no-task-required",
      "The event does not represent a material reassessment requiring a new human-review Task.",
    );
  }
  const taskTitle =
    buildTaskTitle(
      event,
    );
  const duplicate =
    await findDuplicateActiveTask(
      taskTitle,
    );
  if (duplicate) {
    return {
      symbol:
        normalizeSymbol(
          event.symbol,
        ),
      market:
        event.market,
      eventId:
        event.eventId,
      eventType:
        event.eventType,
      action:
        "task-already-exists",
      materialChange:
        true,
      currentVersion:
        event.currentVersion,
      reassessmentId:
        event.reassessmentId,
      taskId:
        duplicate.id,
      taskTitle:
        duplicate.title,
      humanDecisionRequired:
        true,
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      reason:
        "An active human-review Task already exists for this market decision version. No duplicate Task was created.",
    };
  }
  try {
    const task =
      await createPersistentTask(
        taskTitle,
        buildTaskDescription(
          event,
        ),
      );
    return {
      symbol:
        normalizeSymbol(
          event.symbol,
        ),
      market:
        event.market,
      eventId:
        event.eventId,
      eventType:
        event.eventType,
      action:
        "task-created",
      materialChange:
        true,
      currentVersion:
        event.currentVersion,
      reassessmentId:
        event.reassessmentId,
      taskId:
        task.id,
      taskTitle:
        task.title,
      humanDecisionRequired:
        true,
      automatedExecutionStarted:
        false,
      plannerDispatched:
        false,
      tradingExecuted:
        false,
      reason:
        "Material market decision change converted into a persistent human-review Task.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Task creation failed.";
    if (
      message.startsWith(
        "DUPLICATE_TASK:",
      )
    ) {
      const duplicateId =
        message.slice(
          "DUPLICATE_TASK:"
            .length,
        );
      return {
        symbol:
          normalizeSymbol(
            event.symbol,
          ),
        market:
          event.market,
        eventId:
          event.eventId,
        eventType:
          event.eventType,
        action:
          "task-already-exists",
        materialChange:
          true,
        currentVersion:
          event.currentVersion,
        reassessmentId:
          event.reassessmentId,
        taskId:
          duplicateId || null,
        taskTitle:
          taskTitle,
        humanDecisionRequired:
          true,
        automatedExecutionStarted:
          false,
        plannerDispatched:
          false,
        tradingExecuted:
          false,
        reason:
          "A concurrent request created the same active Task. Duplicate creation was prevented.",
      };
    }
    return buildNoTaskItem(
      event,
      "blocked",
      `Task creation blocked: ${message}`,
    );
  }
}
export async function runMarketChangeEventTaskBridge(
  request:
    MarketChangeEventTaskBridgeRequest,
): Promise<MarketChangeEventTaskBridgeResult> {
  const startedAt =
    Date.now();
  const eventRuntime =
    await runMarketChangeEventRuntime({
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
  if (
    eventRuntime.events.length ===
    0
  ) {
    return {
      success: false,
      code:
        "C147_14_MARKET_EVENT_TASK_BRIDGE_INSUFFICIENT",
      universeSize:
        eventRuntime.universeSize,
      eventCount:
        0,
      materialEventCount:
        0,
      taskCreatedCount:
        0,
      taskExistingCount:
        0,
      noTaskRequiredCount:
        0,
      blockedCount:
        0,
      items: [],
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
          "market-change-event-task-bridge-runtime",
        version:
          "C147.14",
        upstream:
          "C147.13",
        generatedAt:
          new Date().toISOString(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      principles: [
        "C147.14 consumes C147.13 events.",
        "Only material reassessment events can create Tasks.",
        "No-change events do not create Tasks.",
        "No-history events do not create Tasks.",
        "Blocked events do not create executable Tasks.",
        "Human review remains mandatory.",
      ],
      disclaimer:
        DISCLAIMER,
    };
  }
  const items:
    MarketChangeEventTaskBridgeItem[] =
    [];
  for (
    const event of
      eventRuntime.events
  ) {
    items.push(
      await bridgeEvent(
        event,
      ),
    );
  }
  const materialEventCount =
    eventRuntime.events.filter(
      (event) =>
        event.materialChange ===
        true,
    ).length;
  const taskCreatedCount =
    items.filter(
      (item) =>
        item.action ===
        "task-created",
    ).length;
  const taskExistingCount =
    items.filter(
      (item) =>
        item.action ===
        "task-already-exists",
    ).length;
  const noTaskRequiredCount =
    items.filter(
      (item) =>
        item.action ===
        "no-task-required",
    ).length;
  const blockedCount =
    items.filter(
      (item) =>
        item.action ===
        "blocked",
    ).length;
  const code =
    items.length === 0
      ? "C147_14_MARKET_EVENT_TASK_BRIDGE_INSUFFICIENT"
      : blockedCount > 0
        ? "C147_14_MARKET_EVENT_TASK_BRIDGE_PARTIAL"
        : "C147_14_MARKET_EVENT_TASK_BRIDGE_PASS";
  return {
    success:
      items.length > 0 &&
      blockedCount === 0,
    code,
    universeSize:
      eventRuntime.universeSize,
    eventCount:
      eventRuntime.eventCount,
    materialEventCount,
    taskCreatedCount,
    taskExistingCount,
    noTaskRequiredCount,
    blockedCount,
    items,
    mutationPerformed:
      false,
    taskCreated:
      taskCreatedCount > 0,
    plannerDispatched:
      false,
    tradingExecuted:
      false,
    humanDecisionRequired:
      true,
    runtime: {
      name:
        "market-change-event-task-bridge-runtime",
      version:
        "C147.14",
      upstream:
        "C147.13",
      generatedAt:
        new Date().toISOString(),
      latencyMs:
        Date.now() -
        startedAt,
    },
    principles: [
      "C147.14 consumes the existing C147.13 event runtime.",
      "C147.12 remains the source of truth for change detection.",
      "C147.8 remains the source of truth for reassessment.",
      "C147.11 remains the explicit market-history mutation path.",
      "Only material reassessment-required events may create Tasks.",
      "Task creation is persistent but does not mean execution authorization.",
      "Existing active Tasks are reused instead of duplicated.",
      "Planner development dispatch is deliberately not invoked.",
      "Autonomous execution is deliberately not invoked.",
      "Trading execution is deliberately not invoked.",
      "Human review remains mandatory.",
    ],
    disclaimer:
      DISCLAIMER,
  };
}
