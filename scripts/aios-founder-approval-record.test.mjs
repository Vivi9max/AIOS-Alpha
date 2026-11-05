import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const scriptPath = path.resolve("scripts/aios-founder-approval-record.mjs");
const CANDIDATE_SHA = "4f0f39526b61425e85d558026a7301ccda6ace99";
const BASE_SHA = "6f21b83ec5c9c1e241fd4abf648b2810fd3c1e34";
const SOURCE_RUN_ID = "42059149722";

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aios-founder-approval-"));
  const fileContent = "export const fixture = true;\n";
  const fileHash = hash(fileContent);
  const artifact = {
    schemaVersion: 1,
    builder: "C170.5.3",
    repository: { baseCommitSha: BASE_SHA, candidateCommitSha: CANDIDATE_SHA },
    changeSummary: { fileCount: 1 },
    files: [{
      path: "scripts/fixture.mjs",
      status: "A",
      bytes: Buffer.byteLength(fileContent),
      sha256: fileHash,
      content: fileContent,
    }],
  };
  const artifactBytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`);
  const builder = {
    status: "DELIVERY_ARTIFACT_READY",
    repository: { baseCommitSha: BASE_SHA, candidateCommitSha: CANDIDATE_SHA },
    fileCount: 1,
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
  };
  const builderBytes = Buffer.from(`${JSON.stringify(builder, null, 2)}\n`);
  const verification = {
    status: "VERIFIED",
    baseCommitSha: BASE_SHA,
    candidateCommitSha: CANDIDATE_SHA,
    verifiedFileCount: 1,
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
    artifactSha256: hash(artifactBytes),
  };
  const verificationBytes = Buffer.from(`${JSON.stringify(verification, null, 2)}\n`);
  const manifestText = [
    `${hash(artifactBytes)}  aios-verified-delivery.json`,
    `${hash(builderBytes)}  aios-delivery-builder-summary.json`,
    `${hash(verificationBytes)}  aios-delivery-verification.json`,
    "",
  ].join("\n");
  const manifestBytes = Buffer.from(manifestText);
  const report = {
    status: "FOUNDER_REVIEW_READY",
    reviewGate: "C170.6.1",
    repository: {
      name: "Vivi9max/AIOS-Alpha",
      branch: "c170.5-verified-delivery-builder",
      baseCommitSha: BASE_SHA,
      candidateCommitSha: CANDIDATE_SHA,
    },
    workflow: { runId: SOURCE_RUN_ID },
    artifact: {
      sha256: hash(artifactBytes),
      manifestSha256: hash(manifestBytes),
      fileCount: 1,
    },
    files: [{
      path: "scripts/fixture.mjs",
      status: "A",
      bytes: Buffer.byteLength(fileContent),
      sha256: fileHash,
    }],
    founderApproval: {
      required: true,
      decision: "PENDING",
      approved: false,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
    },
  };
  const paths = {
    review: path.join(root, "review.json"),
    artifact: path.join(root, "aios-verified-delivery.json"),
    builder: path.join(root, "aios-delivery-builder-summary.json"),
    verification: path.join(root, "aios-delivery-verification.json"),
    manifest: path.join(root, "aios-delivery-artifact.sha256"),
    output: path.join(root, "outside", "record.json"),
  };
  fs.writeFileSync(paths.review, JSON.stringify(report, null, 2));
  fs.writeFileSync(paths.artifact, artifactBytes);
  fs.writeFileSync(paths.builder, builderBytes);
  fs.writeFileSync(paths.verification, verificationBytes);
  fs.writeFileSync(paths.manifest, manifestBytes);
  return { root, paths, report, artifact, builder, verification };
}

function invoke(fixture, overrides = {}) {
  const values = {
    expectedFounder: "Vivi9max",
    actor: "Vivi9max",
    eventName: "workflow_dispatch",
    runAttempt: "1",
    sourceRunId: SOURCE_RUN_ID,
    candidateBranch: "c170.5-verified-delivery-builder",
    candidateSha: CANDIDATE_SHA,
    decision: "APPROVE",
    approvalScope: "merge",
    reviewReport: fixture.paths.review,
    deliveryArtifact: fixture.paths.artifact,
    builderSummary: fixture.paths.builder,
    verification: fixture.paths.verification,
    manifest: fixture.paths.manifest,
    output: fixture.paths.output,
    ...overrides,
  };
  const args = Object.entries(values).flatMap(([key, value]) => [
    `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
    String(value),
  ]);
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_RUN_ID: "42060000000",
      GITHUB_REF: "refs/heads/main",
    },
  });
}

function replaceManifestHash(fixture, filename, bytes) {
  const lines = fs.readFileSync(fixture.paths.manifest, "utf8")
    .trimEnd().split(/\r?\n/);
  const index = lines.findIndex((line) => line.endsWith(`  ${filename}`));
  lines[index] = `${hash(bytes)}  ${filename}`;
  const manifestBytes = Buffer.from(`${lines.join("\n")}\n`);
  fs.writeFileSync(fixture.paths.manifest, manifestBytes);
  const report = JSON.parse(fs.readFileSync(fixture.paths.review, "utf8"));
  report.artifact.manifestSha256 = hash(manifestBytes);
  fs.writeFileSync(fixture.paths.review, JSON.stringify(report, null, 2));
}

test("creates a Founder-bound merge approval record after verifying all three manifest files", () => {
  const fixture = makeFixture();
  const result = invoke(fixture);
  assert.equal(result.status, 0, result.stderr);
  const record = JSON.parse(fs.readFileSync(fixture.paths.output, "utf8"));
  assert.equal(record.decision, "APPROVE");
  assert.equal(record.mergeAuthorized, true);
  assert.equal(record.productionDeploymentAuthorized, false);
  assert.equal(record.executionPerformed, false);
  assert.equal(record.evidence.manifestEntriesVerified, 3);
  assert.equal(
    record.evidence.builderSummarySha256,
    hash(fs.readFileSync(fixture.paths.builder)),
  );
  assert.equal(
    record.evidence.verificationSha256,
    hash(fs.readFileSync(fixture.paths.verification)),
  );
  assert.equal(record.cryptographicSignature.signed, false);
});

