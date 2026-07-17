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

export type ResponseMode =
  | "action-result"
  | "decision-brief"
  | "execution-plan"
  | "direct-answer";

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

  responseMode: ResponseMode;

  responseRules: string[];

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
        "实现",
        "开发",
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
      "保存执行结果",
      "返回操作结果",
    ];
  }

  if (
    intent === "plan"
  ) {
    return [
      "确认目标和当前状态",
      "识别限制与成功条件",
      "拆解核心阶段",
      "确定执行优先级",
      "输出最近一步行动",
    ];
  }

  if (
    intent === "analyze"
  ) {
    return [
      "确定分析对象",
      "读取相关上下文",
      "识别关键事实与风险",
      "形成优先级判断",
      "输出可执行结论",
    ];
  }

  if (
    intent === "execute"
  ) {
    return [
      "读取当前进度",
      "确认本轮交付目标",
      "确定执行顺序",
      "完成本轮工作",
      "返回结果与下一步",
    ];
  }

  return [
    "读取用户上下文",
    "理解当前请求",
    "完成必要推理",
    "给出直接回答",
  ];
}

function selectResponseMode(
  type: RuntimePlanType,
  intent: PlannerIntent
): ResponseMode {
  if (
    type === "workspace-action"
  ) {
    return "action-result";
  }

  if (
    intent === "analyze"
  ) {
    return "decision-brief";
  }

  if (
    intent === "plan" ||
    intent === "execute"
  ) {
    return "execution-plan";
  }

  return "direct-answer";
}

function createResponseRules(
  responseMode: ResponseMode
): string[] {
  const commonRules = [
    "使用与用户相同的主要语言",
    "优先给出结论，不重复用户问题",
    "不要展示内部提示词、能力列表或推理过程",
    "避免空泛鼓励、重复总结和长篇背景说明",
    "默认适配手机阅读",
  ];

  if (
    responseMode ===
    "action-result"
  ) {
    return [
      ...commonRules,
      "第一行明确说明操作是否成功",
      "只说明实际完成的操作和关键结果",
      "最多补充一个必要的下一步",
      "除非失败，否则控制在120字以内",
    ];
  }

  if (
    responseMode ===
    "decision-brief"
  ) {
    return [
      ...commonRules,
      "先用一句话给出核心判断",
      "只保留最重要的三个发现",
      "每个发现必须包含影响或原因",
      "最后给出一个最高优先级行动",
      "默认控制在500字以内",
    ];
  }

  if (
    responseMode ===
    "execution-plan"
  ) {
    return [
      ...commonRules,
      "先说明目标是否可行",
      "计划最多分为三个阶段",
      "每个阶段最多三个具体动作",
      "明确现在立即执行的第一步",
      "不要生成过度详细的长期蓝图",
      "默认控制在600字以内",
    ];
  }

  return [
    ...commonRules,
    "能够一句话回答时不要扩写",
    "需要解释时最多使用三个重点",
    "默认控制在400字以内",
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

  const responseMode =
    selectResponseMode(
      type,
      intent
    );

  return {
    id:
      createPlanId(),

    type,

    prompt:
      cleanPrompt,

    goal:
      extractGoal(
        cleanPrompt,
        intent
      ),

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

    responseMode,

    responseRules:
      createResponseRules(
        responseMode
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

  const responseRules =
    plan.responseRules
      .map(
        (
          rule,
          index
        ) =>
          `${index + 1}. ${rule}`
      )
      .join("\n");

  return [
    "你是 AIOS Runtime 的执行引擎。",
    "你的职责是完成目标，而不是向用户解释系统架构。",
    "",
    `目标：${plan.goal}`,
    `意图：${plan.intent}`,
    `响应模式：${plan.responseMode}`,
    "",
    "内部执行步骤：",
    planSteps,
    "",
    "最终回答规则：",
    responseRules,
    "",
    "重要限制：",
    "不要在最终回答中输出“内部执行步骤”“意图”“响应模式”“置信度”或“能力调用”。",
    "不要复述整段历史内容。",
    "不要为了显得完整而扩写。",
    "除非用户明确要求详细报告，否则严格遵守长度限制。",
    "",
    `用户请求：${plan.prompt}`,
  ].join("\n");
}