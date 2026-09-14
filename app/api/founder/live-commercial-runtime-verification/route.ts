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
  createCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

import {
  buildLiveDecision,
} from "@/lib/runtime/live-decision";

import {
  executeLiveCommercialRuntime,
  isLiveCommercialRuntimeReady,
} from "@/lib/runtime/live-commercial-runtime";

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

function check(
  checks: VerificationCheck[],
  name: string,
  pass: boolean,
  detail: string,
  startedAt: number,
) {
  checks.push({
    name,
    pass,
    detail,
    latencyMs:
      Date.now() -
      startedAt,
  });
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
          Date.now() -
          startedAt,
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
          Date.now() -
          startedAt,
      },
      503,
    );
  }

  const checks: VerificationCheck[] =
    [];

  try {
    /*
     * STEP 1
     * Real Main Runtime
     *
     * The decision used below must come from
     * real external intelligence returned by
     * executeRuntime.
     */
    const runtimeStartedAt =
      Date.now();

    const runtime =
      await executeRuntime({
        prompt:
          "What is the current USD to CNY exchange rate today? Use live external web information, verify multiple sources, make a practical commercial judgment, and identify the smallest useful next action for a business decision.",
        locale:
          "en",
      });

    check(
      checks,
      "Main Runtime",
      runtime.success === true,
      runtime.success
        ? "executeRuntime completed successfully."
        : runtime.error ??
            "Main Runtime failed.",
      runtimeStartedAt,
    );

    /*
     * STEP 2
     * Real Web Intelligence
     */
    const web =
      runtime.webIntelligence;

    const webPass =
      Boolean(web) &&
      web.required === true &&
      web.success === true &&
      web.verified === true &&
      web.sourceCount >= 2 &&
      web.sourceHosts.length >= 2;

    check(
      checks,
      "Web Intelligence",
      webPass,
      webPass
        ? `Verified external evidence from ${web?.sourceCount ?? 0} source(s) and ${web?.sourceHosts?.length ?? 0} host(s).`
        : "Verified Web Intelligence was not returned.",
      runtimeStartedAt,
    );

    if (
      !webPass ||
      !web
    ) {
      return json(
        {
          success: false,
          verified: false,
          code:
            "C143_31_WEB_INTELLIGENCE_FAILED",
          stage:
            "web-intelligence",
          runtime:
            APP_CONFIG.runtimeId,
          runtimeVersion:
            APP_CONFIG.version,
          checks,
          timestamp:
            Date.now(),
          latencyMs:
            Date.now() -
            startedAt,
        },
        503,
      );
    }

    /*
     * STEP 3
     * Build the actual Decision Layer
     * directly from the verified Web result.
     */
    const decisionStartedAt =
      Date.now();

    const decision =
      buildLiveDecision(
        web,
      );

    const decisionPass =
      decision.success === true &&
      decision.verification?.verified ===
        true &&
      decision.evidence.length >= 2 &&
      decision.facts.length > 0 &&
      decision.judgments.length > 0 &&
      decision.recommendedActions.length >
        0 &&
      Boolean(
        decision.conclusion,
      ) &&
      Boolean(
        decision.nextStep,
      );

    check(
      checks,
      "Decision Layer",
      decisionPass,
      decisionPass
        ? "Verified Web Intelligence produced a usable commercial Decision."
        : "Decision Layer did not produce a usable verified decision.",
      decisionStartedAt,
    );

    if (!decisionPass) {
      return json(
        {
          success: false,
          verified: false,
          code:
            "C143_31_DECISION_FAILED",
          stage:
            "decision",
          runtime:
            APP_CONFIG.runtimeId,
          runtimeVersion:
            APP_CONFIG.version,
          checks,
          decision,
          timestamp:
            Date.now(),
          latencyMs:
            Date.now() -
            startedAt,
        },
        503,
      );
    }

    /*
     * STEP 4
     * Create a real Commercial Objective.
     *
     * This is intentionally a small validation
     * objective. It creates real persistence so
     * the Runtime can prove Objective -> Outcome
     * -> Task linkage.
     */
    const objectiveStartedAt =
      Date.now();

    const objective =
      await createCommercialObjective({
        title:
          `C143.31 Live Commercial Runtime Verification ${new Date().toISOString()}`,
        description:
          "Founder-only production verification of Live Intelligence -> Decision -> Commercial Objective -> Execution Task.",
        status:
          "planned",
        stage:
          "validation",
        currency:
          "USD",
        revenueTarget:
          1,
        costTarget:
          1,
        customerTarget:
          1,
        successCriteria:
          "Verify that a real live decision can become a persistent commercial execution task without fabricating a business result.",
        deadlineDays:
          1,
      });

    const objectivePass =
      Boolean(
        objective.id,
      ) &&
      objective.currency ===
        "USD" &&
      objective.stage ===
        "validation";

    check(
      checks,
      "Commercial Objective",
      objectivePass,
      objectivePass
        ? `Commercial Objective ${objective.id} created successfully.`
        : "Commercial Objective could not be created correctly.",
      objectiveStartedAt,
    );

    if (!objectivePass) {
      return json(
        {
          success: false,
          verified: false,
          code:
            "C143_31_OBJECTIVE_FAILED",
          stage:
            "commercial-objective",
          runtime:
            APP_CONFIG.runtimeId,
          runtimeVersion:
            APP_CONFIG.version,
          checks,
          objective,
          decision,
          timestamp:
            Date.now(),
          latencyMs:
            Date.now() -
            startedAt,
        },
        503,
      );
    }

    /*
     * STEP 5
     * Execute the unified commercial runtime.
     *
     * No external side effect is fabricated here.
     * The expected result is a persistent internal
     * Task entering "doing".
     */
    const commercialStartedAt =
      Date.now();

    const commercial =
      await executeLiveCommercialRuntime({
        objectiveId:
          objective.id,
        decision,
      });

    const commercialPass =
      commercial.success === true &&
      (
        commercial.status ===
          "task-started" ||
        commercial.status ===
          "already-running"
      ) &&
      Boolean(
        commercial.taskId,
      ) &&
      Boolean(
        commercial.outcomeId,
      ) &&
      commercial.execution !==
        null &&
      (
        commercial.execution.taskStatus ===
          "doing" ||
        commercial.execution.taskStatus ===
          "done"
      );

    check(
      checks,
      "Commercial Runtime",
      commercialPass,
      commercialPass
        ? "Live Decision was converted into a persistent commercial execution task."
        : commercial.conclusion,
      commercialStartedAt,
    );

    /*
     * STEP 6
     * Explicitly verify that an unverified
     * commercial result is blocked.
     *
     * This proves AIOS does not invent revenue,
     * customers or cost.
     */
    const integrityStartedAt =
      Date.now();

    const integrity =
      commercial.taskId
        ? await executeLiveCommercialRuntime({
            objectiveId:
              objective.id,
            decision,
            result: {
              objectiveId:
                objective.id,
              taskId:
                commercial.taskId,
              verified:
                false,
              revenue:
                999999,
              customers:
                999,
              cost:
                0,
              note:
                "C143.31 negative integrity test. This result must never be recorded.",
            },
          })
        : null;

    const integrityPass =
      integrity !== null &&
      integrity.success === false &&
      integrity.status ===
        "blocked" &&
      integrity.result?.verified ===
        false &&
      integrity.result?.taskCompleted ===
        false;

    check(
      checks,
      "Result Integrity Gate",
      integrityPass,
      integrityPass
        ? "Unverified commercial results are correctly blocked; no fabricated business actuals were recorded."
        : "Result integrity gate failed.",
      integrityStartedAt,
    );

    /*
     * STEP 7
     * Final runtime readiness.
     */
    const readinessStartedAt =
      Date.now();

    const readinessPass =
      isLiveCommercialRuntimeReady(
        commercial,
      );

    check(
      checks,
      "Runtime Readiness",
      readinessPass,
      readinessPass
        ? "Unified Live Commercial Runtime reports a valid execution state."
        : "Unified Live Commercial Runtime is not reporting a valid execution state.",
      readinessStartedAt,
    );

    const passed =
      checks.filter(
        (item) =>
          item.pass,
      ).length;

    const finalPass =
      checks.length > 0 &&
      passed ===
        checks.length;

    return json(
      {
        success:
          finalPass,
        verified:
          finalPass,
        code:
          finalPass
            ? "C143_31_LIVE_COMMERCIAL_RUNTIME_PASS"
            : "C143_31_LIVE_COMMERCIAL_RUNTIME_FAILED",
        stage:
          "production-live-commercial-runtime-verification",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        pipeline:
          "Live Intelligence -> Decision -> Commercial Objective -> Outcome -> Task -> Task Execution -> Verified Result Gate",
        checks,
        summary: {
          passed,
          total:
            checks.length,
          failed:
            checks.length -
            passed,
        },
        objective: {
          id:
            objective.id,
          title:
            objective.title,
          currency:
            objective.currency,
          stage:
            objective.stage,
          status:
            objective.status,
        },
        decision: {
          success:
            decision.success,
          priority:
            decision.priority,
          conclusion:
            decision.conclusion,
          nextStep:
            decision.nextStep,
          evidenceCount:
            decision.evidence.length,
          verified:
            decision.verification?.verified ??
            false,
        },
        commercial: {
          success:
            commercial.success,
          status:
            commercial.status,
          taskId:
            commercial.taskId,
          outcomeId:
            commercial.outcomeId,
          milestoneId:
            commercial.milestoneId,
          taskStatus:
            commercial.execution?.taskStatus ??
            null,
          conclusion:
            commercial.conclusion,
          nextStep:
            commercial.nextStep,
        },
        integrity: integrity
          ? {
              success:
                integrity.success,
              status:
                integrity.status,
              resultVerified:
                integrity.result?.verified ??
                false,
              taskCompleted:
                integrity.result?.taskCompleted ??
                false,
              conclusion:
                integrity.conclusion,
            }
          : null,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
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
          "C143_31_LIVE_COMMERCIAL_RUNTIME_EXCEPTION",
        stage:
          "production-live-commercial-runtime-verification",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        error:
          error instanceof Error
            ? error.message
            : "Live Commercial Runtime verification failed.",
        checks,
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
