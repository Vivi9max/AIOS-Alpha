
export const C144_INBOUND_DEMAND_ENGINE_ID =
  "C144-INBOUND-DEMAND-ENGINE";

export const C144_INBOUND_DEMAND_ENGINE_VERSION =
  "C144.4.0";

export type InboundChannel =
  | "xiaohongshu"
  | "xianyu";

export type InboundSignal =
  | "yes"
  | "no"
  | "unknown";

export type InboundBudget =
  | "under-500"
  | "500-2000"
  | "2000-plus"
  | "unknown";

export type InboundUrgency =
  | "high"
  | "medium"
  | "low"
  | "unknown";

export interface InboundDemandInput {
  industry?: string;
  region?: string;
  offerName?: string;
  entryPrice?: number;
  diagnosticPrice?: number;
  channels?: InboundChannel[];
}

export interface InboundContentAsset {
  channel: InboundChannel;
  format: string;
  title: string;
  body: string;
  callToAction: string;
  disclosure: string[];
}

export interface InboundLead {
  businessType?: string;
  currentAds?: InboundSignal;
  hasAdData?: InboundSignal;
  decisionRole?:
    | "decision-maker"
    | "influencer"
    | "unknown";
  budgetRange?: InboundBudget;
  urgency?: InboundUrgency;
  goal?: string;
  currentProblem?: string;
  sourceChannel?: InboundChannel;
}

export interface InboundLeadAssessment {
  score: number;
  tier:
    | "priority"
    | "nurture"
    | "low-priority";
  reasons: string[];
  missingInformation: string[];
  recommendedAction: string;
  evidenceBoundary: string;
  timestamp: number;
}

export interface InboundDemandCampaign {
  id: string;
  version: string;
  status: "draft";
  targetMarket: string;
  industry: string;
  offer: {
    name: string;
    entryPrice: number;
    diagnosticPrice: number;
    entryDeliverables: string[];
    diagnosticDeliverables: string[];
    exclusions: string[];
  };
  contentAssets: InboundContentAsset[];
  sevenDayPlan: Array<{
    day: number;
    channel: InboundChannel;
    topic: string;
    purpose: string;
  }>;
  intakeQuestions: string[];
  operatingRules: string[];
  externalPublishing: {
    executed: false;
    requiresManualAction: true;
  };
  timestamp: number;
}

const DEFAULT_INDUSTRY =
  "本地生活服务商家";

const DEFAULT_REGION =
  "深圳";

const DEFAULT_OFFER =
  "广告获客漏斗诊断";

function cleanText(
  value: unknown,
  fallback: string,
  maxLength = 160,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const result = value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return result || fallback;
}

function validPrice(
  value: unknown,
  fallback: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100000
  ) {
    return fallback;
  }

  return Math.round(value);
}

function normalizeChannels(
  value: unknown,
): InboundChannel[] {
  if (!Array.isArray(value)) {
    return ["xiaohongshu", "xianyu"];
  }

  const valid = value.filter(
    (item): item is InboundChannel =>
      item === "xiaohongshu" ||
      item === "xianyu",
  );

  return Array.from(new Set(valid));
}

