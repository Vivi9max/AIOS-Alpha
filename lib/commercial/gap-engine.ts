import {
  getCommercialObjective,
  updateCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  getOutcome,
  updateOutcome,
} from "@/lib/outcome/store";

import {
  listPersistentTasks,
  createPersistentTask,
} from "@/lib/task/server-store";

import type {
  Locale,
} from "@/lib/i18n";

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
  priority:
    | "normal"
    | "high"
    | "critical";
  reason: string;
}

export interface CommercialNextActionResult {
  success: boolean;
  objectiveId: string;
  action: CommercialNextAction;
  taskId: string;
  reused: boolean;
  gap: CommercialGap;
  linked: boolean;
  outcomeId: string | null;
  milestoneId: string | null;
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

function localizedReason(
  key:
    | "completed"
    | "validation"
    | "acquisition"
    | "conversion"
    | "delivery"
    | "retention"
    | "scaling"
    | "revenue-conversion"
    | "customer-gap",
  locale: Locale,
): string {
  if (locale === "zh-CN") {
    const reasons: Record<
      typeof key,
      string
    > = {
      completed:
        "收入和客户目标均已达到。",
      validation:
        "当前商业目标仍需要经过验证的市场信号。",
      acquisition:
        "当前主要瓶颈是获取符合条件的客户需求。",
      conversion:
        "已经存在客户需求，但可验证收入仍低于目标。",
      delivery:
        "在进入留存或规模化之前，需要先完成商业价值交付。",
      retention:
        "当前下一步商业增长点是客户留存和复购价值。",
      scaling:
        "需求已经得到验证，当前需要进入可规模化执行。",
      "revenue-conversion":
        "客户进展领先于收入进展，因此当前主要缺口是成交转化。",
      "customer-gap":
        "客户进展仍然是当前最主要的可衡量商业缺口。",
    };

    return reasons[key];
  }

  if (locale === "ja") {
    const reasons: Record<
      typeof key,
      string
    > = {
      completed:
        "収益目標と顧客目標の両方を達成しました。",
      validation:
        "現在の商業目標には、検証済みの市場シグナルがまだ必要です。",
      acquisition:
        "現在の主なボトルネックは、適切な顧客需要を獲得することです。",
      conversion:
        "顧客需要はありますが、検証可能な収益がまだ目標を下回っています。",
      delivery:
        "リテンションやスケールの前に、商業価値を提供する必要があります。",
      retention:
        "次の商業的な成長ポイントは、顧客維持とリピート価値です。",
      scaling:
        "需要は検証済みであり、現在はスケール可能な実行が必要です。",
      "revenue-conversion":
        "顧客の進捗が収益の進捗を上回っているため、現在の主なギャップはコンバージョンです。",
      "customer-gap":
        "顧客進捗が依然として最大の測定可能な商業ギャップです。",
    };

    return reasons[key];
  }

  const reasons: Record<
    typeof key,
    string
  > = {
    completed:
      "Revenue and customer targets have been reached.",
    validation:
      "The commercial objective still requires a verified market signal.",
    acquisition:
      "The current bottleneck is generating qualified customer demand.",
    conversion:
      "Demand exists but measurable revenue remains below target.",
    delivery:
      "Commercial value must be delivered before retention or scaling.",
    retention:
      "The next commercial leverage point is retention and repeat value.",
    scaling:
      "The objective has validated demand and now requires scalable execution.",
    "revenue-conversion":
      "Customer progress is ahead of revenue progress, so conversion is the current gap.",
    "customer-gap":
      "Customer progress remains the primary measurable commercial gap.",
  };

  return reasons[key];
}

function resolveAction(
  stage: string,
  revenueGap: number,
  customerGap: number,
  revenueProgress: number,
  customerProgress: number,
  locale: Locale,
): {
  action: CommercialNextAction;
  priority:
    | "normal"
    | "high"
    | "critical";
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
        localizedReason(
          "completed",
          locale,
        ),
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
        localizedReason(
          "validation",
          locale,
        ),
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
        localizedReason(
          "acquisition",
          locale,
        ),
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
        localizedReason(
          "conversion",
          locale,
        ),
    };
  }

  if (
    stage === "delivery"
  ) {
    return {
      action: "deliver",
      priority: "high",
      reason:
        localizedReason(
          "delivery",
          locale,
        ),
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
        localizedReason(
          "retention",
          locale,
        ),
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
        localizedReason(
          "scaling",
          locale,
        ),
    };
  }

  if (
    revenueGap > 0 &&
    revenueProgress <
      customerProgress
  ) {
    return {
      action: "convert",
      priority: "high",
      reason:
        localizedReason(
          "revenue-conversion",
          locale,
        ),
    };
  }

  return {
    action: "acquire",
    priority:
      customerGap > 0
        ? "high"
        : "normal",
    reason:
      localizedReason(
        "customer-gap",
        locale,
      ),
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
  locale: Locale = "en",
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
      locale,
    );

  return {
    objectiveId,
    revenueGap,
    customerGap,
    costVariance,
    revenueProgress,
    customerProgress,
    action:
      resolved.action,
    priority:
      resolved.priority,
    reason:
      resolved.reason,
  };
}

