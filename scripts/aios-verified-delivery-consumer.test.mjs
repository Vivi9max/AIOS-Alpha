import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  buildVerifiedDelivery,
} from "./aios-verified-delivery-builder.mjs";

import {
  verifyVerifiedDeliveryArtifact,
} from "./aios-verified-delivery-artifact-verifier.mjs";

import {
  consumeVerifiedDelivery,
} from "./aios-verified-delivery-consumer.mjs";

import {
  runIndependentVerification,
} from "./aios-engineering-verification-runtime.mjs";

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);

  fs.mkdirSync(path.dirname(target), {
    recursive: true,
  });

  fs.writeFileSync(target, content);
}

function commitAll(root, message) {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", message]);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createReceipt(headSha) {
  return runIndependentVerification({
    getRepositoryState: () => ({
      head: headSha,
      branch: "candidate",
    }),

    runCommand: () => ({
      exitCode: 0,
      signal: null,
      errorCode: null,
      stdout: "C170.5.5 test verification",
      stderr: "",
      durationMs: 1,
    }),

    idFactory: () => "c1705-5-test-run",

    now: (() => {
      let second = 0;

      return () => new Date(
        Date.UTC(2026, 10, 5, 0, 0, second++),
      );
    })(),
  });
}

function createFixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "aios-c1705-5-repository-"),
  );

  const output = fs.mkdtempSync(
    path.join(os.tmpdir(), "aios-c1705-5-output-"),
  );

  git(root, ["init"]);
  git(root, ["config", "user.email", "aios-test@example.invalid"]);
  git(root, ["config", "user.name", "AIOS Test"]);

  write(
    root,
    "package.json",
    JSON.stringify({
      name: "aios-c1705-5-fixture",
      private: true,
    }, null, 2),
  );

  write(
    root,
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        moduleResolution: "node",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ["src/**/*.ts"],
    }, null, 2),
  );

  write(
    root,
    "src/base.ts",
    [
      "export function baseValue(): number {",
      "  return 40;",
      "}",
      "",
    ].join("\n"),
  );

  commitAll(root, "base fixture");

  const baseSha = git(root, ["rev-parse", "HEAD"]);

  write(
    root,
    "src/module.ts",
    [
      'import { baseValue } from "./base";',
      "",
      "export function moduleValue(): number {",
      "  return baseValue() + 2;",
      "}",
      "",
    ].join("\n"),
  );

  commitAll(root, "candidate fixture");

  const headSha = git(root, ["rev-parse", "HEAD"]);
  const receipt = createReceipt(headSha);

  const artifact = buildVerifiedDelivery({
    root,
    baseSha,
    headSha,
    receipt,
  });

  const artifactPath = path.join(
    output,
    "aios-verified-delivery.json",
  );

  const summaryPath = path.join(
    output,
    "aios-delivery-builder-summary.json",
  );

  const verificationPath = path.join(
    output,
    "aios-delivery-verification.json",
  );

  const manifestPath = path.join(
    output,
    "aios-delivery-artifact.sha256",
  );

  const stagingPath = path.join(
    output,
    "handoff",
  );

  const auditPath = path.join(
    output,
    "handoff-audit.json",
  );

  fs.writeFileSync(
    artifactPath,
    artifact.serialized,
    { flag: "wx", mode: 0o600 },
  );

  const builderSummary = {
    status: "DELIVERY_ARTIFACT_READY",
    repository: {
      baseCommitSha: baseSha,
      candidateCommitSha: headSha,
    },
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
  };

  fs.writeFileSync(
    summaryPath,
    `${JSON.stringify(builderSummary, null, 2)}\n`,
  );

  const verification = verifyVerifiedDeliveryArtifact({
    root,
    artifactPath,
    baseSha,
    headSha,
  });

  fs.writeFileSync(
    verificationPath,
    `${JSON.stringify(verification, null, 2)}\n`,
  );

  const manifestFiles = [
    artifactPath,
    summaryPath,
    verificationPath,
  ];

  fs.writeFileSync(
    manifestPath,
    manifestFiles.map((filePath) => {
      const content = fs.readFileSync(filePath);

      return `${sha256(content)}  ${path.basename(filePath)}`;
    }).join("\n") + "\n",
  );

  return {
    root,
    output,
    baseSha,
    headSha,
    artifactPath,
    summaryPath,
    verificationPath,
    manifestPath,
    stagingPath,
    auditPath,
  };
}

