import "server-only";

import type {
  WebIntelligenceResult,
} from "@/lib/web-intelligence";

export type LiveDecisionPriority =
  | "critical"
  | "high"
  | "medium"
  | "low";

export interface LiveDecisionFact {
  statement: string;
  sourceIds: string[];
  confidence: number;
}

export interface LiveDecisionJudgment {
  statement: string;
  basis: string[];
  confidence: number;
}

export interface LiveDecisionRisk {
  statement: string;
  severity: "high" | "medium" | "low";
}

export interface LiveDecisionOpportunity {
  statement: string;
  potential: "high" | "medium" | "low";
}

export interface LiveDecisionAction {
  action: string;
  priority: LiveDecisionPriority;
  reason: string;
}

export interface LiveDecisionEvidence {
  id: string;
  title: string;
  hostname: string;
  url: string;
  confidence: number;
}

export interface LiveDecisionVerification {
  verified: boolean;
  label: "high" | "medium" | "limited";
  score: number;
  independentSourceCount: number;
  primarySourceFound: boolean;
  corroborated: boolean;
}

export interface LiveDecision {
  success: boolean;

  conclusion: string;

  facts: LiveDecisionFact[];

  judgments: LiveDecisionJudgment[];

  risks: LiveDecisionRisk[];

  opportunities: LiveDecisionOpportunity[];

  recommendedActions: LiveDecisionAction[];

  priority: LiveDecisionPriority;

  evidence: LiveDecisionEvidence[];

  verification: LiveDecisionVerification | null;

  nextStep: string;

