import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

import {
  buildRuntimePlan,
} from "@/lib/runtime/planner";

import {
  createPersistentTask,
  listPersistentTasks,
} from "@/lib/task/server-store";

import type {
  Task,
} from "@/lib/task/types";

import {
  buildPlannerDevelopmentIntent,
  buildDevelopmentMetadata,
} from "@/lib/planner/development-intent";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const MAX_GOAL_LENGTH = 1000;
const MAX_MATERIALIZED_TASKS = 8;

type PlannerMode =
  | "plan"
  | "execute";

interface PlannerRequestBody {
  goal?: unknown;
  mode?: unknown;
}

interface GoalQuality {
  score: number;

  level:
    | "basic"
    | "clear"
    | "strong";

  hasResult: boolean;
  hasDeadline: boolean;
  hasSuccessMetric: boolean;
  hasConstraint: boolean;
}

interface MaterializedTask {
  id: string;
  title: string;
  status: Task["status"];
  created: boolean;
}

interface PlannerWorkflow {
  status: "ready";
  createdCount: number;
  reusedCount: number;
  taskCount: number;
  tasks: MaterializedTask[];
}

export async function GET() {
  return NextResponse.json({
    success: true,

    planner: {
      name:
        "AIOS Strategic Planner",

      version:
        APP_CONFIG.version,

      status: "online",

      modes: [
        "plan",
        "execute",
      ],

      capabilities: [
        "goal-understanding",
        "goal-quality-analysis",
        "intent-detection",
        "step-planning",
        "capability-routing",
        "runtime-execution",
        "task-materialization",
        "execution-trace",
        "development-intent-bridge",
      ],
    },

    limits: {
      maxGoalLength:
        MAX_GOAL_LENGTH,

      maxMaterializedTasks:
        MAX_MATERIALIZED_TASKS,
    },

    workflow: {
      sequence: [
        "goal",
        "plan",
        "tasks",
        "execution",
        "outcome",
      ],
    },

    timestamp:
      Date.now(),
  });
}

