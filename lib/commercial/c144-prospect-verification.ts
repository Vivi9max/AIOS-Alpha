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
  "C144.3.2";
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
  "company",
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
  "china",
  "chinese",
  "mainland china",
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
  "中国",
  "中国大陆",
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
  "investment",
  "store",
  "stores",
  "marketplace",
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
  "合作",
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
function evidenceText(
  evidence: VerificationEvidence[],
): string {
  return evidence
    .flatMap((item) => [
      item.title,
      ...item.snippets,
    ])
    .join(" ")
    .toLowerCase();
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
function isExcludedSource(
  item: VerificationEvidence,
): boolean {
  const host =
    normalizeHost(
      item.hostname,
    );
  const title =
    item.title.toLowerCase();
  if (
    EXCLUDED_HOSTS.some(
      (pattern) =>
        host.includes(pattern),
    )
  ) {
    return true;
  }
  if (
    EXCLUDED_TITLE_TERMS.some(
      (term) =>
        title.includes(
          term.toLowerCase(),
        ),
    )
  ) {
    return true;
  }
  return false;
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
function buildVerificationQueries(
  businessName: string,
): string[] {
  const name =
    normalizeText(
      businessName,
      120,
    );
  return [
    `"${name}" China company Japan cross-border ecommerce`,
    `"${name}" China business Japan market expansion`,
    `"${name}" Chinese brand overseas Japan sales`,
    `"${name}" 日本市场 中国 企业 跨境电商`,
    `"${name}" 日本 出海 跨境 电商 合作`,
  ];
}
async function collectVerificationEvidence(
  businessName: string,
): Promise<VerificationEvidence[]> {
  const queries =
    buildVerificationQueries(
      businessName,
    );
  const collected: VerificationEvidence[] =
    [];
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
        const item of result.evidence
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
      cleanEvidence(collected)
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
  const fallbackName =
    normalizeText(
      candidate.name,
      160,
    );
  const businessName =
    candidateName ||
    fallbackName;
  if (!businessName) {
    return {
      name: null,
      verified: false,
      confidence: 0,
      evidence: [],
    };
  }
  const combined =
    evidenceText(evidence);
  const identitySignals =
    evidence.filter(
      (item) => {
        const text = [
          item.title,
          ...item.snippets,
        ]
          .join(" ")
          .toLowerCase();
        return (
          hasAnyTerm(
            text,
            BUSINESS_IDENTITY_TERMS,
          ) ||
          text.includes(
            businessName.toLowerCase(),
          )
        );
      },
    );
  const matchingSources =
    identitySignals.filter(
      (item) => {
        const text = [
          item.title,
          ...item.snippets,
        ]
          .join(" ")
          .toLowerCase();
        return text.includes(
          businessName.toLowerCase(),
        );
      },
    );
  const verified =
    matchingSources.length >= 2 ||
    (
      matchingSources.length >= 1 &&
      hasAnyTerm(
        combined,
        BUSINESS_IDENTITY_TERMS,
      )
    );
  const confidence =
    Math.min(
      1,
      (
        matchingSources.length *
          0.25
      ) +
        (
          identitySignals.length *
          0.1
        ),
    );
  return {
    name:
      businessName,
    verified,
    confidence,
    evidence:
      uniqueStrings([
        ...candidate.businessIdentityEvidence,
        ...matchingSources
          .slice(0, 3)
          .map(
            (item) =>
              `${item.title} - ${item.hostname}`,
          ),
      ]),
  };
}
function verifyChinaBusiness(
  candidate: C144ProspectCandidate,
  evidence: VerificationEvidence[],
): {
  verified: boolean;
  evidence: string[];
} {
  const combined =
    evidenceText(evidence);
  const chinaEvidence =
    evidence.filter(
      (item) =>
        hasAnyTerm(
          [
            item.title,
            ...item.snippets,
          ]
            .join(" ")
            .toLowerCase(),
          CHINA_TERMS,
        ),
    );
  const candidateSignals =
    candidate.customerType !==
      "unknown" ||
    candidate.paymentCapability ===
      "likely-domestic-rmb";
  const verified =
    chinaEvidence.length >= 1 ||
    (
      candidateSignals &&
      hasAnyTerm(
        combined,
        CHINA_TERMS,
      )
    );
  return {
    verified,
    evidence:
      chinaEvidence
        .slice(0, 4)
        .map(
          (item) =>
            `${item.title} - ${item.hostname}`,
        ),
  };
}
function verifyCommercialSignal(
  evidence: VerificationEvidence[],
): {
  verified: boolean;
  signals: string[];
  evidence: string[];
} {
  const combined =
    evidenceText(evidence);
  const signals =
    COMMERCIAL_ACTIVITY_TERMS.filter(
      (term) =>
        combined.includes(
          term.toLowerCase(),
        ),
    );
  const commercialEvidence =
    evidence.filter(
      (item) =>
        hasAnyTerm(
          [
            item.title,
            ...item.snippets,
          ]
            .join(" ")
            .toLowerCase(),
          COMMERCIAL_ACTIVITY_TERMS,
        ),
    );
  return {
    verified:
      signals.length >= 2 &&
      commercialEvidence.length >= 1,
    signals:
      uniqueStrings(
        signals,
      ),
    evidence:
      commercialEvidence
        .slice(0, 5)
        .map(
          (item) =>
            `${item.title} - ${item.hostname}`,
        ),
  };
}
function verifyJapanOrCrossBorderSignal(
  evidence: VerificationEvidence[],
): {
  verified: boolean;
  signals: string[];
  evidence: string[];
} {
  const combined =
    evidenceText(evidence);
  const japan =
    hasAnyTerm(
      combined,
      JAPAN_TERMS,
    );
  const crossBorder =
    hasAnyTerm(
      combined,
      CROSS_BORDER_TERMS,
    );
  const signalCount =
    Number(japan) +
    Number(crossBorder);
  const relevantEvidence =
    evidence.filter(
      (item) => {
        const text = [
          item.title,
          ...item.snippets,
        ]
          .join(" ")
          .toLowerCase();
        return (
          hasAnyTerm(
            text,
            JAPAN_TERMS,
          ) &&
          hasAnyTerm(
            text,
            CROSS_BORDER_TERMS,
          )
        );
      },
    );
  return {
    verified:
      signalCount >= 2 &&
      relevantEvidence.length >= 1,
    signals:
      [
        japan
          ? "Japan market"
          : "",
        crossBorder
          ? "cross-border commerce"
          : "",
      ].filter(Boolean),
    evidence:
      relevantEvidence
        .slice(0, 5)
        .map(
          (item) =>
            `${item.title} - ${item.hostname}`,
        ),
  };
}
function calculateFitScore(
  candidate: C144ProspectCandidate,
  evidence: VerificationEvidence[],
  verifiedBusiness: boolean,
  verifiedChina: boolean,
  verifiedCommercial: boolean,
  verifiedJapan: boolean,
): number {
  let score = 0;
  if (verifiedBusiness) {
    score += 0.25;
  }
  if (verifiedChina) {
    score += 0.15;
  }
  if (verifiedCommercial) {
    score += 0.2;
  }
  if (verifiedJapan) {
    score += 0.2;
  }
  if (
    candidate.paymentCapability ===
    "likely-domestic-rmb"
  ) {
    score += 0.1;
  }
  if (
    candidate.customerType !==
    "unknown"
  ) {
    score += 0.05;
  }
  if (
    candidate.aiosFitScore >=
    0.55
  ) {
    score += 0.05;
  }
  if (
    uniqueHosts(evidence)
      .length >= 3
  ) {
    score += 0.05;
  }
  return Math.min(
    1,
    Number(
      score.toFixed(3),
    ),
  );
}
function resolveQualification(
  verifiedBusiness: boolean,
  verifiedChina: boolean,
  verifiedCommercial: boolean,
  verifiedJapan: boolean,
  independentHosts: number,
  fitScore: number,
): C144ProspectVerificationResult[
  "qualificationStatus"
] {
  if (
    verifiedBusiness &&
    verifiedChina &&
    verifiedCommercial &&
    verifiedJapan &&
    independentHosts >= 2 &&
    fitScore >= 0.7
  ) {
    return "verified-prospect";
  }
  if (
    verifiedBusiness &&
    independentHosts >= 1
  ) {
    return "needs-manual-validation";
  }
  return "rejected";
}
export async function verifyC144Prospect(
  candidate: C144ProspectCandidate,
): Promise<C144ProspectVerificationResult> {
  const timestamp =
    Date.now();
  const candidateBusinessName =
    normalizeText(
      candidate.businessName,
      120,
    );
  if (
    !candidateBusinessName
  ) {
    return {
      success: false,
      status: "blocked",
      candidateId:
        candidate.id,
      businessName: null,
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
        "No sufficiently reliable business name is available.",
      ],
      qualificationStatus:
        "rejected",
      paymentCapability:
        "unknown",
      paymentCurrency:
        "unknown",
      aiosFitScore: 0,
      conclusion:
        "The candidate cannot be treated as a real enterprise prospect because business identity is unresolved.",
      nextStep:
        "Return to discovery and find a candidate with an identifiable business entity.",
      integrity: {
        fabricatedBusiness: false,
        fabricatedLead: false,
        fabricatedContact: false,
        fabricatedCustomer: false,
        fabricatedRevenue: false,
      },
      timestamp,
    };
  }
  const evidence =
    await collectVerificationEvidence(
      candidateBusinessName,
    );
  const hosts =
    uniqueHosts(evidence);
  const identity =
    resolveBusinessIdentity(
      candidate,
      evidence,
    );
  const china =
    verifyChinaBusiness(
      candidate,
      evidence,
    );
  const commercial =
    verifyCommercialSignal(
      evidence,
    );
  const japan =
    verifyJapanOrCrossBorderSignal(
      evidence,
    );
  const fitScore =
    calculateFitScore(
      candidate,
      evidence,
      identity.verified,
      china.verified,
      commercial.verified,
      japan.verified,
    );
  const qualification =
    resolveQualification(
      identity.verified,
      china.verified,
      commercial.verified,
      japan.verified,
      hosts.length,
      fitScore,
    );
  const success =
    qualification ===
    "verified-prospect";
  const reasons: string[] =
    [];
  if (!identity.verified) {
    reasons.push(
      "Business identity still requires manual validation.",
    );
  }
  if (!china.verified) {
    reasons.push(
      "Mainland-China business status is not sufficiently established by the retrieved evidence.",
    );
  }
  if (!commercial.verified) {
    reasons.push(
      "Current commercial activity is not sufficiently established.",
    );
  }
  if (!japan.verified) {
    reasons.push(
      "Japan or cross-border commercial relevance is not sufficiently established.",
    );
  }
  if (hosts.length < 2) {
    reasons.push(
      "Fewer than two independent source hosts were found.",
    );
  }
  if (fitScore < 0.7) {
    reasons.push(
      "AIOS commercial fit is below the verified-prospect threshold.",
    );
  }
  if (
    candidate.paymentCapability !==
    "likely-domestic-rmb"
  ) {
    reasons.push(
      "CNY payment capability remains unknown and requires manual validation.",
    );
  }
  if (
    reasons.length === 0
  ) {
    reasons.push(
      "All automated verification gates passed.",
    );
  }
  return {
    success,
    status:
      success
        ? "verified"
        : qualification ===
            "rejected"
          ? "blocked"
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
      japan.verified,
    independentHosts:
      hosts.length,
    sourceCount:
      evidence.length,
    evidence:
      uniqueStrings([
        ...identity.evidence,
        ...china.evidence,
        ...commercial.evidence,
        ...japan.evidence,
      ]).slice(0, 12),
    sourceTitles:
      uniqueStrings(
        evidence.map(
          (item) =>
            item.title,
        ),
      ).slice(0, 10),
    validationReasons:
      reasons,
    qualificationStatus:
      qualification,
    paymentCapability:
      candidate.paymentCapability,
    paymentCurrency:
      candidate.paymentCurrency,
    aiosFitScore:
      fitScore,
    conclusion:
      success
        ? "The enterprise identity, mainland-China relevance, current commercial activity, Japan or cross-border signal, and independent-source threshold have been verified sufficiently for the C144 prospect pool."
        : "The candidate has not passed the automated commercial verification gate and must not be treated as a verified prospect.",
    nextStep:
      success
        ? "Manually confirm the business, current need, decision-maker/contact channel, and CNY payment capability before outreach."
        : "Do not contact the candidate yet. Resolve the listed verification gaps or return to prospect discovery.",
    integrity: {
      fabricatedBusiness: false,
      fabricatedLead: false,
      fabricatedContact: false,
      fabricatedCustomer: false,
      fabricatedRevenue: false,
    },
    timestamp,
  };
}
export async function verifyC144Prospects(
  candidates: C144ProspectCandidate[],
): Promise<C144ProspectVerificationResult[]> {
  const results: C144ProspectVerificationResult[] =
    [];
  for (
    const candidate of candidates
  ) {
    const result =
      await verifyC144Prospect(
        candidate,
      );
    results.push(result);
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
    result.independentHosts >= 2 &&
    result.sourceCount >= 2 &&
    result.aiosFitScore >= 0.7 &&
    result.integrity
      .fabricatedBusiness ===
      false &&
    result.integrity
      .fabricatedLead ===
      false &&
    result.integrity
      .fabricatedContact ===
      false &&
    result.integrity
      .fabricatedCustomer ===
      false &&
    result.integrity
      .fabricatedRevenue ===
      false
  );
}
export function isC144VerifiedProspect(
  result: C144ProspectVerificationResult,
): boolean {
  return (
    isC144ProspectVerificationReady(
      result,
    ) &&
    result.businessName !==
      null
  );
}
