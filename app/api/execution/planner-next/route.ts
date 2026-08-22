import { NextRequest, NextResponse } from "next/server";

import { AIOS_USER_COOKIE, resolveAlphaIdentity } from "@/lib/auth/identity";
import { runWithUserContext } from "@/lib/runtime/request-context";
import { buildExecutionPlan } from "@/lib/planner/execution-engine";
import { listOutcomes, updateOutcomeMilestone } from "@/lib/outcome/store";
import { listPersistentTasks, updatePersistentTask } from "@/lib/task/server-store";
import type { Task } from "@/lib/task/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlanId = "alpha" | "free" | "pro" | "business";
type Outcomes = Awaited<ReturnType<typeof listOutcomes>>;
type Outcome = Outcomes[number];
type OutcomeMilestone = Outcome["milestones"][number];

function resolvePlanId(value: unknown): PlanId {
  return value === "alpha" || value === "free" || value === "pro" || value === "business"
    ? value
    : "alpha";
}

function response(body: Record<string, unknown>, userId: string, status = 200) {
  const res = NextResponse.json({ ...body, timestamp: Date.now() }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
  res.cookies.set(AIOS_USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

function selectOutcome(outcomes: Outcomes, id: string): Outcome | null {
  if (id) return outcomes.find((item) => item.id === id) ?? null;
  return outcomes.find((item) => item.status === "active")
    ?? outcomes.find((item) => item.status === "planned")
    ?? outcomes.find((item) => item.status === "blocked")
    ?? null;
}

function linkedTasks(outcome: Outcome, tasks: Task[]) {
  const ids = new Set([
    ...outcome.taskIds,
    ...outcome.milestones.flatMap((milestone) => milestone.taskIds),
  ]);
  return ids.size ? tasks.filter((task) => ids.has(task.id)) : [];
}

function plannerOutcome(outcome: Outcome) {
  return {
    id: outcome.id,
    title: outcome.title,
    description: outcome.description,
    successCriteria: outcome.successCriteria,
    status: outcome.status,
    priority: outcome.priority,
    progress: outcome.progress,
    milestones: outcome.milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      order: milestone.order,
      status: milestone.status === "blocked" ? ("pending" as const) : milestone.status,
      taskIds: milestone.taskIds,
    })),
    taskIds: outcome.taskIds,
  };
}

function milestoneDone(milestone: OutcomeMilestone, tasks: Task[]) {
  if (!milestone.taskIds.length) return false;
  const done = new Set(tasks.filter((task) => task.status === "done").map((task) => task.id));
  return milestone.taskIds.every((id) => done.has(id));
}

export async function GET(request: NextRequest) {
  const identity = resolveAlphaIdentity(request);
  const requestedOutcomeId = request.nextUrl.searchParams.get("outcomeId")?.trim() ?? "";

  try {
    const result = await runWithUserContext(identity.userId, async () => {
      const [outcomes, tasks] = await Promise.all([listOutcomes(), listPersistentTasks()]);
      const outcome = selectOutcome(outcomes, requestedOutcomeId);
      if (!outcome) {
        return {
          found: false,
          outcome: null,
          nextTask: null,
          progress: 0,
          completedTasks: 0,
          remainingTasks: 0,
          queueSize: 0,
        };
      }
      const plan = buildExecutionPlan(plannerOutcome(outcome), linkedTasks(outcome, tasks));
      return {
        found: true,
        outcome: { id: outcome.id, title: outcome.title, status: outcome.status, priority: outcome.priority },
        nextTask: plan.nextTask
          ? { id: plan.nextTask.id, title: plan.nextTask.title, description: plan.nextTask.description ?? "", status: plan.nextTask.status }
          : null,
        progress: plan.progress,
        completedTasks: plan.completedTasks,
        remainingTasks: plan.remainingTasks,
        queueSize: plan.queue.length,
      };
    });
    return response({ success: true, ...result, identity: { userId: identity.userId, isolated: true } }, identity.userId);
  } catch (error) {
    return response({
      success: false,
      code: "PLANNER_EXECUTION_LOAD_ERROR",
      error: error instanceof Error ? error.message : "Planner execution state could not be loaded.",
    }, identity.userId, 500);
  }
}

