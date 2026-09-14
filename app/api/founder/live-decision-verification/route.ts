import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  requiresWebIntelligence,
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

import {
  executeLiveDecision,
  hasUsableLiveDecision,
} from "@/lib/runtime/live-decision-runtime";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

type VerificationCheck = {
  name: string;
  pass: boolean;
  detail: string;
  latencyMs: number;
};

function json(
  body: Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,
        verified: false,
        code: "FOUNDER_AUTH_REQUIRED",
        stage: "authentication",
        runtime: APP_CONFIG.runtimeId,
        runtimeVersion: APP_CONFIG.version,
        timestamp: Date.now(),
        latencyMs: Date.now() - startedAt,
      },
      401,
    );
  }

  if (
    !process.env.BRAVE_SEARCH_API_KEY?.trim()
  ) {
    return json(
      {
        success: false,
        verified: false,
        code: "BRAVE_SEARCH_API_KEY_MISSING",
        stage: "configuration",
        runtime: APP_CONFIG.runtimeId,
        runtimeVersion: APP_CONFIG.version,
        timestamp: Date.now(),
        latencyMs: Date.now() - startedAt,
      },
      503,
    );
  }

  const prompt =
    "What is the current USD to CNY exchange rate today? Use live external web information and verify the current value. Analyze the evidence and determine the safest useful next action.";

  const checks: VerificationCheck[] = [];

  let evidence:
    Awaited<
      ReturnType<typeof retrieveWebEvidence>
    > | null = null;

  let decisionResult:
    ReturnType<typeof executeLiveDecision> | null = null;

  const webStartedAt = Date.now();

  try {
    const routed =
      requiresWebIntelligence(prompt);

    checks.push({
      name: "Live Intelligence Routing",
      pass: routed,
      detail: routed
        ? "Decision request correctly activated Live Intelligence."
        : "Decision request did not activate Live Intelligence.",
      latencyMs:
        Date.now() - webStartedAt,
    });

    if (routed) {
      evidence =
        await retrieveWebEvidence(prompt);

      const pass =
        evidence.success &&
        evidence.verified &&
        evidence.sourceCount >= 2;

      checks.push({
        name: "Verified External Evidence",
        pass,
        detail: pass
          ? `Retrieved and verified ${evidence.sourceCount} source(s).`
          : evidence.error ??
            "External evidence verification failed.",
        latencyMs:
          Date.now() - webStartedAt,
      });
    }
  } catch (error) {
    checks.push({
      name: "Verified External Evidence",
      pass: false,
      detail:
        error instanceof Error
          ? error.message
          : "External evidence retrieval failed.",
      latencyMs:
        Date.now() - webStartedAt,
    });
  }

  if (evidence) {
    const decisionStartedAt = Date.now();

    try {
      decisionResult =
        executeLiveDecision(evidence);

      const decision =
        decisionResult.decision;

      checks.push({
        name: "Decision Layer",
        pass:
          decisionResult.success &&
          decision.success,
        detail:
          decision.success
            ? "Decision Layer successfully consumed verified web evidence."
            : "Decision Layer did not produce a successful decision.",
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });

      checks.push({
        name: "FACT",
        pass:
          decision.facts.length > 0,
        detail:
          `${decision.facts.length} fact(s) generated.`,
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });

      checks.push({
        name: "JUDGMENT",
        pass:
          decision.judgments.length > 0,
        detail:
          `${decision.judgments.length} judgment(s) generated.`,
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });

      checks.push({
        name: "RISK",
        pass:
          decision.risks.length > 0 ||
          decision.verification?.verified === true,
        detail:
          decision.risks.length > 0
            ? `${decision.risks.length} risk(s) identified.`
            : "No material verification risk detected.",
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });

      checks.push({
        name: "OPPORTUNITY",
        pass:
          decision.opportunities.length > 0,
        detail:
          `${decision.opportunities.length} opportunity signal(s) generated.`,
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });

      checks.push({
        name: "ACTION",
        pass:
          decision.recommendedActions.length > 0,
        detail:
          `${decision.recommendedActions.length} recommended action(s) generated.`,
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });

      checks.push({
        name: "NEXT STEP",
        pass:
          decision.nextStep.trim().length > 0,
        detail:
          decision.nextStep,
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });

      checks.push({
        name: "Usable Decision",
        pass:
          hasUsableLiveDecision(
            decisionResult,
          ),
        detail:
          hasUsableLiveDecision(
            decisionResult,
          )
            ? "Decision is usable by the Runtime."
            : "Decision is not yet usable by the Runtime.",
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });
    } catch (error) {
      checks.push({
        name: "Decision Layer",
        pass: false,
        detail:
          error instanceof Error
            ? error.message
            : "Decision Layer execution failed.",
        latencyMs:
          Date.now() -
          decisionStartedAt,
      });
    }
  }

  const ordinaryPrompt =
    "What is 2 + 2?";

  const regressionStartedAt =
    Date.now();

  let noWebRegression = false;

  try {
    noWebRegression =
      !requiresWebIntelligence(
        ordinaryPrompt,
      );
  } catch {
    noWebRegression = false;
  }

  checks.push({
    name: "No-Web Regression",
    pass: noWebRegression,
    detail:
      noWebRegression
        ? "Ordinary question remained outside Live Intelligence."
        : "Ordinary question incorrectly activated Live Intelligence.",
    latencyMs:
      Date.now() -
      regressionStartedAt,
  });

  const passed =
    checks.filter(
      (check) => check.pass,
    ).length;

  const total =
    checks.length;

  const finalPass =
    total > 0 &&
    passed === total &&
    Boolean(
      decisionResult &&
      hasUsableLiveDecision(
        decisionResult,
      ),
    );

  return json(
    {
      success: finalPass,
      verified: finalPass,
      code: finalPass
        ? "C143_18_LIVE_DECISION_VERIFIED"
        : "C143_18_LIVE_DECISION_FAILED",
      stage:
        "production-live-decision-verification",
      runtime:
        APP_CONFIG.runtimeId,
      runtimeVersion:
        APP_CONFIG.version,
      timestamp:
        Date.now(),
      latencyMs:
        Date.now() -
        startedAt,
      pipeline:
        "Router -> Web -> Evidence -> Verification -> Decision",
      checks,
      summary: {
        passed,
        total,
      },
      decision:
        decisionResult?.decision
          ? {
              success:
                decisionResult.decision.success,
              conclusion:
                decisionResult.decision.conclusion,
              factCount:
                decisionResult.decision.facts.length,
              judgmentCount:
                decisionResult.decision.judgments.length,
              riskCount:
                decisionResult.decision.risks.length,
              opportunityCount:
                decisionResult.decision.opportunities.length,
              actionCount:
                decisionResult.decision
                  .recommendedActions.length,
              priority:
                decisionResult.decision.priority,
              nextStep:
                decisionResult.decision.nextStep,
              verification:
                decisionResult.decision.verification,
            }
          : null,
      evidence:
        evidence
          ? {
              success:
                evidence.success,
              verified:
                evidence.verified,
              sourceCount:
                evidence.sourceCount,
              sourceHosts:
                evidence.sourceHosts,
            }
          : null,
    },
    finalPass
      ? 200
      : 503,
  );
}
