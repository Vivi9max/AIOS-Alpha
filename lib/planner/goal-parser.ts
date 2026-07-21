export type GoalCategory =
  | "launch"
  | "build"
  | "validate"
  | "growth"
  | "content"
  | "revenue"
  | "research"
  | "general";

export interface ParsedGoalTask {
  title: string;
  description: string;
  order: number;
}

export interface ParsedGoal {
  originalGoal: string;
  mission: string;
  category: GoalCategory;
  currentGoal: string;
  nextStep: string;
  expectedResult: string;
  successSignal: string;
  tasks: ParsedGoalTask[];
  generatedAt: number;
}

const MAX_GOAL_LENGTH =
  1000;

function normalizeText(
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
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function removeGoalPrefix(
  goal: string
): string {
  return goal
    .replace(
      /^(我想|我要|我需要|希望|计划|目标是|请帮我|帮我|准备|打算)\s*/i,
      ""
    )
    .replace(
      /[。！!？?]+$/,
      ""
    )
    .trim();
}

function detectCategory(
  goal: string
): GoalCategory {
  if (
    /上线|发布|推出|公开|部署|公测|发布会/.test(
      goal
    )
  ) {
    return "launch";
  }

  if (
    /开发|创建|搭建|制作|建立|实现|设计|构建/.test(
      goal
    )
  ) {
    return "build";
  }

  if (
    /验证|测试|试验|证明|可行性|用户反馈/.test(
      goal
    )
  ) {
    return "validate";
  }

  if (
    /增长|推广|获客|用户|流量|曝光|知名度/.test(
      goal
    )
  ) {
    return "growth";
  }

  if (
    /内容|视频|文章|歌曲|短剧|账号|发布内容/.test(
      goal
    )
  ) {
    return "content";
  }

  if (
    /收入|现金流|盈利|变现|销售|订单|客户/.test(
      goal
    )
  ) {
    return "revenue";
  }

  if (
    /研究|分析|调查|寻找|了解|对比|评估/.test(
      goal
    )
  ) {
    return "research";
  }

  return "general";
}

function createTasks(
  mission: string,
  category: GoalCategory
): ParsedGoalTask[] {
  const templates:
    Record<
      GoalCategory,
      Array<{
        title: string;
        description: string;
      }>
    > = {
    launch: [
      {
        title:
          `明确「${mission}」的发布范围`,
        description:
          "确定本次发布必须具备的核心功能、目标用户和暂不包含的内容。",
      },
      {
        title:
          "完成发布前核心功能检查",
        description:
          "检查主流程、任务、记忆、Planner、Runtime 和关键页面是否可正常使用。",
      },
      {
        title:
          "完成公开环境部署与访问测试",
        description:
          "验证公网地址、移动端访问、接口响应和基础安全设置。",
      },
      {
        title:
          "准备首批用户体验流程",
        description:
          "设计邀请方式、体验步骤、反馈入口和问题收集方式。",
      },
      {
        title:
          "发布并收集第一轮真实反馈",
        description:
          "邀请真实用户使用，根据反馈确定下一轮优先修复和升级内容。",
      },
    ],

    build: [
      {
        title:
          `定义「${mission}」的最小可用结果`,
        description:
          "明确最终交付物、核心使用场景和完成标准。",
      },
      {
        title:
          "拆分核心模块与执行顺序",
        description:
          "将目标拆分为可以独立开发、测试和验证的模块。",
      },
      {
        title:
          "完成第一版核心功能",
        description:
          "优先实现能够形成完整用户路径的核心能力。",
      },
      {
        title:
          "测试完整流程并修复阻碍",
        description:
          "从用户入口开始完整操作一次，修复影响使用的主要问题。",
      },
      {
        title:
          "部署可验证版本",
        description:
          "形成可访问、可测试、可收集反馈的版本。",
      },
    ],

    validate: [
      {
        title:
          `定义「${mission}」的验证假设`,
        description:
          "明确需要验证的核心问题、目标用户和成功标准。",
      },
      {
        title:
          "准备最小验证版本",
        description:
          "只保留验证核心假设所必需的功能和内容。",
      },
      {
        title:
          "寻找首批真实测试用户",
        description:
          "邀请目标用户完成真实操作，而不是只听取口头意见。",
      },
      {
        title:
          "收集行为数据与反馈",
        description:
          "记录用户是否完成核心流程、遇到的问题和真实需求。",
      },
      {
        title:
          "根据证据决定继续、调整或停止",
        description:
          "基于真实数据更新方向和下一阶段优先级。",
      },
    ],

    growth: [
      {
        title:
          `明确「${mission}」的目标用户`,
        description:
          "确定最优先服务的人群、需求和使用场景。",
      },
      {
        title:
          "提炼最有吸引力的核心价值",
        description:
          "用一句话说明产品为目标用户解决什么问题。",
      },
      {
        title:
          "准备用户获取内容与入口",
        description:
          "建立内容、落地页、邀请入口和清晰的体验路径。",
      },
      {
        title:
          "执行第一轮用户邀请",
        description:
          "通过现有账号、社群和直接邀请获取首批用户。",
      },
      {
        title:
          "分析转化并优化",
        description:
          "根据点击、注册、使用和反馈数据调整推广内容。",
      },
    ],

    content: [
      {
        title:
          `确定「${mission}」的受众与主题`,
        description:
          "明确内容为谁服务、解决什么问题和希望产生什么行动。",
      },
      {
        title:
          "完成内容结构与素材准备",
        description:
          "整理脚本、画面、声音、标题和发布素材。",
      },
      {
        title:
          "生成第一版成品",
        description:
          "完成可直接发布的内容版本。",
      },
      {
        title:
          "完成质量检查与优化",
        description:
          "检查节奏、信息准确性、字幕、视觉和平台适配。",
      },
      {
        title:
          "发布并记录真实数据",
        description:
          "记录曝光、互动、关注、线索和转化数据。",
      },
    ],

    revenue: [
      {
        title:
          `明确「${mission}」的付费对象`,
        description:
          "确定谁愿意付费、为什么付费以及最迫切的需求。",
      },
      {
        title:
          "设计最小可销售产品",
        description:
          "明确交付内容、价格、流程和完成标准。",
      },
      {
        title:
          "准备销售说明与转化入口",
        description:
          "建立让客户快速理解价值并采取行动的入口。",
      },
      {
        title:
          "联系首批潜在客户",
        description:
          "优先从现有资源和明确需求的人群开始验证。",
      },
      {
        title:
          "完成首笔交易并复盘",
        description:
          "记录客户来源、成交原因、交付成本和可复制流程。",
      },
    ],

    research: [
      {
        title:
          `定义「${mission}」的研究问题`,
        description:
          "明确需要回答的问题和最终需要支持的决策。",
      },
      {
        title:
          "收集可信资料与真实案例",
        description:
          "优先使用原始资料、官方信息和实际案例。",
      },
      {
        title:
          "整理关键发现与差异",
        description:
          "提炼机会、限制、风险和可借鉴的方法。",
      },
      {
        title:
          "形成可执行结论",
        description:
          "把研究结果转化为明确选择和下一步行动。",
      },
    ],

    general: [
      {
        title:
          `明确「${mission}」的完成标准`,
        description:
          "定义最终结果、使用场景和可以验证的成功标准。",
      },
      {
        title:
          "拆分目标为可执行步骤",
        description:
          "将目标转化为可以逐项完成和检查的行动。",
      },
      {
        title:
          "完成最高优先级行动",
        description:
          "先完成最能推动整体结果的一项工作。",
      },
      {
        title:
          "检查结果并处理阻碍",
        description:
          "验证当前结果，解决阻碍下一步推进的问题。",
      },
      {
        title:
          "完成目标并记录成果",
        description:
          "确认完成标准并保存可复用的经验和资产。",
      },
    ],
  };

  return templates[
    category
  ].map(
    (
      task,
      index
    ) => ({
      ...task,
      order:
        index + 1,
    })
  );
}

function createExpectedResult(
  mission: string,
  category: GoalCategory
): string {
  const values:
    Record<
      GoalCategory,
      string
    > = {
    launch:
      `形成可公开访问、可邀请用户验证的「${mission}」版本`,

    build:
      `形成可以真实使用和测试的「${mission}」第一版`,

    validate:
      `获得足够证据判断「${mission}」是否值得继续推进`,

    growth:
      `建立能够持续获取目标用户的「${mission}」增长路径`,

    content:
      `完成并发布可验证真实数据的「${mission}」内容成品`,

    revenue:
      `形成「${mission}」的首个真实付费或现金流结果`,

    research:
      `形成能够支持实际决策的「${mission}」研究结论`,

    general:
      `完成可验证、可记录的「${mission}」结果`,
  };

  return values[
    category
  ];
}

function createSuccessSignal(
  category: GoalCategory
): string {
  const values:
    Record<
      GoalCategory,
      string
    > = {
    launch:
      "公网版本可正常访问，并有真实用户完成核心流程。",

    build:
      "核心功能可以运行，并完成一次完整使用测试。",

    validate:
      "获得真实用户行为、反馈和明确的继续或调整结论。",

    growth:
      "获得可追踪的新用户、使用行为或有效线索。",

    content:
      "内容成功发布，并获得可记录的真实平台数据。",

    revenue:
      "出现真实付费、订单、客户承诺或可验证收入。",

    research:
      "研究结果能够直接支持一个明确决策。",

    general:
      "所有核心任务完成，并达到预先定义的结果。",
  };

  return values[
    category
  ];
}

export function parseGoal(
  value: unknown
): ParsedGoal {
  const normalizedGoal =
    normalizeText(
      value
    );

  if (
    !normalizedGoal
  ) {
    throw new Error(
      "请输入希望 AIOS Alpha 帮助完成的目标。"
    );
  }

  if (
    normalizedGoal.length <
    4
  ) {
    throw new Error(
      "目标描述过短，请补充希望获得的结果。"
    );
  }

  if (
    normalizedGoal.length >
    MAX_GOAL_LENGTH
  ) {
    throw new Error(
      `目标不能超过 ${MAX_GOAL_LENGTH} 个字符。`
    );
  }

  const mission =
    removeGoalPrefix(
      normalizedGoal
    ) ||
    normalizedGoal;

  const category =
    detectCategory(
      normalizedGoal
    );

  const tasks =
    createTasks(
      mission,
      category
    );

  return {
    originalGoal:
      normalizedGoal,

    mission,

    category,

    currentGoal:
      tasks[0]?.title ??
      mission,

    nextStep:
      tasks[1]?.title ??
      "开始执行第一项任务",

    expectedResult:
      createExpectedResult(
        mission,
        category
      ),

    successSignal:
      createSuccessSignal(
        category
      ),

    tasks,

    generatedAt:
      Date.now(),
  };
}