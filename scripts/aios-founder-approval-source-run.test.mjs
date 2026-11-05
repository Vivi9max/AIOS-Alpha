import test from "node:test";
import assert from "node:assert/strict";

import {
  verifySourceRunIdentity,
} from "./aios-founder-approval-source-run.mjs";

const sha = "2a9818e577612fc37784dd2913a11449d808c2ac";
const runId = "42070352461";

function fixture() {
  const run = {
    id: Number(runId),
    status: "completed",
    conclusion: "success",
    event: "push",
    workflow_id: 332656458,
    path: ".github/workflows/aios-alpha-ci.yml",
    run_attempt: 1,
    head_branch: "c170.5-verified-delivery-builder",
    head_sha: sha,
    repository: {
      full_name: "Vivi9max/AIOS-Alpha",
    },
    actor: {
      login: "Vivi9max",
    },
  };

  const artifacts = {
    artifacts: [
      {
        id: 13435178299,
        name: `aios-verified-delivery-${sha}-${runId}`,
        expired: false,
        digest: "sha256:example",
        workflow_run: {
          id: Number(runId),
          head_branch: run.head_branch,
          head_sha: sha,
        },
      },
    ],
  };

  const review = {
    status: "FOUNDER_REVIEW_READY",
    repository: {
      name: "Vivi9max/AIOS-Alpha",
      branch: run.head_branch,
      candidateCommitSha: sha,
      checkedOutHead: sha,
    },
    workflow: {
      runId,
      runAttempt: "1",
      actor: "Vivi9max",
    },
    founderApproval: {
      decision: "PENDING",
      approved: false,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
    },
  };

  return {
    run,
    artifacts,
    review,
    sourceRunId: runId,
    candidateBranch: run.head_branch,
    candidateSha: sha,
  };
}

function rejects(change, code) {
  const input = fixture();
  change(input);

  assert.throws(
    () => verifySourceRunIdentity(input),
    (error) => error.code === code,
  );
}

test("accepts the exact successful source workflow, candidate and artifact", () => {
  const result = verifySourceRunIdentity(fixture());

  assert.equal(result.valid, true);
  assert.equal(result.sourceRunId, runId);
  assert.equal(result.candidateSha, sha);
  assert.equal(result.artifactId, 13435178299);
  assert.equal(result.mergeAuthorized, false);
});

test("rejects repository mismatch", () =>
  rejects(
    (x) => {
      x.run.repository.full_name = "attacker/repo";
    },
    "SOURCE_REPOSITORY_MISMATCH",
  ));

test("rejects unsuccessful source run", () =>
  rejects(
    (x) => {
      x.run.conclusion = "failure";
    },
    "SOURCE_RUN_NOT_SUCCESSFUL",
  ));

test("rejects a non-push source event", () =>
  rejects(
    (x) => {
      x.run.event = "workflow_dispatch";
    },
    "SOURCE_EVENT_INVALID",
  ));

test("rejects workflow ID mismatch", () =>
  rejects(
    (x) => {
      x.run.workflow_id = 123;
    },
    "SOURCE_WORKFLOW_ID_MISMATCH",
  ));

test("rejects workflow path mismatch", () =>
  rejects(
    (x) => {
      x.run.path = ".github/workflows/other.yml";
    },
    "SOURCE_WORKFLOW_PATH_MISMATCH",
  ));

test("rejects candidate branch mismatch", () =>
  rejects(
    (x) => {
      x.run.head_branch = "other";
    },
    "SOURCE_BRANCH_MISMATCH",
  ));

test("rejects candidate SHA mismatch", () =>
  rejects(
    (x) => {
      x.run.head_sha = "a".repeat(40);
    },
    "SOURCE_SHA_MISMATCH",
  ));

test("rejects missing candidate artifact", () =>
  rejects(
    (x) => {
      x.artifacts.artifacts = [];
    },
    "SOURCE_ARTIFACT_MISSING_OR_DUPLICATE",
  ));

test("rejects expired candidate artifact", () =>
  rejects(
    (x) => {
      x.artifacts.artifacts[0].expired = true;
    },
    "SOURCE_ARTIFACT_EXPIRED",
  ));

test("rejects artifact from another run", () =>
  rejects(
    (x) => {
      x.artifacts.artifacts[0].workflow_run.id = 1;
    },
    "SOURCE_ARTIFACT_RUN_MISMATCH",
  ));

test("rejects artifact SHA mismatch", () =>
  rejects(
    (x) => {
      x.artifacts.artifacts[0].workflow_run.head_sha = "a".repeat(40);
    },
    "SOURCE_ARTIFACT_SHA_MISMATCH",
  ));

test("rejects review report bound to another run", () =>
  rejects(
    (x) => {
      x.review.workflow.runId = "1";
    },
    "REVIEW_SOURCE_RUN_MISMATCH",
  ));

test("rejects review report attempt mismatch", () =>
  rejects(
    (x) => {
      x.review.workflow.runAttempt = "2";
    },
    "REVIEW_SOURCE_ATTEMPT_MISMATCH",
  ));

test("rejects review report candidate mismatch", () =>
  rejects(
    (x) => {
      x.review.repository.candidateCommitSha = "a".repeat(40);
    },
    "REVIEW_CANDIDATE_MISMATCH",
  ));

test("rejects non-pending review report", () =>
  rejects(
    (x) => {
      x.review.founderApproval.approved = true;
    },
    "REVIEW_NOT_PENDING",
  ));

test("rejects source actor mismatch", () =>
  rejects(
    (x) => {
      x.run.actor.login = "another-user";
    },
    "SOURCE_ACTOR_MISMATCH",
  ));

test("rejects an invalid candidate branch", () =>
  rejects(
    (x) => {
      x.candidateBranch = "../main";
    },
    "CANDIDATE_BRANCH_INVALID",
  ));
