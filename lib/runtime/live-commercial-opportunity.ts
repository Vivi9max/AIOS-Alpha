import “server\-only”;

import \{
getCommercialObjective,
type CommercialObjective,
\} from “@/lib/commercial/operating\-layer”;

import \{
retrieveWebEvidence,
type WebIntelligenceResult,
\} from “@/lib/web\-intelligence”;

import \{
buildLiveDecision,
type LiveDecision,
\} from “@/lib/runtime/live\-decision”;

import \{
executeLiveCommercialRuntime,
isLiveCommercialRuntimeReady,
type LiveCommercialRuntimeResult,
\} from “@/lib/runtime/live\-commercial\-runtime”;

export type LiveCommercialOpportunityStatus =
\| “ready”
\| “blocked”
\| “objective\-not\-found”
\| “web\-failed”
\| “decision\-blocked”
\| “runtime\-blocked”;

export interface LiveCommercialOpportunityInput \{
objectiveId: string;

/\*\*

- Optional market/commercial question\.
- 
- When omitted, AIOS derives a question from
- the commercial objective itself\.
  \*/
  prompt?: string;
  \}

export interface LiveCommercialOpportunityResult \{
success: boolean;

status: LiveCommercialOpportunityStatus;

objectiveId: string;

objective: CommercialObjective \| null;

web: WebIntelligenceResult \| null;

decision: LiveDecision \| null;

runtime: LiveCommercialRuntimeResult \| null;

conclusion: string;

nextStep: string;

timestamp: number;
\}

function normalizeText&#40;
value: unknown,
maxLength = 2000,
&#41;: string \{
if &#40;typeof value \!== “string”&#41; \{
return “”;
\}

return value
\.replace&#40;/\\s\+/g, “ “&#41;
\.trim&#40;&#41;
\.slice&#40;0, maxLength&#41;;
\}

function buildObjectiveMarketPrompt&#40;
objective: CommercialObjective,
&#41;: string \{
const parts = &#91;
`Commercial objective: ${objective.title}.`,
`Description: ${objective.description}.`,
`Stage: ${objective.stage}.`,
`Revenue target: ${objective.revenueTarget} ${objective.currency}.`,
`Customer target: ${objective.customerTarget}.`,
`Cost target: ${objective.costTarget} ${objective.currency}.`,
`Success criteria: ${objective.successCriteria}.`,
“”,
“Use current external web information\.”,
“Identify the most relevant current market evidence\.”,
“Verify the evidence using multiple independent sources\.”,
“Determine what this means for the commercial objective\.”,
“Produce one concrete, measurable next commercial action\.”,
&#93;;

return parts\.join&#40;”\\n”&#41;;
\}

function buildBlockedResult&#40;
input: LiveCommercialOpportunityInput,
objective: CommercialObjective \| null,
status: LiveCommercialOpportunityStatus,
conclusion: string,
nextStep: string,
web: WebIntelligenceResult \| null = null,
decision: LiveDecision \| null = null,
runtime: LiveCommercialRuntimeResult \| null = null,
&#41;: LiveCommercialOpportunityResult \{
return \{
success: false,
status,
objectiveId: input\.objectiveId,
objective,
web,
decision,
runtime,
conclusion,
nextStep,
timestamp: Date\.now&#40;&#41;,
\};
\}

/\*\*

- C143\.32
- 
- Converts an existing Commercial Objective into a
- live, evidence\-backed commercial decision and then
- into the existing Commercial Runtime\.
- 
- Pipeline:
- 
- Commercial Objective
- ```
    ->
  ```
- Live Web Intelligence
- ```
    ->
  ```
- Evidence Verification
- ```
    ->
  ```
- Live Decision
- ```
    ->
  ```
- Commercial Runtime
- ```
    ->
  ```
- Execution Task
- 
- This function does not fabricate:
- 
  - market evidence
- 
  - customer demand
- 
  - revenue
- 
  - costs
- 
  - business results
- 
- Real commercial actuals remain protected by the
- existing verified\-result gate\.
  \*/
  export async function executeLiveCommercialOpportunity&#40;
  input: LiveCommercialOpportunityInput,
  &#41;: Promise  <LiveCommercialOpportunityResult> \{
  const objective =
  await getCommercialObjective&#40;
  input\.objectiveId,
  &#41;;

if &#40;\!objective&#41; \{
return buildBlockedResult&#40;
input,
null,
“objective\-not\-found”,
“The commercial objective could not be found\.”,
“Create or restore the commercial objective before requesting live commercial intelligence\.”,
&#41;;
\}

const prompt =
normalizeText&#40;
input\.prompt,
&#41; \|\|
buildObjectiveMarketPrompt&#40;
objective,
&#41;;

/\*

- Step 1:
- Obtain fresh external evidence\.
  \*/
  const web =
  await retrieveWebEvidence&#40;
  prompt,
  &#41;;

if &#40;
\!web\.success \|\|
\!web\.verified \|\|
web\.evidence\.length < 2 \|\|
web\.sourceCount < 2 \|\|
web\.sourceHosts\.length < 2
&#41; \{
return buildBlockedResult&#40;
input,
objective,
“web\-failed”,
“The commercial opportunity is blocked because current external evidence is insufficiently verified\.”,
“Strengthen the live evidence before converting it into a commercial decision\.”,
web,
&#41;;
\}

/\*

- Step 2:
- Convert verified evidence into a structured
- AIOS decision\.
  \*/
  const decision =
  buildLiveDecision&#40;
  web,
  &#41;;

