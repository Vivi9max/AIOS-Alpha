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
  "C144.3.1";

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
  "展会",
  "展览",
  "会议",
  "活动",
  "指南",
  "报告",
  "市场规模",
];

const DISCOVERY_PROMPTS = [
  [
    "中国内地跨境电商企业 日本市场 扩张 出海 品牌 最新 2026",
    "Find real mainland China companies, brands, manufacturers, exporters, or cross-border ecommerce sellers with current Japan or overseas expansion activity. Prefer named commercial organizations and current business signals. Exclude media, government, events, universities, generic market reports, marketplaces, and consulting firms.",
  ],
  [
    "中国品牌 日本市场 电商 出海 招聘 渠道 合作 2026 企业",
    "Find real mainland China companies or brands that currently show commercial signals connected to Japan ecommerce, overseas sales, distribution, hiring, partnerships, marketplace activity, or market entry. Prioritize businesses that could realistically purchase commercial market intelligence or product validation services.",
  ],
  [
    "深圳 广州 东莞 杭州 义乌 中国企业 日本市场 跨境电商 2026",
    "Find real mainland Chinese businesses, especially SMEs or mid-market companies, showing current Japan-market, cross-border ecommerce, export, overseas distribution, or international expansion signals. Prefer businesses rather than large platforms, media organizations, governments, or consultants.",
  ],
  [
    "中国工厂 品牌 外贸企业 日本市场 拓展 经销商 电商 2026",
    "Find named China-based manufacturers, brands, exporters, or sellers with current commercial activity related to Japan or overseas markets. Look for concrete product launches, distribution, sales, hiring, partnerships, or expansion signals.",
  ],
  [
    "中国跨境卖家 日本 Amazon Rakuten TikTok Shop 品牌 出海 2026 企业",
    "Find real China-based cross-border ecommerce sellers or brands with current activity involving Japan, Amazon Japan, Rakuten, TikTok Shop, Japanese consumers, overseas ecommerce, or international expansion. Exclude marketplaces themselves and generic articles.",
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

  const excluded = [
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
    "政府",
    "政府部门",
    "大学",
    "研究院",
    "协会",
    "展会",
    "会议",
  ];

  return excluded.some(
    (item) =>
      lower === item ||
      lower.includes(item),
  );
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
    ).slice(0, 5);

  const text = [
    title,
    ...snippets,
  ].join(" ");

  const englishPatterns = [
    /^([A-Z][A-Za-z0-9&.'’ -]{2,80}?)\s+(?:launches|launched|expands|expanded|expanding|enters|entered|entering|opens|opened|opening|partners|partnered|partnership|announces|announced|plans|planned|targets|targeting|seeks|seeking|grows|growing|sales|revenue|hiring|recruits|sets up)\b/i,

    /^([A-Z][A-Za-z0-9&.'’ -]{2,80}?)\s+(?:Japan|Japanese market|China|Chinese market|cross-border|overseas)\b/i,
  ];

  for (
    const pattern of
      englishPatterns
  ) {
    const match =
      title.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const name =
      normalizeText(
        match[1],
        120,
      );

    if (
      name.length >= 2 &&
      !isExcludedIdentity(name)
    ) {
      return {
        name,
        confidence: 0.78,
        evidence: [
          `The organization name "${name}" appears directly in the source title.`,
        ],
      };
    }
  }

  const chinesePattern =
    /^(.{2,40}?)(?:进军|进入|拓展|扩张|布局|登陆|落地|发布|宣布|签约|合作|招聘|招募|出海|跨境|出口|海外|日本市场)/;

  const chineseMatch =
    title.match(
      chinesePattern,
    );

  if (
    chineseMatch?.[1]
  ) {
    const name =
      normalizeText(
        chineseMatch[1],
        100,
      );

    if (
      name.length >= 2 &&
      !isExcludedIdentity(name)
    ) {
      return {
        name,
        confidence: 0.74,
        evidence: [
          `The organization name "${name}" appears before a commercial activity verb in the source title.`,
        ],
      };
    }
  }

  const companyPattern =
    /([A-Z][A-Za-z0-9&.'’ -]{2,80}(?:Inc\.?|Ltd\.?|LLC|Corp\.?|Corporation|Co\.?|Company|Group|Holdings|GmbH))/;

  const companyMatch =
    text.match(
      companyPattern,
    );

  if (
    companyMatch?.[1]
  ) {
    const name =
      normalizeText(
        companyMatch[1],
        120,
      );

    if (
      name.length >= 2 &&
      !isExcludedIdentity(name)
    ) {
      return {
        name,
        confidence: 0.68,
        evidence: [
          `A business-like organization name "${name}" appears in the retrieved evidence.`,
        ],
      };
    }
  }

  const chineseCompanyPattern =
    /([\u4e00-\u9fffA-Za-z0-9·]{2,40}(?:有限公司|股份有限公司|集团|集团公司|株式会社|有限会社))/;

  const chineseCompanyMatch =
    text.match(
      chineseCompanyPattern,
    );

  if (
    chineseCompanyMatch?.[1]
  ) {
    const name =
      normalizeText(
        chineseCompanyMatch[1],
        120,
      );

    if (
      name.length >= 2 &&
      !isExcludedIdentity(name)
    ) {
      return {
        name,
        confidence: 0.76,
        evidence: [
          `A business-like organization name "${name}" appears in the retrieved evidence.`,
        ],
      };
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
        "日本市场",
        "日本",
      ],
    },
    {
      label: "cross-border commerce",
      terms: [
        "cross-border",
        "cross border",
        "跨境",
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
        "market entry",
        "market-entry",
        "进入",
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
    text.includes("cross-border ecommerce seller") ||
    text.includes("跨境卖家")
  ) {
    return "cross-border-seller";
  }

  if (
    text.includes("brand") ||
    text.includes("品牌")
  ) {
    return "brand";
  }

  if (
    text.includes("manufacturer") ||
    text.includes("factory") ||
    text.includes("manufacturer") ||
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
      0.3,
      signals.length * 0.05,
    );

  if (
    customerType ===
    "cross-border-seller"
  ) {
    score += 0.25;
  }

  if (
    customerType === "brand" ||
    customerType === "manufacturer" ||
    customerType === "exporter"
  ) {
    score += 0.2;
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
    !result.verified ||
    result.evidence.length < 2
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

  const verifiedBusiness =
    sourceCount >= 2 &&
    independentHostCount >= 2 &&
    signals.length >= 2;

  const evidenceScore =
    Number(
      Math.min(
        0.99,
        0.45 +
          Math.min(
            0.2,
            sourceCount * 0.05,
          ) +
          Math.min(
            0.2,
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
    "The organization is identified from public source evidence and is not inferred from the source hostname alone.",
    `The candidate has ${sourceCount} supporting source(s) across ${independentHostCount} independent host(s).`,
    `Detected commercial signals: ${signals.length}.`,
    "Payment capability is classified as likely domestic RMB because the target customer is a mainland-China business; actual payment ability must still be confirmed manually.",
    "No contact, response, customer relationship, or payment is claimed by this discovery engine.",
  ];

  if (
    !verifiedBusiness
  ) {
    validationReasons.push(
      "The candidate does not yet meet the evidence threshold for an evidence-backed prospect and requires manual validation.",
    );
  }

  return {
    id: "",
    rank: 0,

    name:
      companyName,

    type:
      verifiedBusiness
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
      `${companyName} is a real business candidate identified from current public evidence.`,
      `Commercial signals: ${signals.join(", ") || "not sufficiently established"}.`,
      `AIOS fit score: ${aiosFitScore}.`,
      `The current C144 objective targets ${objective.revenueTarget} ${objective.currency} revenue and ${objective.customerTarget} paying customer.`,
      "The evidence supports prioritization but does not prove willingness to purchase.",
    ].join(" "),

    qualificationStatus:
      verifiedBusiness
        ? "evidence-backed"
        : "needs-manual-validation",

    recommendedAction: [
      `Manually open the original sources and confirm that ${companyName} is the business described.`,
      "Confirm that the company is actually based in mainland China.",
      "Confirm the current cross-border, Japan, export, ecommerce, brand, or product-validation need.",
      "Confirm that the company can pay in CNY through a domestic payment method.",
      "Only after all checks pass, identify a public business contact channel.",
      "Only after a real outreach action occurs should contact status be recorded.",
    ].join(" "),

    businessName:
      companyName,

    businessIdentityEvidence:
      identityEvidence.length > 0
        ? identityEvidence
        : [
            `Business identity was corroborated using the organization name "${companyName}".`,
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
      identity.confidence < 0.65
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

    if (!key) {
      continue;
    }

    if (
      !grouped.has(key)
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
    const result =
      await retrieveWebEvidence(
        prompt[1],
      );

    if (
      !result.success ||
      !result.verified
    ) {
      continue;
    }

    for (
      const evidence of
        result.evidence
    ) {
      all.push({
        evidence,

        searchIntent:
          prompt[0],
      });
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
    .slice(0, 5)
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
        .flatMap(
          (candidate) => [
            candidate.hostname,
          ],
        )
        .filter(Boolean)
        .map(
          (hostname) =>
            normalizeHost(
              hostname,
            ),
        ),
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
        "The engine found commercial signals but could not corroborate a sufficiently strong mainland-China business prospect.",

      nextStep:
        "Do not perform outreach. Run another targeted prospect discovery cycle with fresh external evidence.",

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
      `C144.3.1 identified ${candidates.length} evidence-backed mainland-China commercial prospect candidate(s).`,

    nextStep:
      "Manually validate candidate #1, including business identity, current commercial need, mainland-China status, and CNY payment capability before any outreach.",

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