export async function POST(
  request: NextRequest
) {
  const startedAt =
    Date.now();

  try {
    const body =
      (await request.json()) as
        PlannerRequestBody;

    const goal =
      normalizeGoal(
        body.goal
      );

    const mode =
      normalizeMode(
        body.mode
      );

    const validationError =
      validateGoal(
        goal
      );

    if (
      validationError
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            validationError,

          code:
            "INVALID_GOAL",
        },
        {
          status: 400,
        }
      );
    }

    const goalQuality =
      analyzeGoalQuality(
        goal
      );

    const plan =
      buildRuntimePlan(
        goal
      );

    if (
      mode === "plan"
    ) {
      return NextResponse.json({
        success:
          true,

        mode:
          "plan",

        planner:
          "AIOS Strategic Planner",

        plan: {
          id:
            plan.id,

          type:
            plan.type,

          goal:
            plan.goal,

          intent:
            plan.intent,

          confidence:
            plan.confidence,

          capabilities:
            plan.capabilities,

          steps:
            plan.steps,

          responseMode:
            plan.responseMode,

          createdAt:
            plan.createdAt,
        },

        analysis: {
          goalQuality,

          complexity:
            calculateComplexity(
              plan.steps.length,
              plan.capabilities
                .length
            ),

          stageCount:
            plan.steps.length,

          capabilityCount:
            plan.capabilities
              .length,
        },

        execution:
          null,

        workflow:
          null,

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      });
    }

    const executionPrompt =
      buildExecutionPrompt({
        goal,

        plan: {
          type:
            plan.type,

          intent:
            plan.intent,

          capabilities:
            plan.capabilities,

          steps:
            plan.steps,
        },
      });

    const result =
      await executeRuntime({
        prompt:
          executionPrompt,
      });

    const finalPlan = {
      id:
        result.planId ??
        plan.id,

      type:
        result.planType ??
        plan.type,

      goal:
        result.goal ??
        plan.goal,

      intent:
        result.intent ??
        plan.intent,

      confidence:
        result.confidence ??
        plan.confidence,

      capabilities:
        result.capabilities ??
        plan.capabilities,

      steps:
        normalizePlanSteps(
          result.steps ??
            plan.steps
        ),

      responseMode:
        plan.responseMode,

      createdAt:
        plan.createdAt,
    };

    const workflow =
      result.success
        ? await materializePlanTasks({
            planId:
              finalPlan.id,

            goal:
              finalPlan.goal,

            steps:
              finalPlan.steps,
          })
        : createFailedWorkflow();

    return NextResponse.json({
      success:
        result.success,

      mode:
        "execute",

      planner:
        "AIOS Strategic Planner",

      plan:
        finalPlan,

      analysis: {
        goalQuality,

        complexity:
          calculateComplexity(
            finalPlan.steps
              .length,

            finalPlan
              .capabilities
              .length
          ),

        stageCount:
          finalPlan.steps
            .length,

        capabilityCount:
          finalPlan
            .capabilities
            .length,
      },

      execution: {
        requestId:
          result.requestId,

        status:
          result.success
            ? "completed"
            : "failed",

        provider:
          result.provider,

        fallbackUsed:
          result.fallbackUsed ??
          false,

        content:
          result.content,

        capabilityTrace:
          result.capabilityTrace ??
          [],

        latencyMs:
          result.latencyMs,
      },

      workflow,

      latencyMs:
        Date.now() -
        startedAt,

      timestamp:
        Date.now(),
    });
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Planner request failed.";

    return NextResponse.json(
      {
        success:
          false,

        error:
          message,

        code:
          "PLANNER_RUNTIME_ERROR",

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}

function normalizeGoal(
  value: unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .replace(
      /\r\n/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim()
    .slice(
      0,
      MAX_GOAL_LENGTH
    );
}

function normalizeMode(
  value: unknown
): PlannerMode {
  return value ===
    "execute"
    ? "execute"
    : "plan";
}

function validateGoal(
  goal: string
): string | null {
  if (!goal) {
    return "Please provide the outcome you want AIOS to achieve.";
  }

  if (
    goal.length < 4
  ) {
    return "The goal is too short. Please describe the desired outcome.";
  }

  if (
    goal.length >
    MAX_GOAL_LENGTH
  ) {
    return `The goal cannot exceed ${MAX_GOAL_LENGTH} characters.`;
  }

  return null;
}

function analyzeGoalQuality(
  goal: string
): GoalQuality {
  const hasResult =
    /完成|实现|获得|达到|建立|上线|发布|解决|提高|降低|验证|输出|生成|确定|完成|实现/.test(
      goal
    );

  const hasDeadline =
    /今天|明天|本周|下周|天内|周内|月内|小时内|之前|截止|日期|期限/.test(
      goal
    );

  const hasSuccessMetric =
    /至少|最多|不少于|不超过|百分比|%|用户|反馈|收入|转化|完成率|成功标准|指标/.test(
      goal
    );

  const hasConstraint =
    /预算|成本|手机|时间|限制|必须|不能|仅限|优先|风险|资源/.test(
      goal
    );

  let score =
    1;

  if (
    goal.length >=
    30
  ) {
    score +=
      1;
  }

  if (
    hasResult
  ) {
    score +=
      1;
  }

  if (
    hasDeadline
  ) {
    score +=
      1;
  }

  if (
    hasSuccessMetric
  ) {
    score +=
      1;
  }

  if (
    hasConstraint
  ) {
    score +=
      1;
  }

  const level =
    score >= 5
      ? "strong"
      : score >= 3
        ? "clear"
        : "basic";

  return {
    score,
    level,
    hasResult,
    hasDeadline,
    hasSuccessMetric,
    hasConstraint,
  };
}

function calculateComplexity(
  stepCount: number,
  capabilityCount: number
):
  | "low"
  | "medium"
  | "high" {
  const score =
    stepCount +
    capabilityCount;

  if (
    score >=
    9
  ) {
    return "high";
  }

  if (
    score >=
    5
  ) {
    return "medium";
  }

  return "low";
}

function normalizePlanSteps(
  steps: string[]
): string[] {
  const seen =
    new Set<string>();

  return steps
    .filter(
      (
        step
      ) =>
        typeof step ===
        "string"
    )
    .map(
      (
        step
      ) =>
        step
          .replace(
            /^\s*(?:步骤|阶段|phase)?\s*\d+[.、:：\-\)\]]*\s*/i,
            ""
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim()
    )
    .filter(
      (
        step
      ) => {
        if (
          !step
        ) {
          return false;
        }

        const key =
          step.toLowerCase();

        if (
          seen.has(
            key
          )
        ) {
          return false;
        }

        seen.add(
          key
        );

        return true;
      }
    )
    .slice(
      0,
      MAX_MATERIALIZED_TASKS
    );
}

async function materializePlanTasks({
  planId,
  goal,
  steps,
}: {
  planId: string;
  goal: string;
  steps: string[];
}): Promise<PlannerWorkflow> {
  const normalizedSteps =
    normalizePlanSteps(
      steps
    );

  const tasks:
    MaterializedTask[] =
    [];

  for (
    let index = 0;
    index <
    normalizedSteps.length;
    index += 1
  ) {
    const step =
      normalizedSteps[
        index
      ];

    const title =
      buildTaskTitle(
        step,
        index
      );

    const existing =
      await findReusableTask(
        title
      );

    if (
      existing
    ) {
      tasks.push({
        id:
          existing.id,

        title:
          existing.title,

        status:
          existing.status,

        created:
          false,
      });

      continue;
    }

    const developmentIntent =
      buildPlannerDevelopmentIntent(
        {
          goal,
          step,
        }
      );

    const developmentMetadata =
      buildDevelopmentMetadata(
        developmentIntent
      );

    const description = [
      `Planner Plan: ${planId}`,
      `Final Goal: ${goal}`,
      `Stage: ${index + 1}/${normalizedSteps.length}`,
      `Action: ${step}`,
      developmentMetadata,
    ]
      .filter(
        Boolean
      )
      .join(
        "\n"
      );

    try {
      const task =
        await createPersistentTask(
          title,
          description
        );

      tasks.push({
        id:
          task.id,

        title:
          task.title,

        status:
          task.status,

        created:
          true,
      });
    } catch (
      error
    ) {
      const duplicateId =
        extractDuplicateTaskId(
          error
        );

      if (
        !duplicateId
      ) {
        throw error;
      }

      const existingTasks =
        await listPersistentTasks();

      const duplicate =
        existingTasks.find(
          (
            task
          ) =>
            task.id ===
            duplicateId
        );

      if (
        !duplicate
      ) {
        throw error;
      }

      tasks.push({
        id:
          duplicate.id,

        title:
          duplicate.title,

        status:
          duplicate.status,

        created:
          false,
      });
    }
  }

  return {
    status:
      "ready",

    createdCount:
      tasks.filter(
        (
          task
        ) =>
          task.created
      ).length,

    reusedCount:
      tasks.filter(
        (
          task
        ) =>
          !task.created
      ).length,

    taskCount:
      tasks.length,

    tasks,
  };
}

async function findReusableTask(
  title: string
): Promise<Task | null> {
  const tasks =
    await listPersistentTasks();

  const normalizedTitle =
    normalizeTaskTitle(
      title
    );

  if (
    !normalizedTitle
  ) {
    return null;
  }

  return (
    tasks.find(
      (
        task
      ) =>
        task.status !==
          "done" &&
        normalizeTaskTitle(
          task.title
        ) ===
          normalizedTitle
    ) ??
    null
  );
}

function normalizeTaskTitle(
  title: string
): string {
  return title
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      ""
    );
}

