import "server-only";

import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import {
  initializeFirstCashflowProject,
} from "@/lib/commercial/first-cashflow-project";

import type {
  CommercialObjective,
} from "@/lib/commercial/operating-layer";

import type {
  LiveCommercialOpportunityResult,
} from "@/lib/runtime/live-commercial-opportunity";

import type {
  VerifiedWebEvidence,
} from "@/lib/web-intelligence/source-verifier";

export const C144_PROSPECT_DISCOVERY_ID =
  "C144-PROSPECT-DISCOVERY";

export const C144_PROSPECT_DISCOVERY_VERSION =
  "C144.3.7";

type ProspectType =
  | "business"
  | "market-segment"
  | "source-backed-opportunity";

type QualificationStatus =
  | "evidence-backed"
  | "needs-manual-validation";

export interface C144ProspectCandidate {
  id: string;
  rank: number;
  name: string;
  type: ProspectType;
  hostname: string;
  url: string;
  sourceTitle: string;
  evidence: string[];
  evidenceScore: number;
  credibilityTier: string;
  verificationLabel: string;
  whyRelevant: string;
  qualificationStatus: QualificationStatus;
  recommendedAction: string;
  businessName: string | null;
  businessIdentityEvidence: string[];
  commercialSignals: string[];
  contactChannel: string | null;
  validationReasons: string[];
  paymentCapability:
    | "likely-domestic-rmb"
    | "unknown";
  paymentCurrency:
    | "CNY"
    | "unknown";
  customerType:
    | "cross-border-seller"
    | "brand"
    | "manufacturer"
    | "exporter"
    | "traditional-business"
    | "other"
    | "unknown";
  aiosFitScore: number;
}

export interface C144ProspectDiscoveryResult {
  success: boolean;
  status:
    | "ready"
    | "blocked"
    | "insufficient-evidence";
  project: CommercialObjective | null;
  candidates: C144ProspectCandidate[];
  sourceCount: number;
  independentHosts: number;
  conclusion: string;
  nextStep: string;
  integrity: {
    fabricatedLead: false;
    fabricatedContact: false;
    fabricatedResponse: false;
    fabricatedCustomer: false;
  };
  timestamp: number;
}

interface DiscoverySource {
  evidence: VerifiedWebEvidence;
  searchIntent: string;
}

interface IdentitySeed {
  name: string;
  source: DiscoverySource;
  confidence: number;
  reason: string;
}

const EXCLUDED_HOSTS = [
  "wikipedia.",
  "facebook.",
  "instagram.",
  "youtube.",
  "linkedin.",
  "reddit.",
  "google.",
  "bing.",
];

const GENERIC_NAME_TERMS = [
  "amazon",
  "rakuten",
  "mercari",
  "marketplace",
  "marketplaces",
  "online marketplace",
  "online marketplaces",
  "ecommerce marketplace",
  "ecommerce marketplaces",
  "online shopping",
  "market size",
  "market report",
  "market outlook",
  "market analysis",
  "market opportunity",
  "market expansion",
  "government",
  "ministry",
  "department",
  "university",
  "conference",
  "expo",
  "event",
  "webinar",
  "reuters",
  "forbes",
  "bloomberg",
  "techcrunch",
  "the verge",
  "business standard",
  "startup daily",
  "news",
  "times",
  "daily",
  "journal",
  "中国电商平台",
  "日本电商平台",
  "跨境电商平台",
  "电商平台",
  "市场规模",
  "市场报告",
];

const EXCLUDED_TITLE_TERMS = [
  "marketplaces in",
  "online marketplaces",
  "market size",
  "market report",
  "market outlook",
  "market analysis",
  "how to",
  "what is",
  "guide to",
  "政府",
  "大学",
  "研究院",
  "展会",
  "展览",
  "会议",
  "市场规模",
  "市场报告",
  "电商平台",
];

const CHINA_TERMS = [
  "mainland china",
  "china",
  "chinese",
  "shenzhen",
  "guangzhou",
  "dongguan",
  "hangzhou",
  "yiwu",
  "ningbo",
  "suzhou",
  "shanghai",
  "beijing",
  "fujian",
  "zhejiang",
  "guangdong",
  "中国大陆",
  "中国",
  "深圳",
  "广州",
  "东莞",
  "杭州",
  "义乌",
  "宁波",
  "苏州",
  "上海",
  "北京",
  "福建",
  "浙江",
  "广东",
];

