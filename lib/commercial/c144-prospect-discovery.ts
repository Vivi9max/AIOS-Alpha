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

function buildCandidateName(
  title: string,
  hostname: string,
): string {
  const cleanTitle =
    normalizeText(title, 180);

  if (cleanTitle) {
    return cleanTitle;
  }

  return hostname || "Source-backed opportunity";
}

function buildRelevance(
  objective: CommercialObjective,
  evidence: string[],
): string {
  const joined =
    evidence.join(" ");

  const target =
    `${objective.revenueTarget} ${objective.currency}`;

  if (
    /japan|日本|cross-border|跨境|海外|ecommerce|电商|market|市场/i.test(
      joined,
    )
  ) {
    return [
      "The verified source contains signals relevant to",
      "cross-border demand, market activity, or market-entry needs.",
      `The commercial objective targets ${target} and one paying customer.`,
    ].join(" ");
  }

  return [
    "The source contains commercially relevant evidence.",
    `Manual validation is required against the ${target} first-customer objective.`,
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
    Number(score.toFixed(3)),
  );
}

function buildRecommendedAction(
  candidate: C144ProspectCandidate,
): string {
  return [
    `Manually validate ${candidate.name}.`,
    "Open the source and confirm the current business context.",
    "Check whether the organization has a real cross-border, Japan-market, product-validation, or market-entry need.",
    "Only after manual validation, identify an appropriate public business contact channel.",
  ].join(" ");
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
    web.evidence.length < 2
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
      .map((item, index) => {
        const snippets =
          uniqueStrings(
            item.snippets || [],
          );

        const score =
          scoreEvidence(item);

        const candidate: C144ProspectCandidate =
          {
            id:
              `C144-PROSPECT-${index + 1}`,
            rank: 0,
            name:
              buildCandidateName(
                item.title,
                item.hostname,
              ),
            type:
              "source-backed-opportunity",
            hostname:
              normalizeText(
                item.hostname,
                180,
              ),
            url:
              normalizeText(
                item.url,
                1000,
              ),
            sourceTitle:
              normalizeText(
                item.title,
                300,
              ),
            evidence:
              snippets.slice(0, 3),
            evidenceScore:
              score,
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
              ),
            qualificationStatus:
              "needs-manual-validation",
            recommendedAction: "",
          };

        candidate.recommendedAction =
          buildRecommendedAction(
            candidate,
          );

        return candidate;
      })
      .sort(
        (a, b) =>
          b.evidenceScore -
          a.evidenceScore,
      )
      .slice(0, 5)
      .map(
        (candidate, index) => ({
          ...candidate,
          rank: index + 1,
        }),
      );

  if (candidates.length === 0) {
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
        "The verified web cycle returned no usable prospect candidates.",
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
      "AIOS converted verified market evidence into ranked prospect hypotheses. These are not yet qualified leads and require manual validation.",
    nextStep:
      "Manually validate candidate #1 first, then proceed in rank order.",
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
