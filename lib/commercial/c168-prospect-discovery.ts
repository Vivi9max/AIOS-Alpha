import "server-only";

import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import type {
  VerifiedWebEvidence,
} from "@/lib/web-intelligence/source-verifier";

import {
  C168_TARGET_PROFILE,
} from "@/lib/commercial/c168-ad-acquisition";

export const C168_PROSPECT_DISCOVERY_ID =
  "C168-PROSPECT-DISCOVERY";

export const C168_PROSPECT_DISCOVERY_VERSION =
  "C168.5.1";

export type C168ProspectIndustry =
  | "home-renovation"
  | "old-home-renovation"
  | "whole-house-customization";

export type C168ProspectQualification =
  | "qualified"
  | "needs-manual-validation";

export type C168CommercialAction =
  | "selective-outbound"
  | "inbound-opportunity"
  | "monitor"
  | "reject";

export interface C168ProspectEvidence {
  url: string;
  hostname: string;
  title: string;
  snippets: string[];
  credibilityTier: string;
  verificationLabel: string;
  verificationScore: number;
}

export interface C168CommercialDecision {
  action: C168CommercialAction;
  actionScore: number;
  evidenceConfidence: number;
  buyingSignalScore: number;
  acquisitionReadinessScore: number;
  reasons: string[];
  founderReviewRequired: boolean;
}

export interface C168ProspectCandidate {
  id: string;
  rank: number;
  name: string;
  industry: C168ProspectIndustry;
  location: string;
  qualification:
    C168ProspectQualification;
  evidenceScore: number;
  verifiedFacts: string[];
  acquisitionSignals: string[];
  buyingSignals: string[];
  diagnosticHypotheses: string[];
  unknowns: string[];
  evidence: C168ProspectEvidence[];
  commercialDecision:
    C168CommercialDecision;
  recommendedAction: string;
}

export interface C168ProspectDiscoveryResult {
  success: boolean;
  status:
    | "ready"
    | "insufficient-evidence"
    | "failed";
  targetMarket: string;
  geography: string;
  candidates: C168ProspectCandidate[];
  sourceCount: number;
  independentHosts: number;
  selectiveOutboundCount: number;
  inboundOpportunityCount: number;
  monitorCount: number;
  rejectedCount: number;
  conclusion: string;
  nextStep: string;
  integrity: {
    fabricatedProspect: false;
    fabricatedBuyingSignal: false;
    fabricatedAdvertisingPerformance: false;
    fabricatedContact: false;
    fabricatedCustomer: false;
  };
  timestamp: number;
}

interface DiscoverySource {
  evidence: VerifiedWebEvidence;
  searchIntent: string;
}

interface BusinessSeed {
  name: string;
  source: DiscoverySource;
}

const DISCOVERY_PROMPTS = [
  "搜索 深圳 装修公司 家装 设计 装修 获客 广告 推广",
  "搜索 深圳 旧房翻新 旧房改造 局部改造 公司 获客 推广",
  "搜索 深圳 全屋定制 公司 获客 广告 推广",
  "搜索 深圳 家装公司 线上获客 营销 推广",
  "搜索 深圳 装修公司 小红书 抖音 获客",
  "搜索 深圳 装修公司 客户 咨询 预约 设计",
  "搜索 深圳 装修公司 新店 开业 新业务 旧房改造",
  "搜索 深圳 装修公司 招聘 营销 销售 市场",
  "搜索 深圳 装修公司 活动 套餐 优惠 免费量房",
];

const SHENZHEN_TERMS = [
  "深圳",
  "shenzhen",
  "南山",
  "福田",
  "罗湖",
  "宝安",
  "龙岗",
  "龙华",
  "光明",
  "坪山",
  "盐田",
  "大鹏",
];

const HOME_RENOVATION_TERMS = [
  "装修",
  "家装",
  "装饰",
  "室内设计",
  "住宅设计",
  "装修设计",
  "home renovation",
  "interior design",
];

const OLD_HOME_TERMS = [
  "旧房",
  "旧房翻新",
  "旧房改造",
  "二手房改造",
  "局部改造",
  "局改",
  "翻新",
];

