export const C144_INBOUND_DEMAND_ENGINE_ID =
  "C144-INBOUND-DEMAND-ENGINE";

export const C144_INBOUND_DEMAND_ENGINE_VERSION =
  "C144.5.0";

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

export interface InboundMarketContext {
  source:
    | "c168-market-intelligence"
    | "founder"
    | "manual"
    | "unknown";
  market?: string;
  geography?: string;
  verifiedProblems?: string[];
  buyingSignals?: string[];
  acquisitionSignals?: string[];
  diagnosticHypotheses?: string[];
  evidenceBoundary?: string;
}

export interface InboundDemandInput {
  industry?: string;
  region?: string;
  offerName?: string;
  entryPrice?: number;
  diagnosticPrice?: number;
  channels?: InboundChannel[];
  marketContext?: Partial<InboundMarketContext>;
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
  marketContext?: InboundMarketContext;
  contentStrategy?: {
    mode:
      | "evidence-driven"
      | "general-safe-fallback";
    primaryObjective: string;
    learningObjective: string;
    evidenceBoundary: string;
  };
}

const DEFAULT_INDUSTRY =
  "深圳家装、旧房局改与全屋定制商家";

const DEFAULT_REGION =
  "深圳";

const DEFAULT_OFFER =
  "48小时广告获客诊断";

const DEFAULT_ENTRY_PRICE =
  399;

const DEFAULT_DIAGNOSTIC_PRICE =
  699;

const DEFAULT_EVIDENCE_BOUNDARY =
  "Public market evidence can support content hypotheses, but it does not prove that any specific business has poor advertising performance, high lead cost, low conversion, negative ROI, budget, or purchase intent.";

function cleanText(
  value: unknown,
  fallback: string,
  maxLength = 500,
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

function cleanOptionalText(
  value: unknown,
  maxLength = 500,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function uniqueStrings(
  values: unknown,
  maxItems = 12,
  maxLength = 300,
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen =
    new Set<string>();

  const result: string[] = [];

  for (const value of values) {
    const text =
      cleanOptionalText(
        value,
        maxLength,
      );

    if (!text) {
      continue;
    }

    const key =
      text.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(text);

    if (
      result.length >=
      maxItems
    ) {
      break;
    }
  }

  return result;
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
    return [
      "xiaohongshu",
      "xianyu",
    ];
  }

  const valid =
    value.filter(
      (
        item,
      ): item is InboundChannel =>
        item ===
          "xiaohongshu" ||
        item ===
          "xianyu",
    );

  const unique =
    Array.from(
      new Set(valid),
    );

  return unique.length > 0
    ? unique
    : [
        "xiaohongshu",
        "xianyu",
      ];
}

function normalizeMarketContext(
  value: unknown,
  region: string,
): InboundMarketContext | undefined {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return undefined;
  }

  const candidate =
    value as Partial<InboundMarketContext>;

  const source:
    InboundMarketContext["source"] =
    candidate.source ===
      "c168-market-intelligence" ||
    candidate.source ===
      "founder" ||
    candidate.source ===
      "manual"
      ? candidate.source
      : "unknown";

  const verifiedProblems =
    uniqueStrings(
      candidate.verifiedProblems,
    );

  const buyingSignals =
    uniqueStrings(
      candidate.buyingSignals,
    );

  const acquisitionSignals =
    uniqueStrings(
      candidate.acquisitionSignals,
    );

  const diagnosticHypotheses =
    uniqueStrings(
      candidate.diagnosticHypotheses,
    );

  const hasUsefulContext =
    verifiedProblems.length > 0 ||
    buyingSignals.length > 0 ||
    acquisitionSignals.length > 0 ||
    diagnosticHypotheses.length > 0;

  if (!hasUsefulContext) {
    return undefined;
  }

  return {
    source,
    market:
      cleanOptionalText(
        candidate.market,
      ),
    geography:
      cleanText(
        candidate.geography,
        region,
      ),
    verifiedProblems,
    buyingSignals,
    acquisitionSignals,
    diagnosticHypotheses,
    evidenceBoundary:
      cleanText(
        candidate.evidenceBoundary,
        DEFAULT_EVIDENCE_BOUNDARY,
        1000,
      ),
  };
}