const JAPAN_TERMS = [
  "japan",
  "japanese",
  "japan market",
  "japanese market",
  "japanese consumers",
  "japanese customers",
  "日本",
  "日本市场",
  "日本消费者",
  "日本客户",
];

const CROSS_BORDER_TERMS = [
  "cross-border",
  "cross border",
  "crossborder",
  "ecommerce",
  "e-commerce",
  "overseas",
  "international",
  "export",
  "exports",
  "global expansion",
  "market entry",
  "distribution",
  "distributor",
  "channel",
  "跨境",
  "跨境电商",
  "出海",
  "海外",
  "出口",
  "国际市场",
  "市场进入",
  "经销商",
  "渠道",
];

const COMMERCIAL_TERMS = [
  "launch",
  "launched",
  "launches",
  "expand",
  "expanded",
  "expands",
  "expansion",
  "enter",
  "entered",
  "entering",
  "sales",
  "revenue",
  "growth",
  "growing",
  "partnership",
  "partner",
  "partners",
  "distribution",
  "distributor",
  "hiring",
  "recruiting",
  "recruits",
  "investment",
  "store",
  "stores",
  "seller",
  "brand",
  "product",
  "products",
  "channel",
  "合作",
  "扩张",
  "拓展",
  "进入",
  "布局",
  "销售",
  "营收",
  "增长",
  "招聘",
  "投资",
  "门店",
  "卖家",
  "品牌",
  "产品",
  "渠道",
];

const DISCOVERY_PROMPTS = [
  "mainland China brands Japan market expansion current company",
  "Chinese manufacturers Japan distributor partnership current company",
  "China cross border sellers Japan ecommerce brands current",
  "Shenzhen China company Japan market expansion current",
  "Guangzhou China manufacturer Japan export distributor current",
  "Dongguan China manufacturer Japan distributor current",
  "Hangzhou China brand Japan ecommerce current",
  "Yiwu China exporter Japan ecommerce current",
  "Chinese company Japan sales growth partnership current",
  "China consumer brand Japanese customers overseas expansion current",
];

function normalizeText(
  value: unknown,
  maxLength = 1200,
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
        .map((value) => normalizeText(value))
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
  return terms.some((term) =>
    text.includes(term.toLowerCase()),
  );
}

function isExcludedHost(
  hostname: string,
): boolean {
  const host = normalizeHost(hostname);

  return EXCLUDED_HOSTS.some((item) =>
    host.includes(item),
  );
}

function isExcludedTitle(
  title: string,
): boolean {
  const lower = title.toLowerCase();

  return EXCLUDED_TITLE_TERMS.some((item) =>
    lower.includes(item.toLowerCase()),
  );
}

function isGenericName(
  name: string,
): boolean {
  const lower = normalizeText(
    name,
    160,
  ).toLowerCase();

  return GENERIC_NAME_TERMS.some((term) =>
    lower === term ||
    lower.includes(term),
  );
}

function cleanBusinessName(
  value: string,
): string {
  return normalizeText(
    value
      .replace(/^the\s+/i, "")
      .replace(
        /^(?:company|business)\s+/i,
        "",
      )
      .replace(
        /[,;:|].*$/,
        "",
      ),
    120,
  );
}

function looksLikeBusinessName(
  value: string,
): boolean {
  const name = cleanBusinessName(value);

  if (
    name.length < 2 ||
    name.length > 100
  ) {
    return false;
  }

  if (isGenericName(name)) {
    return false;
  }

  const lower = name.toLowerCase();

  if (
    lower.startsWith("how ") ||
    lower.startsWith("what ") ||
    lower.startsWith("why ") ||
    lower.startsWith("find ") ||
    lower.startsWith("best ") ||
    lower.startsWith("top ") ||
    lower.startsWith("current ")
  ) {
    return false;
  }

  return true;
}

function sourceText(
  source: VerifiedWebEvidence,
): string {
  return [
    source.title,
    ...(source.snippets || []),
  ]
    .join(" ")
    .toLowerCase();
}