function cleanup(fixture) {
  fs.rmSync(fixture.root, {
    recursive: true,
    force: true,
  });

  fs.rmSync(fixture.output, {
    recursive: true,
    force: true,
  });
}

function consume(fixture, overrides = {}) {
  return consumeVerifiedDelivery({
    root: fixture.root,
    artifactPath: fixture.artifactPath,
    manifestPath: fixture.manifestPath,
    builderSummaryPath: fixture.summaryPath,
    verificationPath: fixture.verificationPath,
    baseSha: fixture.baseSha,
    headSha: fixture.headSha,
    stagingPath: fixture.stagingPath,
    auditPath: fixture.auditPath,
    ...overrides,
  });
}

test(
  "consumes a verified artifact into an isolated Founder review handoff",
  () => {
    const fixture = createFixture();

    try {
      const result = consume(fixture);

      assert.equal(
        result.status,
        "STAGED_FOR_FOUNDER_REVIEW",
      );

      assert.equal(result.candidateCommitSha, fixture.headSha);
      assert.equal(result.baseCommitSha, fixture.baseSha);
      assert.equal(result.founderApprovalRequired, true);
      assert.equal(result.mergeAuthorized, false);
      assert.equal(result.productionDeploymentAuthorized, false);
      assert.equal(result.productionFilesModified, false);

      assert.equal(
        fs.existsSync(
          path.join(fixture.stagingPath, "handoff.json"),
        ),
        true,
      );

      assert.equal(
        fs.existsSync(
          path.join(fixture.stagingPath, "rollback-evidence.json"),
        ),
        true,
      );

      assert.equal(
        fs.existsSync(fixture.auditPath),
        true,
      );

      const handoff = JSON.parse(
        fs.readFileSync(
          path.join(fixture.stagingPath, "handoff.json"),
          "utf8",
        ),
      );

      assert.equal(
        handoff.status,
        "STAGED_FOR_FOUNDER_REVIEW",
      );

      assert.equal(
        handoff.founderApproval.approved,
        false,
      );

      assert.equal(
        handoff.productionMutation.performed,
        false,
      );

      const stagedSource = fs.readFileSync(
        path.join(fixture.stagingPath, "src/module.ts"),
        "utf8",
      );

      assert.match(stagedSource, /baseValue/);

      assert.equal(
        fs.readFileSync(
          path.join(fixture.root, "src/module.ts"),
          "utf8",
        ),
        stagedSource,
      );

      assert.equal(
        git(fixture.root, ["rev-parse", "HEAD"]),
        fixture.headSha,
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects a modified SHA-256 manifest and records failure audit",
  () => {
    const fixture = createFixture();

    try {
      fs.writeFileSync(
        fixture.manifestPath,
        "0".repeat(64) + "  aios-verified-delivery.json\n",
      );

      assert.throws(
        () => consume(fixture),
        {
          code: "AIOS_HANDOFF_MANIFEST_INCOMPLETE",
        },
      );

      assert.equal(
        fs.existsSync(fixture.stagingPath),
        false,
      );

      const audit = JSON.parse(
        fs.readFileSync(fixture.auditPath, "utf8"),
      );

      assert.equal(audit.status, "REJECTED");
      assert.equal(audit.productionFilesModified, false);
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects a different Candidate Commit",
  () => {
    const fixture = createFixture();

    try {
      assert.throws(
        () => consume(fixture, {
          headSha: "a".repeat(40),
        }),
        {
          code: "AIOS_DELIVERY_VERIFY_COMMIT_INVALID",
        },
      );

      assert.equal(
        fs.existsSync(fixture.stagingPath),
        false,
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects a staging directory inside the production source repository",
  () => {
    const fixture = createFixture();

    try {
      assert.throws(
        () => consume(fixture, {
          stagingPath: path.join(fixture.root, "production"),
        }),
        {
          code: "AIOS_HANDOFF_PRODUCTION_PATH_REJECTED",
        },
      );

      assert.equal(
        fs.existsSync(
          path.join(fixture.root, "production"),
        ),
        false,
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "refuses to overwrite an existing staging directory",
  () => {
    const fixture = createFixture();

    try {
      fs.mkdirSync(fixture.stagingPath);

      assert.throws(
        () => consume(fixture),
        {
          code: "AIOS_HANDOFF_OVERWRITE_REJECTED",
        },
      );

      assert.equal(
        fs.existsSync(fixture.auditPath),
        true,
      );

      assert.equal(
        git(fixture.root, ["rev-parse", "HEAD"]),
        fixture.headSha,
      );
    } finally {
      cleanup(fixture);
    }
  },
);
