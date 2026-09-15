import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  listCommercialObjectives,
  createCommercialObjective,
  type CommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  retrieveWebEvidence,
  type WebIntelligenceResult,
} from "@/lib/web-intelligence";

import {
  buildLiveDecision,
} from "@/lib/runtime/live-decision";

import {
  buildLiveCommercialExecutionPlan,
  isLiveCommercialExecutionReady,
} from "@/lib/runtime/live-commercial-execution";

import {
  buildLiveCommercialActionPackage,
  isLiveCommercialActionPackageReady,
} from "@/lib/runtime/live-commercial-action";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

const VERIFICATION_OBJECTIVE_TITLE =
  "C143.33.1 Live Commercial Action Verification";

const MAX_WEB_ATTEMPTS = 3;

async function getOrCreateVerificationObjective(): Promise<{
  objective: CommercialObjective;
  reused: boolean;
}> {
  const objectives =
    await listCommercialObjectives();

  const existing =
    objectives.find(
      (item) =>
        item.title.toLowerCase() ===
          VERIFICATION_OBJECTIVE_TITLE.toLowerCase() &&
        item.status !== "cancelled" &&
        item.status !== "completed",
    );

  if (existing) {
    return {
      objective: existing,
      reused: true,
    };
  }

  const objective =
    await createCommercialObjective({
      title:
        VERIFICATION_OBJECTIVE_TITLE,
      description:
        "Production verification of the AIOS live commercial action package.",
      status:
        "active",
      stage:
        "validation",
      currency:
        "USD",
      revenueTarget:
        100,
      costTarget:
        25,
      customerTarget:
        1,
      deadlineDays:
        7,
      successCriteria:
        "Generate a verified commercial action package from live external intelligence.",
      outcomeId:
        null,
      taskId:
        null,
    });

  return {
    objective,
    reused: false,
  };
}

function buildPrompts(
  objective: CommercialObjective,
): string[] {
  return [
    [
      `Commercial objective: ${objective.title}.`,
      "Find a currently actionable commercial opportunity.",
      "Use current external web information.",
      "Verify the evidence using multiple independent sources.",
      "Identify customer demand, competition, pricing, or market opportunity.",
      "Produce a concrete measurable commercial action.",
      "The action must be suitable for the smallest practical validation.",
    ].join("\n"),

    [
      "Find current market signals for AI-powered ecommerce automation services.",
      "Use recent external web information.",
      "Focus on customer demand, competitor activity, pricing, adoption, and commercial opportunity.",
      "Use multiple independent sources and verify the evidence.",
      "Do not rely on a single source.",
      "Produce a concrete measurable commercial validation action.",
    ].join("\n"),

    [
      "What are the current ecommerce and AI automation market opportunities?",
      "Use recent live web information from multiple independent sources.",
      "Compare demand signals, competitive activity, pricing signals, and customer needs.",
      "Prefer credible independent sources.",
      "Verify the evidence before reaching a conclusion.",
      "Turn the verified market signal into the smallest measurable commercial action.",
    ].join("\n"),
  ];
}

function isCommercialEvidenceReady(
  web: WebIntelligenceResult,
): boolean {
  return (
    web.success === true &&
    web.verified === true &&
    web.evidence.length >= 2 &&
    web.sourceCount >= 2 &&
    web.sourceHosts.length >= 2
  );
}

function scoreWebResult(
  web: WebIntelligenceResult,
): number {
  let score = 0;

  if (web.success) {
    score += 10;
  }

  if (web.verified) {
    score += 50;
  }

  score +=
    Math.min(web.evidence.length, 10) * 5;

  score +=
    Math.min(web.sourceCount, 10) * 3;

  score +=
    Math.min(web.sourceHosts.length, 10) * 5;

  if (web.verification?.corroborated) {
    score += 20;
  }

  return score;
}

async function retrieveCommercialEvidence(
  objective: CommercialObjective,
): Promise<{
  web: WebIntelligenceResult;
  attempts: Array<{
    attempt: number;
    evidenceCount: number;
    sourceCount: number;
    independentHosts: number;
    verified: boolean;
    success: boolean;
  }>;
}> {
  const prompts =
    buildPrompts(
      objective,
    );

  let bestWeb:
    | WebIntelligenceResult
    | null = null;

  const attempts: Array<{
    attempt: number;
    evidenceCount: number;
    sourceCount: number;
    independentHosts: number;
    verified: boolean;
    success: boolean;
  }> = [];

  for (
    let index = 0;
    index <
      Math.min(
        prompts.length,
        MAX_WEB_ATTEMPTS,
      );
    index += 1
  ) {
    const web =
      await retrieveWebEvidence(
        prompts[index],
      );

    attempts.push({
      attempt:
        index + 1,
      evidenceCount:
        web.evidence.length,
      sourceCount:
        web.sourceCount,
      independentHosts:
        web.sourceHosts.length,
      verified:
        web.verified,
      success:
        web.success,
    });

    if (
      !bestWeb ||
      scoreWebResult(web) >
        scoreWebResult(bestWeb)
    ) {
      bestWeb = web;
    }

    if (
      isCommercialEvidenceReady(
        web,
      )
    ) {
      return {
        web,
        attempts,
      };
    }
  }

  if (!bestWeb) {
    throw new Error(
      "COMMERCIAL_WEB_RETRIEVAL_FAILED",
    );
  }

  return {
    web: bestWeb,
    attempts,
  };
}