const WHOLE_HOUSE_TERMS = [
  "全屋定制",
  "整家定制",
  "全案定制",
  "定制家居",
  "定制家具",
];

const ACQUISITION_SIGNAL_TERMS = [
  "广告",
  "推广",
  "获客",
  "营销",
  "线上营销",
  "网络营销",
  "线上获客",
  "客户咨询",
  "免费咨询",
  "在线咨询",
  "立即咨询",
  "预约",
  "预约设计",
  "免费设计",
  "免费量房",
  "量房",
  "报价",
  "免费报价",
  "获取报价",
  "案例",
  "装修案例",
  "设计案例",
  "小红书",
  "抖音",
  "公众号",
  "视频号",
  "百度推广",
  "信息流",
  "线索",
  "lead",
  "leads",
  "marketing",
  "advertising",
];

const BUYING_SIGNAL_GROUPS: Array<{
  label: string;
  terms: string[];
  weight: number;
}> = [
  {
    label:
      "近期业务扩张或新业务信号",
    terms: [
      "新店",
      "开业",
      "新店开业",
      "新增门店",
      "新业务",
      "业务升级",
      "品牌升级",
      "全新升级",
    ],
    weight: 0.18,
  },
  {
    label:
      "旧房改造或局改业务强化信号",
    terms: [
      "旧房翻新",
      "旧房改造",
      "二手房改造",
      "局部改造",
      "局改",
      "焕新",
    ],
    weight: 0.18,
  },
  {
    label:
      "近期Offer或促销信号",
    terms: [
      "套餐",
      "优惠",
      "活动",
      "限时",
      "特惠",
      "补贴",
      "免费量房",
      "免费设计",
      "免费报价",
      "一口价",
    ],
    weight: 0.14,
  },
  {
    label:
      "主动获客或内容增长信号",
    terms: [
      "获客",
      "推广",
      "营销",
      "抖音",
      "小红书",
      "视频号",
      "直播",
      "短视频",
      "信息流",
      "百度推广",
    ],
    weight: 0.16,
  },
  {
    label:
      "营销或销售招聘信号",
    terms: [
      "招聘",
      "市场专员",
      "营销专员",
      "销售顾问",
      "客户经理",
      "网络推广",
      "新媒体运营",
      "短视频运营",
    ],
    weight: 0.16,
  },
  {
    label:
      "明确咨询或留资入口信号",
    terms: [
      "立即咨询",
      "在线咨询",
      "预约设计",
      "预约量房",
      "免费咨询",
      "获取报价",
      "免费报价",
      "联系电话",
      "联系我们",
    ],
    weight: 0.12,
  },
];

const GENERIC_NAME_TERMS = [
  "深圳装修公司",
  "深圳家装公司",
  "装修公司",
  "家装公司",
  "装饰公司",
  "装修设计",
  "旧房改造",
  "旧房翻新",
  "全屋定制",
  "装修网",
  "装修平台",
  "装修公司排名",
  "十大装修公司",
  "装修公司推荐",
  "装修攻略",
  "装修案例",
  "新房装修",
  "目前装修",
  "大型装修",
  "全案设计",
  "预约设计",
  "高端定制",
  "资深设计",
  "新房装饰",
  "家装设计",
  "室内设计",
  "设计公司",
  "装修设计公司",
  "家装设计公司",
  "装修服务",
  "装修服务商",
  "装企",
  "装饰设计",
  "家装案例",
  "设计案例",
  "装修推荐",
  "装修报价",
  "免费量房",
  "免费设计",
];

const EXCLUDED_HOST_HINTS = [
  "zhihu.",
  "baike.",
  "wikipedia.",
  "youtube.",
  "facebook.",
  "instagram.",
  "reddit.",
];

function normalizeText(
  value: unknown,
  maxLength = 1600,
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
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) =>
          normalizeText(value),
        )
        .filter(Boolean),
    ),
  );
}

function clampScore(
  value: number,
): number {
  return Math.min(
    1,
    Math.max(
      0,
      Number(
        value.toFixed(3),
      ),
    ),
  );
}

