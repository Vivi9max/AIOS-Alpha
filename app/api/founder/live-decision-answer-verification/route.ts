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
  retrieveWebEvidence,
} from "@/lib/web-intelligence";
import {
  orchestrateLiveDecision,
} from "@/lib/runtime/live-decision-orchestrator";
import {
  buildLiveDecisionAnswer,
  buildLiveDecisionAnswerContext,
} from "@/lib/runtime/live-decision-answer";
export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";
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
  const startedAt =
    Date.now();
  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        stage:
          "authentication",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() - startedAt,
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
        code:
          "BRAVE_SEARCH_API_KEY_MISSING",
        stage:
          "configuration",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() - startedAt,
      },
      503,
    );
  }
  const prompt =
    "What is the current USD to CNY exchange rate today? Retrieve live external evidence, verify it, analyze it, make a practical decision, and present the result as a concise native AIOS answer.";
  const checks:
    VerificationCheck[] = [];
  try {
    const webStartedAt =
      Date.now();
    const web =
      await retrieveWebEvidence(
        prompt,
      );
    const webPass =
      web.success === true &&
      web.verified === true &&
      web.evidence.length >= 2 &&
      web.sourceCount >= 2;
    checks.push({
      name:
        "Web Intelligence",
      pass:
        webPass,
      detail:
        webPass
          ? `Verified evidence from ${web.sourceCount} source(s).`
          : "Usable verified web evidence was not returned.",
      latencyMs:
        Date.now() -
        webStartedAt,
    });
    const decisionStartedAt =
      Date.now();
    const orchestration =
      orchestrateLiveDecision(
        web,
      );
    const decision =
      orchestration.decision
        ?.decision;
    const decisionPass =
      orchestration.success === true &&
      orchestration.blocked === false &&
      Boolean(decision);
    checks.push({
      name:
        "Decision Layer",
      pass:
        decisionPass,
      detail:
        decisionPass
          ? "Decision Layer produced a usable decision."
          : orchestration.reason ??
            "Decision Layer did not produce a usable decision.",
      latencyMs:
        Date.now() -
        decisionStartedAt,
    });
    const factPass =
      Boolean(
        decision &&
        decision.facts.length > 0,
      );
    checks.push({
      name:
        "FACT",
      pass:
        factPass,
      detail:
        factPass
          ? `${decision?.facts.length ?? 0} fact item(s) produced.`
          : "No usable fact items were produced.",
      latencyMs:
        Date.now() -
        decisionStartedAt,
    });
    const judgmentPass =
      Boolean(
        decision &&
        decision.judgments.length > 0,
      );
    checks.push({
      name:
        "JUDGMENT",
      pass:
        judgmentPass,
      detail:
        judgmentPass
          ? `${decision?.judgments.length ?? 0} judgment item(s) produced.`
          : "No usable judgment items were produced.",
      latencyMs:
        Date.now() -
        decisionStartedAt,
    });
    const actionPass =
      Boolean(
        decision &&
        decision.recommendedActions.length > 0 &&
        decision.nextStep.trim(),
      );
    checks.push({
      name:
        "ACTION",
      pass:
        actionPass,
      detail:
        actionPass
          ? "Recommended action and next step are present."
          : "Recommended action or next step is missing.",
      latencyMs:
        Date.now() -
        decisionStartedAt,
    });
    const answerStartedAt =
      Date.now();
    const answer =
      decision
        ? buildLiveDecisionAnswer(
            decision,
            "en",
          )
        : {
            success: false,
            content: "",
            decisionReady: false,
            reason:
              "Decision was not available.",
          };
    const answerPass =
      answer.success === true &&
      answer.decisionReady === true &&
      answer.content.trim().length > 0;
    checks.push({
      name:
        "Native Answer",
      pass:
        answerPass,
      detail:
        answerPass
          ? "Live Decision was converted into a native AIOS answer."
          : answer.reason ??
            "Native Decision Answer generation failed.",
      latencyMs:
        Date.now() -
        answerStartedAt,
    });
    const context =
      decision
        ? buildLiveDecisionAnswerContext(
            decision,
          )
        : "";
    const contextPass =
      context.includes(
        "AIOS LIVE DECISION ANSWER CONTEXT",
      ) &&
      context.includes(
        "CONCLUSION",
      ) &&
      context.includes(
        "RECOMMENDED ACTIONS",
      ) &&
      context.includes(
        "NEXT STEP",
      );
    checks.push({
      name:
        "Answer Context",
      pass:
        contextPass,
      detail:
        contextPass
          ? "Structured Decision Answer Context is available to the Runtime."
          : "Decision Answer Context is incomplete.",
      latencyMs:
        Date.now() -
        answerStartedAt,
    });
    const finalPass =
      checks.length > 0 &&
      checks.every(
        (check) =>
          check.pass,
      );
    return json(
      {
        success:
          finalPass,
        verified:
          finalPass,
        code:
          finalPass
            ? "C143_23_LIVE_DECISION_NATIVE_ANSWER_PASS"
            : "C143_23_LIVE_DECISION_NATIVE_ANSWER_FAILED",
        stage:
          "production-live-decision-answer-verification",
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
          "Web -> Verification -> Decision -> FACT/JUDGMENT/ACTION -> Native Answer",
        checks,
        summary: {
          passed:
            checks.filter(
              (check) =>
                check.pass,
            ).length,
          total:
            checks.length,
        },
        decision: decision
          ? {
              success:
                decision.success,
              priority:
                decision.priority,
              conclusion:
                decision.conclusion,
              factCount:
                decision.facts.length,
              judgmentCount:
                decision.judgments.length,
              riskCount:
                decision.risks.length,
              opportunityCount:
                decision.opportunities.length,
              actionCount:
                decision.recommendedActions.length,
              nextStep:
                decision.nextStep,
            }
          : null,
        answer: {
          success:
            answer.success,
          decisionReady:
            answer.decisionReady,
          preview:
            answer.content
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 1000),
        },
      },
      finalPass
        ? 200
        : 503,
    );
  } catch (error) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "C143_23_LIVE_DECISION_NATIVE_ANSWER_EXCEPTION",
        stage:
          "production-live-decision-answer-verification",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        error:
          error instanceof Error
            ? error.message
            : "Live Decision Answer verification failed.",
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      503,
    );
  }
}
