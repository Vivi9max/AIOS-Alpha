import “server-only”;

import {
getCommercialObjective,
type CommercialObjective,
} from “@/lib/commercial/operating-layer”;

import {
retrieveWebEvidence,
type WebIntelligenceResult,
} from “@/lib/web-intelligence”;

import {
buildLiveDecision,
type LiveDecision,
} from “@/lib/runtime/live-decision”;

import {
executeLiveCommercialRuntime,
isLiveCommercialRuntimeReady,
type LiveCommercialRuntimeResult,
} from “@/lib/runtime/live-commercial-runtime”;

export type LiveCommercialOpportunityStatus =
| “ready”
| “blocked”
| “objective-not-found”
| “web-failed”
| “decision-blocked”
| “runtime-blocked”;

export interface LiveCommercialOpportunityInput {
objectiveId: string;
prompt?: string;
}

export interface LiveCommercialOpportunityResult {
success: boolean;
status: LiveCommercialOpportunityStatus;
objectiveId: string;
objective: CommercialObjective | null;
web: WebIntelligenceResult | null;
decision: LiveDecision | null;
runtime: LiveCommercialRuntimeResult | null;
conclusion: string;
nextStep: string;
timestamp: number;
}

function normalizeText(
value: unknown,
maxLength = 2000,
): string {
if (typeof value !== “string”) {
return “”;
}

return value
.replace(/\s+/g, “ “)
.trim()
.slice(0, maxLength);
}

function buildObjectiveMarketPrompt(
objective: CommercialObjective,
): string {
return [
Commercial objective: ${objective.title}.,
Description: ${objective.description}.,
Stage: ${objective.stage}.,
Revenue target: ${objective.revenueTarget} ${objective.currency}.,
Customer target: ${objective.customerTarget}.,
Cost target: ${objective.costTarget} ${objective.currency}.,
Success criteria: ${objective.successCriteria}.,
“”,
“Use current external web information.”,
“Identify the most relevant current market evidence.”,
“Verify the evidence using multiple independent sources.”,
“Determine what this means for the commercial objective.”,
“Produce one concrete, measurable next commercial action.”,
].join(”\n”);
}

function buildBlockedResult(
input: LiveCommercialOpportunityInput,
objective: CommercialObjective | null,
status: LiveCommercialOpportunityStatus,
conclusion: string,
nextStep: string,
web: WebIntelligenceResult | null = null,
decision: LiveDecision | null = null,
runtime: LiveCommercialRuntimeResult | null = null,
): LiveCommercialOpportunityResult {
return {
success: false,
status,
objectiveId: input.objectiveId,
objective,
web,
decision,
runtime,
conclusion,
nextStep,
timestamp: Date.now(),
};
}

/**

* C143.32
* Commercial Objective
* -> Live Web Intelligence
* -> Verified Evidence
* -> Live Decision
* -> Commercial Runtime
* -> Execution Task
* This layer never fabricates:
* ●	market evidence
* ●	customer demand
* ●	revenue
* ●	costs
* ●	commercial results
        */
        export async function executeLiveCommercialOpportunity(
        input: LiveCommercialOpportunityInput,
        ): Promise {
        const objective =
        await getCommercialObjective(
        input.objectiveId,
        );

if (!objective) {
return buildBlockedResult(
input,
null,
“objective-not-found”,
“The commercial objective could not be found.”,
“Create or restore the commercial objective before requesting live commercial intelligence.”,
);
}

const prompt =
normalizeText(input.prompt) ||
buildObjectiveMarketPrompt(
objective,
);

const web =
await retrieveWebEvidence(prompt);

if (
!web.success ||
!web.verified ||
web.evidence.length < 2 ||
web.sourceCount < 2 ||
web.sourceHosts.length < 2
) {
return buildBlockedResult(
input,
objective,
“web-failed”,
“The commercial opportunity is blocked because current external evidence is insufficiently verified.”,
“Strengthen the live evidence before converting it into a commercial decision.”,
web,
);
}

const decision =
buildLiveDecision(web);

if (
!decision.success ||
decision.verification?.verified !== true ||
decision.evidence.length < 2 ||
!normalizeText(
decision.conclusion,
) ||
!normalizeText(
decision.nextStep,
) ||
decision.recommendedActions.length === 0
) {
return buildBlockedResult(
input,
objective,
“decision-blocked”,
“Verified market evidence was obtained, but AIOS could not produce a usable commercial decision.”,
“Generate a concrete measurable action before starting commercial execution.”,
web,
decision,
);
}

const runtime =
await executeLiveCommercialRuntime({
objectiveId: objective.id,
decision,
});

if (
!isLiveCommercialRuntimeReady(
runtime,
)
) {
return buildBlockedResult(
input,
objective,
“runtime-blocked”,
runtime.conclusion ||
“The verified commercial decision could not be converted into a ready execution state.”,
runtime.nextStep ||
“Resolve the commercial runtime block before execution.”,
web,
decision,
runtime,
);
}

return {
success: true,
status: “ready”,
objectiveId: objective.id,
objective,
web,
decision,
runtime,
conclusion:
runtime.conclusion ||
decision.conclusion,
nextStep:
runtime.nextStep ||
decision.nextStep,
timestamp: Date.now(),
};
}