function normalizeHost(
  hostname: string,
): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
}

function containsAny(
  text: string,
  terms: string[],
): boolean {
  const lower =
    text.toLowerCase();

  return terms.some((term) =>
    lower.includes(
      term.toLowerCase(),
    ),
  );
}

function sourceText(
  evidence: VerifiedWebEvidence,
): string {
  return [
    evidence.title,
    evidence.hostname,
    ...(evidence.snippets || []),
  ]
    .join(" ")
    .toLowerCase();
}

function combinedSourceText(
  sources: DiscoverySource[],
): string {
  return sources
    .map((source) =>
      sourceText(
        source.evidence,
      ),
    )
    .join(" ");
}

function isExcludedHost(
  hostname: string,
): boolean {
  const host =
    normalizeHost(hostname);

  return EXCLUDED_HOST_HINTS.some(
    (item) =>
      host.includes(item),
  );
}

function cleanBusinessName(
  value: string,
): string {
  return normalizeText(
    value
      .replace(
        /^[\s\-|:：]+/,
        "",
      )
      .replace(
        /[\s\-|:：]+$/,
        "",
      ),
    100,
  );
}

function normalizeBusinessKey(
  value: string,
): string {
  return cleanBusinessName(value)
    .toLowerCase()
    .replace(
      /[\s()（）\-_.·]+/g,
      "",
    );
}

function isGenericBusinessName(
  value: string,
): boolean {
  const name =
    normalizeBusinessKey(value);

  if (
    name.length < 2 ||
    name.length > 80
  ) {
    return true;
  }

  return GENERIC_NAME_TERMS.some(
    (term) => {
      const normalizedTerm =
        normalizeBusinessKey(term);

      return (
        name === normalizedTerm
      );
    },
  );
}

function extractBusinessSeeds(
  source: DiscoverySource,
): BusinessSeed[] {
  const evidence =
    source.evidence;

  const text = [
    evidence.title,
    ...(evidence.snippets || []),
  ].join(" ");

  const seeds: BusinessSeed[] = [];

  const legalPatterns = [
    /([\u4e00-\u9fffA-Za-z0-9&()（）·.-]{2,50}(?:有限公司|股份有限公司|有限责任公司))/g,
    /([\u4e00-\u9fffA-Za-z0-9&()（）·.-]{2,40}(?:装饰|家居|设计|装修|定制)(?:集团)?)/g,
  ];

  for (const pattern of legalPatterns) {
    for (
      const match of
        text.matchAll(pattern)
    ) {
      const name =
        cleanBusinessName(
          match[1] || "",
        );

      if (
        !name ||
        isGenericBusinessName(
          name,
        )
      ) {
        continue;
      }

      seeds.push({
        name,
        source,
      });
    }
  }

  return seeds;
}

function classifyIndustry(
  text: string,
): C168ProspectIndustry {
  if (
    containsAny(
      text,
      OLD_HOME_TERMS,
    )
  ) {
    return "old-home-renovation";
  }

  if (
    containsAny(
      text,
      WHOLE_HOUSE_TERMS,
    )
  ) {
    return "whole-house-customization";
  }

  return "home-renovation";
}

function extractAcquisitionSignals(
  sources: DiscoverySource[],
): string[] {
  const text =
    combinedSourceText(
      sources,
    );

  return uniqueStrings(
    ACQUISITION_SIGNAL_TERMS
      .filter((term) =>
        text.includes(
          term.toLowerCase(),
        ),
      )
      .map((term) =>
        `公开信息出现获客相关信号: ${term}`,
      ),
  ).slice(0, 8);
}

function extractBuyingSignals(
  sources: DiscoverySource[],
): string[] {
  const text =
    combinedSourceText(
      sources,
    );

  const signals =
    BUYING_SIGNAL_GROUPS
      .filter((group) =>
        containsAny(
          text,
          group.terms,
        ),
      )
      .map((group) =>
        `公开信息出现Buying Signal: ${group.label}`,
      );

  return uniqueStrings(
    signals,
  );
}

