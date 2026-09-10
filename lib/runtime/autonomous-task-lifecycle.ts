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
    "AIOS creates one Outcome and one Task, passes the Safety Gate, executes one bounded runtime operation, verifies the result, records evidence, and completes the task.";

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
      const gate =
        await evaluateAutonomyGate();

      return {
        success: false,
        status: "blocked",
        lifecycleId,
        message:
          "An autonomous task is already running. The single-doing-task safety boundary is active.",
        outcomeId: null,
        taskId: null,
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
              "Execute one bounded runtime operation and verify its result.",
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

    /*
     * Re-read the real persisted state before execution.
     * The gate must evaluate the state that actually exists,
     * not the state that was assumed immediately after creation.
     */
    const gate =
      await evaluateAutonomyGate();

    const persistedTasks =
      await listPersistentTasks();

    const currentTask =
      persistedTasks.find(
        (item) => item.id === task.id,
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
        gate.ready
          ? "C142.10 created a task and the Safety Gate permits one bounded execution."
          : "C142.10 created a task, but the Safety Gate does not permit execution.",
      taskId: task.id,
      taskTitle: task.title,
      outcomeId: outcome.id,
      maxConcurrentTasks: 1,
      doingCount:
        persistedTasks.filter(
          (item) => item.status === "doing",
        ).length,
    });

    if (!gate.ready) {
      const evidence =
        await addAndSaveExecutionMemory({
          eventType: "planner-inspected",
          source: "runtime",
          title:
            "Autonomous lifecycle blocked by Safety Gate",
          summary:
            gate.blockers.join(" ") ||
            "Safety Gate did not permit execution.",
          outcome,
          task: currentTask ?? task,
          outcomeId: outcome.id,
          taskId: task.id,
          metadata: {
            lifecycleId,
            gateDecision: gate.decision,
            gateLevel: gate.level,
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
        status: "blocked",
        lifecycleId,
        message:
          gate.blockers.join(" ") ||
          "Safety Gate did not permit autonomous execution.",
        outcomeId: outcome.id,
        taskId: task.id,
        evidenceId: evidence.id,
        gate: gateSnapshot(gate),
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
      mode: "baseline",
      message:
        "Safety Gate permitted one autonomous task to start.",
      taskId: started.id,
      taskTitle: started.title,
      outcomeId: outcome.id,
      maxConcurrentTasks: 1,
      doingCount: 1,
    });

    await addAndSaveExecutionMemory({
      eventType: "task-started",
      source: "runtime",
      title:
        "Autonomous task started",
      summary:
        "One bounded autonomous task entered the doing state after Safety Gate approval.",
      outcome,
      task: started,
      outcomeId: outcome.id,
      taskId: started.id,
      metadata: {
        lifecycleId,
        gateDecision: gate.decision,
        gateLevel: gate.level,
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

    const currentTasks =
      await listPersistentTasks();

    const completedTaskCount =
      currentTasks.filter(
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
          "Bounded autonomous execution completed, but verification did not pass. Task was not marked done.",
        taskId: started.id,
        taskTitle: started.title,
        outcomeId: outcome.id,
        maxConcurrentTasks: 1,
        doingCount: 0,
      });

      const evidence =
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
          completedTaskCount,
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

      return {
        success: false,
        status: "failed",
        lifecycleId,
        message:
          "Autonomous execution completed, but verification failed. The task was not marked done.",
        outcomeId: outcome.id,
        taskId: started.id,
        evidenceId: evidence.id,
        gate: gateSnapshot(gate),
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
          taskIds: [completed.id],
        },
      );

    await appendExecutionLedger({
      action: "task-complete",
      decision: "allowed",
      mode: "baseline",
      message:
        "Autonomous task completed after bounded execution and verification.",
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
          completedTaskCount + 1,
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
      gate: gateSnapshot(gate),
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
        blockers: [message],
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
