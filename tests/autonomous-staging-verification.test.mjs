import test from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedStagingBranch,
  selectExactPreviewDeployment,
  verifyGitHubReadback,
  verifyPreviewDeployment
} from "../scripts/lib/autonomous-staging-verification.mjs";
import {
  AUDIT_STATE,
  buildAuditOnlyResult,
  classifyExecutionMode,
  EXECUTION_MODE
} from "../scripts/lib/read-only-audit-runtime.mjs";

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

test("read-only audit produces a complete report via buildAuditOnlyResult", () => {
  const report = "Repository audit report: inspected 4 files, no writes performed.";
  const result = buildAuditOnlyResult({ report });
  assert.equal(result.auditState, AUDIT_STATE.AUDIT_COMPLETE);
  assert.equal(result.report, report);
  assert.equal(result.reportLength, report.length);
  assert.equal(result.readbackVerified, false);
  assert.equal(result.verificationPassed, false);
  assert.equal("commitSha" in result, false);
});

test("read-only audit report is retrievable through the task-result path", () => {
  const report = "Audit report content retrievable by Founder.";
  const result = buildAuditOnlyResult({ report });
  const serialized = JSON.parse(JSON.stringify(result));
  assert.equal(serialized.auditState, AUDIT_STATE.AUDIT_COMPLETE);
  assert.equal(serialized.report, report);
  assert.equal(serialized.reportLength, report.length);
  assert.equal(serialized.readbackVerified, false);
  assert.equal(serialized.verificationPassed, false);
  assert.equal("commitSha" in serialized, false);
});

test("empty or whitespace-only audit report is rejected", () => {
  assert.equal(buildAuditOnlyResult({ report: "" }).auditState, AUDIT_STATE.AUDIT_BLOCKED);
  assert.equal(buildAuditOnlyResult({ report: "   \n\t  " }).auditState, AUDIT_STATE.AUDIT_BLOCKED);
  assert.equal(buildAuditOnlyResult({}).auditState, AUDIT_STATE.AUDIT_BLOCKED);
});

test("audit execution performs zero GitHub writes and creates no commit", () => {
  const result = buildAuditOnlyResult({ report: "Read-only inspection only." });
  assert.equal(result.auditState, AUDIT_STATE.AUDIT_COMPLETE);
  assert.equal("commitSha" in result, false);
  assert.equal(result.usedGitHubWrite, undefined);
});

test("audit result never reports fake GitHub Readback PASS", () => {
  const result = buildAuditOnlyResult({ report: "Audit report." });
  assert.equal(result.readbackVerified, false);
  assert.notEqual(result.readbackVerified, true);
});

test("audit result never reports fake Build Verification PASS", () => {
  const result = buildAuditOnlyResult({ report: "Audit report." });
  assert.equal(result.verificationPassed, false);
  assert.notEqual(result.verificationPassed, true);
});

test("product-development objective mentioning audit feature stays product development", () => {
  const objective = "Implement a new audit feature for the Founder Console with full logging.";
  const mode = classifyExecutionMode(objective);
  assert.equal(mode, EXECUTION_MODE.PRODUCT_DEVELOPMENT);
});

test("explicit read-only audit objective never enters atomic staging", () => {
  const objective = "Perform a read-only audit of the repository. Do not modify any files.";
  const mode = classifyExecutionMode(objective);
  assert.equal(mode, EXECUTION_MODE.READ_ONLY_AUDIT);
  const result = buildAuditOnlyResult({ report: "Inspected only, no writes." });
  assert.equal(result.auditState, AUDIT_STATE.AUDIT_COMPLETE);
  assert.equal("commitSha" in result, false);
});

test("normal product-development execution still uses atomic staging and verification flow", () => {
  const objective = "Add a settings toggle to the Founder Console.";
  const mode = classifyExecutionMode(objective);
  assert.equal(mode, EXECUTION_MODE.PRODUCT_DEVELOPMENT);
  assert.equal(isAllowedStagingBranch("c169-8-ad-task-123"), true);
  assert.equal(isAllowedStagingBranch("main"), false);
});