function calculateBuyingSignalScore(
  sources: DiscoverySource[],
): number {
  const text =
    combinedSourceText(
      sources,
    );

  const score =
    BUYING_SIGNAL_GROUPS.reduce(
      (sum, group) => {
        if (
          !containsAny(
            text,
            group.terms,
          )
        ) {
          return sum;
        }

        return (
          sum +
          group.weight
        );
      },
      0,
    );

  return clampScore(
    score,
  );
}

function buildVerifiedFacts(
  name: string,
  industry: C168ProspectIndustry,
  sources: DiscoverySource[],
): string[] {
  const facts: string[] = [];

  facts.push(
    `公开证据中存在商业主体或品牌名称: ${name}`,
  );

  const text =
    combinedSourceText(
      sources,
    );

  if (
    containsAny(
      text,
      SHENZHEN_TERMS,
    )
  ) {
    facts.push(
      "公开证据包含深圳地域信号。",
    );
  }

  if (
    industry ===
    "old-home-renovation"
  ) {
    facts.push(
      "公开证据包含旧房翻新、旧房改造或局部改造相关业务信号。",
    );
  } else if (
    industry ===
    "whole-house-customization"
  ) {
    facts.push(
      "公开证据包含全屋定制、整家定制或定制家居相关业务信号。",
    );
  } else {
    facts.push(
      "公开证据包含家装、装修或室内设计相关业务信号。",
    );
  }

  return uniqueStrings(
    facts,
  );
}

function buildDiagnosticHypotheses(
  industry: C168ProspectIndustry,
  acquisitionSignals: string[],
  buyingSignals: string[],
): string[] {
  const hypotheses: string[] = [];

  if (
    acquisitionSignals.length > 0
  ) {
    hypotheses.push(
      "该商家存在公开可观察的获客入口，可进一步检查目标客户、Offer、内容入口和咨询路径是否一致。",
    );
  }

  if (
    buyingSignals.length > 0
  ) {
    hypotheses.push(
      "公开信息存在商业行动信号，但这只代表值得进一步研究，不代表该商家已经存在广告效果问题。",
    );
  }

  if (
    industry ===
    "old-home-renovation"
  ) {
    hypotheses.push(
      "可检查旧房翻新或局改客户是否拥有独立、明确的价值表达和咨询入口，而不是与泛家装需求混合。",
    );
  } else {
    hypotheses.push(
      "可检查不同装修需求是否得到清晰客户分层，避免多个服务方向共享过于宽泛的获客表达。",
    );
  }

  hypotheses.push(
    "可检查从公开内容或广告入口到咨询、预约、量房或报价之间是否存在可观察的转化摩擦。",
  );

  return uniqueStrings(
    hypotheses,
  ).slice(0, 4);
}

function buildUnknowns(): string[] {
  return [
    "无法仅凭公开网页确认其当前是否正在付费投放广告。",
    "无法仅凭公开网页确认广告预算。",
    "无法仅凭公开网页确认真实线索成本。",
    "无法仅凭公开网页确认线索质量。",
    "无法仅凭公开网页确认咨询到成交的转化率。",
    "无法仅凭公开网页确认广告ROI。",
    "公开Buying Signal不等于已经确认的购买意愿。",
    "真实联系人与有效联系渠道在主动触达前仍需Founder确认。",
  ];
}

function calculateEvidenceScore(
  sources: DiscoverySource[],
  acquisitionSignals: string[],
): number {
  const hosts =
    new Set(
      sources.map((source) =>
        normalizeHost(
          source.evidence.hostname,
        ),
      ),
    ).size;

  const averageVerification =
    sources.length > 0
      ? sources.reduce(
          (sum, source) =>
            sum +
            source.evidence
              .verificationScore,
          0,
        ) / sources.length
      : 0;

  let score =
    averageVerification * 0.55;

  if (hosts >= 3) {
    score += 0.22;
  } else if (hosts >= 2) {
    score += 0.18;
  } else if (hosts === 1) {
    score += 0.07;
  }

  score += Math.min(
    0.23,
    acquisitionSignals.length *
      0.035,
  );

  return clampScore(
    score,
  );
}

