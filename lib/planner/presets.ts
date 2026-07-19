export interface PlannerPreset {
  id: string;
  icon: string;
  category:
    | "work"
    | "business"
    | "learning"
    | "content"
    | "decision"
    | "personal";
  title: string;
  description: string;
  goal: string;
}

export const PLANNER_PLACEHOLDER = [
  "描述你希望最终得到的结果…",
  "",
  "例如：",
  "在未来 14 天内完成一个新服务的市场验证，",
  "访谈至少 10 位目标用户，整理主要需求，",
  "并根据反馈决定是否继续投入。",
].join("\n");

export const PLANNER_PRESETS: PlannerPreset[] = [
  {
    id: "validate-idea",
    icon: "🧪",
    category: "business",
    title: "验证一个新想法",
    description:
      "设计低成本验证方案，明确用户、假设、行动和判断标准。",
    goal:
      "在未来 14 天内验证一个新的产品或服务想法。明确目标用户、核心问题、需要验证的关键假设，访谈至少 10 位潜在用户，并根据反馈给出继续、调整或停止的判断标准。",
  },
  {
    id: "weekly-priority",
    icon: "📅",
    category: "work",
    title: "规划未来 7 天",
    description:
      "从现有目标中筛选最重要的工作，并形成可执行顺序。",
    goal:
      "根据我当前的目标、已有任务、时间和资源限制，制定未来 7 天最重要的三项工作，说明优先顺序、每天的推进动作、完成标准以及可能阻碍执行的风险。",
  },
  {
    id: "solve-bottleneck",
    icon: "⚠️",
    category: "decision",
    title: "解决当前瓶颈",
    description:
      "定位最影响结果的问题，并给出最短解决路径。",
    goal:
      "分析当前项目中最影响进度或结果的主要瓶颈。区分根本原因和表面问题，按影响程度排序，并给出可以立即执行的最短解决路径、验证方法和备用方案。",
  },
  {
    id: "find-customers",
    icon: "🎯",
    category: "business",
    title: "寻找首批客户",
    description:
      "建立低成本获客实验，验证真实需求和付费意愿。",
    goal:
      "为一个刚起步的产品或服务设计首批客户获取计划。明确最可能付费的目标用户、核心价值、低成本触达渠道、沟通信息、转化步骤和未来 14 天的成功指标。",
  },
  {
    id: "improve-retention",
    icon: "📈",
    category: "business",
    title: "提高用户留存",
    description:
      "分析用户离开的原因，设计可以快速验证的留存实验。",
    goal:
      "分析一个数字产品用户使用一次后不再回来的可能原因，找出最值得优先验证的留存问题，并制定未来 7 天可以执行的改进实验、观察指标和成功标准。",
  },
  {
    id: "content-system",
    icon: "✍️",
    category: "content",
    title: "建立内容计划",
    description:
      "围绕明确受众，形成可持续发布和复盘的内容系统。",
    goal:
      "为一个面向明确目标受众的账号制定未来 14 天内容计划。确定核心主题、用户痛点、内容形式、发布节奏、行动引导和复盘指标，并优先选择可以重复利用的内容资产。",
  },
  {
    id: "learn-skill",
    icon: "📚",
    category: "learning",
    title: "学习一项新技能",
    description:
      "拆解学习阶段，安排练习、输出和验证方式。",
    goal:
      "为我制定一个 30 天学习计划，目标是从零开始掌握一项新技能并完成一个可以展示的成果。请拆解阶段、每日练习、必要资源、检查点和最终验收标准。",
  },
  {
    id: "make-decision",
    icon: "⚖️",
    category: "decision",
    title: "做出重要决策",
    description:
      "比较不同选择，明确风险、收益和验证动作。",
    goal:
      "帮助我评估一个重要决策。列出主要选项、关键假设、成本、潜在收益、风险和不可逆因素，并设计最小验证行动，帮助我在信息不足时提高做出正确决定的概率。",
  },
];

export function getPlannerPreset(
  id: string
): PlannerPreset | null {
  return (
    PLANNER_PRESETS.find(
      (preset) =>
        preset.id === id
    ) ?? null
  );
}

export function getPlannerPresetsByCategory(
  category: PlannerPreset["category"]
): PlannerPreset[] {
  return PLANNER_PRESETS.filter(
    (preset) =>
      preset.category === category
  );
}