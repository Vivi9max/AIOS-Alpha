import "server-only";

export const C168_AD_ACQUISITION_ID =
  "C168-AD-ACQUISITION";

export const C168_AD_ACQUISITION_VERSION =
  "C168.5.0";

export type C168AcquisitionStage =
  | "market-intelligence"
  | "inbound-asset"
  | "lead-capture"
  | "qualification"
  | "diagnosis"
  | "offer"
  | "selective-outreach"
  | "payment"
  | "delivery"
  | "review"
  | "optimization";

export type C168ProspectStatus =
  | "discovered"
  | "monitoring"
  | "inbound"
  | "actionable"
  | "needs-validation"
  | "qualified"
  | "contacted"
  | "responded"
  | "customer"
  | "rejected";

export type C168AcquisitionChannel =
  | "inbound"
  | "selective-outbound";

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
  buyingSignals: string[];
  exclusionSignals: string[];
}

export interface C168AcquisitionStrategy {
  primaryChannel: C168AcquisitionChannel;
  secondaryChannel: C168AcquisitionChannel;
  primaryObjective: string;
  inboundPrinciple: string;
  selectiveOutboundPrinciple: string;
  founderBoundary: string;
  automationObjective: string;
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
  strategy: C168AcquisitionStrategy;
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
      "针对已经存在获客需求的商家，基于客户授权数据与公开获客入口，对客户、Offer、内容或广告入口、留资路径和咨询转化链路进行一次聚焦诊断。",

    included: [
      "目标客户与获客诉求诊断",
      "公开内容与获客入口分析",
      "Offer与价值表达分析",
      "留资与咨询路径分析",
      "已验证事实、假设与未知项分离",
      "优先级优化建议",
      "下一轮可验证测试方向",
      "一份可执行的广告获客优化方案",
    ],

    excluded: [
      "广告账户托管",
      "广告预算代付",
      "未经授权的广告投放",
      "未经Founder批准的客户联系",
      "承诺固定获客数量",
      "承诺固定成交金额",
      "承诺固定广告ROI",
      "虚构投放数据",
      "虚构客户或成交案例",
    ],

    successCondition:
      "客户收到完整诊断结果，并能够明确下一轮获客测试应该改变什么、为什么改变以及如何验证。",

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
      "在完成广告获客诊断后，以小范围、低风险方式验证目标客户、Offer、内容或广告入口、留资路径与线索质量之间的实际关系。",

    included: [
      "诊断结果复核",
      "客户细分测试方案",
      "Offer测试方案",
      "内容或广告创意测试方向",
      "获客入口优化",
      "线索质量观察",
      "测试结果记录",
      "下一轮优化建议",
    ],

