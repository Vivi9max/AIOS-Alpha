import "server-only";
import type {
  CommercialObjective,
} from "@/lib/commercial/operating-layer";
import type {
  LiveCommercialOpportunityResult,
} from "@/lib/runtime/live-commercial-opportunity";
export const C144_PROSPECT_DISCOVERY_ID =
  "C144-PROSPECT-DISCOVERY";
export interface C144ProspectCandidate {
  id: string;
  rank: number;
  name: string;
  type:
    | "business"
    | "market-segment"
    | "source-backed-opportunity";
  hostname: string;
  url: string;
  sourceTitle: string;
  evidence: string[];
  evidenceScore: number;
  credibilityTier: string;
  verificationLabel: string;
  whyRelevant: string;
  qualificationStatus:
    | "evidence-backed"
    | "needs-manual-validation";
  recommendedAction: string;
  businessName: string | null;
  businessIdentityEvidence: string[];
  commercialSignals: string[];
  contactChannel: string | null;
  validationReasons: string[];
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
function containsAny(
  text: string,
  terms: string[],
): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) =>
    lower.includes(term.toLowerCase()),
  );
}
function extractCommercialSignals(
  evidence: string[],
): string[] {
  const joined = evidence.join(" ");
  const signalGroups: Array<{
    label: string;
    terms: string[];
  }> = [
    {
      label: "Japan market activity",
      terms: [
        "japan",
        "japanese market",
        "日本市場",
        "日本",
      ],
    },
    {
      label: "cross-border commerce",
      terms: [
        "cross-border",
        "cross border",
        "跨境",
        "海外销售",
        "海外市場",
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
        "ネット通販",
      ],
    },
    {
      label: "market expansion",
      terms: [
        "expansion",
        "expand",
        "market entry",
        "market-entry",
        "市场进入",
        "市场拓展",
        "海外展開",
        "海外展開",
      ],
    },
    {
      label: "product validation",
      terms: [
        "product validation",
        "product testing",
        "产品验证",
        "商品验证",
        "商品検証",
      ],
    },
    {
      label: "business growth",
      terms: [
        "growth",
        "growing",
        "sales growth",
        "revenue growth",
        "增长",
        "销售增长",
        "売上",
      ],
    },
    {
      label: "outsourcing or service demand",
      terms: [
        "outsourcing",
        "agency",
        "consulting",
        "service provider",
        "外包",
        "咨询",
        "代理",
        "業務委託",
        "コンサルティング",
      ],
    },
  ];
  return signalGroups
    .filter((group) =>
      containsAny(
        joined,
        group.terms,
      ),
    )
    .map((group) =>
      group.label,
    );
}
function detectBusinessIdentity(
  title: string,
  hostname: string,
  evidence: string[],
): {
  businessName: string | null;
  businessIdentityEvidence: string[];
  validationReasons: string[];
} {
  const joined = [
    title,
    hostname,
    ...evidence,
  ]
    .filter(Boolean)
    .join(" ");
  const identityEvidence: string[] = [];
  const validationReasons: string[] = [];
  const companyPattern =
    /([A-Z][A-Za-z0-9&.' -]{2,80}(?:Inc\.?|Ltd\.?|LLC|Corp\.?|Corporation|Co\.?|Company|Group|Holdings|GmbH|KK|株式会社|有限会社))/;
  const japaneseCompanyPattern =
    /([\u4e00-\u9fff\u3040-\u30ffA-Za-z0-9・]{2,40}(?:株式会社|有限会社))/;
  const chineseCompanyPattern =
    /([\u4e00-\u9fff]{2,30}(?:有限公司|股份有限公司|集团|集团公司))/;
  const match =
    joined.match(
      companyPattern,
    ) ||
    joined.match(
      japaneseCompanyPattern,
    ) ||
    joined.match(
      chineseCompanyPattern,
    );
  if (match?.[1]) {
    const name =
      normalizeText(
        match[1],
        160,
      );
    if (name) {
      identityEvidence.push(
        `A possible organization name appears in the retrieved evidence: ${name}.`,
      );
      validationReasons.push(
        "A business-like organization name was detected, but the founder must confirm it against the original source.",
      );
      return {
        businessName: name,
        businessIdentityEvidence:
          identityEvidence,
        validationReasons,
      };
    }
  }
  if (
    hostname &&
    !hostname.includes("google.") &&
    !hostname.includes("bing.") &&
    !hostname.includes("search.") &&
    hostname.includes(".")
  ) {
    identityEvidence.push(
      `The source is associated with the public domain ${hostname}.`,
    );
    validationReasons.push(
      "A public domain is available, but the domain alone does not prove that the organization is a qualified prospect.",
    );
  }
  validationReasons.push(
    "No sufficiently strong business identity was extracted from the evidence.",
  );
  return {
    businessName: null,
    businessIdentityEvidence:
      identityEvidence,
    validationReasons,
  };
}
function buildCandidateName(
  businessName: string | null,
  title: string,
  hostname: string,
  rank: number,
): string {
  if (businessName) {
    return businessName;
  }
  const cleanTitle =
    normalizeText(
      title,
      180,
    );
  if (cleanTitle) {
    return `Opportunity ${rank}: ${cleanTitle}`;
  }
  if (hostname) {
    return `Opportunity ${rank}: ${hostname}`;
  }
  return `Source-backed opportunity ${rank}`;
}
function buildRelevance(
  objective: CommercialObjective,
  evidence: string[],
  signals: string[],
  businessName: string | null,
): string {
  const target =
    `${objective.revenueTarget} ${objective.currency}`;
  const signalText =
    signals.length > 0
      ? signals.join(", ")
      : "general commercial activity";
  const identityText =
    businessName
      ? `A possible business identity was detected as ${businessName}, but it still requires manual confirmation.`
      : "No sufficiently strong business identity was extracted, so this remains a prospect hypothesis.";
  return [
    `Relevant commercial signals: ${signalText}.`,
    identityText,
    `The current objective targets ${target} revenue and ${objective.customerTarget} paying customer.`,
    "The evidence can support prioritization, but it does not by itself prove willingness to purchase.",
  ].join(" ");
}
function scoreEvidence(
  item: {
    verificationScore?: number;
    credibilityScore?: number;
    corroborationCount?: number;
    corroborationScore?: number;
    snippets?: string[];
  },
): number {
  const verification =
    typeof item.verificationScore ===
    "number"
      ? item.verificationScore
      : 0;
  const credibility =
    typeof item.credibilityScore ===
    "number"
      ? item.credibilityScore
      : 0;
  const corroboration =
    typeof item.corroborationScore ===
    "number"
      ? item.corroborationScore
      : 0;
  const corroborationCount =
    typeof item.corroborationCount ===
    "number"
      ? item.corroborationCount
      : 0;
  const snippetBonus =
    Math.min(
      0.08,
      (item.snippets?.length || 0) *
        0.02,
    );
  const score =
    verification * 0.45 +
    credibility * 0.25 +
    corroboration * 0.2 +
    Math.min(
      0.08,
      corroborationCount * 0.04,
    ) +
    snippetBonus;
  return Math.min(
    0.99,
    Number(
      score.toFixed(3),
    ),
  );
}
function buildRecommendedAction(
  candidate: C144ProspectCandidate,
): string {
  const identityAction =
    candidate.businessName
      ? `Manually confirm that ${candidate.businessName} is the organization described by the original source.`
      : "Manually identify the actual organization or business represented by this source.";
  return [
    identityAction,
    "Open the original source and verify the current business context.",
    "Confirm a real connection to Japan, cross-border commerce, product validation, or market-entry activity.",
    "Check whether the organization has a plausible commercial need for the AIOS market-intelligence and validation service.",
    "Only after qualification, identify an appropriate public business contact channel.",
    "Record the real external action separately after it is actually performed.",
  ].join(" ");
}
function buildValidationReasons(
  existing: string[],
  signals: string[],
  hostname: string,
): string[] {
  const reasons = [
    ...existing,
  ];
  if (signals.length >= 2) {
    reasons.push(
      "Multiple commercial signal categories were detected in the evidence.",
    );
  } else {
    reasons.push(
      "Commercial relevance remains limited until manually confirmed.",
    );
  }
  if (hostname) {
    reasons.push(
      `Original-source domain available for manual verification: ${hostname}.`,
    );
  }
  return uniqueStrings(
    reasons,
  );
}
export function discoverC144Prospects(
  opportunity: LiveCommercialOpportunityResult,
): C144ProspectDiscoveryResult {
  const project =
    opportunity.objective;
  if (!project) {
    return {
      success: false,
      status: "blocked",
      project: null,
      candidates: [],
      sourceCount: 0,
      independentHosts: 0,
      conclusion:
        "The C144 commercial objective is unavailable.",
      nextStep:
        "Initialize the first cashflow project before discovering prospects.",
      integrity: {
        fabricatedLead: false,
        fabricatedContact: false,
        fabricatedResponse: false,
        fabricatedCustomer: false,
      },
      timestamp: Date.now(),
    };
  }
  const web =
    opportunity.web;
  if (
    !web ||
    !web.success ||
    !web.verified ||
    web.evidence.length < 2 ||
    web.sourceCount < 2 ||
    web.sourceHosts.length < 2
  ) {
    return {
      success: false,
      status: "insufficient-evidence",
      project,
      candidates: [],
      sourceCount:
        web?.sourceCount || 0,
      independentHosts:
        web?.sourceHosts.length || 0,
      conclusion:
        "Verified external evidence is insufficient to produce prospect candidates.",
      nextStep:
        "Run another verified commercial intelligence cycle before prospect discovery.",
      integrity: {
        fabricatedLead: false,
        fabricatedContact: false,
        fabricatedResponse: false,
        fabricatedCustomer: false,
      },
      timestamp: Date.now(),
    };
  }
  const candidates =
    web.evidence
      .map(
        (item, index) => {
          const snippets =
            uniqueStrings(
              item.snippets || [],
            ).slice(
              0,
              5,
            );
          const title =
            normalizeText(
              item.title,
              300,
            );
          const hostname =
            normalizeText(
              item.hostname,
              180,
            );
          const url =
            normalizeText(
              item.url,
              1000,
            );
          const signals =
            extractCommercialSignals(
              [
                title,
                hostname,
                ...snippets,
              ],
            );
          const identity =
            detectBusinessIdentity(
              title,
              hostname,
              snippets,
            );
          const evidenceScore =
            scoreEvidence(
              item,
            );
          const candidateName =
            buildCandidateName(
              identity.businessName,
              title,
              hostname,
              index + 1,
            );
          const qualificationStatus =
            identity.businessName &&
            signals.length >= 2
              ? "evidence-backed"
              : "needs-manual-validation";
          const candidate:
            C144ProspectCandidate = {
              id:
                `C144-PROSPECT-${index + 1}`,
              rank: 0,
              name:
                candidateName,
              type:
                identity.businessName &&
                signals.length >= 2
                  ? "business"
                  : "source-backed-opportunity",
              hostname,
              url,
              sourceTitle:
                title,
              evidence:
                snippets,
              evidenceScore,
              credibilityTier:
                item.credibilityTier ||
                "unknown",
              verificationLabel:
                item.verificationLabel ||
                "limited",
              whyRelevant:
                buildRelevance(
                  project,
                  snippets,
                  signals,
                  identity.businessName,
                ),
              qualificationStatus,
              recommendedAction:
                "",
              businessName:
                identity.businessName,
              businessIdentityEvidence:
                identity.businessIdentityEvidence,
              commercialSignals:
                signals,
              contactChannel:
                null,
              validationReasons:
                buildValidationReasons(
                  identity.validationReasons,
                  signals,
                  hostname,
                ),
            };
          candidate.recommendedAction =
            buildRecommendedAction(
              candidate,
            );
          return candidate;
        },
      )
      .sort(
        (a, b) => {
          if (
            a.qualificationStatus !==
            b.qualificationStatus
          ) {
            return a.qualificationStatus ===
              "evidence-backed"
              ? -1
              : 1;
          }
          if (
            b.commercialSignals.length !==
            a.commercialSignals.length
          ) {
            return (
              b.commercialSignals.length -
              a.commercialSignals.length
            );
          }
          return (
            b.evidenceScore -
            a.evidenceScore
          );
        },
      )
      .slice(
        0,
        5,
      )
      .map(
        (candidate, index) => ({
          ...candidate,
          rank:
            index + 1,
        }),
      );
  if (
    candidates.length === 0
  ) {
    return {
      success: false,
      status: "insufficient-evidence",
      project,
      candidates: [],
      sourceCount:
        web.sourceCount,
      independentHosts:
        web.sourceHosts.length,
      conclusion:
        "The verified web cycle returned no usable prospect hypotheses.",
      nextStep:
        "Broaden the commercial discovery query.",
      integrity: {
        fabricatedLead: false,
        fabricatedContact: false,
        fabricatedResponse: false,
        fabricatedCustomer: false,
      },
      timestamp: Date.now(),
    };
  }
  return {
    success: true,
    status: "ready",
    project,
    candidates,
    sourceCount:
      web.sourceCount,
    independentHosts:
      web.sourceHosts.length,
    conclusion:
      "AIOS converted verified external evidence into ranked prospect hypotheses and distinguishes possible business identities from unqualified source-backed opportunities.",
    nextStep:
      "Manually validate candidate #1 first, then continue in rank order until 5 real prospects have been validated.",
    integrity: {
      fabricatedLead: false,
      fabricatedContact: false,
      fabricatedResponse: false,
      fabricatedCustomer: false,
    },
    timestamp: Date.now(),
  };
}
export function isC144ProspectDiscoveryReady(
  result: C144ProspectDiscoveryResult,
): boolean {
  return (
    result.success === true &&
    result.status === "ready" &&
    result.project !== null &&
    result.candidates.length > 0 &&
    result.sourceCount >= 2 &&
    result.independentHosts >= 2 &&
    result.integrity
      .fabricatedLead === false &&
    result.integrity
      .fabricatedContact === false &&
    result.integrity
      .fabricatedResponse === false &&
    result.integrity
      .fabricatedCustomer === false
  );
}
