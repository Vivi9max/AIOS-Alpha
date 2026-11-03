import test from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedStagingBranch,
  selectExactPreviewDeployment,
  verifyGitHubReadback,
  verifyPreviewDeployment
} from "../scripts/lib/autonomous-staging-verification.mjs";

const sha = "a".repeat(40);
const tree = "b".repeat(40);
const branch = "c169-8-ad-task-123";

test("accepts only the autonomous staging branch namespace", () => {
  assert.equal(isAllowedStagingBranch(branch), true);
  assert.equal(isAllowedStagingBranch("main"), false);
  assert.equal(isAllowedStagingBranch("c169-8-ad-../main"), false);
});

test("requires branch head and commit readback to match exact SHA", () => {
  assert.equal(verifyGitHubReadback({
    branch, expectedSha: sha, branchSha: sha, commitSha: sha, treeSha: tree
  }).ok, true);

  assert.equal(verifyGitHubReadback({
    branch, expectedSha: sha, branchSha: "c".repeat(40), commitSha: sha, treeSha: tree
  }).code, "STAGING_BRANCH_SHA_MISMATCH");
});

test("selects only exact SHA and branch preview deployments", () => {
  const items = [
    { uid: "wrong-sha", target: "preview", gitSource: { sha: "c".repeat(40), ref: branch } },
    { uid: "wrong-branch", target: "preview", gitSource: { sha, ref: "main" } },
    { uid: "production", target: "production", gitSource: { sha, ref: branch } },
    { uid: "exact", target: "preview", gitSource: { sha, ref: branch } }
  ];
  assert.equal(selectExactPreviewDeployment(items, sha, branch)?.uid, "exact");
});

test("rejects production and non-ready deployments", () => {
  assert.equal(verifyPreviewDeployment({
    uid: "prod", target: "production", readyState: "READY",
    gitSource: { sha, ref: branch }
  }, sha, branch).code, "PRODUCTION_DEPLOYMENT_REJECTED");

  assert.equal(verifyPreviewDeployment({
    uid: "building", target: "preview", readyState: "BUILDING",
    gitSource: { sha, ref: branch }
  }, sha, branch).code, "VERCEL_PREVIEW_NOT_READY");
});

test("passes only a ready preview for the exact commit and branch", () => {
  const result = verifyPreviewDeployment({
    uid: "preview-id", url: "aios-alpha-preview.vercel.app",
    target: "preview", readyState: "READY",
    gitSource: { sha, ref: branch }
  }, sha, branch);
  assert.equal(result.ok, true);
  assert.equal(result.code, "VERCEL_EXACT_PREVIEW_VERIFIED");
});
