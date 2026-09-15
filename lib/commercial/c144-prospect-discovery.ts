import "server-only";

import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

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
  "C144.3.3";

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
];

const EXCLUDED_IDENTITY_TERMS = [
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
];

const DISCOVERY_PROMPTS = [
  [
    "中国内地企业 日本市场 出海 跨境电商 2026 品牌 公司",
    "Find named mainland China companies or brands with current Japan-market, overseas expansion, cross-border ecommerce, export, distribution, partnership, sales, hiring, or marketplace activity in 2026. Prioritize real commercial businesses. Exclude media, government, universities, events, marketplaces, consulting firms, and generic market reports.",
  ],
  [
    "中国品牌 日本市场 扩张 出海 电商 企业 2026 新闻",
    "Find real mainland Chinese businesses with concrete current Japan or overseas commercial activity. Look for company names, product launches, Japan sales, distribution, partnerships, hiring, stores, ecommerce channels, or expansion. Return business organizations rather than articles about the market itself.",
  ],
  [
    "深圳 广州 东莞 杭州 义乌 中国企业 日本 跨境电商 出海 2026",
    "Find named mainland China SMEs, manufacturers, brands, exporters, and cross-border sellers connected to Japan or overseas commerce. Prefer concrete company-specific events and current commercial signals. Exclude media publishers, government, universities, conferences, expos, platforms, and consulting firms.",
  ],
  [
    "中国工厂 中国品牌 外贸企业 日本市场 经销商 电商 2026 公司",
    "Find named China-based manufacturers, brands, exporters, and sellers with current Japan-market or international commercial activity. Prefer company-specific evidence involving distribution, sales, ecommerce, partnerships, hiring, market entry, or overseas expansion.",
  ],
  [
    "中国跨境卖家 日本 Amazon Japan Rakuten 日本消费者 品牌 2026",
    "Find real mainland China companies, brands, and cross-border ecommerce sellers currently doing business connected to Japan, Amazon Japan, Rakuten, Japanese consumers, or overseas ecommerce. Exclude marketplaces themselves and generic guides.",
  ],
  [
    "中国企业 日本市场 合作 招聘 渠道 销售 2026 公司",
    "Find real mainland Chinese companies with current Japan-related commercial demand shown through hiring, distribution, sales, partnerships, channels, ecommerce, or market-entry activity. Prioritize identifiable businesses.",
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
    name
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  return EXCLUDED_IDENTITY_TERMS.some(
    (item) =>
      lower === item ||
      lower.includes(item),
  );
}

function cleanIdentityCandidate(
  value: string,
): string {
  return normalizeText(
    value
      .replace(/^#+\s*/, "")
      .replace(
        /^(?:the\s+)?(?:company|business)\s+/i,
        "",
      )
      .replace(
        /[|:：\-–—].*$/,
        "",
      ),
    120,
  ).trim();
}

function looksLikeBusinessName(
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
    !looksLikeBusinessName(cleaned)
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

function extractBusinessIdentity(
  evidence: VerifiedWebEvidence,
): BusinessIdentity {
  const title =
    normalizeText(
      evidence.title,
      300,
    );

  const snippets =
    uniqueStrings(
      evidence.snippets || [],
    ).slice(0, 8);

  const text = [
    title,
    ...snippets,
  ].join(" ");

  const titlePatterns = [
    /^#?\s*(.+?)\s+(?:launches|launched|expands|expanded|expanding|enters|entered|entering|opens|opened|opening|partners|partnered|announces|announced|plans|planned|targets|targeting|seeks|seeking|grows|growing|hiring|recruits|sets up|establishes|established)\b/i,

    /^#?\s*(.+?)\s+(?:Japan|Japanese market|Japan market|China|Chinese market|cross-border|cross border|overseas|international)\b/i,

    /^#?\s*(.+?)\s*[:：]\s*(?:Japan|Japanese|China|Chinese|cross-border|overseas|ecommerce|e-commerce|market|sales|expansion)\b/i,

    /^#?\s*(.+?)\s*[-–—|]\s*(?:Japan|Japanese|China|Chinese|cross-border|overseas|ecommerce|e-commerce|market|sales|expansion)\b/i,
  ];

  for (
    const pattern of titlePatterns
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
        0.84,
        `The organization name "${cleanIdentityCandidate(match[1])}" appears in the source title before a concrete commercial descriptor.`,
      );

    if (
      identity.name
    ) {
      return identity;
    }
  }

  const companyPattern =
    /\b([A-Z][A-Za-z0-9&.'’()\/-]{1,60}(?:\s+[A-Z][A-Za-z0-9&.'’()\/-]{1,60}){0,5}\s+(?:Inc\.?|Ltd\.?|LLC|Corp\.?|Corporation|Co\.?|Company|Group|Holdings|GmbH|PLC))\b/;

  const companyMatch =
    text.match(companyPattern);

  if (
    companyMatch?.[1]
  ) {
    const identity =
      buildIdentity(
        companyMatch[1],
        0.82,
        `A business-style legal organization name "${cleanIdentityCandidate(companyMatch[1])}" appears in the retrieved evidence.`,
      );

    if (
      identity.name
    ) {
      return identity;
    }
  }

  const chineseCompanyPattern =
    /([\u4e00-\u9fffA-Za-z0-9·]{2,40}(?:有限公司|股份有限公司|集团公司|集团|株式会社|有限会社))/;

  const chineseCompanyMatch =
    text.match(
      chineseCompanyPattern,
    );

  if (
    chineseCompanyMatch?.[1]
  ) {
    const identity =
      buildIdentity(
        chineseCompanyMatch[1],
        0.86,
        `A Chinese business organization name "${cleanIdentityCandidate(chineseCompanyMatch[1])}" appears in the retrieved evidence.`,
      );

    if (
      identity.name
    ) {
      return identity;
    }
  }

  const latinLeadingPattern =
    /^#?\s*([A-Z][A-Za-z0-9&.'’()\/-]*(?:\s+[A-Z][A-Za-z0-9&.'’()\/-]*){0,5})\s+(?:Japan|Japanese|China|Chinese|cross-border|overseas|ecommerce|e-commerce)\b/i;

  const latinLeadingMatch =
    title.match(
      latinLeadingPattern,
    );

  if (
    latinLeadingMatch?.[1]
  ) {
    const identity =
      buildIdentity(
        latinLeadingMatch[1],
        0.72,
        `The organization name "${cleanIdentityCandidate(latinLeadingMatch[1])}" appears as the leading named entity in the source title.`,
      );

    if (
      identity.name
    ) {
      return identity;
    }
  }

  return {
    name: null,
    confidence: 0,
    evidence: [],
  };
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

  const groups: Array<{
    label: string;
    terms: string[];
  }> = [
    {
      label: "Japan market activity",
      terms: [
        "japan",
        "japanese market",
        "japan market",
        "日本市场",
        "日本消费者",
        "日本客户",
        "日本",
      ],
    },
    {
      label: "cross-border commerce",
      terms: [
        "cross-border",
        "cross border",
        "crossborder",
        "跨境",
        "跨境电商",
        "出海",
        "海外销售",
        "overseas sales",
      ],
    },
    {
      label: "ecommerce activity",
      terms: [
        "ecommerce",
        "e-commerce",
        "online retail",
        "电商",
        "电子商务",
        "amazon japan",
        "rakuten",
        "tiktok shop",
      ],
    },
    {
      label: "market expansion",
      terms: [
        "expansion",
        "expand",
        "expanded",
        "market entry",
        "market-entry",
        "entering",
        "进入",
        "进军",
        "拓展",
        "扩张",
        "布局",
      ],
    },
    {
      label: "distribution or partnership",
      terms: [
        "distribution",
        "distributor",
        "partnership",
        "partner",
        "distribution channel",
        "经销商",
        "渠道",
        "合作",
        "签约",
      ],
    },
    {
      label: "sales or growth",
      terms: [
        "sales",
        "revenue",
        "growth",
        "growing",
        "销售",
        "营收",
        "增长",
      ],
    },
    {
      label: "hiring or operational demand",
      terms: [
        "hiring",
        "recruiting",
        "recruits",
        "招聘",
        "招募",
        "团队",
        "岗位",
      ],
    },
    {
      label: "export activity",
      terms: [
        "export",
        "exporter",
        "出口",
        "外贸",
      ],
    },
  ];

  return groups
    .filter(
      (group) =>
        group.terms.some(
          (term) =>
            text.includes(
              term.toLowerCase(),
            ),
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
    text.includes("cross-border seller") ||
    text.includes(
      "cross-border ecommerce seller",
    ) ||
    text.includes("跨境卖家")
  ) {
    return "cross-border-seller";
  }

  if (
    text.includes("manufacturer") ||
    text.includes("factory") ||
    text.includes("制造") ||
    text.includes("工厂")
  ) {
    return "manufacturer";
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
    text.includes("brand") ||
    text.includes("品牌")
  ) {
    return "brand";
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

function calculateAiosFitScore(
  signals: string[],
  customerType:
    C144ProspectCandidate["customerType"],
): number {
  let score = 0.35;

  score +=
    Math.min(
      0.30,
      signals.length * 0.045,
    );

  if (
    customerType ===
    "cross-border-seller"
  ) {
    score += 0.25;
  } else if (
    customerType === "brand" ||
    customerType === "manufacturer" ||
    customerType === "exporter"
  ) {
    score += 0.20;
  }

  return Number(
    Math.min(
      0.95,
      score,
    ).toFixed(2),
  );
}

function buildSearchQuery(
  companyName: string,
): string {
  return [
    `"${companyName}"`,
    "China",
    "Japan",
    "cross-border ecommerce",
    "overseas",
    "market expansion",
    "2026",
  ].join(" ");
}

async function corroborateBusiness(
  companyName: string,
): Promise<DiscoverySource[]> {
  const result =
    await retrieveWebEvidence(
      buildSearchQuery(
        companyName,
      ),
    );

  if (
    !result.success ||
    !result.evidence ||
    result.evidence.length === 0
  ) {
    return [];
  }

  return result.evidence
    .filter(
      (item) =>
        !isExcludedSource(
          normalizeText(
            item.title,
            300,
          ),
          normalizeText(
            item.hostname,
            180,
          ),
        ),
    )
    .map(
      (item) => ({
        evidence: item,
        searchIntent:
          "business-corroboration",
      }),
    );
}

function buildCandidate(
  companyName: string,
  sources: DiscoverySource[],
  objective: CommercialObjective,
): C144ProspectCandidate {
  const uniqueSources =
    sources.filter(
      (source, index) =>
        sources.findIndex(
          (other) =>
            normalizeHost(
              other.evidence.hostname,
            ) ===
              normalizeHost(
                source.evidence.hostname,
              ) &&
            other.evidence.url ===
              source.evidence.url,
        ) === index,
    );

  const evidence =
    uniqueSources.flatMap(
      (source) =>
        uniqueStrings(
          source.evidence.snippets || [],
        ).slice(0, 3),
    );

  const identityEvidence =
    uniqueStrings(
      uniqueSources.flatMap(
        (source) =>
          extractBusinessIdentity(
            source.evidence,
          ).evidence,
      ),
    );

  const signals =
    extractCommercialSignals(
      uniqueSources.map(
        (source) =>
          source.evidence,
      ),
    );

  const customerType =
    classifyCustomerType(
      uniqueSources.map(
        (source) =>
          source.evidence,
      ),
    );

  const hosts =
    Array.from(
      new Set(
        uniqueSources.map(
          (source) =>
            normalizeHost(
              source.evidence.hostname,
            ),
        ),
      ),
    );

  const primary =
    uniqueSources[0];

  const sourceCount =
    uniqueSources.length;

  const independentHostCount =
    hosts.length;

  const discoveryEvidenceReady =
    sourceCount >= 2 &&
    independentHostCount >= 2;

  const evidenceScore =
    Number(
      Math.min(
        0.99,
        0.45 +
          Math.min(
            0.20,
            sourceCount * 0.05,
          ) +
          Math.min(
            0.20,
            independentHostCount * 0.08,
          ) +
          Math.min(
            0.14,
            signals.length * 0.02,
          ),
      ).toFixed(3),
    );

  const aiosFitScore =
    calculateAiosFitScore(
      signals,
      customerType,
    );

  const validationReasons = [
    "The organization name was extracted from public source evidence rather than inferred from the hostname.",
    `The candidate has ${sourceCount} supporting source(s) across ${independentHostCount} independent host(s).`,
    `Detected commercial signals: ${signals.length}.`,
    "Payment capability is classified as likely domestic RMB because the first-customer strategy targets mainland-China businesses. Actual payment capability still requires manual confirmation.",
    "Discovery does not claim contact, interest, customer status, payment, or revenue.",
  ];

  if (
    !discoveryEvidenceReady
  ) {
    validationReasons.push(
      "Discovery evidence is not yet sufficient for an evidence-backed prospect.",
    );
  }

  return {
    id: "",
    rank: 0,

    name:
      companyName,

    type:
      discoveryEvidenceReady
        ? "business"
        : "source-backed-opportunity",

    hostname:
      primary
        ? normalizeText(
            primary.evidence.hostname,
            180,
          )
        : "",

    url:
      primary
        ? normalizeText(
            primary.evidence.url,
            1000,
          )
        : "",

    sourceTitle:
      primary
        ? normalizeText(
            primary.evidence.title,
            300,
          )
        : companyName,

    evidence,

    evidenceScore,

    credibilityTier:
      primary?.evidence
        .credibilityTier ||
      "unknown",

    verificationLabel:
      primary?.evidence
        .verificationLabel ||
      "limited",

    whyRelevant: [
      `${companyName} was identified as a named mainland-China business candidate from current public evidence.`,
      `Commercial signals: ${signals.join(", ") || "not sufficiently established"}.`,
      `AIOS fit score: ${aiosFitScore}.`,
      `The current C144 objective targets ${objective.revenueTarget} ${objective.currency} revenue and ${objective.customerTarget} paying customer.`,
      "The evidence supports prioritization only; it does not prove willingness to purchase.",
    ].join(" "),

    qualificationStatus:
      discoveryEvidenceReady
        ? "evidence-backed"
        : "needs-manual-validation",

    recommendedAction: [
      `Open the original sources and confirm that ${companyName} is the business described.`,
      "Confirm that the company is based in mainland China.",
      "Confirm a current Japan, cross-border, export, ecommerce, overseas, or product-validation need.",
      "Confirm that the company can pay in CNY through a domestic payment method.",
      "Only after C144.3.2 verification passes should a public business contact channel be identified.",
      "Do not treat discovery evidence as proof of customer interest.",
    ].join(" "),

    businessName:
      companyName,

    businessIdentityEvidence:
      identityEvidence.length > 0
        ? identityEvidence
        : [
            `The organization name "${companyName}" was extracted from public business evidence.`,
          ],

    commercialSignals:
      signals,

    contactChannel:
      null,

    validationReasons,

    paymentCapability:
      "likely-domestic-rmb",

    paymentCurrency:
      "CNY",

    customerType,

    aiosFitScore,
  };
}

function collectCandidateSeeds(
  sources: DiscoverySource[],
): CandidateSeed[] {
  const seeds: CandidateSeed[] = [];

  for (
    const source of
      sources
  ) {
    const title =
      normalizeText(
        source.evidence.title,
        300,
      );

    const hostname =
      normalizeText(
        source.evidence.hostname,
        180,
      );

    if (
      !title ||
      isExcludedSource(
        title,
        hostname,
      )
    ) {
      continue;
    }

    const identity =
      extractBusinessIdentity(
        source.evidence,
      );

    if (
      !identity.name ||
      identity.confidence < 0.70
    ) {
      continue;
    }

    const signals =
      extractCommercialSignals([
        source.evidence,
      ]);

    if (
      signals.length < 2
    ) {
      continue;
    }

    seeds.push({
      name:
        identity.name,

      source,

      identity,
    });
  }

  const grouped =
    new Map<
      string,
      CandidateSeed
    >();

  for (
    const seed of
      seeds
  ) {
    const key =
      seed.name
        .toLowerCase()
        .replace(
          /[^a-z0-9\u4e00-\u9fff]/g,
          "",
        );

    if (
      !key
    ) {
      continue;
    }

    const existing =
      grouped.get(key);

    if (
      !existing ||
      seed.identity.confidence >
        existing.identity.confidence
    ) {
      grouped.set(
        key,
        seed,
      );
    }
  }

  return Array.from(
    grouped.values(),
  );
}

async function discoverSources(): Promise<
  DiscoverySource[]
> {
  const all: DiscoverySource[] = [];

  for (
    const prompt of
      DISCOVERY_PROMPTS
  ) {
    try {
      const result =
        await retrieveWebEvidence(
          prompt[1],
        );

      if (
        !result.success ||
        !result.evidence
      ) {
        continue;
      }

      for (
        const evidence of
          result.evidence
      ) {
        if (
          isExcludedSource(
            normalizeText(
              evidence.title,
              300,
            ),
            normalizeText(
              evidence.hostname,
              180,
            ),
          )
        ) {
          continue;
        }

        all.push({
          evidence,

          searchIntent:
            prompt[0],
        });
      }
    } catch {
      continue;
    }
  }

  return all;
}

function mergeSources(
  left: DiscoverySource[],
  right: DiscoverySource[],
): DiscoverySource[] {
  const merged = [
    ...left,
    ...right,
  ];

  return merged.filter(
    (source, index) =>
      merged.findIndex(
        (other) =>
          normalizeHost(
            other.evidence.hostname,
          ) ===
            normalizeHost(
              source.evidence.hostname,
            ) &&
          other.evidence.url ===
            source.evidence.url,
      ) === index,
  );
}

function finalizeCandidates(
  candidates: C144ProspectCandidate[],
): C144ProspectCandidate[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.businessName !==
          null &&
        candidate.commercialSignals
          .length >= 2 &&
        candidate.aiosFitScore >=
          0.55,
    )
    .sort(
      (a, b) =>
        b.aiosFitScore -
          a.aiosFitScore ||
        b.evidenceScore -
          a.evidenceScore,
    )
    .slice(0, 8)
    .map(
      (candidate, index) => ({
        ...candidate,

        id:
          `C144-PROSPECT-${index + 1}`,

        rank:
          index + 1,
      }),
    );
}

export async function discoverC144Prospects(
  opportunity: LiveCommercialOpportunityResult,
): Promise<C144ProspectDiscoveryResult> {
  const project =
    opportunity.objective;

  if (!project) {
    return {
      success: false,

      status:
        "blocked",

      project:
        null,

      candidates:
        [],

      sourceCount:
        0,

      independentHosts:
        0,

      conclusion:
        "The C144 commercial objective is unavailable.",

      nextStep:
        "Initialize the first cashflow project before discovering prospects.",

      integrity: {
        fabricatedLead:
          false,

        fabricatedContact:
          false,

        fabricatedResponse:
          false,

        fabricatedCustomer:
          false,
      },

      timestamp:
        Date.now(),
    };
  }

  const sources =
    await discoverSources();

  const discoveryHosts =
    new Set(
      sources.map(
        (source) =>
          normalizeHost(
            source.evidence.hostname,
          ),
      ),
    );

  if (
    sources.length < 2 ||
    discoveryHosts.size < 2
  ) {
    return {
      success:
        false,

      status:
        "insufficient-evidence",

      project,

      candidates:
        [],

      sourceCount:
        sources.length,

      independentHosts:
        discoveryHosts.size,

      conclusion:
        "Targeted mainland-China prospect discovery did not return enough verified external evidence.",

      nextStep:
        "Run another verified prospect discovery cycle with fresh external sources.",

      integrity: {
        fabricatedLead:
          false,

        fabricatedContact:
          false,

        fabricatedResponse:
          false,

        fabricatedCustomer:
          false,
      },

      timestamp:
        Date.now(),
    };
  }

  const seeds =
    collectCandidateSeeds(
      sources,
    );

  const candidateList:
    C144ProspectCandidate[] =
    [];

  for (
    const seed of
      seeds.slice(0, 12)
  ) {
    let corroboration:
      DiscoverySource[] =
      [];

    try {
      corroboration =
        await corroborateBusiness(
          seed.name,
        );
    } catch {
      corroboration =
        [];
    }

    const merged =
      mergeSources(
        [seed.source],
        corroboration,
      );

    const candidate =
      buildCandidate(
        seed.name,
        merged,
        project,
      );

    const independentHosts =
      new Set(
        merged.map(
          (source) =>
            normalizeHost(
              source.evidence.hostname,
            ),
        ),
      ).size;

    if (
      independentHosts >= 2 &&
      merged.length >= 2
    ) {
      candidateList.push(
        candidate,
      );
    }
  }

  const candidates =
    finalizeCandidates(
      candidateList,
    );

  const candidateHosts =
    new Set(
      candidateList
        .map(
          (candidate) =>
            normalizeHost(
              candidate.hostname,
            ),
        )
        .filter(Boolean),
    );

  if (
    candidates.length < 1
  ) {
    return {
      success:
        false,

      status:
        "insufficient-evidence",

      project,

      candidates:
        [],

      sourceCount:
        sources.length,

      independentHosts:
        Math.max(
          discoveryHosts.size,
          candidateHosts.size,
        ),

      conclusion:
        "C144.3.3 found current commercial evidence but could not yet produce a sufficiently corroborated named mainland-China enterprise candidate.",

      nextStep:
        "Do not perform outreach. Improve or rerun targeted enterprise discovery. C144.3.2 remains the final verification gate.",

      integrity: {
        fabricatedLead:
          false,

        fabricatedContact:
          false,

        fabricatedResponse:
          false,

        fabricatedCustomer:
          false,
      },

      timestamp:
        Date.now(),
    };
  }

  return {
    success:
      true,

    status:
      "ready",

    project,

    candidates,

    sourceCount:
      sources.length,

    independentHosts:
      Math.max(
        discoveryHosts.size,
        candidateHosts.size,
      ),

    conclusion:
      `C144.3.3 identified ${candidates.length} named mainland-China enterprise prospect candidate(s) for C144.3.2 verification.`,

    nextStep:
      "Pass the named candidates through C144.3.2. Only candidates that pass business identity, mainland-China business, commercial signal, Japan/cross-border signal, independent-source, and CNY qualification gates may proceed to outreach.",

    integrity: {
      fabricatedLead:
        false,

      fabricatedContact:
        false,

      fabricatedResponse:
        false,

      fabricatedCustomer:
        false,
    },

    timestamp:
      Date.now(),
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
    result.candidates.length < 1
  ) {
    return false;
  }

  return result.candidates.every(
    (candidate) =>
      candidate.businessName !==
        null &&
      candidate.commercialSignals
        .length >= 2 &&
      candidate.qualificationStatus ===
        "evidence-backed" &&
      candidate.contactChannel ===
        null &&
      candidate.paymentCurrency ===
        "CNY" &&
      candidate.paymentCapability ===
        "likely-domestic-rmb" &&
      candidate.aiosFitScore >=
        0.55,
  );
}