function extractIdentitySeeds(
  source: DiscoverySource,
): IdentitySeed[] {
  const title = normalizeText(
    source.evidence.title,
    300,
  );

  const snippets = uniqueStrings(
    source.evidence.snippets || [],
  ).slice(0, 10);

  const text = [
    title,
    ...snippets,
  ].join(" ");

  const seeds: IdentitySeed[] = [];

  const chinesePatterns = [
    /([\u4e00-\u9fffA-Za-z0-9&()·.-]{2,40}(?:有限公司|股份有限公司|有限责任公司|集团公司|集团))/g,
  ];

  for (const pattern of chinesePatterns) {
    for (const match of text.matchAll(pattern)) {
      const name = cleanBusinessName(
        match[1] || "",
      );

      if (!looksLikeBusinessName(name)) {
        continue;
      }

      seeds.push({
        name,
        source,
        confidence: 0.98,
        reason:
          "Concrete Chinese business organization name detected in source evidence.",
      });
    }
  }

  const englishLegalPattern =
    /\b([A-Z][A-Za-z0-9&.-]{1,40}(?:\s+[A-Z][A-Za-z0-9&.-]{1,40}){0,5}\s+(?:Inc\.?|Ltd\.?|LLC|Corp\.?|Corporation|Company|Group|Holdings|PLC))\b/g;

  for (const match of text.matchAll(
    englishLegalPattern,
  )) {
    const name = cleanBusinessName(
      match[1] || "",
    );

    if (!looksLikeBusinessName(name)) {
      continue;
    }

    seeds.push({
      name,
      source,
      confidence: 0.98,
      reason:
        "Concrete English business organization name detected in source evidence.",
    });
  }

  const actionPattern =
    /\b([A-Z][A-Za-z0-9&.-]{1,30}(?:\s+[A-Z][A-Za-z0-9&.-]{1,30}){0,4})\s+(?:launches|launched|enters|entered|entering|expands|expanded|expanding|opens|opened|opening|partners|partnered|hired|hiring|recruits|recruiting|exports|exporting|sells|selling|distributes|distributed|invests|invested|announces|announced)\b/gi;

  for (const match of text.matchAll(
    actionPattern,
  )) {
    const name = cleanBusinessName(
      match[1] || "",
    );

    if (!looksLikeBusinessName(name)) {
      continue;
    }

    seeds.push({
      name,
      source,
      confidence: 0.82,
      reason:
        "Named business appears directly next to a concrete commercial action.",
    });
  }

  const titlePrefixPatterns = [
    /^([A-Z][A-Za-z0-9&.-]{2,40}(?:\s+[A-Z][A-Za-z0-9&.-]{1,30}){0,4})\s+(?:to|in|enters|expands|launches|opens|partners)/i,
    /^([A-Z][A-Za-z0-9&.-]{2,40}(?:\s+[A-Z][A-Za-z0-9&.-]{1,30}){0,4}):/i,
  ];

  for (const pattern of titlePrefixPatterns) {
    const match = title.match(pattern);

    if (!match) {
      continue;
    }

    const name = cleanBusinessName(
      match[1] || "",
    );

    if (!looksLikeBusinessName(name)) {
      continue;
    }

    seeds.push({
      name,
      source,
      confidence: 0.72,
      reason:
        "Potential named business extracted from a commercial article title.",
    });
  }

  return seeds;
}

function normalizeBusinessKey(
  name: string,
): string {
  return cleanBusinessName(name)
    .toLowerCase()
    .replace(
      /\b(inc|inc\.|ltd|ltd\.|llc|corp|corp\.|corporation|company|group|holdings|co|co\.)\b/g,
      "",
    )
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "")
    .trim();
}

function countIndependentHosts(
  sources: DiscoverySource[],
): number {
  return new Set(
    sources.map((source) =>
      normalizeHost(
        source.evidence.hostname,
      ),
    ),
  ).size;
}

function dedupeSources(
  sources: DiscoverySource[],
): DiscoverySource[] {
  const seen = new Set<string>();
  const result: DiscoverySource[] = [];

  for (const source of sources) {
    const url = normalizeText(
      source.evidence.url,
      1000,
    );

    const host = normalizeHost(
      source.evidence.hostname,
    );

    const key =
      url ||
      `${host}:${normalizeText(
        source.evidence.title,
        240,
      ).toLowerCase()}`;

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(source);
  }

  return result;
}

