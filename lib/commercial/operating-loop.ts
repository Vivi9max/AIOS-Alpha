import {
  createCommercialObjective,
  getCommercialObjective,
  updateCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  createOutcome,
  updateOutcome,
} from "@/lib/outcome/store";

import {
  createPersistentTask,
} from "@/lib/task/server-store";

export interface CommercialOperatingLoopResult {
  success: boolean;
  objectiveId: string;
  outcomeId: string;
  taskId: string;
  milestoneId: string | null;
  stage: "commercial-objective" | "outcome" | "task" | "linked";
  reused: boolean;
}

function buildTaskTitle(
  title: string,
): string {
  return `Commercial execution: ${title}`;
}

function buildTaskDescription(
  title: string,
  description: string,
  successCriteria: string,
): string {
  return [
    `Commercial Objective: ${title}`,
    description
      ? `Description: ${description}`
      : "",
    `Success Criteria: ${successCriteria}`,
    "",
    "This task exists to create measurable commercial progress.",
    "Execution results must be verified before commercial actuals are updated.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function ensureCommercialOperatingLoop(
  objectiveId: string,
): Promise<CommercialOperatingLoopResult> {
  const objective =
    await getCommercialObjective(
      objectiveId,
    );

  if (!objective) {
    throw new Error(
      "COMMERCIAL_OBJECTIVE_NOT_FOUND",
    );
  }

  /*
   * Existing linked objective:
   * do not create another execution chain.
   */
  if (
    objective.outcomeId &&
    objective.taskId
  ) {
    return {
      success: true,
      objectiveId: objective.id,
      outcomeId: objective.outcomeId,
      taskId: objective.taskId,
      milestoneId: null,
      stage: "linked",
      reused: true,
    };
  }

  const outcome =
    objective.outcomeId
      ? null
      : await createOutcome({
          title: objective.title,
          description:
            objective.description,
          successCriteria:
            objective.successCriteria,
          priority:
            objective.revenueTarget > 0 ||
            objective.customerTarget > 0
              ? "high"
              : "normal",
          targetDate: null,
          milestones: [
            {
              title: "Validate commercial opportunity",
              description:
                "Produce the first verified signal that the objective can generate measurable demand or revenue.",
            },
            {
              title: "Execute commercial action",
              description:
                "Run the concrete acquisition, conversion, delivery, or retention action required by the current stage.",
            },
            {
              title: "Verify business result",
              description:
                "Record verified revenue, customer, or other measurable commercial progress.",
            },
          ],
        });

  const resolvedOutcomeId =
    objective.outcomeId ??
    outcome?.id;

  if (!resolvedOutcomeId) {
    throw new Error(
      "COMMERCIAL_OUTCOME_CREATION_FAILED",
    );
  }

  if (
    !objective.outcomeId
  ) {
    await updateOutcome(
      resolvedOutcomeId,
      {
        status: "active",
      },
    );
  }

  const task =
    objective.taskId
      ? null
      : await createPersistentTask(
          buildTaskTitle(
            objective.title,
          ),
          buildTaskDescription(
            objective.title,
            objective.description,
            objective.successCriteria,
          ),
        );

  const resolvedTaskId =
    objective.taskId ??
    task?.id;

  if (!resolvedTaskId) {
    throw new Error(
      "COMMERCIAL_TASK_CREATION_FAILED",
    );
  }

  const linkedOutcome =
    await updateOutcome(
      resolvedOutcomeId,
      {
        status: "active",
        taskIds: [
          resolvedTaskId,
        ],
      },
    );

  if (!linkedOutcome) {
    throw new Error(
      "COMMERCIAL_OUTCOME_LINK_FAILED",
    );
  }

  const firstMilestone =
    linkedOutcome.milestones[0];

  let milestoneId:
    string | null = null;

  if (firstMilestone) {
    milestoneId =
      firstMilestone.id;

    /*
     * The first milestone becomes the
     * current execution checkpoint.
     *
     * We intentionally keep the rest of
     * the Outcome lifecycle intact.
     */
    const {
      updateOutcomeMilestone,
    } = await import(
      "@/lib/outcome/store"
    );

    const updated =
      await updateOutcomeMilestone(
        resolvedOutcomeId,
        firstMilestone.id,
        {
          status: "active",
          taskIds: [
            resolvedTaskId,
          ],
        },
      );

    if (!updated) {
      throw new Error(
        "COMMERCIAL_MILESTONE_LINK_FAILED",
      );
    }
  }

  await updateCommercialObjective(
    objective.id,
    {
      status: "active",
      outcomeId:
        resolvedOutcomeId,
      taskId:
        resolvedTaskId,
    },
  );

  return {
    success: true,
    objectiveId: objective.id,
    outcomeId: resolvedOutcomeId,
    taskId: resolvedTaskId,
    milestoneId,
    stage: "linked",
    reused:
      Boolean(
        objective.outcomeId &&
        objective.taskId,
      ),
  };
}
