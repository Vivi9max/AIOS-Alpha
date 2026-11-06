import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createFounderReviewReport,
  writeFounderReviewReport,
} from "./aios-founder-review-gate.mjs";

const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture(riskLevel = "low") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aios-c1706-test-"));
  const root = path.join(tempRoot, "repository");
  const output = path.join(tempRoot, "runner-temp");
  const stagingPath = path.join(output, "handoff");

  fs.mkdirSync(root);
  fs.mkdirSync(output);
  fs.mkdirSync(stagingPath);

  const stagedContent = "export const safe = true;\n";
  const stagedBytes = Buffer.from(stagedContent);

  const file = {
    path: ".github/workflows/sample.yml",
    status: "A",
    bytes: stagedBytes.byteLength,
    sha256: sha256(stagedBytes),
  };

  const artifact = {
    schemaVersion: 1,
    builder: "C170.5.3",
    repository: {
      baseCommitSha: BASE_SHA,
      candidateCommitSha: HEAD_SHA,
    },
    changeSummary: {
      fileCount: 1,
      totalBytes: stagedBytes.byteLength,
      risk: {
        level: riskLevel,
        reasons: [],
      },
    },
    impact: {
      analyzer: "C170.2",
      affectedFileCount: 0,
    },
    files: [{ ...file, content: stagedContent }],
    verification: {
      status: "passed",
      commitSha: HEAD_SHA,
    },
    founderApproval: {
      required: true,
      approved: false,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
    },
    rollback: {
      automaticRollback: false,
    },
  };

  const artifactPath = path.join(output, "aios-verified-delivery.json");
  const builderSummaryPath = path.join(output, "aios-delivery-builder-summary.json");
  const verificationPath = path.join(output, "aios-delivery-verification.json");
  const manifestPath = path.join(output, "aios-delivery-artifact.sha256");
  const handoffPath = path.join(stagingPath, "handoff.json");
  const rollbackPath = path.join(stagingPath, "rollback-evidence.json");
  const auditPath = path.join(output, "aios-delivery-handoff-audit.json");

  writeJson(artifactPath, artifact);

  const artifactBytes = fs.readFileSync(artifactPath);
  const artifactSha256 = sha256(artifactBytes);

  const builderSummary = {
    status: "DELIVERY_ARTIFACT_READY",
    builder: "C170.5.3",
    repository: {
      baseCommitSha: BASE_SHA,
      candidateCommitSha: HEAD_SHA,
    },
    fileCount: 1,
    verification: {
      attestation: "local-process-observation-not-signed",
    },
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
  };

  writeJson(builderSummaryPath, builderSummary);

  const verification = {
    status: "VERIFIED",
    verifier: "C170.5.4",
    artifactSha256,
    baseCommitSha: BASE_SHA,
    candidateCommitSha: HEAD_SHA,
    verifiedFileCount: 1,
    verificationReceipt: {
      signed: false,
    },
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
  };

  writeJson(verificationPath, verification);

  const manifestEntries = [
    [artifactPath, "aios-verified-delivery.json"],
    [builderSummaryPath, "aios-delivery-builder-summary.json"],
    [verificationPath, "aios-delivery-verification.json"],
  ];

  const manifest = manifestEntries.map(([filePath, name]) => {
    return `${sha256(fs.readFileSync(filePath))}  ${name}`;
  }).join("\n") + "\n";

  fs.writeFileSync(manifestPath, manifest);

  const manifestSha256 = sha256(Buffer.from(manifest));

  const handoff = {
    status: "STAGED_FOR_FOUNDER_REVIEW",
    repository: {
      baseCommitSha: BASE_SHA,
      candidateCommitSha: HEAD_SHA,
    },
    verification: {
      artifactSha256,
      manifestSha256,
    },
    stagedFiles: [{ ...file }],
    founderApproval: {
      required: true,
      approved: false,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
    },
    productionMutation: {
      allowed: false,
      performed: false,
    },
    audit: {
      writeOnce: true,
      appendOnly: false,
    },
  };

  writeJson(handoffPath, handoff);

  const rollback = {
    baseCommitSha: BASE_SHA,
    candidateCommitSha: HEAD_SHA,
    artifactSha256,
    manifestSha256,
    stagedFiles: [{ ...file }],
    productionFilesModified: false,
  };

  writeJson(rollbackPath, rollback);

  const audit = {
    status: "STAGED_FOR_FOUNDER_REVIEW",
    repository: {
      baseCommitSha: BASE_SHA,
      candidateCommitSha: HEAD_SHA,
    },
    artifactSha256,
    manifestSha256,
    founderApprovalRequired: true,
    founderApproved: false,
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
    productionFilesModified: false,
    storage: {
      mode: "exclusive-create",
      writeOnce: true,
      appendOnly: false,
    },
  };

  writeJson(auditPath, audit);

  const stagedFilePath = path.join(
    stagingPath,
    ".github",
    "workflows",
    "sample.yml",
  );

  fs.mkdirSync(path.dirname(stagedFilePath), { recursive: true });
  fs.writeFileSync(stagedFilePath, stagedBytes);

  return {
    tempRoot,
    root,
    output,
    stagingPath,
    artifactPath,
    builderSummaryPath,
    verificationPath,
    manifestPath,
    handoffPath,
    rollbackPath,
    auditPath,
    stagedFilePath,
    artifactSha256,
    manifestSha256,
  };
}