function classifyCustomerType(
  text: string,
): C144ProspectCandidate["customerType"] {
  if (
    containsAny(text, [
      "cross-border seller",
      "cross border seller",
      "ecommerce seller",
      "e-commerce seller",
      "跨境卖家",
      "跨境电商",
      "卖家",
    ])
  ) {
    return "cross-border-seller";
  }

  if (
    containsAny(text, [
      "manufacturer",
      "manufacturing",
      "factory",
      "manufacturer",
      "制造商",
      "工厂",
    ])
  ) {
    return "manufacturer";
  }

  if (
    containsAny(text, [
      "exporter",
      "export",
      "exports",
      "出口商",
      "出口",
    ])
  ) {
    return "exporter";
  }

  if (
    containsAny(text, [
      "brand",
      "consumer brand",
      "品牌",
    ])
  ) {
    return "brand";
  }

  if (
    containsAny(text, [
      "traditional business",
      "retail business",
      "retailer",
      "零售",
      "传统企业",
    ])
  ) {
    return "traditional-business";
  }

  return "other";
}

function calculateFitScore(
  sources: DiscoverySource[],
  identitySources: DiscoverySource[],
  chinaSignal: boolean,
  japanSignal: boolean,
  crossBorderSignal: boolean,
  commercialSignals: string[],
): number {
  const hosts = countIndependentHosts(
    sources,
  );

  let score = 0;

  if (identitySources.length >= 2) {
    score += 0.25;
  } else if (identitySources.length === 1) {
    score += 0.12;
  }

  if (chinaSignal) {
    score += 0.2;
  }

  if (
    japanSignal ||
    crossBorderSignal
  ) {
    score += 0.2;
  }

  if (commercialSignals.length >= 2) {
    score += 0.2;
  } else if (commercialSignals.length === 1) {
    score += 0.1;
  }

  if (hosts >= 3) {
    score += 0.15;
  } else if (hosts >= 2) {
    score += 0.1;
  }

  return Math.min(
    1,
    Number(score.toFixed(3)),
  );
}

