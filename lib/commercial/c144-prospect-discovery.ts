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
  "C144.3.6.2";

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

const EXCLUDED_NAME_TERMS = [
  "amazon",
  "rakuten",
  "marketplace",
  "marketplaces",
  "online marketplaces",
  "online marketplace",
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
  [
    "中国企业 日本市场 出海 跨境电商 2026 公司 品牌",
    "Find named mainland China businesses, brands, manufacturers, exporters or cross-border sellers with concrete current Japan or overseas commercial activity. Look for company names connected to actions such as entering Japan, Japan sales, hiring, distribution, partnerships, expansion, exports, Rakuten, Amazon Japan or Japanese consumers. Return real business names, not market categories.",
  ],
  [
    "中国品牌 进入日本市场 出海 2026 企业",
    "Find real mainland Chinese companies or brands that are specifically named in current evidence about entering, expanding in, selling into, hiring for, partnering in or distributing through Japan. The company name must be identifiable from the source evidence.",
  ],
  [
    "中国企业 日本 招聘 渠道 经销商 合作 2026",
    "Find named China-based companies with current Japan-related commercial signals such as Japan hiring, distributor recruitment, sales expansion, partnerships, channels or market-entry work. Prefer company-specific evidence.",
  ],
  [
    "深圳 广州 东莞 杭州 义乌 企业 日本 出海 2026",
    "Find named mainland Chinese SMEs, manufacturers, exporters, brands and cross-border sellers in Shenzhen, Guangzhou, Dongguan, Hangzhou, Yiwu or nearby regions with current Japan or overseas commercial activity.",
  ],
  [
    "中国跨境卖家 日本 Amazon Rakuten 品牌 企业 2026",
    "Find named mainland Chinese companies, brands and sellers currently selling, expanding or building channels in Japan. Do not return Amazon, Rakuten, marketplace platforms, generic market articles or marketplace categories as prospects.",
  ],
  [
    "中国制造商 日本市场 出口 品牌 经销商 2026",
    "Find named mainland China manufacturers, brands and exporters with concrete Japan-market, export, distributor, sales or channel activity. Require company-specific evidence rather than generic market commentary.",
  ],
  [
    "中国公司 日本市场 销售 增长 合作 招聘 2026",
    "Find named mainland Chinese companies showing current commercial activity connected with Japan through sales, growth, hiring, partnerships, distribution, channels or market expansion.",
  ],
  [
    "中国品牌 日本消费者 海外市场 出海 企业 2026",
    "Find named mainland Chinese consumer brands with current Japan or overseas commercial activity. Prefer evidence that identifies the company and describes a concrete commercial action.",
  ],
] as const;

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

