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
  "C168.4.1";

export type C168ProspectIndustry =
  | "home-renovation"
  | "old-home-renovation"
  | "whole-house-customization";

export type C168ProspectQualification =
  | "qualified"
  | "needs-manual-validation";

export interface C168ProspectEvidence {
  url: string;
  hostname: string;
  title: string;
  snippets: string[];
  credibilityTier: string;
  verificationLabel: string;
  verificationScore: number;
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
  diagnosticHypotheses: string[];
  unknowns: string[];
  evidence: C168ProspectEvidence[];
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
  conclusion: string;
  nextStep: string;
  integrity: {
    fabricatedProspect: false;
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
    sources
      .map((source) =>
        sourceText(
          source.evidence,
        ),
      )
      .join(" ");

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

function buildVerifiedFacts(
  name: string,
  industry: C168ProspectIndustry,
  sources: DiscoverySource[],
): string[] {
  const facts: string[] = [];

  facts.push(
    `公开证据中存在商业主体或品牌名称: ${name}`,
  );

  const combinedText =
    sources
      .map((source) =>
        sourceText(
          source.evidence,
        ),
      )
      .join(" ");

  if (
    containsAny(
      combinedText,
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

  return uniqueStrings(facts);
}

function buildDiagnosticHypotheses(
  acquisitionSignals: string[],
): string[] {
  const hypotheses: string[] = [];

  if (
    acquisitionSignals.length > 0
  ) {
    hypotheses.push(
      "该商家存在公开可观察的获客入口，可进一步诊断Offer、素材和咨询路径是否清晰。",
    );
  }

  hypotheses.push(
    "需要人工检查其广告或内容入口是否能快速说明目标客户、核心价值和下一步行动。",
  );

  hypotheses.push(
    "需要人工检查从广告或内容到咨询、预约、量房或报价之间是否存在明显转化摩擦。",
  );

  return hypotheses;
}

function buildUnknowns(): string[] {
  return [
    "无法仅凭公开网页确认其当前是否正在付费投放广告。",
    "无法仅凭公开网页确认广告预算。",
    "无法仅凭公开网页确认真实线索成本。",
    "无法仅凭公开网页确认线索质量。",
    "无法仅凭公开网页确认咨询到成交的转化率。",
    "无法仅凭公开网页确认广告ROI。",
    "需要Founder人工确认真实联系人与有效联系渠道。",
  ];
}

function calculateCandidateScore(
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

  if (hosts >= 2) {
    score += 0.2;
  } else if (hosts === 1) {
    score += 0.08;
  }

  score += Math.min(
    0.25,
    acquisitionSignals.length *
      0.04,
  );

  return Math.min(
    1,
    Number(
      score.toFixed(3),
    ),
  );
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
    normalizeBusinessKey(name);

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
          ).includes(key)
        );
      },
    );

  if (sources.length === 0) {
    return null;
  }

  const combinedText =
    sources
      .map((source) =>
        sourceText(
          source.evidence,
        ),
      )
      .join(" ");

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

  const evidenceScore =
    calculateCandidateScore(
      sources,
      acquisitionSignals,
    );

  const independentHosts =
    new Set(
      sources.map((source) =>
        normalizeHost(
          source.evidence.hostname,
        ),
      ),
    ).size;

  const qualification:
    C168ProspectQualification =
    evidenceScore >= 0.55 &&
    independentHosts >= 2 &&
    acquisitionSignals.length > 0
      ? "qualified"
      : "needs-manual-validation";

  return {
    id:
      `c168-prospect-${key}`,
    rank: 0,
    name,
    industry,
    location: "深圳",
    qualification,
    evidenceScore,
    verifiedFacts:
      buildVerifiedFacts(
        name,
        industry,
        sources,
      ),
    acquisitionSignals,
    diagnosticHypotheses:
      buildDiagnosticHypotheses(
        acquisitionSignals,
      ),
    unknowns:
      buildUnknowns(),
    evidence:
      sources
        .sort(
          (a, b) =>
            b.evidence
              .verificationScore -
            a.evidence
              .verificationScore,
        )
        .slice(0, 5)
        .map(toEvidence),
    recommendedAction:
      qualification ===
      "qualified"
        ? "Founder人工核验该商家的官网、公开获客入口、广告或内容素材，并判断是否适合进入48小时广告获客诊断触达名单。"
        : "暂不联系。先补充企业真实性、深圳业务和公开获客行为证据。",
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
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    result.push(source);
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
        names.get(key);

      if (existing) {
        existing.count += 1;
        continue;
      }

      names.set(key, {
        name: seed.name,
        count: 1,
      });
    }
  }

  return Array.from(
    names.values(),
  )
    .sort(
      (a, b) =>
        b.count - a.count,
    )
    .map((item) =>
      item.name,
    );
}

function rankCandidates(
  candidates: C168ProspectCandidate[],
): C168ProspectCandidate[] {
  return candidates
    .sort((a, b) => {
      if (
        a.qualification !==
        b.qualification
      ) {
        return a.qualification ===
          "qualified"
          ? -1
          : 1;
      }

      return (
        b.evidenceScore -
        a.evidenceScore
      );
    })
    .slice(0, 10)
    .map(
      (candidate, index) => ({
        ...candidate,
        rank: index + 1,
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

    if (sources.length === 0) {
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
        conclusion:
          "Web Intelligence未返回足够的深圳家装获客公开证据。",
        nextStep:
          "保持目标行业不变，稍后重新执行发现，不生成虚假候选客户。",
        integrity: {
          fabricatedProspect: false,
          fabricatedAdvertisingPerformance:
            false,
          fabricatedContact: false,
          fabricatedCustomer: false,
        },
        timestamp: Date.now(),
      };
    }

    const names =
      discoverBusinessNames(
        sources,
      );

    const candidates =
      rankCandidates(
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
          ),
      );

    const qualifiedCount =
      candidates.filter(
        (candidate) =>
          candidate.qualification ===
          "qualified",
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
      conclusion:
        candidates.length > 0
          ? `发现${candidates.length}个有公开证据支持的深圳家装候选对象，其中${qualifiedCount}个达到当前初步筛选标准。候选排序代表研究优先级，不代表其广告效果差。`
          : "当前公开证据不足以形成可信的深圳家装候选客户名单。",
      nextStep:
        qualifiedCount > 0
          ? "Founder先人工核验排名最高的候选商家，检查官网、公开广告或内容入口、Offer和咨询路径，再决定是否进入诊断与联系阶段。"
          : "继续补充深圳家装企业身份和公开获客行为证据，不进行客户联系。",
      integrity: {
        fabricatedProspect: false,
        fabricatedAdvertisingPerformance:
          false,
        fabricatedContact: false,
        fabricatedCustomer: false,
      },
      timestamp: Date.now(),
    };
  } catch {
    return {
      success: false,
      status: "failed",
      targetMarket:
        C168_TARGET_PROFILE.market,
      geography:
        C168_TARGET_PROFILE.geography,
      candidates: [],
      sourceCount: 0,
      independentHosts: 0,
      conclusion:
        "C168客户发现执行失败，未生成未经验证的候选客户。",
      nextStep:
        "检查Web Intelligence运行状态后重新执行。",
      integrity: {
        fabricatedProspect: false,
        fabricatedAdvertisingPerformance:
          false,
        fabricatedContact: false,
        fabricatedCustomer: false,
      },
      timestamp: Date.now(),
    };
  }
}
