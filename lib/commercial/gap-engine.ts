import {
  getCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  listPersistentTasks,
  createPersistentTask,
} from "@/lib/task/server-store";

export type CommercialNextAction =
  | "validate"
  | "acquire"
  | "convert"
  | "deliver"
  | "retain"
  | "scale"
  | "complete";

export interface CommercialGap {
  objectiveId: string;
  revenueGap: number;
  customerGap: number;
  costVariance: number;

  revenueProgress: number;
  customerProgress: number;

  action: CommercialNextAction;
  priority: "normal" | "high" | "critical";

  reason: string;
}

export interface CommercialNextActionResult {
  success: boolean;
  objectiveId: string;
  action: CommercialNextAction;
  taskId: string;
  reused: boolean;
  gap: CommercialGap;
  timestamp: number;
}

function normalizeMoney(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(value * 100) / 100,
  );
}

function calculateProgress(
  actual: number,
  target: number,
): number {
  if (target <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (actual / target) * 100,
    ),
  );
}

function resolveAction(
  stage: string,
  revenueGap: number,
  customerGap: number,
  revenueProgress: number,
  customerProgress: number,
): {
  action: CommercialNextAction;
  priority: "normal" | "high" | "critical";
  reason: string;
} {
  if (
    revenueGap <= 0 &&
    customerGap <= 0
  ) {
    return {
      action: "complete",
      priority: "normal",
      reason:
        "Revenue and customer targets have been reached.",
    };
  }

  if (
    stage === "idea" ||
    stage === "validation"
  ) {
    return {
      action: "validate",
      priority: "high",
      reason:
        "The commercial objective still requires a verified market signal.",
    };
  }

  if (
    stage === "acquisition"
  ) {
    return {
      action: "acquire",
      priority:
        customerGap > 0
          ? "high"
          : "normal",
      reason:
        "The current bottleneck is generating qualified customer demand.",
    };
  }

  if (
    stage === "conversion"
  ) {
    return {
      action: "convert",
      priority:
        revenueGap > 0
          ? "high"
          : "normal",
      reason:
        "Demand exists but measurable revenue remains below target.",
    };
  }

  if (
    stage === "delivery"
  ) {
    return {
      action: "deliver",
      priority: "high",
      reason:
        "Commercial value must be delivered before retention or scaling.",
    };
  }

  if (
    stage === "retention"
  ) {
    return {
      action: "retain",
      priority:
        customerGap > 0
          ? "high"
          : "normal",
      reason:
        "The next commercial leverage point is retention and repeat value.",
    };
  }

  if (
    stage === "scaling"
  ) {
    return {
      action: "scale",
      priority:
        revenueGap > 0
          ? "high"
          : "normal",
      reason:
        "The objective has validated demand and now requires scalable execution.",
    };
  }

  if (
    revenueGap > 0 &&
    revenueProgress < customerProgress
  ) {
    return {
      action: "convert",
      priority: "high",
      reason:
        "Customer progress is ahead of revenue progress, so conversion is the current gap.",
    };
  }

  return {
    action: "acquire",
    priority:
      customerGap > 0
        ? "high"
        : "normal",
    reason:
      "Customer progress remains the primary measurable commercial gap.",
  };
}

function buildTaskTitle(
  objectiveTitle: string,
  action: CommercialNextAction,
): string {
  const labels: Record<
    CommercialNextAction,
    string
  > = {
    validate:
      "Validate commercial opportunity",
    acquire:
      "Acquire qualified customers",
    convert:
      "Convert demand into revenue",
    deliver:
      "Deliver commercial value",
    retain:
      "Retain and expand customers",
    scale:
      "Scale commercial execution",
    complete:
      "Verify commercial objective completion",
  };

  return `Commercial next action: ${labels[action]} — ${objectiveTitle}`;
}

function buildTaskDescription(
  objectiveTitle: string,
  gap: CommercialGap,
): string {
  return [
    `Commercial Objective: ${objectiveTitle}`,
    `Next Action: ${gap.action}`,
    `Revenue Gap: ${gap.revenueGap}`,
    `Customer Gap: ${gap.customerGap}`,
    `Cost Variance: ${gap.costVariance}`,
    `Revenue Progress: ${gap.revenueProgress}%`,
    `Customer Progress: ${gap.customerProgress}%`,
    `Priority: ${gap.priority}`,
    "",
    `Reason: ${gap.reason}`,
    "",
    "Execute the action through AIOS Runtime.",
    "Only verified business results may update commercial actuals.",
  ].join("\n");
}

export async function getCommercialGap(
  objectiveId: string,
): Promise<CommercialGap> {
  const objective =
    await getCommercialObjective(
      objectiveId,
    );

  if (!objective) {
    throw new Error(
      "COMMERCIAL_OBJECTIVE_NOT_FOUND",
    );
  }

  const revenueGap =
    normalizeMoney(
      Math.max(
        0,
        objective.revenueTarget -
          objective.revenueActual,
      ),
    );

  const customerGap =
    Math.max(
      0,
      objective.customerTarget -
        objective.customerActual,
    );

  const costVariance =
    normalizeMoney(
      Math.max(
        0,
        objective.costActual -
          objective.costTarget,
      ),
    );

  const revenueProgress =
    calculateProgress(
      objective.revenueActual,
      objective.revenueTarget,
    );

  const customerProgress =
    calculateProgress(
      objective.customerActual,
      objective.customerTarget,
    );

  const resolved =
    resolveAction(
      objective.stage,
      revenueGap,
      customerGap,
      revenueProgress,
      customerProgress,
    );

  return {
    objectiveId,
    revenueGap,
    customerGap,
    costVariance,
    revenueProgress,
    customerProgress,
    action: resolved.action,
    priority: resolved.priority,
    reason: resolved.reason,
  };
}

export async function ensureCommercialNextAction(
  objectiveId: string,
): Promise<CommercialNextActionResult> {
  const objective =
    await getCommercialObjective(
      objectiveId,
    );

  if (!objective) {
    throw new Error(
      "COMMERCIAL_OBJECTIVE_NOT_FOUND",
    );
  }

  const gap =
    await getCommercialGap(
      objectiveId,
    );

  const tasks =
    await listPersistentTasks();

  const taskTitle =
    buildTaskTitle(
      objective.title,
      gap.action,
    );

  const existing =
    tasks.find(
      (task) =>
        task.status !== "done" &&
        task.title === taskTitle,
    );

  if (existing) {
    return {
      success: true,
      objectiveId,
      action: gap.action,
      taskId: existing.id,
      reused: true,
      gap,
      timestamp: Date.now(),
    };
  }

  const task =
    await createPersistentTask(
      taskTitle,
      buildTaskDescription(
        objective.title,
        gap,
      ),
    );

  return {
    success: true,
    objectiveId,
    action: gap.action,
    taskId: task.id,
    reused: false,
    gap,
    timestamp: Date.now(),
  };
}