function buildCandidate(
  name: string,
  sources: DiscoverySource[],
): C144ProspectCandidate | null {
  const normalizedName =
    cleanBusinessName(name);

  if (!looksLikeBusinessName(normalizedName)) {
    return null;
  }

  const relevantSources = sources.filter(
    (source) => {
      const text = sourceText(
        source.evidence,
      );

      return (
        text.includes(
          normalizedName.toLowerCase(),
        ) ||
        source.evidence.title
          .toLowerCase()
          .includes(
            normalizedName.toLowerCase(),
          )
      );
    },
  );

  const usableSources =
    relevantSources.length > 0
      ? relevantSources
      : sources;

  const hosts =
    countIndependentHosts(
      usableSources,
    );

  if (
    usableSources.length < 2 ||
    hosts < 2
  ) {
    return null;
  }

const combinedText =
  usableSources
    .map((source) =>
      sourceText(source.evidence),
    )
    .join(" ");

  const chinaSignal =
    containsAny(
      combinedText,
      CHINA_TERMS,
    );

  const japanSignal =
    containsAny(
      combinedText,
      JAPAN_TERMS,
    );

  const crossBorderSignal =
    containsAny(
      combinedText,
      CROSS_BORDER_TERMS,
    );

  const commercialSignals =
    COMMERCIAL_TERMS.filter(
      (term) =>
        combinedText.includes(
          term.toLowerCase(),
        ),
    );

  if (!chinaSignal) {
    return null;
  }

  if (
    !japanSignal &&
    !crossBorderSignal
  ) {
    return null;
  }

  if (commercialSignals.length < 2) {
    return null;
  }

  const identityEvidence =
    usableSources
      .filter((source) => {
        const seeds =
          extractIdentitySeeds(source);

        return seeds.some(
          (seed) =>
            normalizeBusinessKey(
              seed.name,
            ) ===
            normalizeBusinessKey(
              normalizedName,
            ),
        );
      })
      .map((source) =>
        [
          source.evidence.title,
          ...source.evidence.snippets,
        ].join(" "),
      );

  if (identityEvidence.length < 2) {
    return null;
  }

  const fitScore =
    calculateFitScore(
      usableSources,
      usableSources,
      chinaSignal,
      japanSignal,
      crossBorderSignal,
      commercialSignals,
    );

  if (fitScore < 0.45) {
    return null;
  }

  const strongest =
    [...usableSources].sort(
      (a, b) =>
        b.evidence.verificationScore -
        a.evidence.verificationScore,
    )[0];

  if (!strongest) {
    return null;
  }

  const evidence =
    uniqueStrings(
      usableSources.flatMap(
        (source) =>
          source.evidence.snippets,
      ),
    ).slice(0, 12);

  const sourceTitles =
    uniqueStrings(
      usableSources.map(
        (source) =>
          source.evidence.title,
      ),
    );

  const customerType =
    classifyCustomerType(
      combinedText,
    );

  const validationReasons: string[] =
    [];

  if (hosts < 3) {
    validationReasons.push(
      "Only two independent hosts are currently available. Manually confirm the business identity before outreach.",
    );
  }

  if (
    strongest.evidence.verificationLabel ===
    "limited"
  ) {
    validationReasons.push(
      "At least one source has limited verification strength. Final verification must re-query the named business.",
    );
  }

  if (
    customerType === "other"
  ) {
    validationReasons.push(
      "Business type is not sufficiently specific and requires manual validation.",
    );
  }

  const primarySource =
    usableSources[0];

  return {
    id:
      `c144-prospect-${normalizeBusinessKey(
        normalizedName,
      ).slice(0, 48)}`,
    rank: 0,
    name: normalizedName,
    type: "business",
    hostname: normalizeHost(
      primarySource.evidence.hostname,
    ),
    url: primarySource.evidence.url,
    sourceTitle:
      primarySource.evidence.title,
    evidence,
    evidenceScore: Number(
      (
        usableSources.reduce(
          (sum, source) =>
            sum +
            source.evidence.verificationScore,
          0,
        ) /
        usableSources.length
      ).toFixed(3),
    ),
    credibilityTier:
      strongest.evidence.credibilityTier,
    verificationLabel:
      strongest.evidence.verificationLabel,
    whyRelevant:
      [
        "Named mainland China business.",
        japanSignal
          ? "Concrete Japan-related commercial signal found."
          : "Concrete cross-border commercial signal found.",
        `Detected commercial signals: ${commercialSignals.slice(0, 6).join(", ")}.`,
      ].join(" "),
    qualificationStatus:
      "needs-manual-validation",
    recommendedAction:
      "Run C144.3.4 strict verification, then manually validate the company and contact channel before outreach.",
    businessName: normalizedName,
    businessIdentityEvidence:
      identityEvidence.slice(0, 6),
    commercialSignals:
      commercialSignals.slice(0, 10),
    contactChannel: null,
    validationReasons,
    paymentCapability:
      "unknown",
    paymentCurrency:
      "unknown",
    customerType,
    aiosFitScore: fitScore,
  };
}

async function retrieveDiscoverySources(
  queries: string[],
): Promise<DiscoverySource[]> {
  const collected: DiscoverySource[] =
    [];

  for (const query of queries) {
    try {
      const result =
        await retrieveWebEvidence(
          query,
        );

      if (
        !result.success ||
        !result.evidence ||
        result.evidence.length === 0
      ) {
        continue;
      }

      for (const evidence of result.evidence) {
        if (
          isExcludedHost(
            evidence.hostname,
          )
        ) {
          continue;
        }

        if (
          isExcludedTitle(
            evidence.title,
          )
        ) {
          continue;
        }

        collected.push({
          evidence,
          searchIntent: query,
        });
      }
    } catch {
      continue;
    }
  }

  return dedupeSources(
    collected,
  );
}

function groupIdentitySeeds(
  sources: DiscoverySource[],
): Map<
  string,
  {
    name: string;
    sources: DiscoverySource[];
    confidence: number;
  }
> {
  const groups = new Map<
    string,
    {
      name: string;
      sources: DiscoverySource[];
      confidence: number;
    }
  >();

  for (const source of sources) {
    const seeds =
      extractIdentitySeeds(source);

    for (const seed of seeds) {
      const key =
        normalizeBusinessKey(
          seed.name,
        );

      if (!key) {
        continue;
      }

      const existing =
        groups.get(key);

      if (existing) {
        existing.sources.push(
          seed.source,
        );
        existing.confidence =
          Math.max(
            existing.confidence,
            seed.confidence,
          );
        continue;
      }

      groups.set(key, {
        name: seed.name,
        sources: [seed.source],
        confidence: seed.confidence,
      });
    }
  }

  return groups;
}