function hasEvidenceDrivenContext(
  context:
    | InboundMarketContext
    | undefined,
): boolean {
  if (!context) {
    return false;
  }

  return (
    (context.verifiedProblems?.length ??
      0) > 0 ||
    (context.buyingSignals?.length ??
      0) > 0 ||
    (context.acquisitionSignals?.length ??
      0) > 0 ||
    (context.diagnosticHypotheses
      ?.length ?? 0) > 0
  );
}

function pickPrimaryProblem(
  context:
    | InboundMarketContext
    | undefined,
): string {
  return (
    context?.verifiedProblems?.[0] ||
    context
      ?.diagnosticHypotheses?.[0] ||
    "很多商家有内容、咨询入口或推广动作，但没有把客户、Offer、咨询路径和最终结果放在同一条链路里验证"
  );
}

function pickSecondaryProblem(
  context:
    | InboundMarketContext
    | undefined,
): string {
  return (
    context?.verifiedProblems?.[1] ||
    context
      ?.diagnosticHypotheses?.[1] ||
    "点击、咨询、有效线索和成交属于不同阶段，不能只用单一指标判断获客是否有效"
  );
}

function pickBuyingSignal(
  context:
    | InboundMarketContext
    | undefined,
): string {
  return (
    context?.buyingSignals?.[0] ||
    "公开市场中持续存在内容获客、咨询入口、免费量房、报价或服务推广等商业动作"
  );
}

function pickAcquisitionSignal(
  context:
    | InboundMarketContext
    | undefined,
): string {
  return (
    context
      ?.acquisitionSignals?.[0] ||
    "公开内容和咨询入口可以被观察，但真实广告效果仍需要客户授权数据才能判断"
  );
}

function buildEvidenceDrivenXiaohongshuAssets(
  industry: string,
  region: string,
  context: InboundMarketContext,
): InboundContentAsset[] {
  const primaryProblem =
    pickPrimaryProblem(
      context,
    );

  const secondaryProblem =
    pickSecondaryProblem(
      context,
    );

  const buyingSignal =
    pickBuyingSignal(
      context,
    );

  const acquisitionSignal =
    pickAcquisitionSignal(
      context,
    );

  return [
    {
      channel:
        "xiaohongshu",
      format:
        "market-insight-post",
      title:
        `${region}家装获客：有咨询入口，不等于已经知道问题出在哪里`,
      body: [
        `最近整理${region}${industry}公开获客信息时，一个值得关注的现象是：`,
        "",
        primaryProblem,
        "",
        "这并不能证明某一家公司的广告效果不好。",
        "但它说明经营者在判断获客问题时，不能只看有没有内容、有没有咨询按钮或有没有流量。",
        "",
        "更有用的检查方式是把整个过程拆开：",
        "1. 什么客户看到了内容或广告？",
        "2. 内容承诺的服务是什么？",
        "3. 用户下一步进入哪个咨询入口？",
        "4. 咨询中有多少是真正匹配的客户？",
        "5. 最终哪些咨询产生了有效业务结果？",
        "",
        `当前市场观察：${acquisitionSignal}`,
        "",
        "如果没有客户自己的广告、咨询和成交数据，就应该把结论停留在“需要验证”，而不是直接判断广告好坏。",
      ].join("\n"),
      callToAction:
        "如果你正在做家装、旧房局改或全屋定制获客，可以在平台内私信“获客诊断”，说明目前最难判断的一个环节。",
      disclosure: [
        "内容来自公开市场模式与可验证信息的归纳，不代表任何特定商家的实际广告表现。",
        "不使用虚构客户案例或收益数据。",
        "不承诺固定线索数量、成交数量或广告ROI。",
        "真实诊断需要客户主动提供或授权的数据。",
      ],
    },
    {
      channel:
        "xiaohongshu",
      format:
        "problem-diagnosis-post",
      title:
        "装修获客别只看点击：真正要追的是这4个数字",
      body: [
        `如果你经营${industry}，正在做线上获客，最容易混在一起的其实是四件事：`,
        "",
        "广告或内容带来的点击。",
        "真正产生的咨询。",
        "符合业务条件的有效线索。",
        "最终成交。",
        "",
        secondaryProblem,
        "",
        "所以看到“点击不少”不能直接说明获客有效。",
        "同样，看到“咨询不多”也不能在没有数据的情况下直接归因于素材、平台或投放。",
        "",
        "更实用的方法是先建立最小记录：",
        "渠道 → 花费 → 咨询 → 有效线索 → 成交。",
        "",
        "然后只找当前损失最大的一个环节做下一轮测试。",
        "",
        `公开市场信号：${buyingSignal}`,
        "",
        "这个信号只说明市场存在持续获客动作，不代表任何具体商家已经准备购买服务。",
      ].join("\n"),
      callToAction:
        "如果你已经有近期广告或咨询记录，可以在平台内私信“检查”，先判断数据够不够做诊断。",
      disclosure: [
        "Buying Signal只用于识别值得研究的市场主题，不等于购买意愿。",
        "不把公开信息推断成客户内部广告数据。",
        "不保证诊断后一定增加线索或成交。",
      ],
    },
    {
      channel:
        "xiaohongshu",
      format:
        "diagnostic-checklist-post",
      title:
        "深圳装修公司获客自查：先别加预算，先检查这6项",
      body: [
        `如果你在${region}做家装、旧房局改或全屋定制，可以先检查：`,
        "",
        "□ 目标客户是否具体，而不是只写“有装修需求的人”？",
        "□ Offer是否明确告诉客户为什么现在值得咨询？",
        "□ 内容、广告和咨询页面说的是不是同一件事？",
        "□ 免费量房、报价或设计入口是否说明下一步会发生什么？",
        "□ 是否记录每条咨询来自哪个渠道？",
        "□ 是否区分普通咨询、有效线索和真实成交？",
        "",
        "如果其中几项没有记录清楚，先补证据，再判断问题。",
        "",
        primaryProblem,
        "",
        "这是一份诊断框架，不是对任何具体公司的广告效果评价。",
      ].join("\n"),
      callToAction:
        "需要把自己的获客链路拆开检查，可以在平台内私信“6项检查”。",
      disclosure: [
        "不使用未经授权的客户资料。",
        "不把市场观察写成具体客户已经发生的问题。",
        "发布前需要Founder再次检查平台规则和最终表述。",
      ],
    },
  ];
}