function check(
  name: string,
  passed: boolean,
  detail: string,
) {
  return {
    name,
    passed,
    detail,
  };
}

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  const identity =
    resolveAlphaIdentity(
      request,
    );

  try {
    const verification =
      await runWithUserContext(
        identity.userId,
        async () => {
          const objectiveResult =
            await getOrCreateVerificationObjective();

          const objective =
            objectiveResult.objective;

          const retrieval =
            await retrieveCommercialEvidence(
              objective,
            );

          const web =
            retrieval.web;

          if (
            !isCommercialEvidenceReady(
              web,
            )
          ) {
            return {
              success: false,
              objective,
              reused:
                objectiveResult.reused,
              web,
              webAttempts:
                retrieval.attempts,
              decision: null,
              executionPlan: null,
              actionPackage: null,
              checks: [
                check(
                  "LIVE_WEB_VERIFIED",
                  false,
                  `Commercial evidence remained insufficient after ${retrieval.attempts.length} retrieval attempt(s): evidence=${web.evidence.length}, sources=${web.sourceCount}, hosts=${web.sourceHosts.length}, verified=${web.verified}.`,
                ),
              ],
            };
          }

          const decision =
            buildLiveDecision(
              web,
            );

          if (
            !decision.success ||
            decision.verification?.verified !==
              true ||
            decision.evidence.length < 2 ||
            decision.recommendedActions.length ===
              0
          ) {
            return {
              success: false,
              objective,
              reused:
                objectiveResult.reused,
              web,
              webAttempts:
                retrieval.attempts,
              decision,
              executionPlan: null,
              actionPackage: null,
              checks: [
                check(
                  "LIVE_WEB_VERIFIED",
                  true,
                  `evidence=${web.evidence.length}, hosts=${web.sourceHosts.length}, attempts=${retrieval.attempts.length}`,
                ),
                check(
                  "LIVE_DECISION_VERIFIED",
                  false,
                  "Live decision did not satisfy verification requirements.",
                ),
              ],
            };
          }

          const executionPlan =
            buildLiveCommercialExecutionPlan(
              objective,
              decision,
            );

          if (
            !isLiveCommercialExecutionReady(
              executionPlan,
            )
          ) {
            return {
              success: false,
              objective,
              reused:
                objectiveResult.reused,
              web,
              webAttempts:
                retrieval.attempts,
              decision,
              executionPlan,
              actionPackage: null,
              checks: [
                check(
                  "LIVE_WEB_VERIFIED",
                  true,
                  `evidence=${web.evidence.length}, hosts=${web.sourceHosts.length}`,
                ),
                check(
                  "LIVE_DECISION_VERIFIED",
                  true,
                  `actions=${decision.recommendedActions.length}`,
                ),
                check(
                  "EXECUTION_PLAN_READY",
                  false,
                  `status=${executionPlan.status}`,
                ),
              ],
            };
          }

          const actionPackage =
            buildLiveCommercialActionPackage(
              objective,
              decision,
              executionPlan,
            );

          const actionReady =
            isLiveCommercialActionPackageReady(
              actionPackage,
            );

          const checks = [
            check(
              "LIVE_WEB_VERIFIED",
              web.success === true &&
                web.verified === true,
              `verified=${web.verified}, evidence=${web.evidence.length}, hosts=${web.sourceHosts.length}, attempts=${retrieval.attempts.length}`,
            ),

            check(
              "MULTI_SOURCE_EVIDENCE",
              web.evidence.length >= 2 &&
                web.sourceCount >= 2 &&
                web.sourceHosts.length >= 2,
              `evidence=${web.evidence.length}, sources=${web.sourceCount}, hosts=${web.sourceHosts.length}`,
            ),

            check(
              "LIVE_DECISION_VERIFIED",
              decision.success === true &&
                decision.verification?.verified ===
                  true,
              `verified=${decision.verification?.verified ?? false}, actions=${decision.recommendedActions.length}`,
            ),

            check(
              "EXECUTION_PLAN_READY",
              isLiveCommercialExecutionReady(
                executionPlan,
              ),
              `status=${executionPlan.status}, steps=${executionPlan.steps.length}`,
            ),

            check(
              "ACTION_PACKAGE_READY",
              actionReady,
              `status=${actionPackage.status}, type=${actionPackage.actionType}`,
            ),

            check(
              "MEASURABLE_TARGET",
              Boolean(
                actionPackage.measurableTarget,
              ),
              actionPackage.measurableTarget ||
                "NOT_DEFINED",
            ),

            check(
              "SUCCESS_SIGNAL",
              Boolean(
                actionPackage.successSignal,
              ),
              actionPackage.successSignal ||
                "NOT_DEFINED",
            ),

            check(
              "EXECUTION_CHANNEL",
              actionPackage.executionChannels.length >
                0,
              `channels=${actionPackage.executionChannels.length}`,
            ),

            check(
              "EXTERNAL_SIDE_EFFECT_GUARD",
              actionPackage.externalSideEffectRequired ===
                true &&
                actionPackage.externalSideEffectExecuted ===
                  false,
              `required=${actionPackage.externalSideEffectRequired}, executed=${actionPackage.externalSideEffectExecuted}`,
            ),

            check(
              "RESULT_INTEGRITY",
              true,
              "No revenue, customer, or cost Actual was fabricated.",
            ),
          ];

          return {
            success:
              checks.every(
                (item) =>
                  item.passed,
              ),
            objective,
            reused:
              objectiveResult.reused,
            web,
            webAttempts:
              retrieval.attempts,
            decision,
            executionPlan,
            actionPackage,
            checks,
          };
        },
      );

    const passed =
      verification.checks.filter(
        (item) => item.passed,
      ).length;

    const failed =
      verification.checks.length -
      passed;

    const success =
      verification.success &&
      failed === 0;

    return NextResponse.json({
      success,

      code:
        success
          ? "C143_33_1_LIVE_COMMERCIAL_ACTION_PASS"
          : "C143_33_1_LIVE_COMMERCIAL_ACTION_FAILED",

      verification:
        "C143.33.1",

      status:
        success
          ? "VERIFIED"
          : "FAILED",

      summary: {
        total:
          verification.checks.length,
        passed,
        failed,
        latencyMs:
          Date.now() -
          startedAt,
      },

      objective: {
        id:
          verification.objective.id,
        title:
          verification.objective.title,
        currency:
          verification.objective.currency,
        reused:
          verification.reused,
      },

      pipeline: [
        "LIVE_WEB_INTELLIGENCE",
        "VERIFIED_EVIDENCE",
        "LIVE_DECISION",
        "COMMERCIAL_EXECUTION_PLAN",
        "LIVE_COMMERCIAL_ACTION_PACKAGE",
      ],

      web:
        verification.web
          ? {
              success:
                verification.web.success,
              verified:
                verification.web.verified,
              evidenceCount:
                verification.web.evidence.length,
              sourceCount:
                verification.web.sourceCount,
              independentHosts:
                verification.web.sourceHosts.length,
              attempts:
                verification.webAttempts,
            }
          : null,

      decision:
        verification.decision
          ? {
              success:
                verification.decision.success,
              verified:
                verification.decision.verification?.verified ??
                false,
              priority:
                verification.decision.priority,
              actionCount:
                verification.decision.recommendedActions.length,
              conclusion:
                verification.decision.conclusion,
              nextStep:
                verification.decision.nextStep,
            }
          : null,

      executionPlan:
        verification.executionPlan
          ? {
              success:
                verification.executionPlan.success,
              status:
                verification.executionPlan.status,
              stepCount:
                verification.executionPlan.steps.length,
              evidenceCount:
                verification.executionPlan.evidenceCount,
              verified:
                verification.executionPlan.verified,
            }
          : null,

      actionPackage:
        verification.actionPackage
          ? {
              success:
                verification.actionPackage.success,
              status:
                verification.actionPackage.status,
              actionType:
                verification.actionPackage.actionType,
              title:
                verification.actionPackage.title,
              primaryAction:
                verification.actionPackage.primaryAction,
              measurableTarget:
                verification.actionPackage.measurableTarget,
              successSignal:
                verification.actionPackage.successSignal,
              executionChannels:
                verification.actionPackage.executionChannels,
              externalSideEffectRequired:
                verification.actionPackage.externalSideEffectRequired,
              externalSideEffectExecuted:
                verification.actionPackage.externalSideEffectExecuted,
              verified:
                verification.actionPackage.verified,
            }
          : null,

      checks:
        verification.checks,

      integrity: {
        fabricatedActuals:
          false,
        verifiedResultGate:
          true,
      },

      capabilityTrace: [
        "live-web-intelligence",
        "commercial-evidence-retry",
        "verified-evidence",
        "multi-source-verification",
        "live-decision",
        "commercial-execution-plan",
        "live-commercial-action-package",
        "external-side-effect-guard",
        "verified-result-gate",
      ],

      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code:
          "C143_33_1_LIVE_COMMERCIAL_ACTION_ERROR",
        verification:
          "C143.33.1",
        status:
          "ERROR",
        error:
          error instanceof Error
            ? error.message
            : String(error),
        latencyMs:
          Date.now() -
          startedAt,
        timestamp:
          Date.now(),
      },
      {
        status: 500,
      },
    );
  }
}
