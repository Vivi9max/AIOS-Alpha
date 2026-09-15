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
  "C144.3.5";
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
interface BusinessIdentity {
  name: string | null;
  confidence: number;
  evidence: string[];
}
interface CandidateSeed {
  name: string;
  source: DiscoverySource;
  identity: BusinessIdentity;
}
const EXCLUDED_HOST_PATTERNS = [
  "wikipedia.",
  "facebook.",
  "instagram.",
  "youtube.",
  "linkedin.",
  "reddit.",
  "google.",
  "bing.",
  "search.",
];
const EXCLUDED_TITLE_PATTERNS = [
  "government",
  "ministry",
  "department",
  "university",
  "conference",
  "expo",
  "event",
  "webinar",
  "how to",
  "what is",
  "guide",
  "report",
  "market size",
  "market outlook",
  "marketplaces in",
  "online marketplaces",
  "top online marketplaces",
  "leading marketplaces",
  "政府",
  "部门",
  "大学",
  "研究院",
  "展会",
  "展览",
  "会议",
  "活动",
  "指南",
  "报告",
  "市场规模",
  "市场报告",
  "市场展望",
  "电商平台",
  "电商市场",
];
const EXCLUDED_IDENTITY_TERMS = [
  "online marketplaces",
  "online marketplace",
  "marketplaces in",
  "marketplace in",
  "marketplace",
  "marketplaces",
  "ecommerce marketplace",
  "ecommerce marketplaces",
  "international marketplaces",
  "global marketplaces",
  "online shopping",
  "market size",
  "market outlook",
  "market report",
  "market analysis",
  "top online",
  "leading marketplace",
  "best online",
  "how to",
  "what is",
  "guide to",
  "startup daily",
  "business standard",
  "small business expo",
  "reuters",
  "forbes",
  "bloomberg",
  "techcrunch",
  "the verge",
  "news",
  "times",
  "daily",
  "journal",
  "government",
  "ministry",
  "department",
  "university",
  "conference",
  "expo",
  "event",
  "webinar",
  "政府",
  "政府部门",
  "大学",
  "研究院",
  "协会",
  "展会",
  "会议",
  "市场规模",
  "市场报告",
  "电商平台",
  "电商市场",
  "跨境平台",
  "跨境电商平台",
];
const BUSINESS_LEGAL_SUFFIXES = [
  "inc.",
  "inc",
  "ltd.",
  "ltd",
  "llc",
  "corp.",
  "corp",
  "corporation",
  "company",
  "co.",
  "group",
  "holdings",
  "gmbh",
  "plc",
  "有限公司",
  "股份有限公司",
  "有限责任公司",
  "集团",
  "集团公司",
  "株式会社",
  "有限会社",
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
  "japanese market",
  "japan market",
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
  "global expansion",
  "market entry",
  "distribution",
  "distributor",
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
  "expansion",
  "expanded",
  "expands",
  "enter",
  "entered",
  "entering",
  "sales",
  "revenue",
  "growth",
  "growing",
  "partnership",
  "partner",
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
  "channel",
  "合作",
  "扩张",
  "拓展",
  "进入",
  "销售",
  "营收",
  "增长",
  "渠道",
  "招聘",
  "投资",
  "门店",
  "卖家",
  "品牌",
  "产品",
];
const DISCOVERY_PROMPTS = [
  [
    "中国内地企业 日本市场 出海 跨境电商 2026 品牌 公司",
    "Find named mainland China companies or brands with current Japan-market, overseas expansion, cross-border ecommerce, export, distribution, partnership, sales, hiring, or marketplace activity in 2026. Only return identifiable commercial businesses. Exclude marketplace platforms themselves, media publishers, government, universities, events, consulting firms, market reports, and generic articles.",
  ],
  [
    "中国品牌 日本市场 扩张 出海 电商 企业 2026 公司",
    "Find real mainland Chinese businesses with concrete current Japan or overseas commercial activity. Require an identifiable business organization and company-specific activity. Do not return marketplace names, market categories, article titles, or generic market descriptions.",
  ],
  [
    "深圳 广州 东莞 杭州 义乌 中国企业 日本 跨境电商 出海 2026",
    "Find named mainland China SMEs, manufacturers, brands, exporters, and cross-border sellers connected to Japan or overseas commerce. Prefer company-specific evidence. Exclude platforms, media, government, universities, conferences, expos, and generic market reports.",
  ],
  [
    "中国工厂 中国品牌 外贸企业 日本市场 经销商 电商 2026 公司",
    "Find named China-based manufacturers, brands, exporters, and sellers with current Japan-market or international commercial activity. Require a concrete company identity and company-specific commercial signal.",
  ],
  [
    "中国跨境卖家 日本 Amazon Japan Rakuten 日本消费者 品牌 2026 公司",
    "Find real mainland China companies, brands, and cross-border ecommerce sellers currently connected to Japan, Amazon Japan, Rakuten, Japanese consumers, or overseas ecommerce. Do not return Rakuten, Amazon, marketplaces, platforms, or generic guides as prospects.",
  ],
  [
    "中国企业 日本市场 合作 招聘 渠道 销售 2026 公司",
    "Find real mainland Chinese companies with current Japan-related commercial demand shown through hiring, distribution, sales, partnerships, channels, ecommerce, or market-entry activity. Require a named business organization.",
  ],
] as const;
function normalizeText(
  value: unknown,
  maxLength = 1000,
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
function containsAny(
  text: string,
  terms: string[],
): boolean {
  return terms.some((term) =>
    text.includes(
      term.toLowerCase(),
    ),
  );
}
function isExcludedSource(
  title: string,
  hostname: string,
): boolean {
  const lowerTitle =
    title.toLowerCase();
  const lowerHost =
    normalizeHost(hostname);
  if (
    EXCLUDED_HOST_PATTERNS.some(
      (pattern) =>
        lowerHost.includes(pattern),
    )
  ) {
    return true;
  }
  if (
    EXCLUDED_TITLE_PATTERNS.some(
      (pattern) =>
        lowerTitle.includes(
          pattern.toLowerCase(),
        ),
    )
  ) {
    return true;
  }
  return false;
}
function isExcludedIdentity(
  name: string,
): boolean {
  const lower =
    normalizeText(
      name,
      160,
    ).toLowerCase();
  return EXCLUDED_IDENTITY_TERMS.some(
    (term) =>
      lower === term ||
      lower.includes(term),
  );
}
function hasLegalBusinessSuffix(
  name: string,
): boolean {
  const lower =
    name.toLowerCase();
  return BUSINESS_LEGAL_SUFFIXES.some(
    (suffix) =>
      lower.includes(
        suffix.toLowerCase(),
      ),
  );
}
function cleanIdentityCandidate(
  value: string,
): string {
  let cleaned =
    normalizeText(
      value,
      120,
    );
  cleaned =
    cleaned
      .replace(/^#+\s*/, "")
      .replace(
        /^(?:the\s+)?(?:company|business)\s+/i,
        "",
      )
      .trim();
  return cleaned;
}
function looksLikeConcreteBusinessName(
  value: string,
): boolean {
  const name =
    cleanIdentityCandidate(value);
  if (
    name.length < 2 ||
    name.length > 100
  ) {
    return false;
  }
  if (
    isExcludedIdentity(name)
  ) {
    return false;
  }
  const lower =
    name.toLowerCase();
  if (
    lower.startsWith("opportunity ") ||
    lower.startsWith("why ") ||
    lower.startsWith("how ") ||
    lower.startsWith("what ")
  ) {
    return false;
  }
  if (
    EXCLUDED_TITLE_PATTERNS.some(
      (term) =>
        lower.includes(
          term.toLowerCase(),
        ),
    )
  ) {
    return false;
  }
  return true;
}
function buildIdentity(
  name: string,
  confidence: number,
  reason: string,
): BusinessIdentity {
  const cleaned =
    cleanIdentityCandidate(name);
  if (
    !looksLikeConcreteBusinessName(
      cleaned,
    )
  ) {
    return {
      name: null,
      confidence: 0,
      evidence: [],
    };
  }
  return {
    name: cleaned,
    confidence,
    evidence: [
      reason,
    ],
  };
}
function extractExplicitBusinessIdentity(
  source: VerifiedWebEvidence,
): BusinessIdentity {
  const title =
    normalizeText(
      source.title,
      300,
    );
  const snippets =
    uniqueStrings(
      source.snippets || [],
    ).slice(0, 8);
  const text =
    [
      title,
      ...snippets,
    ].join(" ");
  /*
   * Strongest pattern:
   *
   * "OPPO launches..."
   * "Xiaomi enters Japan..."
   * "Company expands..."
   *
   * This is a company-action relationship,
   * not a generic market phrase.
   */
  const actionPatterns = [
    /^#?\s*(.+?)\s+(?:launches|launched|expands|expanded|expanding|enters|entered|entering|opens|opened|opening|partners|partnered|announces|announced|plans|planned|targets|targeting|seeks|seeking|grows|growing|hiring|recruits|sets up|establishes|established)\b/i,
    /^#?\s*(.+?)\s+(?:进军|进入|拓展|扩张|布局|登陆|发布|推出|成立|招聘|合作|签约|投资|出海|开拓|落地)(?:日本|日本市场|海外|海外市场|跨境|全球)/,
    /^#?\s*(.+?)(?:进军|进入|拓展|扩张|布局|登陆|发布|推出|成立|招聘|合作|签约|投资|出海|开拓|落地)(?:日本|日本市场|海外|海外市场|跨境|全球)/,
  ];
  for (
    const pattern of actionPatterns
  ) {
    const match =
      title.match(pattern);
    if (
      !match?.[1]
    ) {
      continue;
    }
    const identity =
      buildIdentity(
        match[1],
        0.95,
        `The source title explicitly associates the named organization with a concrete commercial action.`,
      );
    if (
      identity.name
    ) {
      return identity;
    }
  }
  /*
   * Legal organization names are strong
   * evidence, but still require the rest
   * of the discovery pipeline to corroborate
   * them across independent sources.
   */
  const legalPattern =
    /\b([A-Z][A-Za-z0-9&.'’()/-]{1,60}(?:\s+[A-Z][A-Za-z0-9&.'’()/-]{1,60}){0,5}\s+(?:Inc\.?|Ltd\.?|LLC|Corp\.?|Corporation|Co\.?|Company|Group|Holdings|GmbH|PLC))\b/;
  const legalMatch =
    text.match(
      legalPattern,
    );
  if (
    legalMatch?.[1] &&
    hasLegalBusinessSuffix(
      legalMatch[1],
    )
  ) {
    const identity =
      buildIdentity(
        legalMatch[1],
        0.9,
        `A concrete legal-style business organization name appears in the source.`,
      );
    if (
      identity.name
    ) {
      return identity;
    }
  }
  const chineseLegalPattern =
    /([\u4e00-\u9fffA-Za-z0-9·]{2,40}(?:有限公司|股份有限公司|有限责任公司|集团公司|株式会社|有限会社))/;
  const chineseMatch =
    text.match(
      chineseLegalPattern,
    );
  if (
    chineseMatch?.[1]
  ) {
    const identity =
      buildIdentity(
        chineseMatch[1],
        0.95,
        `A concrete Chinese business organization name appears in the source.`,
      );
    if (
      identity.name
    ) {
      return identity;
    }
  }
  /*
   * Explicit "X, a Chinese company..."
   * / "X, a manufacturer..." patterns.
   */
  const descriptorPatterns = [
    /\b([A-Z][A-Za-z0-9&.'’()/-]*(?:\s+[A-Z][A-Za-z0-9&.'’()/-]*){0,5}),?\s+(?:a|an)\s+(?:Chinese|China-based|mainland Chinese)\s+(?:company|manufacturer|brand|exporter|seller|business)\b/i,
    /\b([A-Z][A-Za-z0-9&.'’()/-]*(?:\s+[A-Z][A-Za-z0-9&.'’()/-]*){0,5})\s+(?:is|was|has|plans|will)\s+(?:expanding|entering|enter|launching|launches|selling|opening|partnering)\b/i,
  ];
  for (
    const pattern of descriptorPatterns
  ) {
    const match =
      text.match(pattern);
    if (
      !match?.[1]
    ) {
      continue;
    }
    const identity =
      buildIdentity(
        match[1],
        0.86,
        `The retrieved evidence explicitly describes the named organization as a commercial business.`,
      );
    if (
      identity.name
    ) {
      return identity;
    }
  }
  /*
   * IMPORTANT:
   * Do not use a generic leading noun phrase
   * as a company name.
   *
   * This deliberately rejects:
   *
   * "Online Marketplaces in Japan"
   * "Top Online Marketplaces"
   * "Amazon, Rakuten and the Rest"
   *
   * and similar article-title structures.
   */
  return {
    name: null,
    confidence: 0,
    evidence: [],
  };
}
function mergeIdentityEvidence(
  existing: BusinessIdentity,
  incoming: BusinessIdentity,
): BusinessIdentity {
  if (
    !incoming.name
  ) {
    return existing;
  }
  if (
    !existing.name
  ) {
    return incoming;
  }
  if (
    existing.name.toLowerCase() ===
    incoming.name.toLowerCase()
  ) {
    return {
      name: existing.name,
      confidence: Math.max(
        existing.confidence,
        incoming.confidence,
      ),
      evidence:
        uniqueStrings([
          ...existing.evidence,
          ...incoming.evidence,
        ]),
    };
  }
  return existing.confidence >=
    incoming.confidence
    ? existing
    : incoming;
}
function extractCommercialSignals(
  evidence: VerifiedWebEvidence[],
): string[] {
  const text =
    evidence
      .flatMap((item) => [
        item.title,
        ...(item.snippets || []),
      ])
      .join(" ")
      .toLowerCase();
  const groups = [
    {
      label: "Japan market activity",
      terms: JAPAN_TERMS,
    },
    {
      label: "cross-border commerce",
      terms: CROSS_BORDER_TERMS,
    },
    {
      label: "commercial activity",
      terms: COMMERCIAL_TERMS,
    },
  ];
  return groups
    .filter((group) =>
      containsAny(
        text,
        group.terms,
      ),
    )
    .map(
      (group) =>
        group.label,
    );
}
function classifyCustomerType(
  evidence: VerifiedWebEvidence[],
): C144ProspectCandidate["customerType"] {
  const text =
    evidence
      .flatMap((item) => [
        item.title,
        ...(item.snippets || []),
      ])
      .join(" ")
      .toLowerCase();
  if (
    text.includes("manufacturer") ||
    text.includes("factory") ||
    text.includes("制造商") ||
    text.includes("工厂")
  ) {
    return "manufacturer";
  }
  if (
    text.includes("brand") ||
    text.includes("品牌")
  ) {
    return "brand";
  }
  if (
    text.includes("exporter") ||
    text.includes("export") ||
    text.includes("出口") ||
    text.includes("外贸")
  ) {
    return "exporter";
  }
  if (
    text.includes("cross-border seller") ||
    text.includes("cross border seller") ||
    text.includes("跨境卖家")
  ) {
    return "cross-border-seller";
  }
  if (
    text.includes("seller") ||
    text.includes("卖家")
  ) {
    return "cross-border-seller";
  }
  if (
    text.includes("traditional business") ||
    text.includes("traditional company") ||
    text.includes("传统企业")
  ) {
    return "traditional-business";
  }
  return "unknown";
}
function calculateFitScore(
  businessIdentityConfidence: number,
  independentHosts: number,
  sourceCount: number,
  signals: string[],
): number {
  if (
    businessIdentityConfidence < 0.8 ||
    independentHosts < 2 ||
    sourceCount < 2
  ) {
    return 0;
  }
  let score = 0.7;
  if (
    businessIdentityConfidence >=
    0.9
  ) {
    score += 0.08;
  }
  if (
    independentHosts >= 3
  ) {
    score += 0.07;
  }
  if (
    independentHosts >= 5
  ) {
    score += 0.05;
  }
  if (
    sourceCount >= 4
  ) {
    score += 0.05;
  }
  if (
    signals.length >= 2
  ) {
    score += 0.05;
  }
  return Math.min(
    1,
    Number(
      score.toFixed(2),
    ),
  );
}
function buildCandidateSeeds(
  sources: DiscoverySource[],
): CandidateSeed[] {
  const seeds: CandidateSeed[] = [];
  for (
    const source of sources
  ) {
    const identity =
      extractExplicitBusinessIdentity(
        source.evidence,
      );
    /*
     * No explicit business identity:
     * this source cannot create a prospect.
     */
    if (
      !identity.name
    ) {
      continue;
    }
    seeds.push({
      name: identity.name,
      source,
      identity,
    });
  }
  return seeds;
}
function groupSeeds(
  seeds: CandidateSeed[],
): Array<{
  name: string;
  identity: BusinessIdentity;
  sources: DiscoverySource[];
}> {
  const groups =
    new Map<
      string,
      {
        name: string;
        identity: BusinessIdentity;
        sources: DiscoverySource[];
      }
    >();
  for (
    const seed of seeds
  ) {
    if (
      !seed.identity.name
    ) {
      continue;
    }
    const normalized =
      seed.identity.name
        .toLowerCase()
        .replace(
          /[^a-z0-9\u4e00-\u9fff]+/g,
          "",
        );
    if (
      !normalized
    ) {
      continue;
    }
    const existing =
      groups.get(normalized);
    if (
      !existing
    ) {
      groups.set(
        normalized,
        {
          name:
            seed.identity.name,
          identity:
            seed.identity,
          sources: [
            seed.source,
          ],
        },
      );
      continue;
    }
    existing.identity =
      mergeIdentityEvidence(
        existing.identity,
        seed.identity,
      );
    existing.sources.push(
      seed.source,
    );
  }
  return Array.from(
    groups.values(),
  );
}
function dedupeSources(
  sources: DiscoverySource[],
): DiscoverySource[] {
  const map =
    new Map<
      string,
      DiscoverySource
    >();
  for (
    const source of sources
  ) {
    const host =
      normalizeHost(
        source.evidence.hostname,
      );
    const url =
      normalizeText(
        source.evidence.url,
        500,
      );
    if (
      !host ||
      !url
    ) {
      continue;
    }
    const key =
      `${host}|${url}`;
    if (
      !map.has(key)
    ) {
      map.set(
        key,
        source,
      );
    }
  }
  return Array.from(
    map.values(),
  );
}
function buildCandidate(
  group: {
    name: string;
    identity: BusinessIdentity;
    sources: DiscoverySource[];
  },
  rank: number,
): C144ProspectCandidate | null {
  const sources =
    dedupeSources(
      group.sources,
    );
  const hosts =
    new Set(
      sources.map(
        (source) =>
          normalizeHost(
            source.evidence.hostname,
          ),
      ),
    );
  const sourceCount =
    sources.length;
  const independentHosts =
    hosts.size;
  /*
   * Discovery gate:
   *
   * A named business must already have
   * independent corroboration before
   * it is allowed into C144 verification.
   */
  if (
    sourceCount < 2 ||
    independentHosts < 2
  ) {
    return null;
  }
  if (
    !looksLikeConcreteBusinessName(
      group.name,
    )
  ) {
    return null;
  }
  const evidence =
    sources.flatMap(
      (source) =>
        source.evidence.snippets ||
        [],
    );
  const commercialSignals =
    extractCommercialSignals(
      sources.map(
        (source) =>
          source.evidence,
      ),
    );
  const chinaSources =
    sources.filter(
      (source) =>
        containsAny(
          sourceText(
            source.evidence,
          ),
          CHINA_TERMS,
        ),
    );
  const japanOrCrossBorderSources =
    sources.filter(
      (source) =>
        containsAny(
          sourceText(
            source.evidence,
          ),
          [
            ...JAPAN_TERMS,
            ...CROSS_BORDER_TERMS,
          ],
        ),
    );
  /*
   * Do not create a candidate merely because
   * the business name appears on two sites.
   *
   * The two independent evidence dimensions
   * must also exist:
   *
   * 1. China business evidence
   * 2. Japan/cross-border evidence
   */
  if (
    chinaSources.length < 1 ||
    japanOrCrossBorderSources.length < 1
  ) {
    return null;
  }
  const fitScore =
    calculateFitScore(
      group.identity.confidence,
      independentHosts,
      sourceCount,
      commercialSignals,
    );
  if (
    fitScore < 0.7
  ) {
    return null;
  }
  const primary =
    sources[0];
  const customerType =
    classifyCustomerType(
      sources.map(
        (source) =>
          source.evidence,
      ),
    );
  const businessIdentityEvidence =
    uniqueStrings([
      ...group.identity.evidence,
      ...sources
        .slice(0, 5)
        .map(
          (source) =>
            `${source.evidence.title} - ${source.evidence.hostname}`,
        ),
    ]);
  const validationReasons = [
    `The named business was independently identified across ${independentHosts} host(s).`,
    `The candidate has ${sourceCount} usable source(s).`,
    "China-business relevance is tied to the named organization.",
    "Japan or cross-border relevance is tied to the named organization.",
    `Detected commercial signals: ${commercialSignals.length}.`,
    "Discovery does not claim contact, interest, customer status, payment, or revenue.",
  ];
  return {
    id:
      `C144-PROSPECT-${rank}`,
    rank,
    name:
      group.name,
    type:
      "business",
    hostname:
      normalizeHost(
        primary.evidence.hostname,
      ),
    url:
      normalizeText(
        primary.evidence.url,
        500,
      ),
    sourceTitle:
      normalizeText(
        primary.evidence.title,
        300,
      ),
    evidence:
      uniqueStrings(
        evidence,
      ).slice(0, 10),
    evidenceScore:
      Math.max(
        ...sources.map(
          (source) =>
            typeof source.evidence.confidence ===
            "number"
              ? source.evidence.confidence
              : 0,
        ),
        0,
      ),
    credibilityTier:
      independentHosts >= 4
        ? "high"
        : "medium",
    verificationLabel:
      independentHosts >= 4
        ? "high"
        : "medium",
    whyRelevant:
      `${group.name} has independently sourced mainland-China business evidence together with current Japan or cross-border commercial relevance. AIOS fit score: ${fitScore}.`,
    qualificationStatus:
      "evidence-backed",
    recommendedAction:
      "Send this candidate through C144.3.4 verification. Do not contact automatically.",
    businessName:
      group.name,
    businessIdentityEvidence,
    commercialSignals,
    contactChannel:
      null,
    validationReasons,
    paymentCapability:
      "likely-domestic-rmb",
    paymentCurrency:
      "CNY",
    customerType,
    aiosFitScore:
      fitScore,
  };
}
async function collectDiscoverySources(
  opportunity: LiveCommercialOpportunityResult,
): Promise<DiscoverySource[]> {
  const sources: DiscoverySource[] = [];
  if (
    opportunity.web?.evidence
  ) {
    for (
      const evidence of
        opportunity.web.evidence
    ) {
      if (
        isExcludedSource(
          evidence.title,
          evidence.hostname,
        )
      ) {
        continue;
      }
      sources.push({
        evidence,
        searchIntent:
          "live-commercial-opportunity",
      });
    }
  }
  for (
    const [query, searchIntent] of
      DISCOVERY_PROMPTS
  ) {
    try {
      const result =
        await retrieveWebEvidence(
          query,
        );
      if (
        !result.success ||
        !result.evidence?.length
      ) {
        continue;
      }
      for (
        const evidence of
          result.evidence
      ) {
        if (
          isExcludedSource(
            evidence.title,
            evidence.hostname,
          )
        ) {
          continue;
        }
        sources.push({
          evidence,
          searchIntent,
        });
      }
    } catch {
      continue;
    }
  }
  return dedupeSources(
    sources,
  );
}
function getDiscoveryHostCount(
  sources: DiscoverySource[],
): number {
  return new Set(
    sources.map(
      (source) =>
        normalizeHost(
          source.evidence.hostname,
        ),
    ),
  ).size;
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
  if (
    !projectResult.success ||
    !project
  ) {
    return {
      success: false,
      status: "blocked",
      project: null,
      candidates: [],
      sourceCount: 0,
      independentHosts: 0,
      conclusion:
        "C144.3.5 could not initialize the first-cashflow project.",
      nextStep:
        "Initialize the C144 first-cashflow project before prospect discovery.",
      integrity: {
        fabricatedLead: false,
        fabricatedContact: false,
        fabricatedResponse: false,
        fabricatedCustomer: false,
      },
      timestamp,
    };
  }
  const sources =
    await collectDiscoverySources(
      opportunity,
    );
  const seeds =
    buildCandidateSeeds(
      sources,
    );
  const groups =
    groupSeeds(
      seeds,
    );
  const candidates: C144ProspectCandidate[] =
    [];
  for (
    const group of groups
  ) {
    const candidate =
      buildCandidate(
        group,
        candidates.length + 1,
      );
    if (
      candidate
    ) {
      candidates.push(
        candidate,
      );
    }
  }
  candidates.sort(
    (a, b) =>
      b.aiosFitScore -
      a.aiosFitScore,
  );
  const ranked =
    candidates.map(
      (
        candidate,
        index,
      ) => ({
        ...candidate,
        rank:
          index + 1,
        id:
          `C144-PROSPECT-${index + 1}`,
      }),
    );
  /*
   * Safety-first behavior:
   *
   * zero candidates is a valid discovery
   * outcome. We do not manufacture a lead
   * simply to satisfy the downstream pipeline.
   */
  if (
    ranked.length < 1
  ) {
    return {
      success: false,
      status:
        "insufficient-evidence",
      project,
      candidates: [],
      sourceCount:
        sources.length,
      independentHosts:
        getDiscoveryHostCount(
          sources,
        ),
      conclusion:
        "C144.3.5 did not identify a concrete mainland-China enterprise prospect that passed the discovery identity gates.",
      nextStep:
        "Rerun live discovery with additional company-specific sources. Do not contact any blocked or generic market candidate.",
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
    candidates:
      ranked,
    sourceCount:
      sources.length,
    independentHosts:
      getDiscoveryHostCount(
        sources,
      ),
    conclusion:
      `C144.3.5 identified ${ranked.length} concrete mainland-China enterprise prospect candidate(s) for C144.3.4 verification.`,
    nextStep:
      "Pass every candidate through C144.3.4 verification before any manual outreach.",
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
  return (
    result.success &&
    result.status ===
      "ready" &&
    result.candidates.length > 0 &&
    result.candidates.every(
      (candidate) =>
        candidate.type ===
          "business" &&
        Boolean(
          candidate.businessName,
        ) &&
        candidate.businessName ===
          candidate.name &&
        candidate.aiosFitScore >=
          0.7 &&
        candidate.contactChannel ===
          null &&
        candidate.paymentCurrency ===
          "CNY" &&
        candidate.validationReasons.length >=
          3 &&
        candidate.customerType !==
          "unknown",
    ) &&
    result.integrity.fabricatedLead ===
      false &&
    result.integrity.fabricatedContact ===
      false &&
    result.integrity.fabricatedResponse ===
      false &&
    result.integrity.fabricatedCustomer ===
      false
  );
}
export function isC144DiscoveryCandidateSafe(
  candidate: C144ProspectCandidate,
): boolean {
  return (
    candidate.type ===
      "business" &&
    Boolean(
      candidate.businessName,
    ) &&
    candidate.businessName ===
      candidate.name &&
    looksLikeConcreteBusinessName(
      candidate.businessName,
    ) &&
    candidate.contactChannel ===
      null &&
    candidate.paymentCurrency ===
      "CNY" &&
    candidate.aiosFitScore >=
      0.7
  );
}