function optionsFor(fixture, overrides = {}) {
  return {
    root: fixture.root,
    artifactPath: fixture.artifactPath,
    manifestPath: fixture.manifestPath,
    builderSummaryPath: fixture.builderSummaryPath,
    verificationPath: fixture.verificationPath,
    handoffPath: fixture.handoffPath,
    rollbackPath: fixture.rollbackPath,
    auditPath: fixture.auditPath,
    stagingPath: fixture.stagingPath,
    mainProtected: true,
    rulesetsCount: 0,
    repository: "Vivi9max/AIOS-Alpha",
    branch: "c170.5-verified-delivery-builder",
    runId: "12345",
    actor: "Vivi9max",
    ...overrides,
  };
}

function dependencies() {
  return {
    gitResolve: (_root, ref) => {
      if (ref === "HEAD") return HEAD_SHA;
      if (ref === "refs/remotes/origin/main") return BASE_SHA;
      throw new Error(`Unexpected ref: ${ref}`);
    },
    verifyArtifact: ({ baseSha, headSha, artifactPath }) => ({
      status: "VERIFIED",
      verifier: "C170.5.4",
      artifactSha256: sha256(fs.readFileSync(artifactPath)),
      baseCommitSha: baseSha,
      candidateCommitSha: headSha,
      verifiedFileCount: 1,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
    }),
  };
}

function cleanup(fixture) {
  fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
}

