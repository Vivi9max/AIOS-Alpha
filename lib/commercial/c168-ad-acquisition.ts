import "server-only";

export const C168_AD_ACQUISITION_ID =
  "C168-AD-ACQUISITION";

export const C168_AD_ACQUISITION_VERSION =
  "C168.1.0";

export type C168AcquisitionStage =
  | "prospecting"
  | "qualification"
  | "diagnosis"
  | "offer"
  | "outreach"
  | "payment"
  | "delivery"
  | "review"
  | "optimization";

export type C168ProspectStatus =
  | "discovered"
  | "needs-validation"
  | "qualified"
  | "contacted"
  | "responded"
  | "customer"
  | "rejected";

export type C168OfferId =
  | "ad-acquisition-diagnosis"
  | "ad-acquisition-validation";

export interface C168OfferDefinition {
  id: C168OfferId;
  name: string;
  priceCny: number;
  deliveryWindow: string;
  positioning: string;
  included: string[];
  excluded: string[];
  successCondition: string;
  upgradeTo: C168OfferId | null;
}

export interface C168TargetProfile {
  market: string;
  industries: string[];
  geography: string;
  idealCustomer: string;
  problemSignals: string[];
  exclusionSignals: string[];
}

export interface C168WorkflowStage {
  id: C168AcquisitionStage;
  name: string;
  objective: string;
  founderAction: string;
  aiosAction: string;
  completionEvidence: string;
}

export interface C168AdvertisingAcquisitionDefinition {
  id: string;
  version: string;
  name: string;
  positioning: string;
  primaryObjective: string;
  target: C168TargetProfile;
  offers: C168OfferDefinition[];
  workflow: C168WorkflowStage[];
  operatingRules: string[];
  integrityRules: string[];
}

export const C168_OFFERS: C168OfferDefinition[] = [
  {
    id: "ad-acquisition-diagnosis",

    name:
      "48小时广告获客诊断",

    priceCny:
      399,

    deliveryWindow:
      "48 hours",

    positioning:
      "针对已经存在广告获客需求、但线索质量或转化效果不理想的商家，提供一次聚焦广告获客链路的问题诊断与优化方案。",

    included: [
      "目标客户与广告诉求诊断",
      "广告素材与Offer问题分析",
      "获客入口与转化链路分析",
      "主要流失点判断",
      "优先级优化建议",
      "下一轮测试方向",
      "一份可执行的广告获客优化方案",
    ],

    excluded: [
      "广告账户托管",
      "广告预算代付",
      "未经授权的广告投放",
      "承诺固定获客数量",
      "承诺固定成交金额",
      "虚构投放数据",
      "虚构客户或成交案例",
    ],

    successCondition:
      "客户收到完整诊断结果，并能够明确下一轮广告获客测试应该改变什么、为什么改变以及如何验证。",

    upgradeTo:
      "ad-acquisition-validation",
  },

  {
    id: "ad-acquisition-validation",

    name:
      "7天广告获客验证",

    priceCny:
      699,

    deliveryWindow:
      "7 days",

    positioning:
      "在完成广告获客诊断后，以小范围、低风险方式验证Offer、素材、获客入口与线索质量之间的实际关系。",

    included: [
      "诊断结果复核",
      "Offer测试方案",
      "广告创意测试方向",
      "获客入口优化",
      "线索质量观察",
      "测试结果记录",
      "下一轮优化建议",
    ],

    excluded: [
      "广告账户托管",
      "广告预算",
      "未经授权的自动投放",
      "保证线索数量",
      "保证成交数量",
      "保证广告ROI",
    ],

    successCondition:
      "完成约定测试并记录真实结果，形成下一轮广告获客优化决策。",

    upgradeTo:
      null,
  },
];

export const C168_TARGET_PROFILE: C168TargetProfile = {
  market:
    "中国大陆本地商业获客",

  industries: [
    "家装",
    "旧房局改",
    "全屋定制",
  ],

  geography:
    "深圳优先",

  idealCustomer:
    "已经有广告投放或明确广告获客需求，希望获得客户线索，但当前广告素材、Offer、获客入口或转化链路存在明显问题的商家。",

  problemSignals: [
    "已经在投广告",
    "广告有曝光但咨询少",
    "有点击但有效线索少",
    "有咨询但成交率低",
    "线索成本过高",
    "广告素材长期没有迭代",
    "Offer不够明确",
    "落地页或咨询入口转化弱",
    "销售收到大量低质量线索",
    "不知道广告预算应该优先测试什么",
  ],

  exclusionSignals: [
    "完全没有广告获客需求",
    "只寻找低价广告代投",
    "要求保证成交数量",
    "要求保证广告ROI",
    "要求先代付广告预算",
    "要求未经授权直接操作广告账户",
    "无法提供任何可验证的业务信息",
  ],
};