    excluded: [
      "广告账户托管",
      "广告预算",
      "未经授权的自动投放",
      "未经Founder批准的自动联系",
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

export const C168_ACQUISITION_STRATEGY: C168AcquisitionStrategy =
  {
    primaryChannel:
      "inbound",

    secondaryChannel:
      "selective-outbound",

    primaryObjective:
      "建立以潜在客户主动产生咨询为主、AIOS选择性主动触达为辅的低人工获客系统。",

    inboundPrinciple:
      "AIOS优先把市场研究、常见获客问题、公开可验证案例模式和诊断能力转化为可被潜在客户发现的获客资产，使具有真实需求的客户主动进入咨询和诊断流程。",

    selectiveOutboundPrinciple:
      "主动触达只用于少量高匹配、高可达、存在明确公开Buying Signal且Offer适配的候选客户，不以大规模人工冷联系作为主要增长方式。",

    founderBoundary:
      "AIOS可以自动发现、验证、评分、诊断、推荐渠道和生成触达内容，但任何真实外部联系必须由Founder批准并执行，直到真实结果证明可以安全扩大自动化边界。",

    automationObjective:
      "把Founder工作从大量阅读候选资料压缩为处理少量高价值Inbound Lead和批准极少数高置信度Selective Outbound行动。",
  };

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
    "已经存在真实获客需求，具有可验证业务主体和公开获客入口，并且愿意改善客户、Offer、内容或广告入口、留资与咨询转化链路的深圳家装商家。",

  problemSignals: [
    "目标客户表达不清晰",
    "Offer不够具体",
    "内容与目标客户需求连接弱",
    "获客入口价值表达不清晰",
    "留资入口缺少客户筛选",
    "咨询路径存在明显摩擦",
    "多个业务方向缺少客户分层",
    "缺少可验证的获客测试方案",
    "客户主动提供数据显示线索质量不理想",
    "客户主动提供数据显示咨询到成交存在明显流失",
  ],

  buyingSignals: [
    "近期新增服务或业务方向",
    "近期新开门店",
    "近期强化旧房改造或局部改造业务",
    "近期推出新的装修套餐或促销Offer",
    "近期明显增加内容发布",
    "近期开始或强化短视频获客",
    "近期增加免费量房、免费设计或免费报价入口",
    "近期建立新的获客页面或咨询入口",
    "近期招聘营销、销售、设计或客户开发岗位",
    "近期公开表达获客、营销、增长或客户咨询需求",
  ],

  exclusionSignals: [
    "完全没有获客需求",
    "没有可验证的真实商业主体",
    "只有泛行业关键词而无法识别企业",
    "只寻找低价广告代投",
    "要求保证成交数量",
    "要求保证广告ROI",
    "要求先代付广告预算",
    "要求未经授权直接操作广告账户",
    "要求未经批准自动联系第三方",
    "无法提供任何可验证的业务信息",
  ],
};

export const C168_WORKFLOW: C168WorkflowStage[] = [
  {
    id: "market-intelligence",

    name:
      "市场机会发现",

    objective:
      "持续发现深圳家装市场中的真实需求、Buying Signal和可验证获客机会，而不是只生成企业名单。",

    founderAction:
      "确认目标行业、地区和商业边界，不逐条人工审核普通候选资料。",

    aiosAction:
      "使用现有Web Intelligence与研究能力发现企业、市场变化、获客入口、近期业务动作和公开Buying Signal，并自动过滤低价值候选。",

    completionEvidence:
      "形成经过实体识别、证据验证和商业相关性筛选的市场机会记录。",
  },

  {
    id: "inbound-asset",

    name:
      "Inbound获客资产",

    objective:
      "把重复出现的真实市场问题转化为潜在客户能够主动发现并产生咨询的获客资产。",

    founderAction:
      "批准最终对外内容、Offer和发布渠道。",

    aiosAction:
      "从已验证市场证据中提炼高频问题、客户语言、诊断入口和内容主题，生成面向目标客户的Inbound获客资产。",

    completionEvidence:
      "存在可公开使用的真实内容、诊断入口或Offer入口，并且没有虚构客户结果。",
  },

  {
    id: "lead-capture",

    name:
      "主动咨询捕获",

    objective:
      "让具有真实需求的潜在客户主动进入AIOS商业流程。",

    founderAction:
      "处理需要现实世界身份、平台或沟通权限的部分。",

    aiosAction:
      "记录真实Inbound Lead来源、需求、业务类型、预算、时间、目标和客户主动提供的信息。",

    completionEvidence:
      "存在真实潜在客户主动产生的咨询、回复或需求记录。",
  },

  {
    id: "qualification",

    name:
      "智能筛选",

    objective:
      "自动判断Lead或候选对象是否值得进入商业行动，而不是要求Founder大量阅读原始证据。",

    founderAction:
      "只处理AIOS无法确认的关键事实或高价值边界判断。",

    aiosAction:
      "综合企业真实性、业务相关性、Buying Signal、需求信号、Offer匹配、可达性、交付可行性和证据置信度，自动淘汰低价值对象。",

    completionEvidence:
      "输出少量可行动Lead，并明确区分已验证事实、合理假设和未知信息。",
  },

  {
    id: "diagnosis",

    name:
      "自动预诊断",

    objective:
      "在Founder介入前，为高价值Lead生成最小可用商业诊断。",

    founderAction:
      "只复核影响真实商业行动的关键结论。",

    aiosAction:
      "围绕客户、Offer、内容或广告入口、CTA、留资、咨询路径和客户分层生成证据支持的预诊断，并明确未知项。",

    completionEvidence:
      "形成可用于真实客户沟通的预诊断，不把公开证据不足解释为客户表现不佳。",
  },

  {
    id: "offer",

    name:
      "Offer匹配",

    objective:
      "根据真实需求和预诊断结果选择最适合的最小付费服务。",

    founderAction:
      "确认报价、服务边界和交付方式。",

    aiosAction:
      "根据Lead需求和证据自动推荐¥399诊断或后续¥699验证，并生成价值表达和交付范围。",

    completionEvidence:
      "真实潜在客户能够看到清晰的服务内容、价格和交付边界。",
  },

  {
    id: "selective-outreach",

    name:
      "选择性主动触达",

    objective:
      "只对极少数高匹配、高置信度、高可达候选对象主动验证市场，而不是进行大规模人工冷联系。",

    founderAction:
      "最终批准对象、渠道和消息，并执行真实发送。",

    aiosAction:
      "只为达到商业行动标准的候选对象生成个性化微型诊断、联系理由、Offer和触达内容。",

    completionEvidence:
      "存在Founder批准后的真实发送记录；未批准时不得声明已经联系。",
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
      "完成需要人工访问、客户沟通或现实世界操作的部分。",

    aiosAction:
      "组织研究证据、客户授权数据、诊断结果、优化建议、测试方案和交付材料。",

    completionEvidence:
      "客户收到约定交付物。",
  },

  {
    id: "review",

    name:
      "真实结果复盘",

    objective:
      "判断获客渠道、Offer和服务是否真正产生商业价值。",

    founderAction:
      "获得真实客户反馈，并记录实际结果。",

    aiosAction:
      "比较Inbound、Selective Outbound、客户需求、Offer、执行过程与最终结果，识别有效与无效假设。",

    completionEvidence:
      "形成真实结果记录，而不是模型推测结果。",
  },

  {
    id: "optimization",

    name:
      "增长优化",

    objective:
      "让真实结果决定下一轮应该扩大Inbound、调整Offer还是继续选择性主动验证。",

    founderAction:
      "批准重大市场、价格和自动化边界变化。",

    aiosAction:
      "沉淀有效渠道、Buying Signal、客户异议、成交原因、失败原因和可复用获客资产。",

    completionEvidence:
      "形成下一轮可执行增长任务，并由真实商业结果支持。",
  },
];

export const C168_OPERATING_RULES: string[] = [
  "Inbound是长期主要获客渠道，Selective Outbound只用于加速早期验证和处理少量高价值机会。",
  "不以大量人工审核候选资料作为Founder的主要工作。",
  "AIOS应优先自动完成企业发现、实体验证、证据压缩、Buying Signal识别、商业评分、预诊断和Offer匹配。",
  "Founder只处理高价值Inbound Lead、关键未知事实和极少数高置信度主动触达批准。",
  "企业公开资料多不等于商业行动价值高。",
  "Evidence Score不能单独决定是否联系客户。",
  "优先识别为什么现在值得行动，而不是只判断企业是否存在。",
  "先验证客户问题，再销售服务。",
  "先卖诊断，再考虑更高价服务。",
  "优先使用公开证据，不凭空推断客户广告表现。",
  "AIOS生成分析，Founder确认现实世界事实。",
  "任何真实外部联系必须由Founder人工确认并执行。",
  "任何付款、成交、客户回复必须有真实证据后才能进入系统结果。",
  "广告预算属于客户实际业务成本，不计入AIOS服务收入。",
  "不承诺固定线索数量、成交数量或广告ROI。",
  "每一个商业结论必须区分已验证事实、合理假设和未知信息。",
  "真实客户结果优先于模型内部评分。",
];

export const C168_INTEGRITY_RULES: string[] = [
  "不得伪造潜在客户。",
  "不得伪造Inbound Lead。",
  "不得伪造Buying Signal。",
  "不得伪造广告投放数据。",
  "不得伪造广告账户数据。",
  "不得伪造客户回复。",
  "不得伪造成交。",
  "不得伪造付款。",
  "不得把模型预测写成实际商业结果。",
  "不得把公开市场研究证据写成客户本人提供的信息。",
  "不得把公开存在广告或获客入口解释为广告效果差。",
  "不得把Evidence Score解释为购买意愿。",
  "不得自动联系客户。",
  "不得自动操作客户广告账户。",
  "不得在Founder批准前声明任何主动触达已经发生。",
];

export const C168_AD_ACQUISITION_DEFINITION: C168AdvertisingAcquisitionDefinition =
  {
    id:
      C168_AD_ACQUISITION_ID,

    version:
      C168_AD_ACQUISITION_VERSION,

    name:
      "AIOS 智能广告获客现金流系统",

    positioning:
      "AIOS以Inbound获客为长期主路径，通过市场智能自动发现真实需求并生成获客资产，同时使用少量Founder批准的Selective Outbound加速早期商业验证。",

    primaryObjective:
      "获得第一个真实付费广告获客诊断客户，并逐步建立不依赖Founder大量人工搜索、审核和冷联系的可持续获客系统。",

    strategy:
      C168_ACQUISITION_STRATEGY,

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