  generatedAt: number;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

function normalizeText(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function getVerification(
  web: WebIntelligenceResult,
): LiveDecisionVerification | null {
  if (!web.verification) {
    return null;
  }

  return {
    verified:
      web.verification.verified,
    label:
      web.verification.label,
    score:
      web.verification.score,
    independentSourceCount:
      web.verification
        .independentSourceCount,
    primarySourceFound:
      web.verification
        .primarySourceFound,
    corroborated:
      web.verification
        .corroborated,
  };
}

function buildEvidence(
  web: WebIntelligenceResult,
): LiveDecisionEvidence[] {
  return web.evidence.map(
    (item) => ({
      id: item.id,
      title:
        normalizeText(
          item.title,
        ),
      hostname:
        item.hostname,
      url:
        item.url,
      confidence:
        clamp(
          item.confidence,
          0,
          1,
        ),
    }),
  );
}

function buildFacts(
  web: WebIntelligenceResult,
): LiveDecisionFact[] {
  return web.evidence
    .slice(0, 8)
    .flatMap((item) => {
      const snippets =
        item.snippets
          .map(
            normalizeText,
          )
          .filter(Boolean)
          .slice(0, 2);

      return snippets.map(
        (snippet) => ({
          statement:
            snippet,
          sourceIds: [
            item.id,
          ],
          confidence:
            clamp(
              item.confidence,
              0,
              1,
            ),
        }),
      );
    })
    .slice(0, 12);
}

function buildJudgments(
  web: WebIntelligenceResult,
): LiveDecisionJudgment[] {
  const judgments: LiveDecisionJudgment[] =
    [];

  const verification =
    web.verification;

  if (
    verification?.verified &&
    verification.independentSourceCount >= 2
  ) {
    judgments.push({
      statement:
        "The retrieved information has sufficient independent-source support for a cautious decision.",
      basis: [
        `${verification.independentSourceCount} independent sources`,
        verification.corroborated
          ? "cross-source corroboration detected"
          : "independent sources available",
        `verification score ${verification.score.toFixed(2)}`,
      ],
      confidence:
        clamp(
          verification.score,
          0,
          1,
        ),
    });
  } else if (
    verification
  ) {
    judgments.push({
      statement:
        "The information can support analysis, but confidence is limited and should be treated cautiously.",
      basis: [
        `${verification.independentSourceCount} independent sources`,
        `verification label ${verification.label}`,
        `verification score ${verification.score.toFixed(2)}`,
      ],
      confidence:
        clamp(
          verification.score,
          0,
          1,
        ),
    });
  }

  if (
    web.route?.category ===
    "finance"
  ) {
    judgments.push({
      statement:
        "Financial values should be interpreted together with timestamp, market definition, unit and source methodology.",
      basis: [
        "financial data can differ by market",
        "different providers may use different timestamps or definitions",
      ],
      confidence: 0.86,
    });
  }

  if (
    web.route?.category ===
    "weather"
  ) {
    judgments.push({
      statement:
        "Weather information is time-sensitive and should be interpreted against the retrieval time and location.",
      basis: [
        "weather conditions change rapidly",
        "forecast and observed conditions are different data types",
      ],
      confidence: 0.9,
    });
  }

  if (
    web.route?.category ===
    "news"
  ) {
    judgments.push({
      statement:
        "Recent news should be treated as evolving information until independently corroborated or confirmed by a primary source.",
      basis: [
        "breaking information can change",
        "secondary reporting may lag or conflict",
      ],
      confidence: 0.9,
    });
  }

  return judgments.slice(0, 5);
}

function buildRisks(
  web: WebIntelligenceResult,
): LiveDecisionRisk[] {
  const risks: LiveDecisionRisk[] =
    [];

  const verification =
    web.verification;

  if (
    !web.verified ||
    verification?.label ===
      "limited"
  ) {
    risks.push({
      statement:
        "Evidence verification is not strong enough to support a high-confidence decision.",
      severity:
        "high",
    });
  }

  if (
    verification &&
    !verification.primarySourceFound
  ) {
    risks.push({
      statement:
        "No primary source was identified, so official confirmation may still be required.",
      severity:
        "medium",
    });
  }

  if (
    verification &&
    !verification.corroborated
  ) {
    risks.push({
      statement:
        "Cross-source corroboration is limited.",
      severity:
        "medium",
    });
  }

  if (
    web.sourceCount === 0
  ) {
    risks.push({
      statement:
        "No external evidence was retrieved.",
      severity:
        "high",
    });
  }

  return risks.slice(0, 5);
}

function buildOpportunities(
  web: WebIntelligenceResult,
): LiveDecisionOpportunity[] {
  const opportunities: LiveDecisionOpportunity[] =
    [];

  if (
    web.verified &&
    web.sourceCount >= 2
  ) {
    opportunities.push({
      statement:
        "Verified external evidence can be used as the basis for the next decision step.",
      potential:
        "high",
    });
  }

  switch (
    web.route?.category
  ) {
    case "finance":
      opportunities.push({
        statement:
          "Current financial information can be converted into a concrete comparison, timing or transaction decision.",
        potential:
          "high",
      });
      break;

    case "market":
      opportunities.push({
        statement:
          "Current market evidence can be converted into a product, pricing or acquisition decision.",
        potential:
          "high",
      });
      break;

    case "product":
      opportunities.push({
        statement:
          "Current product information can be converted into a purchase, pricing or sourcing decision.",
        potential:
          "high",
      });
      break;

    case "policy":
      opportunities.push({
        statement:
          "Current policy information can be converted into a compliance or market-entry decision.",
        potential:
          "high",
      });
      break;

    case "news":
      opportunities.push({
        statement:
          "Recent information can be monitored for material changes before committing to an action.",
        potential:
          "medium",
      });
      break;

    default:
      opportunities.push({
        statement:
          "The retrieved evidence can be used to determine the next concrete action.",
        potential:
          "medium",
      });
      break;
  }

  return opportunities.slice(
    0,
    5,
  );
}

function resolvePriority(
  web: WebIntelligenceResult,
  risks: LiveDecisionRisk[],
): LiveDecisionPriority {
  if (
    risks.some(
      (risk) =>
        risk.severity === "high",
    )
  ) {
    return "high";
  }

  if (
    web.route?.category ===
      "finance" ||
    web.route?.category ===
      "policy" ||
    web.route?.category ===
      "market"
  ) {
    return "medium";
  }

  return "low";
}

function buildRecommendedActions(
  web: WebIntelligenceResult,
  risks: LiveDecisionRisk[],
): LiveDecisionAction[] {
  const actions: LiveDecisionAction[] =
    [];

  if (
    risks.some(
      (risk) =>
        risk.severity === "high",
    )
  ) {
    actions.push({
      action:
        "Do not commit to a high-impact action until the evidence is strengthened.",
      priority:
        "high",
      reason:
        "Current verification confidence is insufficient.",
    });
  }

  if (
    web.verification?.primarySourceFound ===
    false
  ) {
    actions.push({
      action:
        "Check the relevant primary or official source before final execution.",
      priority:
        "medium",
      reason:
        "No primary source was identified.",
    });
  }

  switch (
    web.route?.category
  ) {
    case "finance":
      actions.push({
        action:
          "Confirm the exact timestamp, unit, market and currency definition before using the value operationally.",
        priority:
          "high",
        reason:
          "Financial values are definition-sensitive.",
      });
      break;

    case "weather":
      actions.push({
        action:
          "Use the current observation and forecast window relevant to the user's location or planned activity.",
        priority:
          "medium",
        reason:
          "Weather conditions are highly time-sensitive.",
      });
      break;

    case "news":
      actions.push({
        action:
          "Monitor for confirmation or material updates before treating a developing report as final.",
        priority:
          "medium",
        reason:
          "News information can evolve rapidly.",
      });
      break;

    case "policy":
      actions.push({
        action:
          "Verify the applicable official policy text and effective date before execution.",
        priority:
          "high",
        reason:
          "Policy decisions require authoritative confirmation.",
      });
      break;

    case "market":
      actions.push({
        action:
          "Convert the current market evidence into a measurable test before committing significant resources.",
        priority:
          "high",
        reason:
          "Market evidence should lead to validation rather than blind execution.",
      });
      break;

    case "product":
      actions.push({
        action:
          "Confirm current price, availability, seller and purchase conditions before acting.",
        priority:
          "medium",
        reason:
          "Product availability and pricing can change.",
      });
      break;

    default:
      actions.push({
        action:
          "Use the verified evidence to define the smallest useful next action.",
        priority:
          "medium",
        reason:
          "The Runtime should convert intelligence into an actionable next step.",
      });
      break;
  }

  return actions.slice(
    0,
    5,
  );
}

function buildConclusion(
  web: WebIntelligenceResult,
  priority: LiveDecisionPriority,
): string {
  if (
    !web.success ||
    web.evidence.length === 0
  ) {
    return "No decision should be made from external intelligence because usable evidence was not retrieved.";
  }

  if (
    !web.verified
  ) {
    return "External evidence was retrieved, but verification is not strong enough for a high-confidence decision.";
  }

  if (
    priority === "high"
  ) {
    return "Verified external evidence is available, but the next step should prioritize confirmation and risk control before execution.";
  }

  return "Verified external evidence is available and can now support a concrete decision and next action.";
}

function buildNextStep(
  web: WebIntelligenceResult,
  risks: LiveDecisionRisk[],
): string {
  if (
    risks.some(
      (risk) =>
        risk.severity === "high",
    )
  ) {
    return "Strengthen verification before execution.";
  }

  if (
    web.route?.category ===
    "finance"
  ) {
    return "Confirm timestamp and data definition, then apply the value to the user's specific decision.";
  }

  if (
    web.route?.category ===
    "market"
  ) {
    return "Turn the verified market signal into the smallest measurable validation action.";
  }

  return "Use the verified evidence to execute the smallest useful next action.";
}

export function buildLiveDecision(
  web: WebIntelligenceResult,
): LiveDecision {
  const evidence =
    buildEvidence(web);

  const facts =
    buildFacts(web);

  const judgments =
    buildJudgments(web);

  const risks =
    buildRisks(web);

  const opportunities =
    buildOpportunities(web);

  const priority =
    resolvePriority(
      web,
      risks,
    );

  const recommendedActions =
    buildRecommendedActions(
      web,
      risks,
    );

  return {
    success:
      web.success &&
      web.evidence.length > 0,

    conclusion:
      buildConclusion(
        web,
        priority,
      ),

    facts,

    judgments,

    risks,

    opportunities,

    recommendedActions,

    priority,

    evidence,

    verification:
      getVerification(web),

    nextStep:
      buildNextStep(
        web,
        risks,
      ),

    generatedAt:
      Date.now(),
  };
}

export function buildLiveDecisionContext(
  decision: LiveDecision,
): string {
  const facts =
    decision.facts
      .map(
        (item, index) =>
          `FACT ${index + 1}: ${item.statement}`,
      )
      .join("\n");

  const judgments =
    decision.judgments
      .map(
        (item, index) =>
          `JUDGMENT ${index + 1}: ${item.statement}`,
      )
      .join("\n");

  const risks =
    decision.risks
      .map(
        (item, index) =>
          `RISK ${index + 1}: ${item.statement} [${item.severity}]`,
      )
      .join("\n");

  const opportunities =
    decision.opportunities
      .map(
        (item, index) =>
          `OPPORTUNITY ${index + 1}: ${item.statement} [${item.potential}]`,
      )
      .join("\n");

  const actions =
    decision.recommendedActions
      .map(
        (item, index) =>
          `ACTION ${index + 1}: ${item.action} [${item.priority}]`,
      )
      .join("\n");

  return [
    "AIOS LIVE DECISION CONTEXT",
    "",
    "Decision Layer converts verified external intelligence into a structured decision context.",
    "",
    "IMPORTANT BOUNDARIES",
    "FACT = externally retrieved information.",
    "JUDGMENT = analysis derived from facts.",
    "RISK = uncertainty or downside that can affect the decision.",
    "OPPORTUNITY = potentially useful upside identified from the evidence.",
    "ACTION = a recommended next step.",
    "Do not present judgments as externally verified facts.",
    "Do not present opportunities as guaranteed outcomes.",
    "Do not claim an action was executed unless execution actually occurred.",
    "",
    `SUCCESS=${decision.success}`,
    `PRIORITY=${decision.priority}`,
    `CONCLUSION=${decision.conclusion}`,
    "",
    facts,
    "",
    judgments,
    "",
    risks,
    "",
    opportunities,
    "",
    actions,
    "",
    `NEXT_STEP=${decision.nextStep}`,
  ]
    .filter(Boolean)
    .join("\n");
}