function calculateAcquisitionReadinessScore(
  industry: C168ProspectIndustry,
  acquisitionSignals: string[],
  sources: DiscoverySource[],
): number {
  const text =
    combinedSourceText(
      sources,
    );

  let score = 0;

  if (
    acquisitionSignals.length >= 5
  ) {
    score += 0.35;
  } else if (
    acquisitionSignals.length >= 3
  ) {
    score += 0.25;
  } else if (
    acquisitionSignals.length > 0
  ) {
    score += 0.12;
  }

  if (
    containsAny(
      text,
      [
        "立即咨询",
        "在线咨询",
        "免费咨询",
        "预约设计",
        "预约量房",
        "免费量房",
        "免费报价",
        "获取报价",
      ],
    )
  ) {
    score += 0.3;
  }

  if (
    containsAny(
      text,
      [
        "案例",
        "装修案例",
        "设计案例",
        "抖音",
        "小红书",
        "公众号",
        "视频号",
      ],
    )
  ) {
    score += 0.18;
  }

  if (
    industry ===
      "old-home-renovation" ||
    industry ===
      "whole-house-customization"
  ) {
    score += 0.12;
  }

  return clampScore(
    score,
  );
}

function buildCommercialDecision(
  evidenceScore: number,
  buyingSignalScore: number,
  acquisitionReadinessScore: number,
  independentHosts: number,
  buyingSignals: string[],
): C168CommercialDecision {
  const evidenceConfidence =
    clampScore(
      evidenceScore,
    );

  const actionScore =
    clampScore(
      evidenceConfidence *
        0.4 +
        buyingSignalScore *
          0.35 +
        acquisitionReadinessScore *
          0.25,
    );

  const reasons: string[] = [];

  if (
    evidenceConfidence >= 0.65
  ) {
    reasons.push(
      "企业与业务证据置信度较高。",
    );
  }

  if (
    independentHosts >= 2
  ) {
    reasons.push(
      "存在至少两个独立公开来源支持当前商业主体研究。",
    );
  }

  if (
    buyingSignalScore >= 0.35
  ) {
    reasons.push(
      "存在多个公开Buying Signal，具备进一步商业研究价值。",
    );
  }

  if (
    acquisitionReadinessScore >=
    0.55
  ) {
    reasons.push(
      "存在较明确的公开获客入口或咨询路径，可形成具体诊断切入点。",
    );
  }

  let action:
    C168CommercialAction;

  if (
    evidenceConfidence >= 0.68 &&
    buyingSignalScore >= 0.42 &&
    acquisitionReadinessScore >=
      0.5 &&
    independentHosts >= 2 &&
    buyingSignals.length >= 2 &&
    actionScore >= 0.58
  ) {
    action =
      "selective-outbound";

    reasons.push(
      "达到选择性主动触达研究阈值，但真实发送仍必须由Founder批准。",
    );
  } else if (
    evidenceConfidence >= 0.58 &&
    acquisitionReadinessScore >=
      0.4 &&
    actionScore >= 0.45
  ) {
    action =
      "inbound-opportunity";

    reasons.push(
      "更适合用于提炼Inbound内容、诊断主题或Offer，而不是立即人工联系。",
    );
  } else if (
    evidenceConfidence >= 0.45 &&
    independentHosts >= 1
  ) {
    action =
      "monitor";

    reasons.push(
      "当前商业行动证据不足，保留观察而不占用Founder人工审核时间。",
    );
  } else {
    action =
      "reject";

    reasons.push(
      "当前证据不足以支持商业行动，自动淘汰。",
    );
  }

  return {
    action,
    actionScore,
    evidenceConfidence,
    buyingSignalScore,
    acquisitionReadinessScore,
    reasons:
      uniqueStrings(
        reasons,
      ),
    founderReviewRequired:
      action ===
      "selective-outbound",
  };
}