function buildXiaohongshuAssets(
  industry: string,
): InboundContentAsset[] {
  return [
    {
      channel: "xiaohongshu",
      format: "educational-post",
      title:
        "广告花了钱，为什么咨询还是不稳定？先检查这5项",
      body: [
        `如果你经营${industry}，正在考虑线上获客，可以先别急着增加预算。`,
        "",
        "先检查这5件事：",
        "1. 广告吸引的人，是否真的是你的目标客户？",
        "2. 广告承诺和咨询页面介绍的服务是否一致？",
        "3. 用户看到内容后，是否知道下一步怎么咨询？",
        "4. 每次咨询是否有记录来源和后续结果？",
        "5. 你统计的是点击数量，还是有效咨询和实际成交？",
        "",
        "如果这些数据没有记录清楚，单纯增加预算可能无法回答最重要的问题：哪些投入真正带来了客户？",
        "",
        "可以先用一张表记录渠道、花费、咨询、有效线索和成交，再决定下一步测试什么。",
        "",
        "这是一份通用检查方法，不代表每家商户都存在以上问题。",
      ].join("\n"),
      callToAction:
        "如果你想梳理自己的获客流程，可以在平台内留言或私信“获客检查”。",
      disclosure: [
        "不使用虚构客户案例或收益数据。",
        "不承诺固定获客成本或成交结果。",
        "不在内容中添加未经平台允许的站外联系方式。",
      ],
    },
    {
      channel: "xiaohongshu",
      format: "educational-post",
      title:
        "先别急着加广告预算：你需要先知道钱花在哪里",
      body: [
        "广告效果不理想时，第一反应不一定是继续加预算。",
        "",
        "建议先把一次获客过程拆成四段：",
        "广告展示与点击 → 用户咨询 → 有效线索 → 实际成交。",
        "",
        "每一段都要单独记录。",
        "",
        "有点击、没咨询，可能要检查创意和咨询入口。",
        "有咨询、没成交，需要进一步了解线索质量、报价和跟进过程。",
        "有成交、利润低，则需要核算获客成本与真实毛利。",
        "",
        "这些是不同的问题，不能用同一种方法解决。",
        "",
        "如果你已有广告数据，可以先整理最近一段时间的花费、咨询和成交记录，再决定要测试的环节。",
      ].join("\n"),
      callToAction:
        "欢迎在平台内交流你目前最难判断的获客环节。",
      disclosure: [
        "以上为通用分析框架，不构成具体广告效果承诺。",
      ],
    },
    {
      channel: "xiaohongshu",
      format: "checklist-post",
      title:
        "有点击没咨询？先做这份广告落地检查清单",
      body: [
        "如果广告有人点击，却很少有人咨询，可以先检查：",
        "",
        "□ 广告与落地页面是否介绍同一项服务？",
        "□ 价格、服务范围和适用人群是否清楚？",
        "□ 用户是否需要填写过多信息才能咨询？",
        "□ 页面是否有真实、可核实的服务说明？",
        "□ 咨询入口在手机上是否容易找到？",
        "□ 是否记录了不同创意对应的咨询结果？",
        "",
        "先排查，再测试。一次只调整少量变量，才能更清楚地判断变化来自哪里。",
        "",
        "如果没有足够数据，就先补记录，不要直接把原因归结为广告素材。",
      ].join("\n"),
      callToAction:
        "需要整理自己的获客路径，可以在平台内私信“检查清单”。",
      disclosure: [
        "不把推测描述成已验证的广告问题。",
        "不使用未经授权的客户资料。",
      ],
    },
  ];
}

function buildXianyuAsset(
  industry: string,
  offerName: string,
  entryPrice: number,
  diagnosticPrice: number,
): InboundContentAsset {
  return {
    channel: "xianyu",
    format: "service-listing",
    title:
      `${offerName}｜广告线索与获客流程梳理`,
    body: [
      `适用对象：${industry}中希望梳理线上获客流程的经营者。`,
      "",
      `【入门版：${entryPrice}元】`,
      "1. 根据你提供的业务资料梳理现有获客路径。",
      "2. 检查广告、咨询入口和线索记录是否衔接。",
      "3. 给出一份初步问题清单和3个可测试的优化方向。",
      "",
      `【诊断版：${diagnosticPrice}元】`,
      "1. 在入门版基础上，分析客户提供的脱敏广告与咨询数据。",
      "2. 梳理点击、咨询、有效线索和成交之间的记录缺口。",
      "3. 提供优先级明确的优化行动计划和指标表。",
      "",
      "【购买前请注意】",
      "需要诊断版的客户，应先确认是否能够提供必要的广告数据。",
      "如果数据不足，只能提供初步判断与验证建议。",
      "本服务不包含广告费、代投、实地拍摄或账号代运营。",
      "不承诺固定线索数量、成交额或投资回报率。",
      "具体交付范围、时间和修改规则以双方确认的订单为准。",
    ].join("\n"),
    callToAction:
      "请通过闲鱼订单或平台允许的沟通方式，先说明业务类型、目前的获客方式和希望解决的问题。",
    disclosure: [
      "发布前核对闲鱼当前服务类目与发布规则。",
      "价格和交付范围必须与实际服务一致。",
      "不使用虚假案例、虚假评价或收益保证。",
    ],
  };
}

