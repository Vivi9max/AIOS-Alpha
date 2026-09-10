import {
  evaluateAutonomyGate,
} from "@/lib/evolution/autonomy-gate";

import {
  createOutcome,
  updateOutcome,
} from "@/lib/outcome/store";

import {
  createPersistentTask,
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

/**
 * C142.10
 *
 * Establishes the first bounded end-to-end autonomous task lifecycle:
 *
 * CREATE OUTCOME
 * -> CREATE TODO TASK
 * -> SAFETY GATE
 * -> DOING
 * -> EXECUTE
 * -> VERIFY
 * -> DONE
 * -> EVIDENCE
 * -> COMPLETE OUTCOME
 *
 * The execution adapter used by this first lifecycle is the existing
 * Autonomous Loop Regression. This is intentionally deterministic and
 * bounded; it does not execute arbitrary code.
 */
export async function runAutonomousTaskLifecycle(
  input: AutonomousTaskLifecycleInput = {},
): Promise<AutonomousTaskLifecycleResult> {
  const timestamp = Date.now();
  const lifecycleId = createLifecycleId();

  const title =
    normalizeText(
      input.title,
      200,
    ) ||
    "AIOS Autonomous Runtime Lifecycle";

  const description =
    normalizeText(
      input.description,
      2000,
    ) ||
    "Bounded autonomous lifecycle verification task.";

  const successCriteria =
    normalizeText(
      input.successCriteria,
      1000,
    ) ||
    "Planner creates a task, Safety Gate permits exactly one execution, runtime executes it, verification passes, evidence is recorded, and the task is completed.";

  let outcomeId: string | null = null;
  let taskId: string | null = null;

  try {
    const existingTasks =
      await listPersistentTasks();

    const existingDoing =
      existingTasks.filter(
        (task) => task.status === "doing",
      );

    if (existingDoing.length > 0) {
      const gate = await evaluateAutonomyGate();

      return {
        success: false,
        status: "blocked",
        lifecycleId,
        message:
          "An autonomous task is already running. C142.10 preserves the single-doing-task safety boundary.",
        outcomeId: null,
        taskId: null,
        evidenceId: null,
        gate: {
          ready: gate.ready,
          level: gate.level,
          decision: gate.decision,
          blockers: gate.blockers,
        },
        execution: {
          started: false,
          completed: false,
          verificationPassed: false,
        },
        timestamp: Date.now(),
      };
    }

    const outcome =
      await createOutcome({
        title,
        description,
        successCriteria,
        priority: "normal",
        milestones: [
          {
            title: "Execute and verify",
            description:
              "Run one bounded autonomous runtime execution and verify the resulting evidence.",
          },
        ],
      });

    outcomeId = outcome.id;

    const task =
      await createPersistentTask(
        title,
        description,
      );

    taskId = task.id;

    await updateOutcome(
      outcome.id,
      {
        status: "active",
        taskIds: [task.id],
      },
    );

    const initialTasks =
      await listPersistentTasks();

    const initialGate =
      await evaluateAutonomyGate();

    await appendExecutionLedger({
      action: "task-create",
      decision:
        initialGate.ready
          ? "allowed"
          : "blocked",
      mode: "observation",
      code:
        initialGate.ready
          ? null
          : "AUTONOMY_GATE_NOT_READY",
      message:
        initialGate.ready
          ? "C142.10 created an autonomous lifecycle task and the Safety Gate permits execution."
          : "C142.10 created an autonomous lifecycle task, but the Safety Gate does not yet permit execution.",
      taskId: task.id,
      taskTitle: task.title,
      outcomeId: outcome.id,
      maxConcurrentTasks: 1,
      doingCount:
        initialTasks.filter(
          (item) => item.status === "doing",
        ).length,
    });

    if (!initialGate.ready) {
      await addAndSaveExecutionMemory({
        eventType: "planner-inspected",
        source: "runtime",
        title: "Autonomous lifecycle blocked by Safety Gate",
        summary:
          initialGate.blockers.join(" ") ||
          "Safety Gate did not permit execution.",
        outcome,
        task,
        outcomeId: outcome.id,
        taskId: task.id,
        metadata: {
          lifecycleId,
          gateDecision:
            initialGate.decision,
          gateLevel:
            initialGate.level,
        },
        success: false,
      });

      return {
        success: false,
        status: "blocked",
        lifecycleId,
        message:
          initialGate.blockers.join(" ") ||
          "Safety Gate did not permit autonomous execution.",
        outcomeId: outcome.id,
        taskId: task.id,
        evidenceId: null,
        gate: {
          ready: initialGate.ready,
          level: initialGate.level,
          decision: initialGate.decision,
          blockers: initialGate.blockers,
        },
        execution: {
          started: false,
          completed: false,
          verificationPassed: false,
        },
        timestamp: Date.now(),
      };
    }

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
      mode: "autonomous",
      message:
        "C142.10 Safety Gate permitted exactly one autonomous task to start.",
      taskId: started.id,
      taskTitle: started.title,
      outcomeId: outcome.id,
      maxConcurrentTasks: 1,
      doingCount: 1,
    });

    await addAndSaveExecutionMemory({
      eventType: "task-started",
      source: "runtime",
      title: "Autonomous task started",
      summary:
        "Safety Gate permitted one bounded autonomous task.",
      outcome,
      task: started,
      outcomeId: outcome.id,
      taskId: started.id,
      metadata: {
        lifecycleId,
        decision:
          initialGate.decision,
      },
      success: true,
    });

    const executionStartedAt =
      Date.now();

    const verification =
      await runAutonomousLoopRegression();

    const executionLatency =
      Date.now() -
      executionStartedAt;

    const verificationPassed =
      verification.success &&
      verification.status !== "failed";

    const completedTasksBefore =
      (
        await listPersistentTasks()
      ).filter(
        (item) =>
          item.status === "done",
      ).length;

    if (!verificationPassed) {
      await updatePersistentTask(
        started.id,
        {
          status: "todo",
        },
      );

      await appendExecutionLedger({
        action: "task-update",
        decision: "allowed",
        mode: "autonomous",
        code: "AUTONOMOUS_EXECUTION_VERIFICATION_FAILED",
        message:
          "Autonomous execution completed but verification did not pass.",
        taskId: started.id,
        taskTitle: started.title,
        outcomeId: outcome.id,
        maxConcurrentTasks: 1,
        doingCount: 0,
      });

      const failedEvidence =
        await addAndSaveExecutionMemory({
          eventType: "execution-failed",
          source: "runtime",
          title:
            "Autonomous lifecycle verification failed",
          summary:
            "The bounded execution completed, but Autonomous Loop Regression did not pass.",
          outcome,
          task: started,
          outcomeId: outcome.id,
          taskId: started.id,
          latencyMs:
            executionLatency,
          completedTaskCount:
            completedTasksBefore,
          remainingTaskCount: 1,
          queueSize: 1,
          metadata: {
            lifecycleId,
            regressionStatus:
              verification.status,
            regressionScore:
              verification.score,
          },
          success: false,
        });

      await updateOutcome(
        outcome.id,
        {
          status: "blocked",
        },
      );

      return {
        success: false,
        status: "failed",
        lifecycleId,
        message:
          "Autonomous execution completed, but verification failed. The task was not marked done.",
        outcomeId: outcome.id,
        taskId: started.id,
        evidenceId: failedEvidence.id,
        gate: {
          ready: initialGate.ready,
          level: initialGate.level,
          decision: initialGate.decision,
          blockers: initialGate.blockers,
        },
        execution: {
          started: true,
          completed: false,
          verificationPassed: false,
        },
        timestamp: Date.now(),
      };
    }

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

    const finalOutcome =
      await updateOutcome(
        outcome.id,
        {
          status: "completed",
          progress: 100,
        },
      );

    await appendExecutionLedger({
      action: "task-complete",
      decision: "allowed",
      mode: "autonomous",
      message:
        "C142.10 autonomous task completed after bounded execution and verification.",
      taskId: completed.id,
      taskTitle: completed.title,
      outcomeId: outcome.id,
      maxConcurrentTasks: 1,
      doingCount: 0,
    });

    const evidence =
      await addAndSaveExecutionMemory({
        eventType: "execution-synced",
        source: "runtime",
        title:
          "Autonomous lifecycle completed",
        summary:
          "AIOS created an Outcome and Task, passed the Safety Gate, executed one bounded runtime operation, verified it, completed the Task, and completed the Outcome.",
        outcome:
          finalOutcome ?? outcome,
        task: completed,
        outcomeId: outcome.id,
        taskId: completed.id,
        latencyMs:
          executionLatency,
        completedTaskCount:
          completedTasksBefore + 1,
        remainingTaskCount: 0,
        queueSize: 0,
        metadata: {
          lifecycleId,
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
        "C142.10 autonomous task lifecycle completed successfully.",
      outcomeId: outcome.id,
      taskId: completed.id,
      evidenceId: evidence.id,
      gate: {
        ready: initialGate.ready,
        level: initialGate.level,
        decision: initialGate.decision,
        blockers: initialGate.blockers,
      },
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
        // Preserve the original lifecycle error.
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
        // Preserve the original lifecycle error.
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
        started: Boolean(taskId),
        completed: false,
        verificationPassed: false,
      },
      timestamp: Date.now(),
    };
  }
}
