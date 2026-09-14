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
  executeRuntime,
} from "@/lib/runtime/engine";

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
    "What is the current USD to CNY exchange rate today? Use live external web information, verify the evidence, analyze the evidence, make a practical decision, and recommend the safest useful next step.";

  const checks:
    VerificationCheck[] = [];

  const runtimeStartedAt =
    Date.now();

  try {
    const result =
      await executeRuntime({
        prompt,
        locale: "en",
      });

    const runtimePass =
      result.success === true;

    checks.push({
      name:
        "Main Runtime",
      pass:
        runtimePass,
      detail:
        runtimePass
          ? "executeRuntime completed successfully."
          : result.error ??
            "Main Runtime execution failed.",
      latencyMs:
        Date.now() -
        runtimeStartedAt,
    });

    const planPass =
      Boolean(
        result.planId &&
        result.planType &&
        result.intent,
      );

    checks.push({
      name:
        "Planner",
      pass:
        planPass,
      detail:
        planPass
          ? `Planner produced plan ${result.planId}.`
          : "Planner metadata was not returned.",
      latencyMs:
        Date.now() -
        runtimeStartedAt,
    });

    const webPass =
      result.webIntelligence?.required === true &&
      result.webIntelligence.success === true &&
      result.webIntelligence.verified === true &&
      result.webIntelligence.sourceCount >= 2;

    checks.push({
      name:
        "Web Intelligence",
      pass:
        webPass,
      detail:
        webPass
          ? `Runtime received verified evidence from ${result.webIntelligence?.sourceCount ?? 0} source(s).`
          : "Main Runtime did not expose usable verified Web Intelligence.",
      latencyMs:
        Date.now() -
        runtimeStartedAt,
    });

    const decisionPass =
      result.liveDecision?.success === true &&
      result.liveDecision.ready === true &&
      Boolean(
        result.liveDecision.conclusion &&
        result.liveDecision.nextStep,
      );

    checks.push({
      name:
        "Decision Layer",
      pass:
        decisionPass,
      detail:
        decisionPass
          ? "Main Runtime received a usable Decision Layer result."
          : "Main Runtime did not receive a usable Decision Layer result.",
      latencyMs:
        Date.now() -
        runtimeStartedAt,
    });

    const conclusionPass =
      Boolean(
        result.liveDecision?.conclusion?.trim(),
      );

    checks.push({
      name:
        "Conclusion",
      pass:
        conclusionPass,
      detail:
        conclusionPass
          ? result.liveDecision?.conclusion ??
            ""
          : "No Decision Layer conclusion was exposed.",
      latencyMs:
        Date.now() -
        runtimeStartedAt,
    });

    const nextStepPass =
      Boolean(
        result.liveDecision?.nextStep?.trim(),
      );

    checks.push({
      name:
        "Next Step",
      pass:
        nextStepPass,
      detail:
        nextStepPass
          ? result.liveDecision?.nextStep ??
            ""
          : "No Decision Layer next step was exposed.",
      latencyMs:
        Date.now() -
        runtimeStartedAt,
    });

    const brainAnswerPass =
      typeof result.content ===
        "string" &&
      result.content.trim().length > 0;

    checks.push({
      name:
        "Brain Answer",
      pass:
        brainAnswerPass,
      detail:
        brainAnswerPass
          ? "Brain produced a non-empty answer after Runtime decision preparation."
          : "Brain did not produce a usable answer.",
      latencyMs:
        Date.now() -
        runtimeStartedAt,
    });

    const sourceCount =
      result.webIntelligence
        ?.sourceCount ?? 0;

    const sourceHosts =
      result.webIntelligence
        ?.sourceHosts ?? [];

    const finalPass =
      checks.length > 0 &&
      checks.every(
        (check) =>
          check.pass,
      ) &&
      sourceCount >= 2 &&
      sourceHosts.length >= 2 &&
      decisionPass &&
      brainAnswerPass;

    return json(
      {
        success:
          finalPass,
        verified:
          finalPass,
        code:
          finalPass
            ? "C143_21_MAIN_RUNTIME_LIVE_DECISION_PASS"
            : "C143_21_MAIN_RUNTIME_LIVE_DECISION_FAILED",
        stage:
          "production-main-runtime-verification",
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
          "executeRuntime -> Planner -> Web -> Verification -> Decision -> Brain -> Answer",
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
        runtimeResult: {
          success:
            result.success,
          requestId:
            result.requestId,
          planId:
            result.planId,
          planType:
            result.planType,
          intent:
            result.intent,
          provider:
            result.provider,
          webIntelligence:
            result.webIntelligence,
          liveDecision:
            result.liveDecision,
          answerPresent:
            brainAnswerPass,
          answerPreview:
            result.content
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 500),
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
          "C143_21_MAIN_RUNTIME_EXCEPTION",
        stage:
          "production-main-runtime-verification",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        error:
          error instanceof Error
            ? error.message
            : "Main Runtime verification failed.",
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