function buildRecommendedAction(
  decision: C168CommercialDecision,
): string {
  if (
    decision.action ===
    "selective-outbound"
  ) {
    return "进入Founder最终审批队列。AIOS应先生成一份基于公开证据的微型预诊断和联系理由；Founder确认真实联系渠道与内容后才可发送。";
  }

  if (
    decision.action ===
    "inbound-opportunity"
  ) {
    return "不要求Founder逐家联系。将该对象反映出的公开需求、Offer模式和获客入口问题沉淀为Inbound内容主题、诊断入口或服务表达。";
  }

  if (
    decision.action ===
    "monitor"
  ) {
    return "暂不占用Founder时间。保留为市场观察对象，等待新的业务扩张、营销、招聘、Offer或获客信号后重新评分。";
  }

  return "自动淘汰，不进入Founder审核或客户触达流程。";
}

function toEvidence(
  source: DiscoverySource,
): C168ProspectEvidence {
  return {
    url:
      source.evidence.url,
    hostname:
      source.evidence.hostname,
    title:
      source.evidence.title,
    snippets:
      uniqueStrings(
        source.evidence.snippets ||
          [],
      ).slice(0, 4),
    credibilityTier:
      source.evidence
        .credibilityTier,
    verificationLabel:
      source.evidence
        .verificationLabel,
    verificationScore:
      source.evidence
        .verificationScore,
  };
}

function buildCandidate(
  name: string,
  allSources: DiscoverySource[],
): C168ProspectCandidate | null {
  const key =
    normalizeBusinessKey(
      name,
    );

  const sources =
    allSources.filter(
      (source) => {
        const text =
          sourceText(
            source.evidence,
          );

        return (
          text.includes(
            name.toLowerCase(),
          ) ||
          normalizeBusinessKey(
            text,
          ).includes(
            key,
          )
        );
      },
    );

  if (
    sources.length === 0
  ) {
    return null;
  }

  const combinedText =
    combinedSourceText(
      sources,
    );

  if (
    !containsAny(
      combinedText,
      SHENZHEN_TERMS,
    )
  ) {
    return null;
  }

  if (
    !containsAny(
      combinedText,
      [
        ...HOME_RENOVATION_TERMS,
        ...OLD_HOME_TERMS,
        ...WHOLE_HOUSE_TERMS,
      ],
    )
  ) {
    return null;
  }

  const industry =
    classifyIndustry(
      combinedText,
    );

  const acquisitionSignals =
    extractAcquisitionSignals(
      sources,
    );

  const buyingSignals =
    extractBuyingSignals(
      sources,
    );

  const evidenceScore =
    calculateEvidenceScore(
      sources,
      acquisitionSignals,
    );

  const buyingSignalScore =
    calculateBuyingSignalScore(
      sources,
    );

  const acquisitionReadinessScore =
    calculateAcquisitionReadinessScore(
      industry,
      acquisitionSignals,
      sources,
    );

  const independentHosts =
    new Set(
      sources.map((source) =>
        normalizeHost(
          source.evidence.hostname,
        ),
      ),
    ).size;

  const commercialDecision =
    buildCommercialDecision(
      evidenceScore,
      buyingSignalScore,
      acquisitionReadinessScore,
      independentHosts,
      buyingSignals,
    );

  const qualification:
    C168ProspectQualification =
    commercialDecision.action ===
      "selective-outbound" ||
    commercialDecision.action ===
      "inbound-opportunity"
      ? "qualified"
      : "needs-manual-validation";

  return {
    id:
      `c168-prospect-${key}`,
    rank: 0,
    name,
    industry,
    location:
      "深圳",
    qualification,
    evidenceScore,
    verifiedFacts:
      buildVerifiedFacts(
        name,
        industry,
        sources,
      ),
    acquisitionSignals,
    buyingSignals,
    diagnosticHypotheses:
      buildDiagnosticHypotheses(
        industry,
        acquisitionSignals,
        buyingSignals,
      ),
    unknowns:
      buildUnknowns(),
    evidence:
      [...sources]
        .sort(
          (a, b) =>
            b.evidence
              .verificationScore -
            a.evidence
              .verificationScore,
        )
        .slice(0, 5)
        .map(
          toEvidence,
        ),
    commercialDecision,
    recommendedAction:
      buildRecommendedAction(
        commercialDecision,
      ),
  };
}