export const C168_WORKFLOW: C168WorkflowStage[] = [
  {
    id: "prospecting",

    name:
      "客户发现",

    objective:
      "找到具有真实广告获客需求的潜在商家。",

    founderAction:
      "确认目标行业、地区与客户类型，并人工判断候选对象是否值得继续研究。",

    aiosAction:
      "使用现有 Web Intelligence 与研究能力发现公开商业信号，并整理候选对象。",

    completionEvidence:
      "形成一个真实存在、具有明确商业主体的候选客户记录。",
  },

  {
    id: "qualification",

    name:
      "客户筛选",

    objective:
      "判断候选客户是否存在值得解决的广告获客问题。",

    founderAction:
      "人工确认企业真实性、业务相关性和广告获客需求。",

    aiosAction:
      "汇总公开证据、商业信号、广告/获客相关线索，并形成筛选依据。",

    completionEvidence:
      "候选客户具备明确的业务主体与至少一个可验证的获客问题信号。",
  },

  {
    id: "diagnosis",

    name:
      "广告问题诊断",

    objective:
      "找到影响获客结果的主要问题，而不是泛泛分析广告。",

    founderAction:
      "补充无法从公开信息确认的实际业务情况。",

    aiosAction:
      "围绕客户、Offer、素材、入口、转化与线索质量建立问题假设，并标记证据与未知项。",

    completionEvidence:
      "形成有证据、有优先级、区分事实与假设的诊断结果。",
  },

  {
    id: "offer",

    name:
      "Offer",

    objective:
      "把诊断结果转化成客户愿意购买的最小服务。",

    founderAction:
      "确认报价、服务边界和交付方式。",

    aiosAction:
      "根据诊断结果生成对应的服务说明、价值表达和交付范围。",

    completionEvidence:
      "客户收到清晰的服务内容、价格和交付边界。",
  },

  {
    id: "outreach",

    name:
      "联系",

    objective:
      "将合适的Offer交给真实潜在客户。",

    founderAction:
      "人工选择渠道、确认消息并实际发送。",

    aiosAction:
      "基于已验证的客户信息生成个性化联系内容，并保留证据依据。",

    completionEvidence:
      "记录真实发送时间、渠道和对象。",
  },

  {
    id: "payment",

    name:
      "付费",

    objective:
      "验证市场是否愿意为解决方案支付真实资金。",

    founderAction:
      "人工沟通、收款并记录真实付款。",

    aiosAction:
      "记录客户状态和商业结果，但不得自行声明未发生的付款。",

    completionEvidence:
      "存在真实付款记录。",
  },

  {
    id: "delivery",

    name:
      "交付",

    objective:
      "完成约定的广告获客诊断或验证服务。",

    founderAction:
      "完成需要人工访问、沟通或操作的部分。",

    aiosAction:
      "组织研究证据、诊断结果、优化建议和交付材料。",

    completionEvidence:
      "客户收到约定交付物。",
  },

  {
    id: "review",

    name:
      "复盘",

    objective:
      "判断服务是否真正解决了客户问题。",

    founderAction:
      "获得真实客户反馈，并记录实际结果。",

    aiosAction:
      "比较原始问题、执行过程与最终结果，识别有效与无效假设。",

    completionEvidence:
      "形成真实结果记录，而不是模型推测结果。",
  },

  {
    id: "optimization",

    name:
      "优化",

    objective:
      "将真实客户结果转化为下一轮获客与交付优化。",

    founderAction:
      "决定是否继续该行业、Offer或获客渠道。",

    aiosAction:
      "沉淀有效模式、失败原因、客户异议和可复用资产。",

    completionEvidence:
      "形成下一轮可执行的优化任务。",
  },
];

export const C168_OPERATING_RULES: string[] = [
  "先验证客户问题，再销售服务。",
  "先卖诊断，再考虑更高价服务。",
  "优先使用公开证据，不凭空推断客户广告表现。",
  "AIOS生成分析，Founder确认现实世界事实。",
  "任何联系行为必须由Founder人工确认并执行。",
  "任何付款、成交、客户回复必须有真实证据后才能进入系统结果。",
  "广告预算属于客户实际业务成本，不计入AIOS服务收入。",
  "不承诺固定线索数量、成交数量或广告ROI。",
  "每一个商业结论必须区分已验证事实、合理假设和未知信息。",
  "真实客户结果优先于模型内部评分。",
];

export const C168_INTEGRITY_RULES: string[] = [
  "不得伪造潜在客户。",
  "不得伪造广告投放数据。",
  "不得伪造广告账户数据。",
  "不得伪造客户回复。",
  "不得伪造成交。",
  "不得伪造付款。",
  "不得把模型预测写成实际商业结果。",
  "不得把公开市场研究证据写成客户本人提供的信息。",
  "不得自动联系客户。",
  "不得自动操作客户广告账户。",
];

export const C168_AD_ACQUISITION_DEFINITION: C168AdvertisingAcquisitionDefinition =
  {
    id:
      C168_AD_ACQUISITION_ID,

    version:
      C168_AD_ACQUISITION_VERSION,

    name:
      "AIOS 广告获客现金流工作流",

    positioning:
      "AIOS帮助Founder发现具有真实获客问题的商家，完成广告获客问题研究、诊断、Offer设计、人工触达、交付和结果复盘。",

    primaryObjective:
      "获得第一个真实付费广告获客诊断客户，并通过真实交付验证该服务是否具备持续销售价值。",

    target:
      C168_TARGET_PROFILE,

    offers:
      C168_OFFERS,

    workflow:
      C168_WORKFLOW,

    operatingRules:
      C168_OPERATING_RULES,

    integrityRules:
      C168_INTEGRITY_RULES,
  };

export function getC168Offer(
  id: C168OfferId,
): C168OfferDefinition | null {
  return (
    C168_OFFERS.find(
      (offer) =>
        offer.id === id,
    ) ?? null
  );
}

export function getC168WorkflowStage(
  stage: C168AcquisitionStage,
): C168WorkflowStage | null {
  return (
    C168_WORKFLOW.find(
      (item) =>
        item.id === stage,
    ) ?? null
  );
}

export function getC168Definition() {
  return C168_AD_ACQUISITION_DEFINITION;
}
