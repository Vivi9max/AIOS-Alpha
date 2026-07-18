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
      ],
    },

    limits: {
      maxGoalLength:
        MAX_GOAL_LENGTH,

      maxMaterializedTasks:
        MAX_MATERIALIZED_TASKS,
    },

    timestamp: Date.now(),
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
      validateGoal(goal);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,

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

    if (mode === "plan") {
      return NextResponse.json({
        success: true,

        mode: "plan",

        planner:
          "AIOS Strategic Planner",

        plan: {
          id: plan.id,

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

        execution: null,

        workflow: null,

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
      await materializePlanTasks({
        planId:
          finalPlan.id,

        goal:
          finalPlan.goal,

        steps:
          finalPlan.steps,
      });

    return NextResponse.json({
      success:
        result.success,

      mode: "execute",

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
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Planner 请求失败";

    return NextResponse.json(
      {
        success: false,

        error: message,

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
    .trim();
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
    return "请输入希望 AIOS 最终完成的目标。";
  }

  if (goal.length < 4) {
    return "目标描述过短，请补充希望得到的最终结果。";
  }

  if (
    goal.length >
    MAX_GOAL_LENGTH
  ) {
    return `目标不能超过 ${MAX_GOAL_LENGTH} 个字符。`;
  }

  return null;
}

function analyzeGoalQuality(
  goal: string
): GoalQuality {
  const hasResult =
    /完成|实现|获得|达到|建立|上线|发布|解决|提高|降低|验证|输出|生成|确定/.test(
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

  let score = 1;

  if (
    goal.length >= 30
  ) {
    score += 1;
  }

  if (hasResult) {
    score += 1;
  }

  if (hasDeadline) {
    score += 1;
  }

  if (
    hasSuccessMetric
  ) {
    score += 1;
  }

  if (hasConstraint) {
    score += 1;
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

  if (score >= 9) {
    return "high";
  }

  if (score >= 5) {
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
    .map((step) =>
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
    .filter((step) => {
      if (!step) {
        return false;
      }

      const key =
        step.toLowerCase();

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    })
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
}): Promise<{
  status: "ready";
  createdCount: number;
  reusedCount: number;
  taskCount: number;
  tasks: MaterializedTask[];
}> {
  const tasks:
    MaterializedTask[] = [];

  for (
    let index = 0;
    index < steps.length;
    index += 1
  ) {
    const step =
      steps[index];

    const title =
      buildTaskTitle(
        step,
        index
      );

    const description = [
      `Planner Plan: ${planId}`,
      `Final Goal: ${goal}`,
      `Stage: ${index + 1}/${steps.length}`,
      `Action: ${step}`,
    ].join("\n");

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

        created: true,
      });
    } catch (error) {
      const duplicateId =
        extractDuplicateTaskId(
          error
        );

      if (!duplicateId) {
        throw error;
      }

      const existingTasks =
        await listPersistentTasks();

      const existing =
        existingTasks.find(
          (task) =>
            task.id ===
            duplicateId
        );

      if (existing) {
        tasks.push({
          id:
            existing.id,

          title:
            existing.title,

          status:
            existing.status,

          created: false,
        });
      }
    }
  }

  return {
    status: "ready",

    createdCount:
      tasks.filter(
        (task) =>
          task.created
      ).length,

    reusedCount:
      tasks.filter(
        (task) =>
          !task.created
      ).length,

    taskCount:
      tasks.length,

    tasks,
  };
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
    cleanStep.length > 72
      ? `${cleanStep.slice(
          0,
          69
        )}…`
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
    "你是 AIOS Alpha Runtime 的执行引擎。",
    "",
    "你的任务不是只解释概念，而是把目标转化为可以立即推进的执行结果。",
    "",
    "【最终目标】",
    goal,
    "",
    "【Planner 初步判断】",
    `目标类型：${plan.type}`,
    `用户意图：${plan.intent}`,
    `建议能力：${plan.capabilities.join("、") || "Planner、Runtime"}`,
    "",
    "【初步执行阶段】",
    ...plan.steps.map(
      (step, index) =>
        `${index + 1}. ${step}`
    ),
    "",
    "【执行要求】",
    "1. 先确认最终目标和成功标准。",
    "2. 把任务拆分为有顺序、可执行、可验证的阶段。",
    "3. 标明当前最优先执行的一步。",
    "4. 避免空泛建议，不重复解释理论。",
    "5. 充分考虑用户已有资源、时间、成本和现实限制。",
    "6. 对暂时不能自动执行的事项，给出最短人工操作步骤。",
    "7. 最后输出下一步行动，不要只输出长期规划。",
    "8. 返回的阶段必须可以直接转换成 Tasks。",
    "",
    "【输出结构】",
    "目标理解",
    "关键判断",
    "执行阶段",
    "立即行动",
    "成功标准",
    "风险与备用方案",
  ].join("\n");
}