function buildGeneralXiaohongshuAssets(
  industry: string,
): InboundContentAsset[] {
  return [
    {
      channel:
        "xiaohongshu",
      format:
        "educational-post",
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
      channel:
        "xiaohongshu",
      format:
        "educational-post",
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
        "有点击、没咨询，需要进一步检查创意和咨询入口。",
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
      channel:
        "xiaohongshu",
      format:
        "checklist-post",
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
  context:
    | InboundMarketContext
    | undefined,
): InboundContentAsset {
  const evidenceDriven =
    hasEvidenceDrivenContext(
      context,
    );

  const contextLine =
    evidenceDriven
      ? `当前服务方向来自真实市场公开信息中反复出现的获客、咨询入口和业务增长信号，但不会据此判断你的实际广告表现。`
      : "本服务使用通用获客诊断框架，具体结论需要基于你主动提供或授权的数据。";

  return {
    channel:
      "xianyu",
    format:
      "service-listing",
    title:
      `${offerName}｜家装广告线索与获客流程诊断`,
    body: [
      `适用对象：${industry}中已经存在真实获客需求，希望判断客户、Offer、内容或广告入口、咨询路径哪里值得优先优化的经营者。`,
      "",
      contextLine,
      "",
      `【${entryPrice}元｜48小时广告获客诊断】`,
      "1. 梳理你当前的目标客户与获客目标。",
      "2. 检查内容或广告入口、Offer和咨询路径是否衔接。",
      "3. 区分已验证事实、待验证假设和缺失数据。",
      "4. 给出优先级明确的优化建议。",
      "5. 给出下一轮可以实际验证的测试方向。",
      "",
      `【${diagnosticPrice}元｜7天广告获客验证】`,
      "1. 适合已经完成基础诊断并需要继续验证的客户。",
      "2. 围绕客户、Offer、内容或广告入口、咨询路径进行小范围测试。",
      "3. 根据真实结果记录有效与无效假设。",
      "4. 形成下一轮优化建议。",
      "",
      "【购买前请注意】",
      "诊断需要你提供真实业务情况。",
      "涉及广告、咨询和成交数据时，请只提供你有权处理的资料，并先对客户身份、联系方式等敏感信息做必要脱敏。",
      "如果数据不足，只能提供初步判断和验证建议。",
      "本服务不包含广告费、广告账户托管、实地拍摄或账号代运营。",
      "不承诺固定线索数量、成交额或广告ROI。",
      "具体交付范围、时间和修改规则以双方确认的订单为准。",
    ].join("\n"),
    callToAction:
      "请通过闲鱼订单或平台允许的沟通方式，先说明业务类型、目前的获客方式、是否有近期数据，以及最希望解决的问题。",
    disclosure: [
      "发布前核对闲鱼当前服务类目与发布规则。",
      "价格和交付范围必须与实际服务一致。",
      "不使用虚假案例、虚假评价或收益保证。",
      "公开市场Evidence或Buying Signal不等于客户本人存在广告问题或购买意愿。",
    ],
  };
}

function buildSevenDayPlan(
  channels: InboundChannel[],
  context:
    | InboundMarketContext
    | undefined,
): InboundDemandCampaign["sevenDayPlan"] {
  const evidenceDriven =
    hasEvidenceDrivenContext(
      context,
    );

  const primaryProblem =
    pickPrimaryProblem(
      context,
    );

  const secondaryProblem =
    pickSecondaryProblem(
      context,
    );

  const buyingSignal =
    pickBuyingSignal(
      context,
    );

  const topics =
    evidenceDriven
      ? [
          primaryProblem,
          secondaryProblem,
          "目标客户、Offer和咨询入口为什么必须放在同一条链路里检查",
          buyingSignal,
          "如何区分点击、咨询、有效线索和成交",
          "客户数据不足时，广告诊断应该怎样避免乱下结论",
          "家装获客自查：下一轮最值得验证的一个变量是什么",
        ]
      : [
          "广告花费与有效咨询的区别",
          "为什么点击量不能代表成交",
          "广告咨询入口检查清单",
          "如何记录线索来源",
          "咨询后没有成交应该检查什么",
          "一个广告实验应该记录哪些指标",
          "获客流程自查与常见误区",
        ];

  const purposes = [
    "用真实市场问题吸引具有相关需求的经营者",
    "帮助潜在客户识别获客判断中的信息缺口",
    "展示具体且可执行的诊断方法",
    "把公开市场信号转化为教育内容而不是客户推断",
    "建立点击到成交的完整漏斗认知",
    "展示AIOS对事实、假设和未知信息的边界",
    "引导具有真实需求的客户通过平台产生咨询",
  ];

  return topics.map(
    (
      topic,
      index,
    ) => ({
      day:
        index + 1,
      channel:
        channels[
          index %
            channels.length
        ] ||
        "xiaohongshu",
      topic,
      purpose:
        purposes[index],
    }),
  );
}

export function buildInboundDemandCampaign(
  input: Partial<InboundDemandInput> = {},
): InboundDemandCampaign {
  const industry =
    cleanText(
      input.industry,
      DEFAULT_INDUSTRY,
    );

  const region =
    cleanText(
      input.region,
      DEFAULT_REGION,
    );

  const offerName =
    cleanText(
      input.offerName,
      DEFAULT_OFFER,
    );

  const entryPrice =
    validPrice(
      input.entryPrice,
      DEFAULT_ENTRY_PRICE,
    );

  const diagnosticPrice =
    validPrice(
      input.diagnosticPrice,
      DEFAULT_DIAGNOSTIC_PRICE,
    );

  const channels =
    normalizeChannels(
      input.channels,
    );

  const marketContext =
    normalizeMarketContext(
      input.marketContext,
      region,
    );

  const evidenceDriven =
    hasEvidenceDrivenContext(
      marketContext,
    );

  const contentAssets:
    InboundContentAsset[] =
    [];

  if (
    channels.includes(
      "xiaohongshu",
    )
  ) {
    if (
      evidenceDriven &&
      marketContext
    ) {
      contentAssets.push(
        ...buildEvidenceDrivenXiaohongshuAssets(
          industry,
          region,
          marketContext,
        ),
      );
    } else {
      contentAssets.push(
        ...buildGeneralXiaohongshuAssets(
          industry,
        ),
      );
    }
  }

  if (
    channels.includes(
      "xianyu",
    )
  ) {
    contentAssets.push(
      buildXianyuAsset(
        industry,
        offerName,
        entryPrice,
        diagnosticPrice,
        marketContext,
      ),
    );
  }

  return {
    id:
      C144_INBOUND_DEMAND_ENGINE_ID,

    version:
      C144_INBOUND_DEMAND_ENGINE_VERSION,

    status:
      "draft",

    targetMarket:
      region,

    industry,

    offer: {
      name:
        offerName,

      entryPrice,

      diagnosticPrice,

      entryDeliverables: [
        "目标客户与获客诉求诊断",
        "公开内容与获客入口检查",
        "Offer与价值表达检查",
        "咨询与留资路径检查",
        "已验证事实、假设与未知项分离",
        "优先级优化建议",
        "下一轮可验证测试方向",
      ],

      diagnosticDeliverables: [
        "基础诊断结果复核",
        "客户细分测试方向",
        "Offer测试方向",
        "内容或广告创意测试方向",
        "获客入口优化建议",
        "真实结果记录",
        "下一轮优化建议",
      ],

      exclusions: [
        "广告平台预算",
        "未经授权的广告账户操作",
        "未经Founder批准的外部联系",
        "实地拍摄与视频剪辑",
        "账号代运营",
        "保证流量、线索或成交",
        "保证广告ROI",
      ],
    },

    contentAssets,

    sevenDayPlan:
      buildSevenDayPlan(
        channels,
        marketContext,
      ),

    intakeQuestions: [
      "你经营什么业务，主要服务哪些客户？",
      "目前主要通过什么渠道获客？",
      "目前是否正在投放广告？",
      "是否有近期广告花费、咨询量、有效线索和成交记录？",
      "当前最希望解决的获客问题是什么？",
      "你是否有权决定获客服务的采购？",
      "可以接受的诊断或验证预算范围是什么？",
      "希望什么时候开始解决这个问题？",
    ],

    operatingRules: [
      "只使用真实、可核实的业务信息。",
      "优先从真实市场Evidence提炼内容主题，不为了发布数量虚构市场问题。",
      "区分已观察到的事实、合理假设和未知信息。",
      "公开Buying Signal只代表研究价值，不代表购买意愿。",
      "不因公开页面存在广告、内容或咨询入口而推断广告表现不佳。",
      "不把公开市场Evidence描述成客户本人提供的数据。",
      "真实客户诊断只使用客户主动提供或明确授权处理的信息。",
      "不自动发布内容或向用户发送消息。",
      "发布前由Founder检查渠道规则、服务类目、价格和最终文案。",
      "小红书与闲鱼是当前外部流量入口，AIOS本身不是当前获客流量来源。",
      "内容的目标不是推广AIOS品牌，而是让真实客户识别自己的获客问题并产生平台内咨询。",
      "只有实际收到款项后才记录收入。",
      "真实询盘、付款和成交结果优先于模型评分。",
    ],

    externalPublishing: {
      executed:
        false,
      requiresManualAction:
        true,
    },

    timestamp:
      Date.now(),

    ...(marketContext
      ? {
          marketContext,
        }
      : {}),

    contentStrategy: {
      mode:
        evidenceDriven
          ? "evidence-driven"
          : "general-safe-fallback",

      primaryObjective:
        "Convert verified market problems into useful Xiaohongshu and Xianyu assets that can generate real platform-native inquiries without requiring AIOS itself to have market traffic.",

      learningObjective:
        "Measure which market problem, content angle, platform, call-to-action, and offer produce verified inquiries and paid outcomes, then use those real results to improve the next acquisition cycle.",

      evidenceBoundary:
        marketContext
          ?.evidenceBoundary ||
        DEFAULT_EVIDENCE_BOUNDARY,
    },
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

  const reasons:
    string[] = [];

  const missingInformation:
    string[] = [];

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

  if (
    signalValue(
      lead.currentAds,
      "yes",
    )
  ) {
    score += 25;

    reasons.push(
      "The business reports current advertising activity.",
    );
  } else if (
    signalValue(
      lead.currentAds,
      "no",
    )
  ) {
    reasons.push(
      "The business is not currently advertising; the diagnostic scope may need to focus on the acquisition path before paid advertising.",
    );
  } else {
    missingInformation.push(
      "Whether the business is currently advertising.",
    );
  }

  if (
    signalValue(
      lead.hasAdData,
      "yes",
    )
  ) {
    score += 15;

    reasons.push(
      "The business reports having data available for analysis.",
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
    signalValue(
      lead.budgetRange,
      "500-2000",
    )
  ) {
    score += 10;

    reasons.push(
      "The reported budget range may support the current paid diagnostic or validation offer.",
    );
  } else if (
    signalValue(
      lead.budgetRange,
      "2000-plus",
    )
  ) {
    score += 15;

    reasons.push(
      "The reported budget range may support a larger engagement after initial validation.",
    );
  } else if (
    signalValue(
      lead.budgetRange,
      "under-500",
    )
  ) {
    score += 5;

    reasons.push(
      "The reported budget may fit the entry diagnostic but should be confirmed before custom work begins.",
    );
  } else {
    missingInformation.push(
      "Budget range or willingness to pay for a diagnostic.",
    );
  }

  if (
    signalValue(
      lead.urgency,
      "high",
    )
  ) {
    score += 10;

    reasons.push(
      "The inquiry reports a near-term need.",
    );
  } else if (
    signalValue(
      lead.urgency,
      "medium",
    )
  ) {
    score += 6;
  } else if (
    signalValue(
      lead.urgency,
      "low",
    )
  ) {
    score += 2;
  } else {
    missingInformation.push(
      "Expected timing for addressing the problem.",
    );
  }

  if (
    cleanText(
      lead.currentProblem,
      "",
    ).length > 0
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

  score =
    Math.min(
      100,
      score,
    );

  let tier:
    InboundLeadAssessment["tier"];

  let recommendedAction:
    string;

  if (
    score >= 65 &&
    lead.currentAds ===
      "yes" &&
    lead.hasAdData ===
      "yes"
  ) {
    tier =
      "priority";

    recommendedAction =
      "Prepare the C168 entry diagnostic scope, confirm the customer-provided data, price, delivery time, and payment terms, and do not begin custom delivery before the commercial scope is confirmed.";
  } else if (
    score >= 35
  ) {
    tier =
      "nurture";

    recommendedAction =
      "Ask only the missing qualification questions. Do not prepare a full custom report until the real need, available evidence, scope, and willingness to pay are confirmed.";
  } else {
    tier =
      "low-priority";

    recommendedAction =
      "Provide a short general response or request essential context. Avoid significant custom work before the inquiry becomes sufficiently qualified.";
  }

  return {
    score,
    tier,
    reasons,
    missingInformation,
    recommendedAction,
    evidenceBoundary:
      "This score ranks the completeness and apparent fit of a real inbound inquiry. It does not prove willingness to pay, actual budget, advertising performance, or future conversion.",
    timestamp:
      Date.now(),
  };
}

export function buildInboundReplyDraft(
  lead: Partial<InboundLead>,
  assessment: InboundLeadAssessment,
): string {
  if (
    assessment.tier ===
    "priority"
  ) {
    return [
      "你好，感谢说明目前的获客情况。",
      "",
      "从你提供的信息看，可以进一步确认是否适合做48小时广告获客诊断。",
      "",
      "为了避免凭感觉判断，麻烦先准备近期广告花费、咨询量、有效线索和成交记录。涉及客户身份、联系方式或账户信息的内容请先脱敏，只提供你有权处理的资料。",
      "",
      "我会先确认资料是否足够，再明确诊断范围、399元价格、交付时间和需要验证的问题。",
      "",
      "如果资料不足，只提供初步判断和下一步验证建议，不会把推测写成确定结论。",
    ].join("\n");
  }

  if (
    assessment.tier ===
    "nurture"
  ) {
    return [
      "你好，我想先确认几个关键信息，避免直接给你一套不适用的方案。",
      "",
      `目前最想解决的问题是：${cleanText(
        lead.currentProblem,
        "暂未说明",
      )}`,
      "",
      "你现在主要通过什么渠道获客？是否正在投广告？手头有没有近期广告花费、咨询、有效线索和成交记录？",
      "",
      "另外也需要确认你目前更希望解决的是流量、咨询量、线索质量，还是咨询后的成交问题。",
      "",
      "确认这些信息后，再判断是否适合做399元的48小时广告获客诊断。",
    ].join("\n");
  }

  return [
    "你好，感谢咨询。",
    "",
    "为了先判断这项服务是否适合你，能否简单说明经营的业务类型、目前主要的获客方式，以及现在最希望解决的一个问题？",
    "",
    "如果正在投广告，也可以说明目前是否有近期花费、咨询和成交记录。",
    "",
    "暂时没有完整数据也没关系，会先判断哪些问题可以分析、哪些还需要补充证据，不会在信息不足时直接下结论。",
  ].join("\n");
}