test("rejects a non-Founder actor", () => {
  const fixture = makeFixture();
  const result = invoke(fixture, { actor: "not-the-founder" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FOUNDER_IDENTITY_REJECTED/);
  assert.equal(fs.existsSync(fixture.paths.output), false);
});

test("rejects non-workflow_dispatch events", () => {
  const fixture = makeFixture();
  const result = invoke(fixture, { eventName: "push" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EVENT_REJECTED/);
});

test("rejects workflow reruns", () => {
  const fixture = makeFixture();
  const result = invoke(fixture, { runAttempt: "2" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RERUN_REJECTED/);
});

test("rejects a candidate SHA mismatch", () => {
  const fixture = makeFixture();
  const result = invoke(fixture, { candidateSha: "a".repeat(40) });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CANDIDATE_BINDING_MISMATCH/);
});

test("rejects a non-pending Founder Review report", () => {
  const fixture = makeFixture();
  const report = JSON.parse(fs.readFileSync(fixture.paths.review, "utf8"));
  report.founderApproval.approved = true;
  fs.writeFileSync(fixture.paths.review, JSON.stringify(report));
  const result = invoke(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REVIEW_NOT_PENDING/);
});

test("rejects Builder Summary tampering even when the review and manifest are updated", () => {
  const fixture = makeFixture();
  const builder = { ...fixture.builder, status: "TAMPERED" };
  const bytes = Buffer.from(`${JSON.stringify(builder, null, 2)}\n`);
  fs.writeFileSync(fixture.paths.builder, bytes);
  replaceManifestHash(fixture, "aios-delivery-builder-summary.json", bytes);
  const result = invoke(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BUILDER_SUMMARY_INVALID/);
});

test("rejects Verification report tampering even when the review and manifest are updated", () => {
  const fixture = makeFixture();
  const verification = { ...fixture.verification, status: "UNVERIFIED" };
  const bytes = Buffer.from(`${JSON.stringify(verification, null, 2)}\n`);
  fs.writeFileSync(fixture.paths.verification, bytes);
  replaceManifestHash(fixture, "aios-delivery-verification.json", bytes);
  const result = invoke(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /INDEPENDENT_VERIFICATION_INVALID/);
});

test("rejects a missing required manifest entry", () => {
  const fixture = makeFixture();
  const manifest = fs.readFileSync(fixture.paths.manifest, "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.endsWith("aios-delivery-verification.json"))
    .join("\n");
  fs.writeFileSync(fixture.paths.manifest, manifest);
  const report = JSON.parse(fs.readFileSync(fixture.paths.review, "utf8"));
  report.artifact.manifestSha256 = hash(Buffer.from(manifest));
  fs.writeFileSync(fixture.paths.review, JSON.stringify(report));
  const result = invoke(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /MANIFEST_ENTRY_COUNT_INVALID|MANIFEST_INCOMPLETE/);
});

test("rejects embedded file content tampering", () => {
  const fixture = makeFixture();
  const artifact = JSON.parse(fs.readFileSync(fixture.paths.artifact, "utf8"));
  artifact.files[0].content = "tampered content\n";
  const bytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`);
  fs.writeFileSync(fixture.paths.artifact, bytes);
  replaceManifestHash(fixture, "aios-verified-delivery.json", bytes);
  const verification = JSON.parse(fs.readFileSync(fixture.paths.verification, "utf8"));
  verification.artifactSha256 = hash(bytes);
  const verificationBytes = Buffer.from(`${JSON.stringify(verification, null, 2)}\n`);
  fs.writeFileSync(fixture.paths.verification, verificationBytes);
  replaceManifestHash(fixture, "aios-delivery-verification.json", verificationBytes);
  const report = JSON.parse(fs.readFileSync(fixture.paths.review, "utf8"));
  report.artifact.sha256 = hash(bytes);
  fs.writeFileSync(fixture.paths.review, JSON.stringify(report));
  const result = invoke(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FILE_CONTENT_HASH_MISMATCH/);
});

test("rejects an existing output record", () => {
  const fixture = makeFixture();
  fs.mkdirSync(path.dirname(fixture.paths.output), { recursive: true });
  fs.writeFileSync(fixture.paths.output, "existing");
  const result = invoke(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OUTPUT_ALREADY_EXISTS/);
});

test("production approval does not authorize merge or execute production mutation", () => {
  const fixture = makeFixture();
  const result = invoke(fixture, { approvalScope: "production_deployment" });
  assert.equal(result.status, 0, result.stderr);
  const record = JSON.parse(fs.readFileSync(fixture.paths.output, "utf8"));
  assert.equal(record.productionDeploymentAuthorized, true);
  assert.equal(record.mergeAuthorized, false);
  assert.equal(record.mergeExecuted, false);
  assert.equal(record.productionMutationPerformed, false);
  assert.equal(record.executionPerformed, false);
});

test("REJECT creates a non-authorizing rejection record", () => {
  const fixture = makeFixture();
  const result = invoke(fixture, { decision: "REJECT" });
  assert.equal(result.status, 0, result.stderr);
  const record = JSON.parse(fs.readFileSync(fixture.paths.output, "utf8"));
  assert.equal(record.decision, "REJECT");
  assert.equal(record.approved, false);
  assert.equal(record.mergeAuthorized, false);
  assert.equal(record.productionDeploymentAuthorized, false);
});
