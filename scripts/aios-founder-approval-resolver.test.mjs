import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveFounderApprovalCandidate,
} from "./aios-founder-approval-resolver.mjs";
const SHA = "a".repeat(40);
const RUN_ID = "42142119489";
const BRANCH = "c170.6.11-candidate";
const REPOSITORY = "Vivi9max/AIOS-Alpha";
function fixture(overrides = {}) {
  const pr = {
    number: 31,
    state: "open",
    draft: false,
    html_url: "https://github.com/Vivi9max/AIOS-Alpha/pull/31",
    base: {
      ref: "main",
      repo: { full_name: REPOSITORY },
    },
    head: {
      ref: BRANCH,
      sha: SHA,
      repo: { full_name: REPOSITORY },
    },
  };
  const run = {
    id: Number(RUN_ID),
    workflow_id: 332656458,
    path: ".github/workflows/aios-alpha-ci.yml",
    event: "push",
    status: "completed",
    conclusion: "success",
    run_number: 100,
    run_attempt: 1,
    created_at: "2026-11-06T10:00:00Z",
    head_branch: BRANCH,
    head_sha: SHA,
  };
  const artifact = {
    id: 9001,
    name: `aios-verified-delivery-${SHA}-${RUN_ID}`,
    expired: false,
    digest: `sha256:${"b".repeat(64)}`,
    workflow_run: {
      id: Number(RUN_ID),
      head_branch: BRANCH,
      head_sha: SHA,
    },
  };
  return {
    pullRequests: [pr],
    workflowRuns: [run],
    artifactsByRun: {
      [RUN_ID]: [artifact],
    },
    ...overrides,
  };
}
test("resolves one exact candidate with successful CI and matching artifact", () => {
  const result = resolveFounderApprovalCandidate(fixture());
  assert.equal(result.status, "FOUNDER_APPROVAL_CANDIDATE_RESOLVED");
  assert.equal(result.pullRequestNumber, 31);
  assert.equal(result.sourceRunId, RUN_ID);
  assert.equal(result.candidateBranch, BRANCH);
  assert.equal(result.candidateSha, SHA);
  assert.equal(result.artifactId, 9001);
  assert.equal(result.mergeAuthorized, false);
  assert.equal(result.productionDeploymentAuthorized, false);
});
test("rejects when there is no open candidate PR", () => {
  const input = fixture({ pullRequests: [] });
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_OPEN_CANDIDATE",
  );
});
test("rejects when the latest CI run failed instead of using an older success", () => {
  const input = fixture();
  input.workflowRuns.push({
    ...input.workflowRuns[0],
    id: 42142119490,
    run_number: 101,
    created_at: "2026-11-06T11:00:00Z",
    conclusion: "failure",
  });
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects an in-progress latest CI run", () => {
  const input = fixture();
  input.workflowRuns[0].status = "in_progress";
  input.workflowRuns[0].conclusion = null;
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects a missing artifact", () => {
  const input = fixture({
    artifactsByRun: { [RUN_ID]: [] },
  });
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects an artifact digest with invalid format", () => {
  const input = fixture();
  input.artifactsByRun[RUN_ID][0].digest = "sha256:invalid";
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects duplicate matching artifacts", () => {
  const input = fixture();
  input.artifactsByRun[RUN_ID].push({
    ...input.artifactsByRun[RUN_ID][0],
    id: 9002,
  });
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects an expired artifact", () => {
  const input = fixture();
  input.artifactsByRun[RUN_ID][0].expired = true;
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects an artifact belonging to another workflow run", () => {
  const input = fixture();
  input.artifactsByRun[RUN_ID][0].workflow_run.id = 99999999999;
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects an artifact with a mismatched source branch", () => {
  const input = fixture();
  input.artifactsByRun[RUN_ID][0].workflow_run.head_branch =
    "another-candidate-branch";
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects an artifact with a mismatched candidate SHA", () => {
  const input = fixture();
  input.artifactsByRun[RUN_ID][0].workflow_run.head_sha =
    "c".repeat(40);
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects malformed artifact collection instead of accepting it", () => {
  const input = fixture({
    artifactsByRun: {
      [RUN_ID]: {
        unexpected: "malformed",
      },
    },
  });
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
test("rejects more than one eligible PR rather than guessing", () => {
  const input = fixture();
  const second = structuredClone(input.pullRequests[0]);
  second.number = 32;
  second.head.ref = "c170.6.11-another-candidate";
  const secondRun = {
    ...input.workflowRuns[0],
    id: 42142119492,
    run_number: 102,
    head_branch: second.head.ref,
  };
  const secondArtifact = {
    ...input.artifactsByRun[RUN_ID][0],
    id: 9003,
    name: `aios-verified-delivery-${SHA}-42142119492`,
    workflow_run: {
      id: 42142119492,
      head_branch: second.head.ref,
      head_sha: SHA,
    },
  };
  input.pullRequests.push(second);
  input.workflowRuns.push(secondRun);
  input.artifactsByRun["42142119492"] = [secondArtifact];
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "AMBIGUOUS_CANDIDATES",
  );
});
test("rejects a candidate from a fork", () => {
  const input = fixture();
  input.pullRequests[0].head.repo.full_name = "someone/fork";
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_OPEN_CANDIDATE",
  );
});
test("rejects a run from another workflow", () => {
  const input = fixture();
  input.workflowRuns[0].workflow_id = 12345;
  assert.throws(
    () => resolveFounderApprovalCandidate(input),
    (error) => error.code === "NO_VERIFIED_CANDIDATE",
  );
});