function buildTaskTitle(
  step: string,
  index: number
): string {
  const cleanStep =
    step
      .replace(
        /[。；;]+$/g,
        ""
      )
      .trim();

  const shortStep =
    cleanStep.length >
    72
      ? `${cleanStep.slice(
          0,
          69
        )}...`
      : cleanStep;

  return `P${index + 1} · ${shortStep}`;
}

function extractDuplicateTaskId(
  error: unknown
): string | null {
  if (
    !(error instanceof Error)
  ) {
    return null;
  }

  const prefix =
    "DUPLICATE_TASK:";

  if (
    !error.message.startsWith(
      prefix
    )
  ) {
    return null;
  }

  return (
    error.message.slice(
      prefix.length
    ) || null
  );
}

function createFailedWorkflow():
  PlannerWorkflow {
  return {
    status:
      "ready",

    createdCount:
      0,

    reusedCount:
      0,

    taskCount:
      0,

    tasks: [],
  };
}

function buildExecutionPrompt({
  goal,
  plan,
}: {
  goal: string;

  plan: {
    type: string;
    intent: string;
    capabilities: string[];
    steps: string[];
  };
}): string {
  return [
    "You are the execution engine of AIOS Alpha.",
    "",
    "Convert the user's goal into an actionable and verifiable execution result.",
    "",
    "FINAL GOAL",
    goal,
    "",
    "PLANNER CONTEXT",
    `Goal type: ${plan.type}`,
    `Intent: ${plan.intent}`,
    `Recommended capabilities: ${
      plan.capabilities.join(
        ", "
      ) ||
      "Planner, Runtime"
    }`,
    "",
    "INITIAL EXECUTION STAGES",
    ...plan.steps.map(
      (
        step,
        index
      ) =>
        `${index + 1}. ${step}`
    ),
    "",
    "EXECUTION REQUIREMENTS",
    "1. Confirm the final outcome and success criteria.",
    "2. Convert the goal into ordered, actionable and verifiable stages.",
    "3. Identify the highest-priority next action.",
    "4. Avoid generic advice and unnecessary theoretical explanation.",
    "5. If the goal involves development work, preserve user-provided file paths and do not invent nonexistent paths.",
    "6. The result must directly support the next execution step.",
  ].join(
    "\n"
  );
}