function isExcludedName(
  name: string,
): boolean {
  const lower = normalizeText(
    name,
    160,
  ).toLowerCase();

  return EXCLUDED_NAME_TERMS.some((item) =>
    lower === item ||
    lower.includes(item),
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

  if (isExcludedName(name)) {
    return false;
  }

  const lower = name.toLowerCase();

  if (
    lower.startsWith("how ") ||
    lower.startsWith("what ") ||
    lower.startsWith("why ") ||
    lower.startsWith("find ") ||
    lower.startsWith("best ") ||
    lower.startsWith("top ")
  ) {
    return false;
  }

  if (
    containsAny(
      lower,
      [
        "market size",
        "market report",
        "market outlook",
        "marketplaces in",
        "online marketplaces",
      ],
    )
  ) {
    return false;
  }

  return true;
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

  const chineseLegalPatterns = [
    /([\u4e00-\u9fffA-Za-z0-9&()·.-]{2,40}(?:有限公司|股份有限公司|有限责任公司|集团公司|集团))/g,
  ];

  for (const pattern of chineseLegalPatterns) {
    for (const match of text.matchAll(pattern)) {
      const name = cleanBusinessName(
        match[1] || "",
      );

      if (looksLikeBusinessName(name)) {
        seeds.push({
          name,
          source,
          confidence: 0.98,
          reason:
            "Concrete Chinese business organization name detected in source evidence.",
        });
      }
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

    if (looksLikeBusinessName(name)) {
      seeds.push({
        name,
        source,
        confidence: 0.98,
        reason:
          "Concrete English business organization name detected in source evidence.",
      });
    }
  }

  const actionPattern =
    /\b([A-Z][A-Za-z0-9&.-]{1,30}(?:\s+[A-Z][A-Za-z0-9&.-]{1,30}){0,4})\s+(?:launches|launched|enters|entered|entering|expands|expanded|expanding|opens|opened|opening|partners|partnered|partners with|hired|hiring|recruits|recruiting|exports|exporting|sells|selling|distributes|distributed|invests|invested|announces|announced)\b/gi;

  for (const match of text.matchAll(
    actionPattern,
  )) {
    const name = cleanBusinessName(
      match[1] || "",
    );

    if (looksLikeBusinessName(name)) {
      seeds.push({
        name,
        source,
        confidence: 0.91,
        reason:
          "Public-facing business name is directly connected to a concrete commercial action.",
      });
    }
  }

  const chineseActionPattern =
    /([\u4e00-\u9fffA-Za-z0-9·&.-]{2,30})\s*(?:进入|进入了|拓展|拓展了|布局|布局了|开拓|开拓了|进军|进军了|扩大|扩大了|扩张|扩张了|合作|合作了|招聘|招聘了|销售|销售了|出口|出口了|出海|出海了|进入日本|拓展日本|日本市场)/g;

  for (const match of text.matchAll(
    chineseActionPattern,
  )) {
    const name = cleanBusinessName(
      match[1] || "",
    );

    if (
      looksLikeBusinessName(name) &&
      name.length >= 2
    ) {
      seeds.push({
        name,
        source,
        confidence: 0.9,
        reason:
          "Chinese public-facing business name is directly connected to a Japan or overseas commercial action.",
      });
    }
  }

  const quotedPattern =
    /["“]([^"”]{2,80})["”]/g;

  for (const match of text.matchAll(
    quotedPattern,
  )) {
    const name = cleanBusinessName(
      match[1] || "",
    );

    if (
      looksLikeBusinessName(name) &&
      containsAny(
        text,
        COMMERCIAL_TERMS,
      )
    ) {
      seeds.push({
        name,
        source,
        confidence: 0.72,
        reason:
          "Named organization or brand appears explicitly in source evidence containing a commercial signal.",
      });
    }
  }

  return seeds;
}

function buildIdentityGroups(
  sources: DiscoverySource[],
): Map<
  string,
  {
    displayName: string;
    sources: DiscoverySource[];
    identities: IdentitySeed[];
  }
> {
  const groups = new Map<
    string,
    {
      displayName: string;
      sources: DiscoverySource[];
      identities: IdentitySeed[];
    }
  >();

  for (const source of sources) {
    const seeds =
      extractIdentitySeeds(source);

    for (const seed of seeds) {
      const key = seed.name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");

      if (!key) {
        continue;
      }

      const existing =
        groups.get(key);

      if (existing) {
        existing.sources.push(
          source,
        );
        existing.identities.push(
          seed,
        );
      } else {
        groups.set(key, {
          displayName: seed.name,
          sources: [source],
          identities: [seed],
        });
      }
    }
  }

  return groups;
}

function dedupeSources(
  sources: DiscoverySource[],
): DiscoverySource[] {
  const seen = new Set<string>();
  const output: DiscoverySource[] = [];

  for (const source of sources) {
    const evidence =
      source.evidence;

    const host =
      normalizeHost(
        evidence.hostname,
      );

    const key = [
      host,
      normalizeText(
        evidence.title,
        300,
      ).toLowerCase(),
      evidence.url,
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(source);
  }

  return output;
}

async function collectDiscoverySources(): Promise<
  DiscoverySource[]
> {
  const all: DiscoverySource[] = [];

  for (
    const [query, intent] of DISCOVERY_PROMPTS
  ) {
    try {
      const result =
        await retrieveWebEvidence(
          query,
        );

      if (
        !result.success ||
        !result.verified ||
        !result.evidence ||
        result.evidence.length === 0
      ) {
        continue;
      }

      for (
        const evidence of result.evidence
      ) {
        if (
          !evidence.url ||
          !evidence.hostname
        ) {
          continue;
        }

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

        all.push({
          evidence,
          searchIntent: intent,
        });
      }
    } catch {
      continue;
    }
  }

  return dedupeSources(all);
}

function getSourcesForBusiness(
  group: {
    displayName: string;
    sources: DiscoverySource[];
    identities: IdentitySeed[];
  },
): DiscoverySource[] {
  return dedupeSources(
    group.sources,
  );
}

function getBusinessText(
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

function hasChinaEvidence(
  sources: DiscoverySource[],
): boolean {
  return sources.some((source) =>
    containsAny(
      sourceText(
        source.evidence,
      ),
      CHINA_TERMS,
    ),
  );
}

function hasJapanOrCrossBorderEvidence(
  sources: DiscoverySource[],
): boolean {
  return sources.some((source) => {
    const text =
      sourceText(
        source.evidence,
      );

    return (
      containsAny(
        text,
        JAPAN_TERMS,
      ) ||
      containsAny(
        text,
        CROSS_BORDER_TERMS,
      )
    );
  });
}

function getCommercialSignals(
  sources: DiscoverySource[],
): string[] {
  const text =
    getBusinessText(
      sources,
    );

  const signals: string[] = [];

  if (
    containsAny(
      text,
      [
        "launch",
        "launched",
        "launches",
        "进入",
        "进军",
      ],
    )
  ) {
    signals.push(
      "market entry or launch",
    );
  }

  if (
    containsAny(
      text,
      [
        "sales",
        "revenue",
        "growth",
        "销售",
        "营收",
        "增长",
      ],
    )
  ) {
    signals.push(
      "sales or growth",
    );
  }

  if (
    containsAny(
      text,
      [
        "hiring",
        "recruiting",
        "招聘",
      ],
    )
  ) {
    signals.push(
      "hiring or recruiting",
    );
  }

  if (
    containsAny(
      text,
      [
        "partnership",
        "partner",
        "合作",
      ],
    )
  ) {
    signals.push(
      "partnership",
    );
  }

  if (
    containsAny(
      text,
      [
        "distribution",
        "distributor",
        "经销商",
        "渠道",
      ],
    )
  ) {
    signals.push(
      "distribution or channel",
    );
  }

  if (
    containsAny(
      text,
      [
        "ecommerce",
        "e-commerce",
        "跨境电商",
        "跨境",
        "出海",
      ]
    )
  ) {
    signals.push(
      "cross-border commerce",
    );
  }

  if (
    containsAny(
      text,
      [
        "export",
        "exports",
        "出口",
      ],
    )
  ) {
    signals.push(
      "export activity",
    );
  }

  return uniqueStrings(
    signals,
  );
}

function classifyCustomerType(
  sources: DiscoverySource[],
): C144ProspectCandidate["customerType"] {
  const text =
    getBusinessText(
      sources,
    );

  if (
    containsAny(
      text,
      [
        "manufacturer",
        "manufacturing",
        "factory",
        "制造商",
        "工厂",
        "制造",
      ],
    )
  ) {
    return "manufacturer";
  }

  if (
    containsAny(
      text,
      [
        "exporter",
        "export",
        "出口",
        "外贸",
      ],
    )
  ) {
    return "exporter";
  }

  if (
    containsAny(
      text,
      [
        "cross-border seller",
        "cross-border ecommerce",
        "cross-border",
        "跨境卖家",
        "跨境电商",
        "出海",
      ],
    )
  ) {
    return "cross-border-seller";
  }

  if (
    containsAny(
      text,
      [
        "brand",
        "品牌",
      ],
    )
  ) {
    return "brand";
  }

  return "other";
}

function buildCandidate(
  group: {
    displayName: string;
    sources: DiscoverySource[];
    identities: IdentitySeed[];
  },
  rank: number,
): C144ProspectCandidate | null {
  const sources =
    getSourcesForBusiness(
      group,
    );

  const hosts = new Set(
    sources.map((source) =>
      normalizeHost(
        source.evidence.hostname,
      ),
    ),
  );

  if (
    sources.length < 2 ||
    hosts.size < 2
  ) {
    return null;
  }

  const businessName =
    group.displayName;

  if (
    !looksLikeBusinessName(
      businessName,
    )
  ) {
    return null;
  }

  if (
    !hasChinaEvidence(
      sources,
    )
  ) {
    return null;
  }

  if (
    !hasJapanOrCrossBorderEvidence(
      sources,
    )
  ) {
    return null;
  }

  const commercialSignals =
    getCommercialSignals(
      sources,
    );

  if (
    commercialSignals.length === 0
  ) {
    return null;
  }

  const identityEvidence =
    uniqueStrings(
      group.identities.map(
        (item) =>
          item.reason,
      ),
    );

  const strongestSource =
    sources
      .slice()
      .sort(
        (a, b) =>
          b.evidence.confidence -
          a.evidence.confidence,
      )[0];

  const evidence =
    uniqueStrings(
      sources.flatMap(
        (source) =>
          source.evidence.snippets ||
          [],
      ),
    ).slice(0, 8);

  const sourceTitles =
    uniqueStrings(
      sources.map(
        (source) =>
          source.evidence.title,
      ),
    );

  const customerType =
    classifyCustomerType(
      sources,
    );

  const score = Math.min(
    0.95,
    0.55 +
      Math.min(
        0.15,
        hosts.size * 0.05,
      ) +
      Math.min(
        0.1,
        sources.length * 0.025,
      ) +
      Math.min(
        0.1,
        commercialSignals.length * 0.025,
      ) +
      (group.identities.some(
        (item) =>
          item.confidence >= 0.9,
      )
        ? 0.05
        : 0),
  );

  return {
    id:
      `C144-PROSPECT-${rank}`,
    rank,
    name: businessName,
    type: "business",
    hostname:
      normalizeHost(
        strongestSource
          .evidence
          .hostname,
      ),
    url:
      strongestSource
        .evidence
        .url,
    sourceTitle:
      strongestSource
        .evidence
        .title,
    evidence,
    evidenceScore: score,
    credibilityTier:
      hosts.size >= 3
        ? "multi-source"
        : "dual-source",
    verificationLabel:
      "discovery-candidate-only",
    whyRelevant:
      `The business has current China-linked and Japan/cross-border commercial signals: ${commercialSignals.join(", ")}.`,
    qualificationStatus:
      "needs-manual-validation",
    recommendedAction:
      "Run C144.3.4 verification before any outreach.",
    businessName,
    businessIdentityEvidence:
      identityEvidence,
    commercialSignals,
    contactChannel: null,
    validationReasons: [
      `Identity supported by ${group.identities.length} identity observations.`,
      `Evidence spans ${hosts.size} independent hosts.`,
      `Commercial signals detected: ${commercialSignals.length}.`,
      `Source titles: ${sourceTitles.length}.`,
    ],
    paymentCapability:
      "unknown",
    paymentCurrency:
      "unknown",
    customerType,
    aiosFitScore: score,
  };
}

export async function discoverC144Prospects(
  opportunity: LiveCommercialOpportunityResult,
): Promise<C144ProspectDiscoveryResult> {
  const timestamp =
    Date.now();

  const project =
    await initializeFirstCashflowProject();

  const objective =
    project.objective;

  if (
    !opportunity.success ||
    opportunity.status !== "ready"
  ) {
    return {
      success: false,
      status: "blocked",
      project: objective,
      candidates: [],
      sourceCount: 0,
      independentHosts: 0,
      conclusion:
        "The verified commercial opportunity is not ready for prospect discovery.",
      nextStep:
        "Complete live commercial opportunity verification before prospect discovery.",
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
    await collectDiscoverySources();

  const independentHosts =
    new Set(
      sources.map((source) =>
        normalizeHost(
          source.evidence.hostname,
        ),
      ),
    ).size;

  if (
    sources.length < 2 ||
    independentHosts < 2
  ) {
    return {
      success: false,
      status: "insufficient-evidence",
      project: objective,
      candidates: [],
      sourceCount: sources.length,
      independentHosts,
      conclusion:
        "Current web retrieval did not provide enough independent evidence to safely discover real enterprise prospects.",
      nextStep:
        "Run another discovery cycle with additional company-specific Japan and cross-border queries. Do not create or contact unverified prospects.",
      integrity: {
        fabricatedLead: false,
        fabricatedContact: false,
        fabricatedResponse: false,
        fabricatedCustomer: false,
      },
      timestamp,
    };
  }

  const groups =
    buildIdentityGroups(
      sources,
    );

  const candidates: C144ProspectCandidate[] =
    [];

  for (
    const group of groups.values()
  ) {
    const candidate =
      buildCandidate(
        group,
        candidates.length + 1,
      );

    if (!candidate) {
      continue;
    }

    candidates.push(
      candidate,
    );
  }

  candidates.sort(
    (a, b) =>
      b.aiosFitScore -
      a.aiosFitScore,
  );

  const ranked =
    candidates
      .slice(0, 10)
      .map(
        (candidate, index) => ({
          ...candidate,
          rank: index + 1,
          id:
            `C144-PROSPECT-${index + 1}`,
        }),
      );

  if (
    ranked.length === 0
  ) {
    return {
      success: false,
      status: "insufficient-evidence",
      project: objective,
      candidates: [],
      sourceCount: sources.length,
      independentHosts,
      conclusion:
        "Web evidence was retrieved, but no real business identity could be safely established across independent sources.",
      nextStep:
        "Improve company-specific discovery until at least one named mainland business is independently supported. Do not contact generic market or platform sources.",
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
    project: objective,
    candidates: ranked,
    sourceCount: sources.length,
    independentHosts,
    conclusion:
      `Discovered ${ranked.length} business candidate(s) from current independent web evidence. Candidates still require C144.3.4 verification before outreach.`,
    nextStep:
      "Run C144.3.4 verification and only prepare outreach for candidates that pass every verification gate.",
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
    result.status === "ready" &&
    result.candidates.length > 0 &&
    result.sourceCount >= 2 &&
    result.independentHosts >= 2 &&
    result.candidates.every(
      (candidate) =>
        Boolean(
          candidate.businessName,
        ) &&
        candidate.name ===
          candidate.businessName &&
        candidate.customerType !==
          "unknown" &&
        candidate.paymentCurrency ===
          "unknown" &&
        candidate.contactChannel ===
          null,
    )
  );
}
