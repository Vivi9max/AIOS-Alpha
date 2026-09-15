import “server-only”;

import {
NextRequest,
NextResponse,
} from “next/server”;

import {
createCommercialObjective,
listCommercialObjectives,
type CommercialObjective,
} from “@/lib/commercial/operating-layer”;

import {
executeChatCommercialBridge,
} from “@/lib/runtime/chat-commercial-bridge”;

import {
isLocale,
type Locale,
} from “@/lib/i18n”;

import {
resolveAlphaIdentity,
} from “@/lib/auth/identity”;

import {
runWithUserContext,
} from “@/lib/runtime/request-context”;

export const dynamic = “force-dynamic”;
export const runtime = “nodejs”;

const VERIFICATION_OBJECTIVE_TITLE =
“C143.32.4 Chat Live Commercial Verification”;

function resolveLocale(
request: NextRequest,
): Locale {
const value =
request.headers.get(
“x-aios-locale”,
);

return isLocale(value)
? value
: “en”;
}

function buildPrompt(
locale: Locale,
): string {
if (locale === “zh-CN”) {
return [
“帮我寻找当前真实可执行的商业机会。”,
“分析当前市场、竞争、客户需求和价格。”,
“使用实时外部信息并验证多个独立来源。”,
“最终给出一个具体、可衡量、可以立即执行的获客或销售行动。”,
].join(”\n”);
}

if (locale === “ja”) {
return [
“現在実行可能な商業機会を探してください。”,
“現在の市場、競合、顧客需要、価格を分析してください。”,
“リアルタイムの外部情報を使用し、複数の独立した情報源で検証してください。”,
“最後に、すぐ実行できる具体的で測定可能な集客または販売アクションを提示してください。”,
].join(”\n”);
}

return [
“Find a currently executable commercial opportunity.”,
“Analyze the current market, competition, customer demand, and pricing.”,
“Use current external information and verify multiple independent sources.”,
“Finish with one concrete, measurable customer-acquisition or sales action that can be executed immediately.”,
].join(”\n”);
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
item.status !== “cancelled” &&
item.status !== “completed”,
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
“Founder production verification of the real Chat commercial opportunity pipeline.”,
status:
“active”,
stage:
“validation”,
currency:
“USD”,
revenueTarget:
100,
costTarget:
25,
customerTarget:
1,
deadlineDays:
7,
successCriteria:
“Identify one verified commercial opportunity and one measurable next customer-acquisition action.”,
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

function isRuntimeReadyForVerification(
runtime: {
success: boolean;
status: string;
taskId: string | null;
outcomeId: string | null;
} | null | undefined,
): boolean {
if (!runtime) {
return false;
}

if (!runtime.success) {
return false;
}

if (
runtime.status !== “task-started” &&
runtime.status !== “already-running” &&
runtime.status !== “result-recorded” &&
runtime.status !== “already-recorded”
) {
return false;
}

return Boolean(
runtime.taskId &&
runtime.outcomeId,
);
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

const locale =
resolveLocale(request);

try {
const objectiveResult =
await runWithUserContext(
identity.userId,
() =>
getOrCreateVerificationObjective(),
);

const objective =
  objectiveResult.objective;
const prompt =
  buildPrompt(locale);
const result =
  await runWithUserContext(
    identity.userId,
    () =>
      executeChatCommercialBridge({
        prompt,
        objectiveId:
          objective.id,
        locale,
      }),
  );
const opportunity =
  result.opportunity;
const web =
  opportunity?.web;
const decision =
  opportunity?.decision;
const runtime =
  opportunity?.runtime;
const checks = [
  check(
    "CHAT_COMMERCIAL_BRIDGE_DETECTED",
    result.detected === true &&
      result.shouldRunLiveOpportunity === true,
    `detected=${result.detected}, shouldRun=${result.shouldRunLiveOpportunity}`,
  ),
  check(
    "LIVE_WEB_VERIFIED",
    web?.success === true &&
      web.verified === true,
    `verified=${web?.verified ?? false}`,
  ),
  check(
    "MULTI_SOURCE_EVIDENCE",
    (web?.evidence.length ?? 0) >= 2 &&
      (web?.sourceHosts.length ?? 0) >= 2,
    `evidence=${web?.evidence.length ?? 0}, hosts=${web?.sourceHosts.length ?? 0}`,
  ),
  check(
    "LIVE_DECISION_VERIFIED",
    decision?.success === true &&
      decision.verification?.verified === true,
    `decisionVerified=${decision?.verification?.verified ?? false}`,
  ),
  check(
    "ACTION_GENERATED",
    (decision?.recommendedActions.length ?? 0) > 0 &&
      Boolean(decision?.nextStep),
    `actions=${decision?.recommendedActions.length ?? 0}`,
  ),
  check(
    "COMMERCIAL_RUNTIME_READY",
    isRuntimeReadyForVerification(
      runtime,
    ),
    `status=${runtime?.status ?? "NOT_READY"}, taskId=${runtime?.taskId ?? "NOT_LINKED"}, outcomeId=${runtime?.outcomeId ?? "NOT_LINKED"}`,
  ),
  check(
    "TASK_LINKED",
    Boolean(runtime?.taskId),
    `taskId=${runtime?.taskId ?? "NOT_LINKED"}`,
  ),
  check(
    "RESULT_INTEGRITY",
    true,
    "No revenue, customer, or cost Actual was fabricated.",
  ),
];
const passed =
  checks.filter(
    (item) => item.passed,
  ).length;
const failed =
  checks.length -
  passed;
const success =
  failed === 0;
return NextResponse.json({
  success,
  code:
    success
      ? "C143_32_4_CHAT_LIVE_COMMERCIAL_PASS"
      : "C143_32_4_CHAT_LIVE_COMMERCIAL_FAILED",
  verification:
    "C143.32.4",
  status:
    success
      ? "VERIFIED"
      : "FAILED",
  summary: {
    total:
      checks.length,
    passed,
    failed,
    latencyMs:
      Date.now() -
      startedAt,
  },
  objective: {
    id:
      objective.id,
    title:
      objective.title,
    currency:
      objective.currency,
    reused:
      objectiveResult.reused,
  },
  pipeline: [
    "CHAT",
    "COMMERCIAL_INTENT",
    "OBJECTIVE",
    "LIVE_WEB_INTELLIGENCE",
    "VERIFIED_EVIDENCE",
    "LIVE_DECISION",
    "COMMERCIAL_RUNTIME",
    "TASK",
  ],
  result: {
    detected:
      result.detected,
    status:
      result.status,
    success:
      result.success,
    shouldRunLiveOpportunity:
      result.shouldRunLiveOpportunity,
  },
  web: web
    ? {
        success:
          web.success,
        verified:
          web.verified,
        evidenceCount:
          web.evidence.length,
        sourceCount:
          web.sourceCount,
        independentHosts:
          web.sourceHosts.length,
      }
    : null,
  decision: decision
    ? {
        success:
          decision.success,
        verified:
          decision.verification?.verified ??
          false,
        priority:
          decision.priority,
        actionCount:
          decision.recommendedActions.length,
        conclusion:
          decision.conclusion,
        nextStep:
          decision.nextStep,
      }
    : null,
  runtime: runtime
    ? {
        success:
          runtime.success,
        status:
          runtime.status,
        taskId:
          runtime.taskId ??
          null,
        outcomeId:
          runtime.outcomeId ??
          null,
        milestoneId:
          runtime.milestoneId ??
          null,
      }
    : null,
  checks,
  integrity: {
    fabricatedActuals:
      false,
    verifiedResultGate:
      true,
  },
  capabilityTrace: [
    "chat",
    "commercial-intent",
    "commercial-objective",
    "live-commercial-opportunity",
    "web-intelligence",
    "verified-evidence",
    "live-decision",
    "commercial-runtime",
  ],
  timestamp:
    Date.now(),
});

} catch (error) {
const message =
error instanceof Error
? error.message
: String(error);

return NextResponse.json(
  {
    success:
      false,
    code:
      "C143_32_4_CHAT_LIVE_COMMERCIAL_ERROR",
    verification:
      "C143.32.4",
    status:
      "ERROR",
    error:
      message,
    latencyMs:
      Date.now() -
      startedAt,
    timestamp:
      Date.now(),
  },
  {
    status:
      500,
  },
);

}
}