async function linkTaskToCommercialLoop(
  objectiveId: string,
  taskId: string,
): Promise<{
  outcomeId: string | null;
  milestoneId: string | null;
}> {
  const objective =
    await getCommercialObjective(
      objectiveId,
    );

  if (!objective) {
    throw new Error(
      "COMMERCIAL_OBJECTIVE_NOT_FOUND",
    );
  }

  if (!objective.outcomeId) {
    throw new Error(
      "COMMERCIAL_OUTCOME_NOT_LINKED",
    );
  }

  const outcome =
    await getOutcome(
      objective.outcomeId,
    );

  if (!outcome) {
    throw new Error(
      "COMMERCIAL_OUTCOME_NOT_FOUND",
    );
  }

  const existingOutcomeTask =
    outcome.taskIds.includes(
      taskId,
    );

  const milestone =
    outcome.milestones.find(
      (item) =>
        item.status ===
        "active",
    ) ??
    outcome.milestones.find(
      (item) =>
        item.status ===
        "pending",
    ) ??
    outcome.milestones[0];

  const nextOutcomeTaskIds =
    existingOutcomeTask
      ? outcome.taskIds
      : [
          ...outcome.taskIds,
          taskId,
        ];

  let updatedOutcome =
    outcome;

  if (
    !existingOutcomeTask ||
    (
      milestone &&
      !milestone.taskIds.includes(
        taskId,
      )
    )
  ) {
    const milestoneIds =
      new Set(
        milestone
          ? [
              ...milestone.taskIds,
              taskId,
            ]
          : [],
      );

    updatedOutcome =
      await updateOutcome(
        outcome.id,
        {
          taskIds:
            nextOutcomeTaskIds,
        },
      ) ??
      outcome;

    if (milestone) {
      const {
        updateOutcomeMilestone,
      } = await import(
        "@/lib/outcome/store"
      );

      updatedOutcome =
        await updateOutcomeMilestone(
          updatedOutcome.id,
          milestone.id,
          {
            taskIds:
              Array.from(
                milestoneIds,
              ),
          },
        ) ??
        updatedOutcome;
    }
  }

  const updatedObjective =
    await updateCommercialObjective(
      objective.id,
      {
        taskId,
      },
    );

  if (!updatedObjective) {
    throw new Error(
      "COMMERCIAL_OBJECTIVE_TASK_LINK_FAILED",
    );
  }

  return {
    outcomeId:
      updatedOutcome.id,
    milestoneId:
      milestone?.id ??
      null,
  };
}

export async function ensureCommercialNextAction(
  objectiveId: string,
  locale: Locale = "en",
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
      locale,
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
        task.title ===
          taskTitle,
    );

  if (existing) {
    const links =
      await linkTaskToCommercialLoop(
        objectiveId,
        existing.id,
      );

    return {
      success: true,
      objectiveId,
      action:
        gap.action,
      taskId:
        existing.id,
      reused: true,
      gap,
      linked: true,
      outcomeId:
        links.outcomeId,
      milestoneId:
        links.milestoneId,
      timestamp:
        Date.now(),
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

  const links =
    await linkTaskToCommercialLoop(
      objectiveId,
      task.id,
    );

  return {
    success: true,
    objectiveId,
    action:
      gap.action,
    taskId:
      task.id,
    reused: false,
    gap,
    linked: true,
    outcomeId:
      links.outcomeId,
    milestoneId:
      links.milestoneId,
    timestamp:
      Date.now(),
  };
}