export function isLiveCommercialOpportunityReady(
result: LiveCommercialOpportunityResult,
): boolean {
if (!result.success) {
return false;
}

if (result.status !== “ready”) {
return false;
}

if (!result.objective) {
return false;
}

if (
!result.web ||
!result.web.success ||
!result.web.verified ||
result.web.evidence.length < 2
) {
return false;
}

if (
!result.decision ||
!result.decision.success ||
result.decision.verification?.verified !== true ||
result.decision.evidence.length < 2
) {
return false;
}

if (!result.runtime) {
return false;
}

return isLiveCommercialRuntimeReady(
result.runtime,
);
}

export function buildLiveCommercialOpportunityContext(
result: LiveCommercialOpportunityResult,
): string {
const lines = [
“AIOS LIVE COMMERCIAL OPPORTUNITY”,
“”,
“PIPELINE:”,
“COMMERCIAL OBJECTIVE -> LIVE INTELLIGENCE -> VERIFIED EVIDENCE -> DECISION -> COMMERCIAL RUNTIME”,
“”,
STATUS: ${result.status},
SUCCESS: ${result.success ? "YES" : "NO"},
OBJECTIVE ID: ${result.objectiveId},
];

if (result.objective) {
lines.push(
OBJECTIVE: ${result.objective.title},
STAGE: ${result.objective.stage},
CURRENCY: ${result.objective.currency},
REVENUE TARGET: ${result.objective.revenueTarget},
CUSTOMER TARGET: ${result.objective.customerTarget},
COST TARGET: ${result.objective.costTarget},
);
}

if (result.web) {
lines.push(
“”,
“LIVE WEB INTELLIGENCE:”,
SUCCESS: ${result.web.success ? "YES" : "NO"},
VERIFIED: ${result.web.verified ? "YES" : "NO"},
EVIDENCE COUNT: ${result.web.evidence.length},
SOURCE COUNT: ${result.web.sourceCount},
INDEPENDENT HOSTS: ${result.web.sourceHosts.length},
);
}

if (result.decision) {
lines.push(
“”,
“LIVE DECISION:”,
SUCCESS: ${result.decision.success ? "YES" : "NO"},
VERIFIED: ${ result.decision.verification?.verified ? "YES" : "NO" },
PRIORITY: ${result.decision.priority},
CONCLUSION: ${result.decision.conclusion},
NEXT STEP: ${result.decision.nextStep},
ACTIONS: ${result.decision.recommendedActions.length},
);
}

if (result.runtime) {
lines.push(
“”,
“COMMERCIAL RUNTIME:”,
STATUS: ${result.runtime.status},
SUCCESS: ${result.runtime.success ? "YES" : "NO"},
TASK ID: ${result.runtime.taskId ?? "NOT LINKED"},
OUTCOME ID: ${result.runtime.outcomeId ?? "NOT LINKED"},
MILESTONE ID: ${result.runtime.milestoneId ?? "NOT LINKED"},
);
}

lines.push(
“”,
CONCLUSION: ${result.conclusion},
NEXT STEP: ${result.nextStep},
“”,
“RESULT INTEGRITY:”,
“No revenue, customer, cost, or other commercial actual is fabricated by this layer.”,
“Commercial actuals remain writable only through the verified-result gate.”,
);

return lines.join(”\n”);
}