export async function discoverC144Prospects(
  opportunity: LiveCommercialOpportunityResult,
): Promise<C144ProspectDiscoveryResult> {
  const timestamp =
    Date.now();

  const projectResult =
    await initializeFirstCashflowProject();

  const project =
    projectResult.objective;

  const opportunityText =
    JSON.stringify(
      opportunity,
    ).slice(0, 4000);

  const querySet =
    uniqueStrings([
      ...DISCOVERY_PROMPTS,
      "mainland China company Japan market expansion current Japan sales",
      "Chinese company Japan distributor current partnership sales",
      opportunityText,
    ]).slice(0, 12);

  const sources =
    await retrieveDiscoverySources(
      querySet,
    );

  if (sources.length === 0) {
    return {
      success: false,
      status: "insufficient-evidence",
      project,
      candidates: [],
      sourceCount: 0,
      independentHosts: 0,
      conclusion:
        "Discovery retrieval returned no usable source evidence. No prospect is created.",
      nextStep:
        "Rerun multilingual prospect discovery. Do not contact or infer any customer from missing evidence.",
      integrity: {
        fabricatedLead: false,
        fabricatedContact: false,
        fabricatedResponse: false,
        fabricatedCustomer: false,
      },
      timestamp,
    };
  }

  const identityGroups =
    groupIdentitySeeds(
      sources,
    );

  const candidates: C144ProspectCandidate[] =
    [];

  for (const group of identityGroups.values()) {
    const candidate =
      buildCandidate(
        group.name,
        sources,
      );

    if (!candidate) {
      continue;
    }

    candidates.push(candidate);
  }

  candidates.sort(
    (a, b) =>
      b.aiosFitScore -
      a.aiosFitScore ||
      b.evidenceScore -
      a.evidenceScore,
  );

  const ranked =
    candidates
      .slice(0, 10)
      .map(
        (candidate, index) => ({
          ...candidate,
          rank: index + 1,
        }),
      );

  const independentHosts =
    new Set(
      sources.map((source) =>
        normalizeHost(
          source.evidence.hostname,
        ),
      ),
    ).size;

  if (ranked.length === 0) {
    return {
      success: false,
      status: "insufficient-evidence",
      project,
      candidates: [],
      sourceCount: sources.length,
      independentHosts,
      conclusion:
        "Live web evidence was retrieved, but no named business passed the discovery-stage identity, China, Japan or cross-border, and commercial-signal gates.",
      nextStep:
        "Broaden or rerun discovery queries. Do not downgrade the final C144.3.4 verification policy.",
      integrity: {
        fabricatedLead: false,
        fabricatedContact: false,
        fabricatedResponse: false,
        fabricatedCustomer: false,
      },
      timestamp,
    };
  }

  return {
    success: true,
    status: "ready",
    project,
    candidates: ranked,
    sourceCount: sources.length,
    independentHosts,
    conclusion:
      "C144.3.7 discovered named mainland China business candidates from live web evidence. Candidates are discovery-stage only and are not treated as verified customers or leads until C144.3.4 passes.",
    nextStep:
      "Run C144.3.4 strict verification for each candidate, then manually validate and approach only verified prospects.",
    integrity: {
      fabricatedLead: false,
      fabricatedContact: false,
      fabricatedResponse: false,
      fabricatedCustomer: false,
    },
    timestamp,
  };
}

export function isC144ProspectDiscoveryReady(
  result: C144ProspectDiscoveryResult,
): boolean {
  if (
    !result.success ||
    result.status !== "ready"
  ) {
    return false;
  }

  if (
    result.candidates.length === 0 ||
    result.sourceCount < 2 ||
    result.independentHosts < 2
  ) {
    return false;
  }

  return result.candidates.some(
    (candidate) =>
      candidate.businessName !== null &&
      candidate.customerType !==
        "unknown" &&
      candidate.paymentCurrency ===
        "unknown" &&
      candidate.aiosFitScore >= 0.45,
  );
}