function dedupeSources(
  sources: DiscoverySource[],
): DiscoverySource[] {
  const seen =
    new Set<string>();

  const result:
    DiscoverySource[] = [];

  for (const source of sources) {
    if (
      isExcludedHost(
        source.evidence.hostname,
      )
    ) {
      continue;
    }

    const key =
      normalizeText(
        source.evidence.url,
        1000,
      ) ||
      `${normalizeHost(
        source.evidence.hostname,
      )}:${normalizeText(
        source.evidence.title,
        300,
      )}`;

    if (
      !key ||
      seen.has(
        key,
      )
    ) {
      continue;
    }

    seen.add(
      key,
    );

    result.push(
      source,
    );
  }

  return result;
}

async function retrieveDiscoverySources(): Promise<
  DiscoverySource[]
> {
  const batches =
    await Promise.all(
      DISCOVERY_PROMPTS.map(
        async (prompt) => {
          const result =
            await retrieveWebEvidence(
              prompt,
            );

          if (
            !result.success ||
            result.evidence.length ===
              0
          ) {
            return [];
          }

          return result.evidence.map(
            (evidence) => ({
              evidence,
              searchIntent:
                prompt,
            }),
          );
        },
      ),
    );

  return dedupeSources(
    batches.flat(),
  );
}

function discoverBusinessNames(
  sources: DiscoverySource[],
): string[] {
  const names =
    new Map<
      string,
      {
        name: string;
        count: number;
      }
    >();

  for (const source of sources) {
    const seeds =
      extractBusinessSeeds(
        source,
      );

    for (const seed of seeds) {
      const key =
        normalizeBusinessKey(
          seed.name,
        );

      if (!key) {
        continue;
      }

      const existing =
        names.get(
          key,
        );

      if (existing) {
        existing.count += 1;
        continue;
      }

      names.set(
        key,
        {
          name:
            seed.name,
          count: 1,
        },
      );
    }
  }

  return Array.from(
    names.values(),
  )
    .sort(
      (a, b) =>
        b.count -
        a.count,
    )
    .map(
      (item) =>
        item.name,
    );
}

function actionPriority(
  action: C168CommercialAction,
): number {
  if (
    action ===
    "selective-outbound"
  ) {
    return 4;
  }

  if (
    action ===
    "inbound-opportunity"
  ) {
    return 3;
  }

  if (
    action ===
    "monitor"
  ) {
    return 2;
  }

  return 1;
}

function rankCandidates(
  candidates: C168ProspectCandidate[],
): C168ProspectCandidate[] {
  return candidates
    .sort(
      (a, b) => {
        const actionDifference =
          actionPriority(
            b.commercialDecision
              .action,
          ) -
          actionPriority(
            a.commercialDecision
              .action,
          );

        if (
          actionDifference !== 0
        ) {
          return actionDifference;
        }

        const scoreDifference =
          b.commercialDecision
            .actionScore -
          a.commercialDecision
            .actionScore;

        if (
          scoreDifference !== 0
        ) {
          return scoreDifference;
        }

        return (
          b.evidenceScore -
          a.evidenceScore
        );
      },
    )
    .slice(0, 10)
    .map(
      (candidate, index) => ({
        ...candidate,
        rank:
          index + 1,
      }),
    );
}

