import {
NextRequest,
NextResponse,
} from “next/server”;

import {
isFounderRequest,
} from “@/lib/founder/auth”;

import {
executeCommerceCandidatePool,
createDefaultCommerceCandidates,
} from “@/lib/runtime/commerce-candidate-pool-runtime”;

export async function GET(
request: NextRequest,
) {
const startedAt =
Date.now();

if (
!isFounderRequest(request)
) {
return NextResponse.json(
{
success: false,
verified: false,
code:
“FOUNDER_AUTH_REQUIRED”,
error:
“Founder access required.”,
},
{
status: 401,
},
);
}

try {
const defaults =
createDefaultCommerceCandidates();

/*
 * Regression deliberately processes only
 * five candidates to verify real batch retrieval
 * without consuming the full 30-candidate budget.
 *
 * Production runtime supports up to 30.
 */
const candidates =
  defaults.slice(0, 5);
const result =
  await executeCommerceCandidatePool(
    candidates,
    {
      maxCandidates: 5,
      concurrency: 2,
    },
  );
const checks = {
  founderAuth: true,
  candidateInput:
    candidates.length === 5,
  candidateProcessing:
    result.processedCount ===
    candidates.length,
  marketEvidence:
    result.candidates.some(
      (item) =>
        Boolean(
          item.marketIntelligence
            ?.marketEvidence
            .length,
        ),
    ),
  supplyEvidence:
    result.candidates.some(
      (item) =>
        Boolean(
          item.marketIntelligence
            ?.supplyEvidence
            .length,
        ),
    ),
  priceEvidence:
    result.candidates.some(
      (item) =>
        Boolean(
          item.marketIntelligence
            ?.priceSignals.length,
        ),
    ),
  comparison:
    result.candidates.length ===
    candidates.length,
  ranking:
    result.candidates.every(
      (item, index) =>
        item.rank ===
        index + 1,
    ),
  shortlist:
    result.shortlist.length > 0,
  boundaries:
    result.boundaries.length >= 5,
};
const finalPass =
  result.success &&
  checks.founderAuth &&
  checks.candidateInput &&
  checks.candidateProcessing &&
  checks.marketEvidence &&
  checks.supplyEvidence &&
  checks.priceEvidence &&
  checks.comparison &&
  checks.ranking &&
  checks.shortlist &&
  checks.boundaries;
const latencyMs =
  Date.now() -
  startedAt;
return NextResponse.json({
  success: finalPass,
  verified: finalPass,
  code: finalPass
    ? "C145_4_COMMERCE_CANDIDATE_POOL_REGRESSION_PASS"
    : "C145_4_COMMERCE_CANDIDATE_POOL_REGRESSION_FAILED",
  runtime:
    "aios-alpha",
  runtimeVersion:
    "0.5",
  latencyMs,
  testMode:
    "5-of-30-batch-regression",
  supportedCandidateCount:
    30,
  requestedCandidateCount:
    candidates.length,
  pipeline: checks,
  result,
});

} catch (error) {
return NextResponse.json(
{
success: false,
verified: false,
code:
“C145_4_COMMERCE_CANDIDATE_POOL_REGRESSION_ERROR”,
error:
error instanceof Error
? error.message
: “Unknown regression error.”,
latencyMs:
Date.now() -
startedAt,
},
{
status: 500,
},
);
}
}