function buildSevenDayPlan(
  channels: InboundChannel[],
): InboundDemandCampaign["sevenDayPlan"] {
  const topics = [
    "广告花费与有效咨询的区别",
    "为什么点击量不能代表成交",
    "广告咨询入口检查清单",
    "如何记录线索来源",
    "咨询后没有成交应该检查什么",
    "一个广告实验应该记录哪些指标",
    "获客流程自查与常见误区",
  ];

  const purposes = [
    "吸引正在寻找获客方法的经营者",
    "帮助用户识别指标误区",
    "展示具体且可执行的诊断方法",
    "教育用户建立线索记录",
    "说明广告与销售转化的区别",
    "展示可复用的实验方法",
    "引导有真实需求的用户咨询",
  ];

  return topics.map((topic, index) => ({
    day: index + 1,
    channel: channels[index % channels.length] ||
      "xiaohongshu",
    topic,
    purpose: purposes[index],
  }));
}

export function buildInboundDemandCampaign(
  input: Partial<InboundDemandInput> = {},
): InboundDemandCampaign {
  const industry = cleanText(
    input.industry,
    DEFAULT_INDUSTRY,
  );

  const region = cleanText(
    input.region,
    DEFAULT_REGION,
  );

  const offerName = cleanText(
    input.offerName,
    DEFAULT_OFFER,
  );

  const entryPrice = validPrice(
    input.entryPrice,
    99,
  );

  const diagnosticPrice = validPrice(
    input.diagnosticPrice,
    399,
  );

  const channels = normalizeChannels(
    input.channels,
  );

  const contentAssets: InboundContentAsset[] =
    [];

  if (channels.includes("xiaohongshu")) {
    contentAssets.push(
      ...buildXiaohongshuAssets(industry),
    );
  }

  if (channels.includes("xianyu")) {
    contentAssets.push(
      buildXianyuAsset(
        industry,
        offerName,
        entryPrice,
        diagnosticPrice,
      ),
    );
  }

  return {
    id: C144_INBOUND_DEMAND_ENGINE_ID,
    version: C144_INBOUND_DEMAND_ENGINE_VERSION,
    status: "draft",
    targetMarket: region,
    industry,
    offer: {
      name: offerName,
      entryPrice,
      diagnosticPrice,
      entryDeliverables: [
        "获客路径初步检查",
        "问题清单",
        "3个可测试的优化方向",
      ],
      diagnosticDeliverables: [
        "基于客户提供数据的获客漏斗诊断",
        "线索记录缺口分析",
        "广告创意测试方向",
        "优先级行动计划",
        "指标追踪表",
      ],
      exclusions: [
        "广告平台预算",
        "未经授权的广告账户操作",
        "实地拍摄与视频剪辑",
        "账号代运营",
        "保证流量、线索或成交",
      ],
    },
    contentAssets,
    sevenDayPlan: buildSevenDayPlan(channels),
    intakeQuestions: [
      "你经营什么业务，主要服务哪些客户？",
      "目前是否正在投放广告？",
      "主要获客渠道是什么？",
      "是否有近期广告花费、咨询量和成交记录？",
      "当前最希望解决的问题是什么？",
      "你是否有权决定获客服务的采购？",
      "希望什么时候开始解决这个问题？",
    ],
    operatingRules: [
      "只使用真实、可核实的业务信息。",
      "区分已观察到的事实和待验证假设。",
      "不因公开页面信息推断客户一定有预算或购买意愿。",
      "不自动发布内容或向用户发送消息。",
      "在对外发布前检查渠道规则和服务类目。",
      "只有实际收到款项后才记录收入。",
    ],
    externalPublishing: {
      executed: false,
      requiresManualAction: true,
    },
    timestamp: Date.now(),
  };
}

function signalValue(
  value: unknown,
  expected: string,
): boolean {
  return value === expected;
}