export async function discoverC168Prospects(): Promise<C168ProspectDiscoveryResult> {
  try {
    const sources =
      await retrieveDiscoverySources();

    const independentHosts =
      new Set(
        sources.map((source) =>
          normalizeHost(
            source.evidence.hostname,
          ),
        ),
      ).size;

    if (
      sources.length === 0
    ) {
      return {
        success: false,
        status:
          "insufficient-evidence",
        targetMarket:
          C168_TARGET_PROFILE.market,
        geography:
          C168_TARGET_PROFILE.geography,
        candidates: [],
        sourceCount: 0,
        independentHosts: 0,
        selectiveOutboundCount: 0,
        inboundOpportunityCount: 0,
        monitorCount: 0,
        rejectedCount: 0,
        conclusion:
          "Web Intelligence未返回足够的深圳家装市场公开证据。",
        nextStep:
          "保持目标行业不变，稍后重新执行市场机会发现，不生成虚假候选客户或Buying Signal。",
        integrity: {
          fabricatedProspect:
            false,
          fabricatedBuyingSignal:
            false,
          fabricatedAdvertisingPerformance:
            false,
          fabricatedContact:
            false,
          fabricatedCustomer:
            false,
        },
        timestamp:
          Date.now(),
      };
    }

    const names =
      discoverBusinessNames(
        sources,
      );

    const allCandidates =
      names
        .map((name) =>
          buildCandidate(
            name,
            sources,
          ),
        )
        .filter(
          (
            candidate,
          ): candidate is C168ProspectCandidate =>
            candidate !== null,
        );

    const rejectedCount =
      allCandidates.filter(
        (candidate) =>
          candidate
            .commercialDecision
            .action ===
          "reject",
      ).length;

    const candidates =
      rankCandidates(
        allCandidates.filter(
          (candidate) =>
            candidate
              .commercialDecision
              .action !==
            "reject",
        ),
      );

    const selectiveOutboundCount =
      candidates.filter(
        (candidate) =>
          candidate
            .commercialDecision
            .action ===
          "selective-outbound",
      ).length;

    const inboundOpportunityCount =
      candidates.filter(
        (candidate) =>
          candidate
            .commercialDecision
            .action ===
          "inbound-opportunity",
      ).length;

    const monitorCount =
      candidates.filter(
        (candidate) =>
          candidate
            .commercialDecision
            .action ===
          "monitor",
      ).length;

    return {
      success:
        candidates.length > 0,
      status:
        candidates.length > 0
          ? "ready"
          : "insufficient-evidence",
      targetMarket:
        C168_TARGET_PROFILE.market,
      geography:
        C168_TARGET_PROFILE.geography,
      candidates,
      sourceCount:
        sources.length,
      independentHosts,
      selectiveOutboundCount,
      inboundOpportunityCount,
      monitorCount,
      rejectedCount,
      conclusion:
        candidates.length > 0
          ? `AIOS从公开市场证据中保留${candidates.length}个商业研究对象：${selectiveOutboundCount}个达到选择性主动触达研究阈值，${inboundOpportunityCount}个更适合作为Inbound获客机会，${monitorCount}个进入自动观察；另有${rejectedCount}个低价值对象已自动淘汰。商业评分代表行动优先级，不代表广告效果或真实购买意愿。`
          : "当前没有足够证据形成值得商业行动的深圳家装机会。",
      nextStep:
        selectiveOutboundCount > 0
          ? "Founder只需审核达到Selective Outbound阈值的少量对象；其余机会由AIOS用于Inbound资产或持续观察。"
          : inboundOpportunityCount > 0
            ? "当前不需要批量主动联系。优先把高频市场问题和公开获客模式转化为Inbound内容、诊断入口和Offer。"
            : "当前没有值得Founder主动介入的商业对象。AIOS继续观察市场Buying Signal。",
      integrity: {
        fabricatedProspect:
          false,
        fabricatedBuyingSignal:
          false,
        fabricatedAdvertisingPerformance:
          false,
        fabricatedContact:
          false,
        fabricatedCustomer:
          false,
      },
      timestamp:
        Date.now(),
    };
  } catch {
    return {
      success: false,
      status:
        "failed",
      targetMarket:
        C168_TARGET_PROFILE.market,
      geography:
        C168_TARGET_PROFILE.geography,
      candidates: [],
      sourceCount: 0,
      independentHosts: 0,
      selectiveOutboundCount: 0,
      inboundOpportunityCount: 0,
      monitorCount: 0,
      rejectedCount: 0,
      conclusion:
        "C168市场机会发现执行失败，未生成未经验证的候选客户、Buying Signal或商业行动。",
      nextStep:
        "检查Web Intelligence运行状态后重新执行。",
      integrity: {
        fabricatedProspect:
          false,
        fabricatedBuyingSignal:
          false,
        fabricatedAdvertisingPerformance:
          false,
        fabricatedContact:
          false,
        fabricatedCustomer:
          false,
      },
      timestamp:
        Date.now(),
    };
  }
}
