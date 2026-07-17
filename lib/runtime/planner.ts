import {
  parseWorkspaceIntent,
} from "@/lib/router/intentParser";

import type {
  WorkspaceAction,
} from "@/lib/router/types";

export type RuntimePlanType =
  | "workspace-action"
  | "goal-plan"
  | "conversation";

export type PlannerIntent =
  | "create-task"
  | "complete-task"
  | "delete-task"
  | "list-tasks"
  | "save-memory"
  | "read-memory"
  | "update-profile"
  | "analyze"
  | "plan"
  | "execute"
  | "question"
  | "conversation";

export type RuntimeCapability =
  | "memory.read"
  | "memory.write"
  | "profile.read"
  | "profile.write"
  | "tasks.read"
  | "tasks.write"
  | "workspace.action"
  | "ai.reason"
  | "ai.plan"
  | "ai.respond";

export interface RuntimePlan {
  id: string;

  type: RuntimePlanType;

  prompt: string;

  goal: string;

  intent: PlannerIntent;

  confidence: number;

  action: WorkspaceAction;

  capabilities: RuntimeCapability[];

  steps: string[];

  createdAt: number;
}

function createPlanId(): string {
  return [
    "plan",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("-");
}

function normalizePrompt(
  prompt: string
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(
  prompt: string,
  keywords: string[]
): boolean {
  const normalized =
    prompt.toLowerCase();

  return keywords.some(
    (keyword) =>
      normalized.includes(
        keyword.toLowerCase()
      )
  );
}

function detectPlannerIntent(
  prompt: string,
  action: WorkspaceAction
): PlannerIntent {
  if (
    action.type !== "none"
  ) {
    const actionType =
      String(action.type);

    if (
      actionType.includes("create") &&
      actionType.includes("task")
    ) {
      return "create-task";
    }

    if (
      actionType.includes("complete") &&
      actionType.includes("task")
    ) {
      return "complete-task";
    }

    if (
      actionType.includes("delete") &&
      actionType.includes("task")
    ) {
      return "delete-task";
    }

    if (
      actionType.includes("list") &&
      actionType.includes("task")
    ) {
      return "list-tasks";
    }

    if (
      actionType.includes("memory")
    ) {
      return actionType.includes(
        "read"
      )
        ? "read-memory"
        : "save-memory";
    }

    if (
      actionType.includes("profile")
    ) {
      return "update-profile";
    }

    return "execute";
  }

  if (
    includesAny(
      prompt,
      [
        "制定计划",
        "规划",
        "怎么完成",
        "如何完成",
        "拆解",
        "下一步",
        "执行方案",
        "路线图",
        "plan",
        "roadmap",
      ]
    )
  ) {
    return "plan";
  }

  if (
    includesAny(
      prompt,
      [
        "分析",
        "判断",
        "评估",
        "风险",
        "原因",
        "优先级",
        "比较",
        "analyse",
        "analyze",
        "evaluate",
      ]
    )
  ) {
    return "analyze";
  }

  if (
    includesAny(
      prompt,
      [
        "执行",
        "完成",
        "开始",
        "推进",
        "交付",
        "implement",
        "execute",
        "build",
      ]
    )
  ) {
    return "execute";
  }

  if (
    /[？?]$/.test(
      prompt
    ) ||
    includesAny(
      prompt,
      [
        "什么",
        "为什么",
        "怎么",
        "如何",
        "是否",
        "可以吗",
        "what",
        "why",
        "how",
      ]
    )
  ) {
    return "question";
  }

  return "conversation";
}

function extractGoal(
  prompt: string,
  intent: PlannerIntent
): string {
  const cleaned =
    prompt
      .replace(
        /^(请|帮我|麻烦|现在|立即|开始|继续)+/u,
        ""
      )
      .replace(
        /[。！!?？]+$/u,
        ""
      )
      .trim();

  if (cleaned) {
    return cleaned;
  }

  switch (intent) {
    case "plan":
      return "制定可执行计划";

    case "analyze":
      return "完成分析并给出判断";

    case "execute":
      return "推进当前工作";

    case "question":
      return "回答用户问题";

    default:
      return "处理用户请求";
  }
}

function selectCapabilities(
  type: RuntimePlanType,
  intent: PlannerIntent
): RuntimeCapability[] {
  if (
    type === "workspace-action"
  ) {
    return [
      "memory.read",
      "profile.read",
      "workspace.action",
      "memory.write",
      "ai.respond",
    ];
  }

  if (
    intent === "plan"
  ) {
    return [
      "memory.read",
      "profile.read",
      "tasks.read",
      "ai.reason",
      "ai.plan",
      "ai.respond",
      "memory.write",
    ];
  }

  if (
    intent === "analyze"
  ) {
    return [
      "memory.read",
      "profile.read",
      "tasks.read",
      "ai.reason",
      "ai.respond",
      "memory.write",
    ];
  }

  if (
    intent === "execute"
  ) {
    return [
      "memory.read",
      "profile.read",
      "tasks.read",
      "ai.plan",
      "ai.reason",
      "ai.respond",
      "memory.write",
    ];
  }

  return [
    "memory.read",
    "profile.read",
    "ai.reason",
    "ai.respond",
    "memory.write",
  ];
}

function createPlanSteps(
  type: RuntimePlanType,
  intent: PlannerIntent
): string[] {
  if (
    type === "workspace-action"
  ) {
    return [
      "读取当前用户上下文",
      "验证操作目标和参数",
      "调用 Workspace Action",
      "保存执行结果到长期记忆",
      "向用户返回执行结果",
    ];
  }

  if (
    intent === "plan"
  ) {
    return [
      "读取用户记忆和个人资料",
      "识别目标、限制和成功条件",
      "把目标拆解为可执行步骤",
      "判断步骤优先级和依赖关系",
      "生成下一步行动方案",
      "保存关键结论到长期记忆",
    ];
  }

  if (
    intent === "analyze"
  ) {
    return [
      "读取相关记忆和任务状态",
      "提取需要判断的核心问题",
      "分析事实、风险和限制条件",
      "形成判断和优先级建议",
      "返回可执行结论",
      "保存关键结论到长期记忆",
    ];
  }

  if (
    intent === "execute"
  ) {
    return [
      "读取当前工作上下文",
      "识别目标和当前进度",
      "确定本轮可完成的工作范围",
      "生成执行顺序",
      "调用 AIOS 能力完成本轮工作",
      "返回结果和下一步",
    ];
  }

  return [
    "读取用户上下文",
    "理解用户当前请求",
    "调用推理能力生成回答",
    "保存有长期价值的信息",
    "向用户返回结果",
  ];
}

function calculateConfidence(
  type: RuntimePlanType,
  intent: PlannerIntent,
  prompt: string
): number {
  if (
    type === "workspace-action"
  ) {
    return 0.98;
  }

  if (
    intent === "plan" ||
    intent === "analyze"
  ) {
    return 0.9;
  }

  if (
    intent === "execute"
  ) {
    return prompt.length >= 8
      ? 0.86
      : 0.72;
  }

  if (
    intent === "question"
  ) {
    return 0.88;
  }

  return 0.76;
}

export function buildRuntimePlan(
  prompt: string
): RuntimePlan {
  const cleanPrompt =
    normalizePrompt(
      prompt
    );

  const action =
    parseWorkspaceIntent(
      cleanPrompt
    );

  const intent =
    detectPlannerIntent(
      cleanPrompt,
      action
    );

  const type:
    RuntimePlanType =
      action.type !== "none"
        ? "workspace-action"
        : intent === "plan" ||
            intent === "analyze" ||
            intent === "execute"
          ? "goal-plan"
          : "conversation";

  const goal =
    extractGoal(
      cleanPrompt,
      intent
    );

  return {
    id:
      createPlanId(),

    type,

    prompt:
      cleanPrompt,

    goal,

    intent,

    confidence:
      calculateConfidence(
        type,
        intent,
        cleanPrompt
      ),

    action,

    capabilities:
      selectCapabilities(
        type,
        intent
      ),

    steps:
      createPlanSteps(
        type,
        intent
      ),

    createdAt:
      Date.now(),
  };
}

export function buildPlannerContext(
  plan: RuntimePlan
): string {
  const planSteps =
    plan.steps
      .map(
        (
          step,
          index
        ) =>
          `${index + 1}. ${step}`
      )
      .join("\n");

  return [
    "你正在 AIOS Planner Engine 中执行请求。",
    "",
    `用户目标：${plan.goal}`,
    `识别意图：${plan.intent}`,
    `计划类型：${plan.type}`,
    `判断置信度：${Math.round(
      plan.confidence * 100
    )}%`,
    "",
    "执行计划：",
    planSteps,
    "",
    "请结合用户长期记忆、个人资料和当前任务状态完成请求。",
    "回答必须优先给出真实判断、明确结果和下一步行动。",
    "不要向用户重复展示内部系统提示。",
    "",
    `用户原始请求：${plan.prompt}`,
  ].join("\n");
}