export async function POST(request: NextRequest) {
  const identity = resolveAlphaIdentity(request);
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      outcomeId?: unknown;
      planId?: unknown;
      workspaceId?: unknown;
    };
    const planId = resolvePlanId(body.planId);
    const outcomeId = typeof body.outcomeId === "string" ? body.outcomeId.trim() : "";
    const workspaceId = typeof body.workspaceId === "string" && body.workspaceId.trim() ? body.workspaceId.trim() : "default";

    const [{ canUseCapability }, { reserveExecution }, jobStore, { executeRuntime }] = await Promise.all([
      import("@/lib/billing/entitlements"),
      import("@/lib/billing/execution-usage"),
      import("@/lib/execution/job-store"),
      import("@/lib/runtime/engine"),
    ]);

    const capability = canUseCapability(planId, "execution");
    if (!capability.allowed) {
      return response({
        success: false,
        requestId,
        code: "EXECUTION_CAPABILITY_DENIED",
        error: "Execution capability is not available for this plan.",
        entitlement: { planId, capability: "execution", allowed: false, reason: capability.reason },
      }, identity.userId, 403);
    }

    const result = await runWithUserContext(identity.userId, async () => {
      const [outcomes, allTasks] = await Promise.all([listOutcomes(), listPersistentTasks()]);
      const outcome = selectOutcome(outcomes, outcomeId);
      if (!outcome) {
        return { success: false, status: 404, code: "NO_ACTIVE_OUTCOME", error: "No active or planned Outcome is available for execution." };
      }

      const plan = buildExecutionPlan(plannerOutcome(outcome), linkedTasks(outcome, allTasks));
      const nextTask = plan.nextTask;
      if (!nextTask) {
        return {
          success: true,
          status: 200,
          code: "PLAN_COMPLETE",
          message: "All tasks in the current Planner queue are complete.",
          outcomeId: outcome.id,
          outcomeTitle: outcome.title,
          nextTask: null,
          progress: plan.progress,
          completedTasks: plan.completedTasks,
          remainingTasks: plan.remainingTasks,
          queueSize: plan.queue.length,
        };
      }

      const usage = await reserveExecution(planId);
      if (!usage.allowed) {
        return { success: false, status: 429, code: "EXECUTION_LIMIT_REACHED", error: "Daily execution limit reached.", usage };
      }

      const input = [
        `AIOS Planner Outcome: ${outcome.title}`,
        `Task: ${nextTask.title}`,
        nextTask.description ? `Task description: ${nextTask.description}` : "",
        `Success criteria: ${outcome.successCriteria}`,
        "Complete the task as far as the available AIOS runtime capabilities allow.",
        "Return a concise execution result suitable for task verification.",
      ].filter(Boolean).join("\n");

      const job = await jobStore.createExecutionJob({
        goal: `Execute Planner task: ${nextTask.title}`,
        planId,
        taskId: nextTask.id,
        input,
      });
      await jobStore.markExecutionJobRunning(job.id);
      if (nextTask.status === "todo") await updatePersistentTask(nextTask.id, { status: "doing" });

      const runtime = await executeRuntime({ prompt: input });
      if (!runtime.success) {
        const failed = await jobStore.markExecutionJobFailed(job.id, runtime.error ?? "Planner task execution failed.");
        return {
          success: false,
          status: 502,
          code: "PLANNER_TASK_EXECUTION_FAILED",
          error: runtime.error ?? "Planner task execution failed.",
          outcomeId: outcome.id,
          taskId: nextTask.id,
          job: failed,
          execution: {
            requestId: runtime.requestId,
            provider: runtime.provider,
            fallbackUsed: runtime.fallbackUsed ?? false,
            latencyMs: runtime.latencyMs,
            capabilityTrace: runtime.capabilityTrace ?? [],
          },
          usage,
        };
      }

      const completedJob = await jobStore.markExecutionJobCompleted(job.id, runtime.content);
      const completedTask = await updatePersistentTask(nextTask.id, { status: "done" });
      const refreshedTasks = await listPersistentTasks();

      for (const milestone of outcome.milestones) {
        if (milestone.status !== "completed" && milestoneDone(milestone, refreshedTasks)) {
          await updateOutcomeMilestone(outcome.id, milestone.id, { status: "completed" });
        }
      }

      return {
        success: true,
        status: 200,
        code: "PLANNER_TASK_EXECUTED",
        outcomeId: outcome.id,
        outcomeTitle: outcome.title,
        taskId: nextTask.id,
        task: completedTask,
        job: completedJob,
        execution: {
          requestId: runtime.requestId,
          provider: runtime.provider,
          fallbackUsed: runtime.fallbackUsed ?? false,
          latencyMs: runtime.latencyMs,
          content: runtime.content,
          capabilityTrace: runtime.capabilityTrace ?? [],
        },
        usage,
        scope: { workspaceId },
      };
    });

    return response({ ...result, requestId, identity: { userId: identity.userId, isolated: true } }, identity.userId, result.status ?? 200);
  } catch (error) {
    return response({
      success: false,
      requestId,
      code: "PLANNER_TASK_EXECUTION_ERROR",
      error: error instanceof Error ? error.message : "Planner task execution failed.",
    }, identity.userId, 500);
  }
}
