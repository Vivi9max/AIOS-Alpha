import {
  evaluateAutonomyGate,
} from "@/lib/evolution/autonomy-gate";

import {
  createOutcome,
  getOutcome,
  updateOutcome,
  updateOutcomeMilestone,
} from "@/lib/outcome/store";

import {
  createPersistentTask,
  findDuplicateActiveTask,
  listPersistentTasks,
  updatePersistentTask,
} from "@/lib/task/server-store";

import {
  addAndSaveExecutionMemory,
} from "@/lib/memory/execution-memory";

import {
  appendExecutionLedger,
} from "@/lib/planner/execution-ledger";

import {
  runAutonomousLoopRegression,
} from "@/lib/runtime/autonomous-loop-regression";

export type AutonomousTaskLifecycleStatus =
  | "completed"
  | "blocked"
  | "failed";

export interface AutonomousTaskLifecycleResult {
  success: boolean;
  status: AutonomousTaskLifecycleStatus;
  lifecycleId: string;
  message: string;
  outcomeId: string | null;
  taskId: string | null;
  evidenceId: string | null;

  gate: {
    ready: boolean;
    level: string;
    decision: string;
    blockers: string[];
  };

  execution: {
    started: boolean;
    completed: boolean;
    verificationPassed: boolean;
  };

  timestamp: number;
}

export interface AutonomousTaskLifecycleInput {
  title?: string;
  description?: string;
  successCriteria?: string;

  /*
   * C142.11.5
   *
   * When the Work Queue has already materialized the Task,
   * Lifecycle must continue that existing Outcome/Milestone
   * instead of creating a second Outcome.
   */
  taskId?: string;
  outcomeId?: string;
  milestoneId?: string;
}

function createLifecycleId(): string {
  return [
    "autonomous-lifecycle",
    Date.now(),
    Math.random().toString(36).slice(2, 9),
  ].join("-");
}

