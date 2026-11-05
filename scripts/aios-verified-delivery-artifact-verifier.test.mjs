import test from "node:test";
import assert from "node:assert/strict";
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
  const absolutePath = path.join(root, relativePath);

  fs.mkdirSync(path.dirname(absolutePath), {
    recursive: true,
  });

  fs.writeFileSync(absolutePath, content);
}

function commitAll(root, message) {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", message]);
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
      stdout: "test-only verification result",
      stderr: "",
      durationMs: 1,
    }),

    idFactory: () => "c1705-4-test-run",

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
    path.join(os.tmpdir(), "aios-c1705-4-verifier-"),
  );

  git(root, ["init"]);
  git(root, ["config", "user.email", "aios-test@example.invalid"]);
  git(root, ["config", "user.name", "AIOS Test"]);

  write(
    root,
    "package.json",
    JSON.stringify({
      name: "aios-c1705-4-fixture",
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

  write(root, "README.md", "base fixture\n");

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

  const outputDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "aios-c1705-4-output-"),
  );

  const artifactPath = path.join(outputDir, "delivery.json");

  fs.writeFileSync(
    artifactPath,
    artifact.serialized,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );

  return {
    root,
    baseSha,
    headSha,
    artifactPath,
    outputDir,
  };
}

function cleanup(fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
  fs.rmSync(fixture.outputDir, { recursive: true, force: true });
}

function readPayload(fixture) {
  return JSON.parse(
    fs.readFileSync(fixture.artifactPath, "utf8"),
  );
}

function writePayload(fixture, payload) {
  fs.writeFileSync(
    fixture.artifactPath,
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}

test(
  "independently verifies a real generated artifact against Git blobs, C170.2 and C170.4",
  () => {
    const fixture = createFixture();

    try {
      const result = verifyVerifiedDeliveryArtifact({
        root: fixture.root,
        artifactPath: fixture.artifactPath,
        baseSha: fixture.baseSha,
        headSha: fixture.headSha,
      });

      assert.equal(result.status, "VERIFIED");
      assert.equal(result.verifier, "C170.5.4");
      assert.equal(result.verifiedFileCount, 1);
      assert.equal(result.impactAnalyzer, "C170.2");
      assert.equal(result.verificationReceipt.status, "passed");
      assert.equal(result.founderApprovalRequired, true);
      assert.equal(result.mergeAuthorized, false);
      assert.equal(result.productionDeploymentAuthorized, false);
      assert.match(result.artifactSha256, /^[a-f0-9]{64}$/);
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects altered artifact file content even when the artifact JSON remains valid",
  () => {
    const fixture = createFixture();

    try {
      const payload = readPayload(fixture);
      payload.files[0].content += "\n// tampered\n";
      writePayload(fixture, payload);

      assert.throws(
        () => verifyVerifiedDeliveryArtifact({
          root: fixture.root,
          artifactPath: fixture.artifactPath,
          baseSha: fixture.baseSha,
          headSha: fixture.headSha,
        }),
        { code: "AIOS_DELIVERY_VERIFY_CONTENT_MISMATCH" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects altered Founder approval and merge authorization flags",
  () => {
    const fixture = createFixture();

    try {
      const payload = readPayload(fixture);
      payload.founderApproval.approved = true;
      payload.founderApproval.mergeAuthorized = true;
      writePayload(fixture, payload);

      assert.throws(
        () => verifyVerifiedDeliveryArtifact({
          root: fixture.root,
          artifactPath: fixture.artifactPath,
          baseSha: fixture.baseSha,
          headSha: fixture.headSha,
        }),
        { code: "AIOS_DELIVERY_VERIFY_APPROVAL_BOUNDARY_FAILED" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects an artifact stored inside the source repository",
  () => {
    const fixture = createFixture();

    try {
      const insidePath = path.join(fixture.root, "delivery.json");

      fs.copyFileSync(fixture.artifactPath, insidePath);

      assert.throws(
        () => verifyVerifiedDeliveryArtifact({
          root: fixture.root,
          artifactPath: insidePath,
          baseSha: fixture.baseSha,
          headSha: fixture.headSha,
        }),
        { code: "AIOS_DELIVERY_VERIFY_ARTIFACT_INSIDE_REPOSITORY" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects an artifact bound to a different Candidate Commit",
  () => {
    const fixture = createFixture();

    try {
      assert.throws(
        () => verifyVerifiedDeliveryArtifact({
          root: fixture.root,
          artifactPath: fixture.artifactPath,
          baseSha: fixture.baseSha,
          headSha: "not-a-sha",
        }),
        { code: "AIOS_DELIVERY_VERIFY_COMMIT_INVALID" },
      );
    } finally {
      cleanup(fixture);
    }
  },
);
