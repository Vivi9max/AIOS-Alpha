import "server-only";

import {
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import type {
  C144ProspectCandidate,
} from "@/lib/commercial/c144-prospect-discovery";

export const C144_PROSPECT_VERIFICATION_ID =
  "C144-PROSPECT-VERIFICATION";

export const C144_PROSPECT_VERIFICATION_VERSION =
  "C144.3.4";

export interface C144ProspectVerificationResult {
  success: boolean;

  status:
    | "verified"
    | "blocked"
    | "insufficient-evidence";

  candidateId: string;

  businessName: string | null;

  verifiedBusinessIdentity: boolean;
  verifiedChinaBusiness: boolean;
  verifiedCommercialSignal: boolean;
  verifiedJapanOrCrossBorderSignal: boolean;

  independentHosts: number;
  sourceCount: number;

  evidence: string[];
  sourceTitles: string[];

  validationReasons: string[];

  qualificationStatus:
    | "verified-prospect"
    | "needs-manual-validation"
    | "rejected";

  paymentCapability:
    | "likely-domestic-rmb"
    | "unknown";

  paymentCurrency:
    | "CNY"
    | "unknown";

  aiosFitScore: number;

  conclusion: string;
  nextStep: string;

  integrity: {
    fabricatedBusiness: false;
    fabricatedLead: false;
    fabricatedContact: false;
    fabricatedCustomer: false;
    fabricatedRevenue: false;
  };

  timestamp: number;
}

interface VerificationEvidence {
  title: string;
  url: string;
  hostname: string;
  snippets: string[];
  score: number;
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
  "search.",
];

const EXCLUDED_TITLE_TERMS = [
  "government",
  "ministry",
  "department",
  "university",
  "conference",
  "expo",
  "event",
  "webinar",
  "report",
  "market size",
  "market outlook",
  "guide",
  "政府",
  "部门",
  "大学",
  "展会",
  "展览",
  "会议",
  "活动",
  "报告",
  "市场规模",
  "市场报告",
];

const GENERIC_IDENTITY_TERMS = [
  "online marketplaces",
  "online marketplace",
  "marketplaces in",
  "marketplace in",
  "ecommerce marketplaces",
  "marketplace",
  "marketplaces",
  "online shopping",
  "online store",
  "market size",
  "market outlook",
  "market report",
  "market analysis",
  "best online",
  "top online",
  "how to",
  "what is",
  "guide to",
  "international marketplaces",
  "global marketplaces",
  "中国电商平台",
  "日本电商平台",
  "跨境电商平台",
  "市场规模",
  "市场报告",
];

const BUSINESS_IDENTITY_TERMS = [
  "company",
  "corporation",
  "inc.",
  "inc",
  "ltd.",
  "ltd",
  "llc",
  "corp.",
  "corp",
  "co.",
  "group",
  "holdings",
  "有限公司",
  "股份有限公司",
  "集团",
  "集团公司",
  "企业",
  "品牌",
  "公司",
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

const COMMERCIAL_ACTIVITY_TERMS = [
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

function normalizeHost(
  hostname: string,
): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
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

function itemText(
  item: VerificationEvidence,
): string {
  return [
    item.title,
    ...item.snippets,
  ]
    .join(" ")
    .toLowerCase();
}

function evidenceText(
  evidence: VerificationEvidence[],
): string {
  return evidence
    .map(itemText)
    .join(" ");
}

function hasAnyTerm(
  text: string,
  terms: string[],
): boolean {
  return terms.some((term) =>
    text.includes(
      term.toLowerCase(),
    ),
  );
}

function isExcludedHost(
  hostname: string,
): boolean {
  const host =
    normalizeHost(hostname);

  return EXCLUDED_HOSTS.some(
    (pattern) =>
      host.includes(pattern),
  );
}

function isExcludedTitle(
  title: string,
): boolean {
  const lower =
    title.toLowerCase();

  return EXCLUDED_TITLE_TERMS.some(
    (term) =>
      lower.includes(
        term.toLowerCase(),
      ),
  );
}

function isExcludedSource(
  item: VerificationEvidence,
): boolean {
  return (
    isExcludedHost(item.hostname) ||
    isExcludedTitle(item.title)
  );
}

function cleanEvidence(
  evidence: VerificationEvidence[],
): VerificationEvidence[] {
  return evidence.filter(
    (item) =>
      Boolean(item.url) &&
      Boolean(item.hostname) &&
      Boolean(item.title) &&
      !isExcludedSource(item),
  );
}

function uniqueHosts(
  evidence: VerificationEvidence[],
): string[] {
  return Array.from(
    new Set(
      evidence.map((item) =>
        normalizeHost(
          item.hostname,
        ),
      ),
    ),
  );
}

function isGenericIdentity(
  value: string,
): boolean {
  const lower =
    normalizeText(
      value,
      120,
    ).toLowerCase();

  if (!lower) {
    return true;
  }

  return GENERIC_IDENTITY_TERMS.some(
    (term) =>
      lower === term ||
      lower.includes(term),
  );
}

function hasLegalBusinessSuffix(
  value: string,
): boolean {
  const lower =
    value.toLowerCase();

  return [
    "inc.",
    "inc",
    "ltd.",
    "ltd",
    "llc",
    "corp.",
    "corp",
    "co.",
    "corporation",
    "company",
    "group",
    "holdings",
    "有限公司",
    "股份有限公司",
    "集团",
    "集团公司",
    "有限责任公司",
  ].some((suffix) =>
    lower.includes(suffix),
  );
}

function looksLikeConcreteBusinessName(
  value: string,
): boolean {
  const name =
    normalizeText(
      value,
      120,
    );

  if (
    name.length < 2 ||
    name.length > 100
  ) {
    return false;
  }

  if (
    isGenericIdentity(name)
  ) {
    return false;
  }

  if (
    name.startsWith(
      "opportunity ",
    ) ||
    name.startsWith(
      "why ",
    ) ||
    name.startsWith(
      "how ",
    ) ||
    name.startsWith(
      "what ",
    )
  ) {
    return false;
  }

  if (
    EXCLUDED_TITLE_TERMS.some(
      (term) =>
        name
          .toLowerCase()
          .includes(
            term.toLowerCase(),
          ),
    )
  ) {
    return false;
  }

  return true;
}

function buildBusinessIdentityQueries(
  candidate: C144ProspectCandidate,
): string[] {
  const seed =
    normalizeText(
      candidate.businessName,
      120,
    );

  if (!seed) {
    return [];
  }

  return [
    `"${seed}" company China`,
    `"${seed}" China company official`,
    `"${seed}" 中国 公司`,
    `"${seed}" 中国 企业`,
    `"${seed}" Shenzhen Guangzhou Dongguan`,
    `"${seed}" Japan cross-border ecommerce`,
    `"${seed}" 日本市场 跨境电商`,
  ];
}

async function collectVerificationEvidence(
  candidate: C144ProspectCandidate,
): Promise<VerificationEvidence[]> {
  const queries =
    buildBusinessIdentityQueries(
      candidate,
    );

  const collected:
    VerificationEvidence[] = [];

  for (
    const query of queries
  ) {
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

      for (
        const item of
          result.evidence
      ) {
        collected.push({
          title:
            normalizeText(
              item.title,
              300,
            ),
          url:
            normalizeText(
              item.url,
              500,
            ),
          hostname:
            normalizeText(
              item.hostname,
              200,
            ),
          snippets:
            uniqueStrings(
              item.snippets || [],
            ).slice(0, 5),
          score:
            typeof item.confidence ===
            "number"
              ? item.confidence
              : 0,
        });
      }
    } catch {
      continue;
    }
  }

  const deduped =
    new Map<
      string,
      VerificationEvidence
    >();

  for (
    const item of
      cleanEvidence(
        collected,
      )
  ) {
    const key =
      `${normalizeHost(item.hostname)}|${item.url}`;

    const existing =
      deduped.get(key);

    if (
      !existing ||
      item.score > existing.score
    ) {
      deduped.set(
        key,
        item,
      );
    }
  }

  return Array.from(
    deduped.values(),
  ).sort(
    (a, b) =>
      b.score - a.score,
  );
}

function resolveBusinessIdentity(
  candidate: C144ProspectCandidate,
  evidence: VerificationEvidence[],
): {
  name: string | null;
  verified: boolean;
  confidence: number;
  evidence: string[];
} {
  const candidateName =
    normalizeText(
      candidate.businessName,
      120,
    );

  /*
   * HARD RULE:
   * candidate.name must NEVER be promoted
   * into business identity.
   *
   * Discovery names can be article titles,
   * market segments, or opportunity labels.
   */
  if (
    !candidateName ||
    !looksLikeConcreteBusinessName(
      candidateName,
    )
  ) {
    return {
      name: null,
      verified: false,
      confidence: 0,
      evidence: [],
    };
  }

  const lowerName =
    candidateName.toLowerCase();

  const matchingSources =
    evidence.filter(
      (item) =>
        itemText(item).includes(
          lowerName,
        ),
    );

  const concreteIdentitySources =
    matchingSources.filter(
      (item) => {
        const text =
          itemText(item);

        return (
          hasAnyTerm(
            text,
            BUSINESS_IDENTITY_TERMS,
          ) ||
          hasLegalBusinessSuffix(
            text,
          )
        );
      },
    );

  /*
   * Identity must be independently
   * corroborated.
   *
   * One article mentioning the name
   * is insufficient.
   */
  const identityHosts =
    new Set(
      concreteIdentitySources.map(
        (item) =>
          normalizeHost(
            item.hostname,
          ),
      ),
    );

  const verified =
    concreteIdentitySources.length >= 2 &&
    identityHosts.size >= 2;

  const confidence =
    verified
      ? Math.min(
          1,
          0.65 +
            Math.min(
              0.35,
              identityHosts.size *
                0.05,
            ),
        )
      : 0;

  return {
    name:
      verified
        ? candidateName
        : null,
    verified,
    confidence,
    evidence:
      uniqueStrings(
        concreteIdentitySources
          .slice(0, 5)
          .map(
            (item) =>
              `${item.title} - ${item.hostname}`,
          ),
      ),
  };
}

function verifyChinaBusiness(
  businessName: string | null,
  evidence: VerificationEvidence[],
): {
  verified: boolean;
  evidence: string[];
} {
  if (!businessName) {
    return {
      verified: false,
      evidence: [],
    };
  }

  const lowerName =
    businessName.toLowerCase();

  /*
   * China evidence must be tied to the
   * actual named business.
   *
   * Generic articles mentioning China
   * do not qualify.
   */
  const matchingChinaEvidence =
    evidence.filter(
      (item) => {
        const text =
          itemText(item);

        return (
          text.includes(
            lowerName,
          ) &&
          hasAnyTerm(
            text,
            CHINA_TERMS,
          )
        );
      },
    );

  const chinaHosts =
    new Set(
      matchingChinaEvidence.map(
        (item) =>
          normalizeHost(
            item.hostname,
          ),
      ),
    );

  const verified =
    matchingChinaEvidence.length >= 2 &&
    chinaHosts.size >= 2;

  return {
    verified,
    evidence:
      uniqueStrings(
        matchingChinaEvidence
          .slice(0, 5)
          .map(
            (item) =>
              `${item.title} - ${item.hostname}`,
          ),
      ),
  };
}

function verifyCommercialSignal(
  businessName: string | null,
  evidence: VerificationEvidence[],
): {
  verified: boolean;
  signals: string[];
  evidence: string[];
} {
  if (!businessName) {
    return {
      verified: false,
      signals: [],
      evidence: [],
    };
  }

  const lowerName =
    businessName.toLowerCase();

  const matching =
    evidence.filter(
      (item) =>
        itemText(item).includes(
          lowerName,
        ),
    );

  const signals =
    uniqueStrings(
      COMMERCIAL_ACTIVITY_TERMS.filter(
        (term) =>
          matching.some(
            (item) =>
              itemText(item).includes(
                term.toLowerCase(),
              ),
          ),
      ),
    );

  const commercialEvidence =
    matching.filter(
      (item) =>
        hasAnyTerm(
          itemText(item),
          COMMERCIAL_ACTIVITY_TERMS,
        ),
    );

  const commercialHosts =
    new Set(
      commercialEvidence.map(
        (item) =>
          normalizeHost(
            item.hostname,
          ),
      ),
    );

  const verified =
    signals.length >= 2 &&
    commercialEvidence.length >= 2 &&
    commercialHosts.size >= 2;

  return {
    verified,
    signals,
    evidence:
      uniqueStrings(
        commercialEvidence
          .slice(0, 5)
          .map(
            (item) =>
              `${item.title} - ${item.hostname}`,
          ),
      ),
  };
}

function verifyJapanOrCrossBorderSignal(
  businessName: string | null,
  evidence: VerificationEvidence[],
): {
  verified: boolean;
  signals: string[];
  evidence: string[];
} {
  if (!businessName) {
    return {
      verified: false,
      signals: [],
      evidence: [],
    };
  }

  const lowerName =
    businessName.toLowerCase();

  const matching =
    evidence.filter(
      (item) =>
        itemText(item).includes(
          lowerName,
        ),
    );

  const japanEvidence =
    matching.filter(
      (item) =>
        hasAnyTerm(
          itemText(item),
          JAPAN_TERMS,
        ),
    );

  const crossBorderEvidence =
    matching.filter(
      (item) =>
        hasAnyTerm(
          itemText(item),
          CROSS_BORDER_TERMS,
        ),
    );

  const japanHosts =
    new Set(
      japanEvidence.map(
        (item) =>
          normalizeHost(
            item.hostname,
          ),
      ),
    );

  const crossBorderHosts =
    new Set(
      crossBorderEvidence.map(
        (item) =>
          normalizeHost(
            item.hostname,
          ),
      ),
    );

  /*
   * Japan and cross-border evidence may
   * come from different sources.
   *
   * This is intentionally NOT required
   * to occur inside one single article.
   */
  const verifiedJapan =
    japanEvidence.length >= 2 &&
    japanHosts.size >= 2;

  const verifiedCrossBorder =
    crossBorderEvidence.length >= 2 &&
    crossBorderHosts.size >= 2;

  const verified =
    verifiedJapan ||
    verifiedCrossBorder;

  const signals =
    uniqueStrings([
      ...(verifiedJapan
        ? ["Japan market activity"]
        : []),
      ...(verifiedCrossBorder
        ? ["cross-border commerce"]
        : []),
    ]);

  const relevantEvidence =
    uniqueStrings([
      ...japanEvidence
        .slice(0, 3)
        .map(
          (item) =>
            `${item.title} - ${item.hostname}`,
        ),
      ...crossBorderEvidence
        .slice(0, 3)
        .map(
          (item) =>
            `${item.title} - ${item.hostname}`,
        ),
    ]);

  return {
    verified,
    signals,
    evidence:
      relevantEvidence,
  };
}

function calculateAiosFitScore(
  verifiedBusinessIdentity: boolean,
  verifiedChinaBusiness: boolean,
  verifiedCommercialSignal: boolean,
  verifiedJapanOrCrossBorderSignal: boolean,
  sourceCount: number,
  independentHosts: number,
): number {
  if (
    !verifiedBusinessIdentity ||
    !verifiedChinaBusiness ||
    !verifiedCommercialSignal ||
    !verifiedJapanOrCrossBorderSignal
  ) {
    return 0;
  }

  let score = 0.7;

  if (sourceCount >= 4) {
    score += 0.1;
  }

  if (independentHosts >= 4) {
    score += 0.1;
  }

  if (independentHosts >= 6) {
    score += 0.1;
  }

  return Math.min(
    1,
    Number(score.toFixed(2)),
  );
}

export async function verifyC144Prospect(
  candidate: C144ProspectCandidate,
): Promise<C144ProspectVerificationResult> {
  const timestamp =
    Date.now();

  const emptyIntegrity = {
    fabricatedBusiness: false as const,
    fabricatedLead: false as const,
    fabricatedContact: false as const,
    fabricatedCustomer: false as const,
    fabricatedRevenue: false as const,
  };

  if (
    !candidate.businessName ||
    !looksLikeConcreteBusinessName(
      candidate.businessName,
    )
  ) {
    return {
      success: false,
      status: "rejected",
      candidateId: candidate.id,
      businessName: null,
      verifiedBusinessIdentity: false,
      verifiedChinaBusiness: false,
      verifiedCommercialSignal: false,
      verifiedJapanOrCrossBorderSignal: false,
      independentHosts: 0,
      sourceCount: 0,
      evidence: [],
      sourceTitles: [],
      validationReasons: [
        "No concrete business identity was supplied by discovery.",
        "Candidate name is not allowed to substitute for business identity.",
      ],
      qualificationStatus:
        "rejected",
      paymentCapability:
        "unknown",
      paymentCurrency:
        "unknown",
      aiosFitScore: 0,
      conclusion:
        "The candidate does not contain a sufficiently concrete enterprise identity for verification.",
      nextStep:
        "Return to discovery and identify a real named mainland-China business before verification.",
      integrity:
        emptyIntegrity,
      timestamp,
    };
  }

  const evidence =
    await collectVerificationEvidence(
      candidate,
    );

  const identity =
    resolveBusinessIdentity(
      candidate,
      evidence,
    );

  const china =
    verifyChinaBusiness(
      identity.name,
      evidence,
    );

  const commercial =
    verifyCommercialSignal(
      identity.name,
      evidence,
    );

  const japanOrCrossBorder =
    verifyJapanOrCrossBorderSignal(
      identity.name,
      evidence,
    );

  const independentHosts =
    uniqueHosts(evidence).length;

  const sourceCount =
    evidence.length;

  const fitScore =
    calculateAiosFitScore(
      identity.verified,
      china.verified,
      commercial.verified,
      japanOrCrossBorder.verified,
      sourceCount,
      independentHosts,
    );

  const allGates =
    identity.verified &&
    china.verified &&
    commercial.verified &&
    japanOrCrossBorder.verified &&
    sourceCount >= 2 &&
    independentHosts >= 2 &&
    fitScore >= 0.7;

  const validationReasons =
    uniqueStrings([
      identity.verified
        ? "Business identity was corroborated across at least 2 independent hosts."
        : "Business identity could not be independently corroborated.",
      china.verified
        ? "Mainland-China relevance was tied to the named business across independent sources."
        : "Mainland-China business status was not sufficiently tied to the named business.",
      commercial.verified
        ? `Concrete commercial activity was detected with ${commercial.signals.length} signal(s).`
        : "Concrete commercial activity was not sufficiently verified.",
      japanOrCrossBorder.verified
        ? "Japan or cross-border relevance was independently corroborated."
        : "Japan or cross-border relevance was not sufficiently verified.",
      sourceCount >= 2
        ? `The candidate has ${sourceCount} usable source(s).`
        : "Fewer than 2 usable sources were available.",
      independentHosts >= 2
        ? `The candidate has ${independentHosts} independent host(s).`
        : "Fewer than 2 independent hosts were available.",
      "No contact, customer, payment, or revenue claim is created by verification.",
    ]);

  return {
    success: allGates,
    status:
      allGates
        ? "verified"
        : "insufficient-evidence",

    candidateId:
      candidate.id,

    businessName:
      identity.name,

    verifiedBusinessIdentity:
      identity.verified,

    verifiedChinaBusiness:
      china.verified,

    verifiedCommercialSignal:
      commercial.verified,

    verifiedJapanOrCrossBorderSignal:
      japanOrCrossBorder.verified,

    independentHosts,

    sourceCount,

    evidence:
      uniqueStrings([
        ...identity.evidence,
        ...china.evidence,
        ...commercial.evidence,
        ...japanOrCrossBorder.evidence,
      ]).slice(0, 20),

    sourceTitles:
      uniqueStrings(
        evidence
          .slice(0, 20)
          .map(
            (item) =>
              item.title,
          ),
      ),

    validationReasons,

    qualificationStatus:
      allGates
        ? "verified-prospect"
        : "needs-manual-validation",

    paymentCapability:
      allGates &&
      candidate.paymentCapability ===
        "likely-domestic-rmb"
        ? "likely-domestic-rmb"
        : "unknown",

    paymentCurrency:
      allGates &&
      candidate.paymentCurrency ===
        "CNY"
        ? "CNY"
        : "unknown",

    aiosFitScore:
      fitScore,

    conclusion:
      allGates
        ? "The enterprise identity, mainland-China relevance, commercial activity, and Japan or cross-border relevance have passed the C144.3.4 verification gates."
        : "The candidate did not pass the C144.3.4 enterprise verification gates.",

    nextStep:
      allGates
        ? "Manually confirm the current business need, decision-maker/contact channel, and CNY payment capability before outreach."
        : "Do not contact this candidate. Return to discovery and identify a concrete mainland-China business with independently corroborated evidence.",

    integrity:
      emptyIntegrity,

    timestamp,
  };
}

export async function verifyC144Prospects(
  candidates: C144ProspectCandidate[],
): Promise<C144ProspectVerificationResult[]> {
  const results:
    C144ProspectVerificationResult[] =
    [];

  for (
    const candidate of candidates
  ) {
    try {
      const result =
        await verifyC144Prospect(
          candidate,
        );

      results.push(
        result,
      );
    } catch {
      results.push({
        success: false,
        status:
          "insufficient-evidence",
        candidateId:
          candidate.id,
        businessName:
          null,
        verifiedBusinessIdentity:
          false,
        verifiedChinaBusiness:
          false,
        verifiedCommercialSignal:
          false,
        verifiedJapanOrCrossBorderSignal:
          false,
        independentHosts: 0,
        sourceCount: 0,
        evidence: [],
        sourceTitles: [],
        validationReasons: [
          "Verification failed safely without promoting the candidate to a verified prospect.",
        ],
        qualificationStatus:
          "needs-manual-validation",
        paymentCapability:
          "unknown",
        paymentCurrency:
          "unknown",
        aiosFitScore: 0,
        conclusion:
          "Verification failed safely.",
        nextStep:
          "Do not contact the candidate. Rerun discovery and verification.",
        integrity: {
          fabricatedBusiness: false,
          fabricatedLead: false,
          fabricatedContact: false,
          fabricatedCustomer: false,
          fabricatedRevenue: false,
        },
        timestamp:
          Date.now(),
      });
    }
  }

  return results;
}

export function isC144ProspectVerificationReady(
  result: C144ProspectVerificationResult,
): boolean {
  return (
    result.success &&
    result.status ===
      "verified" &&
    result.qualificationStatus ===
      "verified-prospect" &&
    result.verifiedBusinessIdentity &&
    result.verifiedChinaBusiness &&
    result.verifiedCommercialSignal &&
    result.verifiedJapanOrCrossBorderSignal &&
    result.sourceCount >= 2 &&
    result.independentHosts >= 2 &&
    result.aiosFitScore >= 0.7 &&
    result.integrity.fabricatedBusiness ===
      false &&
    result.integrity.fabricatedLead ===
      false &&
    result.integrity.fabricatedContact ===
      false &&
    result.integrity.fabricatedCustomer ===
      false &&
    result.integrity.fabricatedRevenue ===
      false
  );
}