function normalizeText(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function gateSnapshot(
  gate: Awaited<
    ReturnType<typeof evaluateAutonomyGate>
  >,
) {
  return {
    ready: gate.ready,
    level: gate.level,
    decision: gate.decision,
    blockers: gate.blockers,
  };
}

export async function runAutonomousTaskLifecycle(
  input: AutonomousTaskLifecycleInput = {},
): Promise<AutonomousTaskLifecycleResult> {
  const lifecycleId = createLifecycleId();

  const title =
    normalizeText(input.title, 200) ||
    "AIOS Autonomous Runtime Lifecycle";

  const description =
    normalizeText(input.description, 2000) ||
    "Bounded autonomous lifecycle execution task.";

  const successCriteria =
    normalizeText(input.successCriteria, 1000) ||
    "AIOS executes one bounded runtime operation, verifies the result, records evidence, and completes the linked work item only when verification passes.";

  let outcomeId: string | null =
    normalizeText(input.outcomeId, 200);

  let taskId: string | null =
    normalizeText(input.taskId, 200);

  const milestoneId: string | null =
    normalizeText(input.milestoneId, 200);

  try {
    /*
     * ------------------------------------------------------------
     * 1. Resolve the real persisted Task
     * ------------------------------------------------------------
     */

    const existingTasks =
      await listPersistentTasks();

    const existingDoing =
      existingTasks.find(
        (task) =>
          task.status === "doing" &&
          task.id !== taskId,
      );

    if (existingDoing) {
      const gate =
        await evaluateAutonomyGate();

      return {
        success: false,
        status: "blocked",
        lifecycleId,
        message:
          "An autonomous task is already running. The single-doing-task safety boundary is active.",
        outcomeId,
        taskId,
        evidenceId: null,
        gate: gateSnapshot(gate),
        execution: {
          started: false,
          completed: false,
          verificationPassed: false,
        },
        timestamp: Date.now(),
      };
    }

    let task =
      taskId
        ? (
            existingTasks.find(
              (item) =>
                item.id === taskId,
            ) ?? null
          )
        : null;

    /*
     * Backward-compatible fallback:
     * if Lifecycle is invoked without Queue lineage,
     * reuse/create a Task as before.
     */
    if (!task) {
      const duplicate =
        await findDuplicateActiveTask(
          title,
        );

      task =
        duplicate ??
        (await createPersistentTask(
          title,
          description,
        ));

      taskId = task.id;
    }

    /*
     * ------------------------------------------------------------
     * 2. Resolve existing Outcome
     * ------------------------------------------------------------
     *
     * C142.11.5:
     *
     * Queue-created work MUST reuse its Outcome.
     *
     * Only legacy/direct Lifecycle calls without outcomeId
     * may create an Outcome.
     */

    let outcome =
      outcomeId
        ? await getOutcome(
            outcomeId,
          )
        : null;

    if (!outcome) {
      /*
       * Legacy/direct invocation path.
       *
       * This preserves the existing Runtime API while preventing
       * Queue → Lifecycle from creating duplicate Outcomes.
       */
      outcome =
        await createOutcome({
          title,
          description,
          successCriteria,
          priority: "normal",
          milestones: [
            {
              title:
                "Execute and verify",
              description:
                "Execute one bounded runtime operation and verify its result.",
            },
          ],
        });

      outcomeId =
        outcome.id;

      await updateOutcome(
        outcome.id,
        {
          status: "active",
          taskIds: [
            task.id,
          ],
        },
      );

      /*
       * If a direct lifecycle created its own Outcome,
       * bind its first milestone to the Task.
       */
      const firstMilestone =
        outcome.milestones[0];

      if (firstMilestone) {
        await updateOutcomeMilestone(
          outcome.id,
          firstMilestone.id,
          {
            status: "active",
            taskIds: [
              task.id,
            ],
          },
        );
      }

      outcome =
        (await getOutcome(
          outcome.id,
        )) ?? outcome;
    } else {
      /*
       * Queue lineage path.
       *
       * Never create another Outcome.
       */
      await updateOutcome(
        outcome.id,
        {
          status: "active",
          taskIds: Array.from(
            new Set([
              ...outcome.taskIds,
              task.id,
            ]),
          ),
        },
      );

      outcome =
        (await getOutcome(
          outcome.id,
        )) ?? outcome;
    }

    /*
     * ------------------------------------------------------------
     * 3. Re-read persisted state before Safety Gate
     * ------------------------------------------------------------
     */

    const gate =
      await evaluateAutonomyGate();

    const persistedTasks =
      await listPersistentTasks();

    const currentTask =
      persistedTasks.find(
        (item) =>
          item.id === task.id,
      );

    await appendExecutionLedger({
      action: "task-create",
      decision:
        gate.ready
          ? "allowed"
          : "blocked",
      mode: "baseline",
      code:
        gate.ready
          ? null
          : "AUTONOMY_GATE_NOT_READY",
      message:
        outcomeId ===
          input.outcomeId
          ? "C142.11.5 continued an existing Queue Outcome without creating a duplicate Outcome."
          : "Autonomous lifecycle resolved its execution lineage.",
      taskId:
        task.id,
      taskTitle:
        task.title,
      outcomeId:
        outcome.id,
      maxConcurrentTasks: 1,
      doingCount:
        persistedTasks.filter(
          (item) =>
            item.status ===
            "doing",
        ).length,
    });

    if (!gate.ready) {
      const evidence =
        await addAndSaveExecutionMemory({
          eventType:
            "planner-inspected",
          source: "runtime",
          title:
            "Autonomous lifecycle blocked by Safety Gate",
          summary:
            gate.blockers.join(" ") ||
            "Safety Gate did not permit execution.",
          outcome,
          task:
            currentTask ??
            task,
          outcomeId:
            outcome.id,
          taskId:
            task.id,
          metadata: {
            lifecycleId,
            queueLineage:
              Boolean(
                input.outcomeId,
              ),
            milestoneId,
            gateDecision:
              gate.decision,
            gateLevel:
              gate.level,
          },
          success: false,
        });

      await updatePersistentTask(
        task.id,
        {
          status: "todo",
        },
      );

      await updateOutcome(
        outcome.id,
        {
          status: "blocked",
        },
      );

      return {
        success: false,
        status: "blocked",
        lifecycleId,
        message:
          gate.blockers.join(" ") ||
          "Safety Gate did not permit autonomous execution.",
        outcomeId:
          outcome.id,
        taskId:
          task.id,
        evidenceId:
          evidence.id,
        gate:
          gateSnapshot(gate),
        execution: {
          started: false,
          completed: false,
          verificationPassed: false,
        },
        timestamp: Date.now(),
      };
    }

    /*
     * ------------------------------------------------------------
     * 4. Start Task
     * ------------------------------------------------------------
     */

    const started =
      await updatePersistentTask(
        task.id,
        {
          status: "doing",
        },
      );

    if (!started) {
      throw new Error(
        "AUTONOMOUS_TASK_START_FAILED",
      );
    }

    await appendExecutionLedger({
      action: "task-start",
      decision: "allowed",
      mode: "baseline",
      message:
        "Safety Gate permitted one autonomous task to start.",
      taskId:
        started.id,
      taskTitle:
        started.title,
      outcomeId:
        outcome.id,
      maxConcurrentTasks: 1,
      doingCount: 1,
    });

    await addAndSaveExecutionMemory({
      eventType:
        "task-started",
      source: "runtime",
      title:
        "Autonomous task started",
      summary:
        "One bounded autonomous task entered the doing state after Safety Gate approval.",
      outcome,
      task: started,
      outcomeId:
        outcome.id,
      taskId:
        started.id,
      metadata: {
        lifecycleId,
        queueLineage:
          Boolean(
            input.outcomeId,
          ),
        milestoneId,
        gateDecision:
          gate.decision,
        gateLevel:
          gate.level,
      },
      success: true,
    });

    /*
     * ------------------------------------------------------------
     * 5. Execute + Verify
     * ------------------------------------------------------------
     */

    const executionStartedAt =
      Date.now();

    const verification =
      await runAutonomousLoopRegression();

    const executionLatency =
      Date.now() -
      executionStartedAt;

    const verificationPassed =
      verification.success &&
      verification.status !==
        "failed";

    const currentTasks =
      await listPersistentTasks();

    const completedTaskCount =
      currentTasks.filter(
        (item) =>
          item.status ===
          "done",
      ).length;

    /*
     * ------------------------------------------------------------
     * 6. Verification failure
     * ------------------------------------------------------------
     */

    if (!verificationPassed) {
      await updatePersistentTask(
        started.id,
        {
          status: "todo",
        },
      );

      await updateOutcome(
        outcome.id,
        {
          status: "blocked",
        },
      );

      await appendExecutionLedger({
        action: "task-update",
        decision: "allowed",
        mode: "baseline",
        code:
          "AUTONOMOUS_EXECUTION_VERIFICATION_FAILED",
        message:
          "Bounded autonomous execution completed, but verification did not pass. Task remains available for a future retry.",
        taskId:
          started.id,
        taskTitle:
          started.title,
        outcomeId:
          outcome.id,
        maxConcurrentTasks: 1,
        doingCount: 0,
      });

      const evidence =
        await addAndSaveExecutionMemory({
          eventType:
            "execution-failed",
          source: "runtime",
          title:
            "Autonomous lifecycle verification failed",
          summary:
            "Bounded execution completed, but Autonomous Loop Regression did not pass.",
          outcome,
          task: started,
          outcomeId:
            outcome.id,
          taskId:
            started.id,
          latencyMs:
            executionLatency,
          completedTaskCount,
          remainingTaskCount: 1,
          queueSize: 1,
          metadata: {
            lifecycleId,
            queueLineage:
              Boolean(
                input.outcomeId,
              ),
            milestoneId,
            regressionStatus:
              verification.status,
            regressionScore:
              verification.score,
          },
          success: false,
        });

      return {
        success: false,
        status: "failed",
        lifecycleId,
        message:
          "Autonomous execution completed, but verification failed. The task remains available for a future autonomous retry.",
        outcomeId:
          outcome.id,
        taskId:
          started.id,
        evidenceId:
          evidence.id,
        gate:
          gateSnapshot(gate),
        execution: {
          started: true,
          completed: false,
          verificationPassed: false,
        },
        timestamp: Date.now(),
      };
    }

    /*
     * ------------------------------------------------------------
     * 7. Complete Task
     * ------------------------------------------------------------
     */

    const completed =
      await updatePersistentTask(
        started.id,
        {
          status: "done",
        },
      );

    if (!completed) {
      throw new Error(
        "AUTONOMOUS_TASK_COMPLETION_FAILED",
      );
    }

    /*
     * ------------------------------------------------------------
     * 8. Complete Milestone
     * ------------------------------------------------------------
     */

    let finalOutcome =
      await getOutcome(
        outcome.id,
      );

    const linkedMilestone =
      milestoneId
        ? finalOutcome?.milestones.find(
            (milestone) =>
              milestone.id ===
              milestoneId,
          )
        : finalOutcome?.milestones.find(
            (milestone) =>
              milestone.taskIds.includes(
                completed.id,
              ),
          );

    if (linkedMilestone) {
      finalOutcome =
        (await updateOutcomeMilestone(
          outcome.id,
          linkedMilestone.id,
          {
            status:
              "completed",
            taskIds: [
              completed.id,
            ],
          },
        )) ??
        finalOutcome;
    } else {
      /*
       * Defensive fallback for direct Lifecycle invocation.
       */
      const fallbackMilestone =
        finalOutcome?.milestones.find(
          (milestone) =>
            milestone.status ===
              "active" &&
            milestone.taskIds.length ===
              0,
        );

      if (fallbackMilestone) {
        finalOutcome =
          (await updateOutcomeMilestone(
            outcome.id,
            fallbackMilestone.id,
            {
              status:
                "completed",
              taskIds: [
                completed.id,
              ],
            },
          )) ??
          finalOutcome;
      }
    }

    /*
     * updateOutcomeMilestone automatically advances Outcome
     * progress/status when all milestones are complete.
     */
    finalOutcome =
      (await getOutcome(
        outcome.id,
      )) ??
      finalOutcome;

    await appendExecutionLedger({
      action: "task-complete",
      decision: "allowed",
      mode: "baseline",
      message:
        "Autonomous task completed after bounded execution and verification.",
      taskId:
        completed.id,
      taskTitle:
        completed.title,
      outcomeId:
        outcome.id,
      maxConcurrentTasks: 1,
      doingCount: 0,
    });

    const evidence =
      await addAndSaveExecutionMemory({
        eventType:
          "execution-synced",
        source: "runtime",
        title:
          "Autonomous lifecycle completed",
        summary:
          "AIOS continued one existing Outcome lineage, executed one bounded runtime operation, verified it, completed the Task, and synchronized the linked Milestone and Outcome.",
        outcome:
          finalOutcome ??
          outcome,
        task: completed,
        outcomeId:
          outcome.id,
        taskId:
          completed.id,
        latencyMs:
          executionLatency,
        completedTaskCount:
          completedTaskCount + 1,
        remainingTaskCount: 0,
        queueSize: 0,
        metadata: {
          lifecycleId,
          queueLineage:
            Boolean(
              input.outcomeId,
            ),
          milestoneId:
            linkedMilestone?.id ??
            null,
          verificationStatus:
            verification.status,
          verificationScore:
            verification.score,
        },
        success: true,
      });

    return {
      success: true,
      status: "completed",
      lifecycleId,
      message:
        "C142.11.5 autonomous task lifecycle completed without creating a duplicate Outcome.",
      outcomeId:
        outcome.id,
      taskId:
        completed.id,
      evidenceId:
        evidence.id,
      gate:
        gateSnapshot(gate),
      execution: {
        started: true,
        completed: true,
        verificationPassed: true,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Autonomous lifecycle failed.";

    if (taskId) {
      try {
        await updatePersistentTask(
          taskId,
          {
            status: "todo",
          },
        );
      } catch {
        // Preserve original lifecycle error.
      }
    }

    if (outcomeId) {
      try {
        await updateOutcome(
          outcomeId,
          {
            status: "blocked",
          },
        );
      } catch {
        // Preserve original lifecycle error.
      }
    }

    return {
      success: false,
      status: "failed",
      lifecycleId,
      message,
      outcomeId,
      taskId,
      evidenceId: null,
      gate: {
        ready: false,
        level: "blocked",
        decision: "hold",
        blockers: [
          message,
        ],
      },
      execution: {
        started:
          Boolean(taskId),
        completed: false,
        verificationPassed: false,
      },
      timestamp: Date.now(),
    };
  }
}
