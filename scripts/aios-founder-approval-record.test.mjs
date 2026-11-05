import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const scriptPath = path.resolve(
  "scripts/aios-founder-approval-record.mjs",
);

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aios-founder-approval-"));
  const candidateSha = "4f0f39526b61425e85d558026a7301ccda6ace99";
  const sourceRunId = "42059149722";
  const fileContent = "export const fixture = true;\n";
  const fileHash = hash(fileContent);

  const artifact = {
    schemaVersion: 1,
    builder: "C170.5.3",
    repository: {
      baseCommitSha: "6f21b83ec5c9c1e241fd4abf648b2810fd3c1e34",
      candidateCommitSha: candidateSha,
    },
    changeSummary: {
      fileCount: 1,
    },
    files: [
      {
        path: "scripts/fixture.mjs",
        status: "A",
        bytes: Buffer.byteLength(fileContent),
        sha256: fileHash,
        content: fileContent,
      },
    ],
  };

  const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
  const manifestText = [
    `${hash(artifactText)}  aios-verified-delivery.json`,
    `${"a".repeat(64)}  aios-delivery-builder-summary.json`,
    `${"b".repeat(64)}  aios-delivery-verification.json`,
    "",
  ].join("\n");

  const report = {
    status: "FOUNDER_REVIEW_READY",
    reviewGate: "C170.6.1",
    repository: {
      name: "Vivi9max/AIOS-Alpha",
      branch: "c170.5-verified-delivery-builder",
      baseCommitSha: artifact.repository.baseCommitSha,
      candidateCommitSha: candidateSha,
    },
    workflow: {
      runId: sourceRunId,
    },
    artifact: {
      sha256: hash(artifactText),
      manifestSha256: hash(manifestText),
      fileCount: 1,
    },
    files: [
      {
        path: "scripts/fixture.mjs",
        status: "A",
        bytes: Buffer.byteLength(fileContent),
        sha256: fileHash,
      },
    ],
    founderApproval: {
      required: true,
      decision: "PENDING",
      approved: false,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
    },
  };

  const reviewPath = path.join(root, "review.json");
  const artifactPath = path.join(root, "artifact.json");
  const manifestPath = path.join(root, "manifest.sha256");
  const outputPath = path.join(root, "outside", "record.json");

  fs.writeFileSync(reviewPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(artifactPath, artifactText);
  fs.writeFileSync(manifestPath, manifestText);

  return {
    root,
    candidateSha,
    sourceRunId,
    reviewPath,
    artifactPath,
    manifestPath,
    outputPath,
  };
}

function invoke(fixture, overrides = {}) {
  const values = {
    expectedFounder: "Vivi9max",
    actor: "Vivi9max",
    eventName: "workflow_dispatch",
    runAttempt: "1",
    sourceRunId: fixture.sourceRunId,
    candidateBranch: "c170.5-verified-delivery-builder",
    candidateSha: fixture.candidateSha,
    decision: "APPROVE",
    approvalScope: "merge",
    reviewReport: fixture.reviewPath,
    deliveryArtifact: fixture.artifactPath,
    manifest: fixture.manifestPath,
    output: fixture.outputPath,
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

test("creates a Founder-bound merge approval record", () => {
  const fixture = makeFixture();
  const result = invoke(fixture);

  assert.equal(result.status, 0, result.stderr);
  const record = JSON.parse(fs.readFileSync(fixture.outputPath, "utf8"));

  assert.equal(record.decision, "APPROVE");
  assert.equal(record.approvalScope, "merge");
  assert.equal(record.mergeAuthorized, true);
  assert.equal(record.productionDeploymentAuthorized, false);
  assert.equal(record.executionPerformed, false);
  assert.equal(record.cryptographicSignature.signed, false);
  assert.equal(record.evidence.filesVerified, true);
});

test("rejects a non-Founder actor", () => {
  const fixture = makeFixture();
  const result = invoke(fixture, { actor: "not-the-founder" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FOUNDER_IDENTITY_REJECTED/);
  assert.equal(fs.existsSync(fixture.outputPath), false);
});

test("rejects workflow events other than workflow_dispatch", () => {
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
  const result = invoke(fixture, {
    candidateSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CANDIDATE_BINDING_MISMATCH/);
});

test("rejects a non-pending Founder Review report", () => {
  const fixture = makeFixture();
  const report = JSON.parse(fs.readFileSync(fixture.reviewPath, "utf8"));
  report.founderApproval.approved = true;
  fs.writeFileSync(fixture.reviewPath, JSON.stringify(report));

  const result = invoke(fixture);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REVIEW_NOT_PENDING/);
});

test("rejects embedded file content tampering", () => {
  const fixture = makeFixture();
  const artifact = JSON.parse(fs.readFileSync(fixture.artifactPath, "utf8"));
  artifact.files[0].content = "tampered content\n";
  const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
  fs.writeFileSync(fixture.artifactPath, artifactText);

  const report = JSON.parse(fs.readFileSync(fixture.reviewPath, "utf8"));
  report.artifact.sha256 = hash(artifactText);
  fs.writeFileSync(fixture.reviewPath, JSON.stringify(report));

  const manifest = fs.readFileSync(fixture.manifestPath, "utf8")
    .replace(/^[a-f0-9]{64}(?=  aios-verified-delivery\.json)/, hash(artifactText));
  fs.writeFileSync(fixture.manifestPath, manifest);

  const updatedReport = JSON.parse(fs.readFileSync(fixture.reviewPath, "utf8"));
  updatedReport.artifact.manifestSha256 = hash(manifest);
  fs.writeFileSync(fixture.reviewPath, JSON.stringify(updatedReport));

  const result = invoke(fixture);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FILE_CONTENT_HASH_MISMATCH/);
});

test("rejects an existing output record", () => {
  const fixture = makeFixture();
  fs.mkdirSync(path.dirname(fixture.outputPath), { recursive: true });
  fs.writeFileSync(fixture.outputPath, "existing");

  const result = invoke(fixture);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OUTPUT_ALREADY_EXISTS/);
});

test("production approval does not authorize merge", () => {
  const fixture = makeFixture();
  const result = invoke(fixture, {
    approvalScope: "production_deployment",
  });

  assert.equal(result.status, 0, result.stderr);
  const record = JSON.parse(fs.readFileSync(fixture.outputPath, "utf8"));

  assert.equal(record.productionDeploymentAuthorized, true);
  assert.equal(record.mergeAuthorized, false);
  assert.equal(record.mergeExecuted, false);
});