export function scoreInboundLead(
  lead: Partial<InboundLead>,
): InboundLeadAssessment {
  let score = 0;
  const reasons: string[] = [];
  const missingInformation: string[] = [];

  if (
    cleanText(
      lead.businessType,
      "",
    ).length > 0
  ) {
    score += 15;
    reasons.push(
      "The inquiry includes a business type.",
    );
  } else {
    missingInformation.push(
      "Business type and target customer.",
    );
  }

  if (signalValue(lead.currentAds, "yes")) {
    score += 25;
    reasons.push(
      "The business reports current advertising activity.",
    );
  } else if (signalValue(lead.currentAds, "no")) {
    reasons.push(
      "The business is not currently advertising; the diagnostic offer may need adjustment.",
    );
  } else {
    missingInformation.push(
      "Whether the business is currently advertising.",
    );
  }

  if (signalValue(lead.hasAdData, "yes")) {
    score += 15;
    reasons.push(
      "The business reports having data for analysis.",
    );
  } else {
    missingInformation.push(
      "Whether recent advertising or lead data is available.",
    );
  }

  if (
    signalValue(
      lead.decisionRole,
      "decision-maker",
    )
  ) {
    score += 15;
    reasons.push(
      "The contact reports being the purchasing decision-maker.",
    );
  } else if (
    signalValue(
      lead.decisionRole,
      "influencer",
    )
  ) {
    score += 5;
  } else {
    missingInformation.push(
      "Whether the contact can approve a purchase.",
    );
  }

  if (
    signalValue(lead.budgetRange, "500-2000")
  ) {
    score += 10;
    reasons.push(
      "The reported budget range may support a paid diagnostic.",
    );
  } else if (
    signalValue(lead.budgetRange, "2000-plus")
  ) {
    score += 15;
    reasons.push(
      "The reported budget range may support a larger engagement.",
    );
  } else if (
    signalValue(lead.budgetRange, "under-500")
  ) {
    score += 3;
  } else {
    missingInformation.push(
      "Budget range or willingness to pay for a diagnostic.",
    );
  }

  if (signalValue(lead.urgency, "high")) {
    score += 10;
    reasons.push(
      "The inquiry reports a near-term need.",
    );
  } else if (
    signalValue(lead.urgency, "medium")
  ) {
    score += 6;
  } else if (
    signalValue(lead.urgency, "low")
  ) {
    score += 2;
  } else {
    missingInformation.push(
      "Expected timing for addressing the problem.",
    );
  }

  if (
    cleanText(lead.currentProblem, "").length > 0
  ) {
    score += 5;
    reasons.push(
      "The inquiry describes a concrete problem.",
    );
  } else {
    missingInformation.push(
      "The specific problem the customer wants to solve.",
    );
  }

  score = Math.min(100, score);

  let tier: InboundLeadAssessment["tier"];
  let recommendedAction: string;

  if (
    score >= 65 &&
    lead.currentAds === "yes" &&
    lead.hasAdData === "yes"
  ) {
    tier = "priority";
    recommendedAction =
      "Prepare a tailored diagnostic scope and confirm data availability, price, delivery time, and payment terms before accepting the order.";
  } else if (score >= 35) {
    tier = "nurture";
    recommendedAction =
      "Ask only the missing qualification questions. Do not prepare a full custom report until the need and scope are confirmed.";
  } else {
    tier = "low-priority";
    recommendedAction =
      "Provide a short general response or request essential context. Avoid spending significant custom-work time before qualification.";
  }

  return {
    score,
    tier,
    reasons,
    missingInformation,
    recommendedAction,
    evidenceBoundary:
      "This score ranks the completeness and apparent fit of the inquiry. It does not prove willingness to pay, actual budget, or future conversion.",
    timestamp: Date.now(),
  };
}

export function buildInboundReplyDraft(
  lead: Partial<InboundLead>,
  assessment: InboundLeadAssessment,
): string {
  if (assessment.tier === "priority") {
    return [
      "你好，感谢说明目前的获客情况。",
      "",
      "为了确认这次诊断能否真正解决你的问题，麻烦先准备近期广告花费、咨询量、有效线索和成交记录。涉及客户身份、联系方式或账户信息的内容请先脱敏。",
      "",
      "我会先确认资料是否足够，再明确交付范围、价格和时间。资料不足时只提供初步判断，不会把推测当成确定结论。",
    ].join("\n");
  }

  if (assessment.tier === "nurture") {
    return [
      "你好，我想先确认几个关键信息，避免给你不适用的方案。",
      "",
      `目前最想解决的问题是：${cleanText(
        lead.currentProblem,
        "暂未说明",
      )}`,
      "",
      "你现在主要通过什么渠道获客？是否正在投广告？手头有没有近期咨询和成交记录？",
      "",
      "确认这些信息后，我再判断适合做初步检查，还是需要完整的数据诊断。",
    ].join("\n");
  }

  return [
    "你好，感谢咨询。",
    "",
    "为了判断这项服务是否适合你，能否先简单说明经营的业务类型、目前的获客方式，以及最希望解决的问题？",
    "",
    "如果暂时没有广告数据，也可以先说明当前情况，我会先判断是否适合做初步检查。",
  ].join("\n");
}
