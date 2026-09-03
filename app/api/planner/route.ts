import { NextRequest, NextResponse } from "next/server";

import { APP_CONFIG } from "@/lib/app-config";
import { executeRuntime } from "@/lib/runtime/execute";
import { buildRuntimePlan } from "@/lib/runtime/plan";
import {
  createPersistentTask,
  listPersistentTasks,
} from "@/lib/task/server-store";
import type { Task } from "@/lib/task/types";
import {
  buildPlannerDevelopmentIntent,
  buildDevelopmentMetadata,
} from "@/lib/planner/development-intent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_GOAL_LENGTH = 1000;
const MAX_MATERIALIZED_TASKS = 8;

type PlannerMode = "plan" | "execute";

function normalizeGoal(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_GOAL_LENGTH);
}

function normalizeMode(value: unknown): PlannerMode {
  return value === "execute" ? "execute" : "plan";
}

function getTaskStatus(task: Task): string {
  return String(task.status ?? "").toLowerCase();
}

function materializePlanTasks(
  planId: string,
  goal: string,
  steps: string[],
): Task[] {
  const createdTasks: Task[] = [];

  for (
    let index = 0;
    index < steps.length && createdTasks.length < MAX_MATERIALIZED_TASKS;
    index += 1
  ) {
    const step = String(steps[index] ?? "").trim();

    if (!step) {
      continue;
    }

    const developmentIntent = buildPlannerDevelopmentIntent({
      goal,
      step,
    });

    const developmentMetadata =
      buildDevelopmentMetadata(developmentIntent);

    const description = [
      `Planner Plan: ${planId}`,
      `Final Goal: ${goal}`,
      `Stage: ${index + 1}/${steps.length}`,
      `Action: ${step}`,
      developmentMetadata,
    ]
      .filter(Boolean)
      .join("\n");

    const task = createPersistentTask({
      title: step,
      description,
    });

    createdTasks.push(task);
  }

  return createdTasks;
}

function buildPlannerResponse(
  goal: string,
  mode: PlannerMode,
  plan: {
    id?: string;
    steps?: string[];
    [key: string]: unknown;
  },
  tasks: Task[],
) {
  return {
    success: true,
    service: APP_CONFIG.name,
    stage: APP_CONFIG.stage,
    version: APP_CONFIG.version,
    mode,
    goal,
    plan,
    tasks,
  };
}

export async function GET() {
  try {
    const tasks = listPersistentTasks();

    return NextResponse.json({
      success: true,
      service: APP_CONFIG.name,
      stage: APP_CONFIG.stage,
      version: APP_CONFIG.version,
      mode: "plan",
      tasks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code: "PLANNER_READ_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Failed to read Planner tasks.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const goal = normalizeGoal(body?.goal);
    const mode = normalizeMode(body?.mode);

    if (!goal) {
      return NextResponse.json(
        {
          success: false,
          code: "PLANNER_GOAL_REQUIRED",
          error: "Planner goal is required.",
        },
        { status: 400 },
      );
    }

    const runtimeInput = {
      goal,
      mode,
    };

    const runtimePlan = await buildRuntimePlan(runtimeInput);

    const planId =
      typeof runtimePlan?.id === "string"
        ? runtimePlan.id
        : `planner-${Date.now()}`;

    const steps = Array.isArray(runtimePlan?.steps)
      ? runtimePlan.steps
          .map((step) => String(step ?? "").trim())
          .filter(Boolean)
      : [];

    if (!steps.length) {
      return NextResponse.json(
        {
          success: false,
          code: "PLANNER_NO_STEPS",
          error: "Planner did not produce any executable steps.",
        },
        { status: 422 },
      );
    }

    let tasks: Task[] = [];

    if (mode === "execute") {
      tasks = materializePlanTasks(
        planId,
        goal,
        steps,
      );
    }

    const plan = {
      ...runtimePlan,
      id: planId,
      steps,
    };

    if (mode === "execute") {
      const executionResult = await executeRuntime({
        goal,
        plan,
        tasks,
      });

      return NextResponse.json({
        ...buildPlannerResponse(
          goal,
          mode,
          plan,
          tasks,
        ),
        execution: executionResult,
      });
    }

    return NextResponse.json(
      buildPlannerResponse(
        goal,
        mode,
        plan,
        tasks,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code: "PLANNER_EXECUTION_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Planner execution failed.",
      },
      { status: 500 },
    );
  }
}