test(
  "creates a review-ready report without granting approval or merge authority",
  async () => {
    const fixture = createFixture();

    try {
      const report = await createFounderReviewReport(
        optionsFor(fixture),
        dependencies(),
      );

      assert.equal(report.status, "FOUNDER_REVIEW_READY");
      assert.equal(report.reviewGate, "C170.6.1");
      assert.equal(report.artifact.fileCount, 1);
      assert.equal(report.founderApproval.decision, "PENDING");
      assert.equal(report.founderApproval.approved, false);
      assert.equal(report.founderApproval.mergeAuthorized, false);
      assert.equal(report.founderApproval.productionDeploymentAuthorized, false);
      assert.equal(report.mergeExecuted, false);
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "blocks integration when main branch protection is not confirmed",
  async () => {
    const fixture = createFixture();

    try {
      const report = await createFounderReviewReport(
        optionsFor(fixture, {
          mainProtected: false,
          rulesetsCount: 0,
        }),
        dependencies(),
      );

      assert.equal(report.status, "FOUNDER_REVIEW_BLOCKED");
      assert.equal(report.branchProtection.mainProtected, false);
      assert.equal(report.branchProtection.verificationScope, "presence-only");
      assert.equal(report.branchProtection.policyReviewRequired, true);
      assert.equal(report.branchProtection.integrationBlockers.length, 1);
      assert.equal(report.founderApproval.approved, false);
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "blocks integration when repository ruleset status is unavailable",
  async () => {
    const fixture = createFixture();

    try {
      const report = await createFounderReviewReport(
        optionsFor(fixture, {
          mainProtected: true,
          rulesetsCount: -1,
        }),
        dependencies(),
      );

      assert.equal(report.status, "FOUNDER_REVIEW_BLOCKED");
      assert.equal(report.branchProtection.rulesetsCount, null);
      assert.equal(report.branchProtection.integrationBlockers.length, 1);
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects a stale Base Commit when origin/main has moved",
  async () => {
    const fixture = createFixture();
    const deps = dependencies();

    deps.gitResolve = (_root, ref) => {
      return ref === "HEAD" ? HEAD_SHA : "3".repeat(40);
    };

    try {
      await assert.rejects(
        () => createFounderReviewReport(optionsFor(fixture), deps),
        { code: "AIOS_FOUNDER_REVIEW_BASE_STALE" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects staged file content that differs from the artifact SHA-256",
  async () => {
    const fixture = createFixture();

    try {
      fs.writeFileSync(fixture.stagedFilePath, "tampered\n");

      await assert.rejects(
        () => createFounderReviewReport(
          optionsFor(fixture),
          dependencies(),
        ),
        { code: "AIOS_FOUNDER_REVIEW_STAGED_FILE_CONTENT_MISMATCH" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects incorrect append-only audit metadata",
  async () => {
    const fixture = createFixture();

    try {
      const handoff = JSON.parse(
        fs.readFileSync(fixture.handoffPath, "utf8"),
      );

      handoff.audit.appendOnly = true;
      writeJson(fixture.handoffPath, handoff);

      await assert.rejects(
        () => createFounderReviewReport(
          optionsFor(fixture),
          dependencies(),
        ),
        { code: "AIOS_FOUNDER_REVIEW_AUDIT_SEMANTICS_INVALID" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects a manifest whose artifact digest has changed",
  async () => {
    const fixture = createFixture();

    try {
      fs.writeFileSync(
        fixture.manifestPath,
        `${"0".repeat(64)}  aios-verified-delivery.json\n` +
        `${"1".repeat(64)}  aios-delivery-builder-summary.json\n` +
        `${"2".repeat(64)}  aios-delivery-verification.json\n`,
      );

      await assert.rejects(
        () => createFounderReviewReport(
          optionsFor(fixture),
          dependencies(),
        ),
        { code: "AIOS_FOUNDER_REVIEW_MANIFEST_HASH_MISMATCH" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "accepts the native C170.2 moderate risk level",
  async () => {
    const fixture = createFixture("moderate");

    try {
      const report = await createFounderReviewReport(
        optionsFor(fixture),
        dependencies(),
      );

      assert.equal(report.status, "FOUNDER_REVIEW_READY");
      assert.equal(report.impact.analyzer, "C170.2");
      assert.equal(report.impact.risk, "moderate");
      assert.equal(report.founderApproval.decision, "PENDING");
      assert.equal(report.founderApproval.approved, false);
      assert.equal(report.founderApproval.mergeAuthorized, false);
      assert.equal(report.founderApproval.productionDeploymentAuthorized, false);
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects medium because it is not a native C170.2 risk level",
  async () => {
    const fixture = createFixture("medium");

    try {
      await assert.rejects(
        () => createFounderReviewReport(
          optionsFor(fixture),
          dependencies(),
        ),
        { code: "AIOS_FOUNDER_REVIEW_RISK_INVALID" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "writes the review report exclusively outside the repository",
  async () => {
    const fixture = createFixture();
    const reportPath = path.join(
      fixture.output,
      "founder-review.json",
    );

    try {
      const report = await createFounderReviewReport(
        optionsFor(fixture),
        dependencies(),
      );

      writeFounderReviewReport(
        report,
        reportPath,
        fixture.root,
      );

      const saved = JSON.parse(
        fs.readFileSync(reportPath, "utf8"),
      );

      assert.equal(saved.status, "FOUNDER_REVIEW_READY");

      assert.throws(
        () => writeFounderReviewReport(
          report,
          reportPath,
          fixture.root,
        ),
        { code: "AIOS_FOUNDER_REVIEW_OUTPUT_EXISTS" },
      );

      assert.throws(
        () => writeFounderReviewReport(
          report,
          path.join(fixture.root, "review.json"),
          fixture.root,
        ),
        { code: "AIOS_FOUNDER_REVIEW_PATH_INSIDE_REPOSITORY" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);