if &#40;
\!decision\.success \|\|
decision\.verification?\.verified \!== true \|\|
decision\.evidence\.length < 2 \|\|
\!normalizeText&#40;
decision\.conclusion,
&#41; \|\|
\!normalizeText&#40;
decision\.nextStep,
&#41; \|\|
decision\.recommendedActions\.length === 0
&#41; \{
return buildBlockedResult&#40;
input,
objective,
“decision\-blocked”,
“Verified market evidence was obtained, but AIOS could not produce a usable commercial decision\.”,
“Generate a concrete measurable action before starting commercial execution\.”,
web,
decision,
&#41;;
\}

/\*

- Step 3:
- Send the verified decision into the existing
- Commercial Runtime\.
- 
- No commercial result is supplied here\.
- Therefore the runtime can only create/start
- the execution task\. It cannot fabricate actuals\.
  \*/
  const runtime =
  await executeLiveCommercialRuntime&#40;\{
  objectiveId:
  objective\.id,
  decision,
  \}&#41;;

if &#40;
\!isLiveCommercialRuntimeReady&#40;
runtime,
&#41;
&#41; \{
return buildBlockedResult&#40;
input,
objective,
“runtime\-blocked”,
runtime\.conclusion \|\|
“The verified commercial decision could not be converted into a ready execution state\.”,
runtime\.nextStep \|\|
“Resolve the commercial runtime block before execution\.”,
web,
decision,
runtime,
&#41;;
\}

return \{
success: true,
status: “ready”,
objectiveId:
objective\.id,
objective,
web,
decision,
runtime,
conclusion:
runtime\.conclusion \|\|
decision\.conclusion,
nextStep:
runtime\.nextStep \|\|
decision\.nextStep,
timestamp: Date\.now&#40;&#41;,
\};
\}

export function isLiveCommercialOpportunityReady&#40;
result: LiveCommercialOpportunityResult,
&#41;: boolean \{
if &#40;\!result\.success&#41; \{
return false;
\}

if &#40;
result\.status \!== “ready”
&#41; \{
return false;
\}

if &#40;\!result\.objective&#41; \{
return false;
\}

if &#40;
\!result\.web \|\|
\!result\.web\.success \|\|
\!result\.web\.verified \|\|
result\.web\.evidence\.length < 2
&#41; \{
return false;
\}

if &#40;
\!result\.decision \|\|
\!result\.decision\.success \|\|
result\.decision\.verification?\.verified \!== true \|\|
result\.decision\.evidence\.length < 2
&#41; \{
return false;
\}

if &#40;\!result\.runtime&#41; \{
return false;
\}

return isLiveCommercialRuntimeReady&#40;
result\.runtime,
&#41;;
\}

export function buildLiveCommercialOpportunityContext&#40;
result: LiveCommercialOpportunityResult,
&#41;: string \{
const lines = &#91;
“AIOS LIVE COMMERCIAL OPPORTUNITY”,
“”,
“PIPELINE:”,
“COMMERCIAL OBJECTIVE \-\> LIVE INTELLIGENCE \-\> VERIFIED EVIDENCE \-\> DECISION \-\> COMMERCIAL RUNTIME”,
“”,
`STATUS: ${result.status}`,
`SUCCESS: ${result.success ? "YES" : "NO"}`,
`OBJECTIVE ID: ${result.objectiveId}`,
&#93;;

if &#40;result\.objective&#41; \{
lines\.push&#40;
`OBJECTIVE: ${result.objective.title}`,
`STAGE: ${result.objective.stage}`,
`CURRENCY: ${result.objective.currency}`,
`REVENUE TARGET: ${result.objective.revenueTarget}`,
`CUSTOMER TARGET: ${result.objective.customerTarget}`,
`COST TARGET: ${result.objective.costTarget}`,
&#41;;
\}

if &#40;result\.web&#41; \{
lines\.push&#40;
“”,
“LIVE WEB INTELLIGENCE:”,
`SUCCESS: ${result.web.success ? "YES" : "NO"}`,
`VERIFIED: ${result.web.verified ? "YES" : "NO"}`,
`EVIDENCE COUNT: ${result.web.evidence.length}`,
`SOURCE COUNT: ${result.web.sourceCount}`,
`INDEPENDENT HOSTS: ${result.web.sourceHosts.length}`,
&#41;;
\}

if &#40;result\.decision&#41; \{
lines\.push&#40;
“”,
“LIVE DECISION:”,
`SUCCESS: ${result.decision.success ? "YES" : "NO"}`,
`VERIFIED: ${ result.decision.verification?.verified ? "YES" : "NO" }`,
`PRIORITY: ${result.decision.priority}`,
`CONCLUSION: ${result.decision.conclusion}`,
`NEXT STEP: ${result.decision.nextStep}`,
`ACTIONS: ${result.decision.recommendedActions.length}`,
&#41;;
\}

if &#40;result\.runtime&#41; \{
lines\.push&#40;
“”,
“COMMERCIAL RUNTIME:”,
`STATUS: ${result.runtime.status}`,
`SUCCESS: ${result.runtime.success ? "YES" : "NO"}`,
`TASK ID: ${result.runtime.taskId ?? "NOT LINKED"}`,
`OUTCOME ID: ${result.runtime.outcomeId ?? "NOT LINKED"}`,
`MILESTONE ID: ${result.runtime.milestoneId ?? "NOT LINKED"}`,
&#41;;
\}

lines\.push&#40;
“”,
`CONCLUSION: ${result.conclusion}`,
`NEXT STEP: ${result.nextStep}`,
“”,
“RESULT INTEGRITY:”,
“No revenue, customer, cost, or other commercial actual is fabricated by this layer\.”,
“Commercial actuals remain writable only through the verified\-result gate\.”,
&#41;;

return lines\.join&#40;”\\n”&#41;;
\}
