import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  buildVerifiedDelivery,
  writeVerifiedDelivery,
  VERIFIED_DELIVERY_LIMITS,
} from "./aios-verified-delivery-builder.mjs";

import {
  analyzeDependencyImpact,
} from "./aios-dependency-impact.mjs";

import {
  runIndependentVerification,
  verifyVerificationReceipt,
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
      stdout: "test-only injected command result",
      stderr: "",
      durationMs: 1,
    }),

    idFactory: () => "c1705-2-test-run",

    now: (() => {
      let second = 0;

      return () =>
        new Date(
          Date.UTC(2026, 10, 5, 0, 0, second++),
        );
    })(),
  });
}

function createFixture(options = {}) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "aios-c1705-2-"),
  );

  git(root, ["init"]);
  git(root, ["config", "user.email", "aios-test@example.invalid"]);
  git(root, ["config", "user.name", "AIOS Test"]);

  write(
    root,
    "package.json",
    JSON.stringify({
      name: "aios-c1705-2-fixture",
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
    "README.md",
    "base fixture\n",
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

  const baseSha = git(
    root,
    ["rev-parse", "HEAD"],
  );

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

  const extraChangedFiles = Number.isInteger(options.extraChangedFiles)
    ? options.extraChangedFiles
    : 0;

  for (let index = 0; index < extraChangedFiles; index += 1) {
    write(
      root,
      `docs/changed-${String(index).padStart(3, "0")}.txt`,
      `fixture file ${index}\n`,
    );
  }

  commitAll(root, "candidate fixture");

  const headSha = git(
    root,
    ["rev-parse", "HEAD"],
  );

  const receipt = createReceipt(headSha);

  return {
    root,
    baseSha,
    headSha,
    receipt,
  };
}

function cleanup(fixture) {
  fs.rmSync(
    fixture.root,
    {
      recursive: true,
      force: true,
    },
  );
}

test(
  "builds a complete immutable delivery using the real C170.2 analyzer and C170.4 verifier",
  () => {
    const fixture = createFixture();

    try {
      const actualImpact = analyzeDependencyImpact(
        fixture.root,
        ["src/module.ts"],
      );

      const receiptCheck = verifyVerificationReceipt(
        fixture.receipt,
        fixture.headSha,
      );

      assert.equal(receiptCheck.valid, true);
      assert.equal(receiptCheck.passed, true);

      assert.equal(actualImpact.analyzer, "C170.2");
      assert.equal(actualImpact.repository.head, fixture.headSha);
      assert.deepEqual(actualImpact.changedFiles, ["src/module.ts"]);

      const artifact = buildVerifiedDelivery({
        ...fixture,
        now: () =>
          new Date("2026-11-05T00:00:00.000Z"),
      });

      assert.equal(
        artifact.payload.builder,
        "C170.5.2",
      );

      assert.equal(
        artifact.payload.repository.baseCommitSha,
        fixture.baseSha,
      );

      assert.equal(
        artifact.payload.repository.candidateCommitSha,
        fixture.headSha,
      );

      assert.equal(
        artifact.payload.files.length,
        1,
      );

      assert.equal(
        artifact.payload.files[0].path,
        "src/module.ts",
      );

      assert.equal(
        artifact.payload.files[0].content,
        [
          'import { baseValue } from "./base";',
          "",
          "export function moduleValue(): number {",
          "  return baseValue() + 2;",
          "}",
          "",
        ].join("\n"),
      );

      assert.equal(
        artifact.payload.files[0].sha256,
        crypto
          .createHash("sha256")
          .update(artifact.payload.files[0].content)
          .digest("hex"),
      );

      assert.equal(
        artifact.payload.impact.analyzer,
        "C170.2",
      );

      assert.deepEqual(
        artifact.payload.impact.changedFiles,
        ["src/module.ts"],
      );

      assert.equal(
        artifact.payload.changeSummary.fileCount,
        actualImpact.changedFileCount,
      );

      assert.equal(
        artifact.payload.verification.receipt.receiptSha256,
        fixture.receipt.receiptSha256,
      );

      assert.equal(
        artifact.payload.founderApproval.required,
        true,
      );

      assert.equal(
        artifact.payload.founderApproval.approved,
        false,
      );

      assert.equal(
        artifact.payload.founderApproval.mergeAuthorized,
        false,
      );

      assert.equal(
        artifact.payload.founderApproval.productionDeploymentAuthorized,
        false,
      );

      assert.equal(
        artifact.payload.rollback.automaticRollback,
        false,
      );

      assert.match(
        artifact.serialized,
        /"builder": "C170\.5\.2"/,
      );

      assert.equal(
        artifact.artifactSha256,
        crypto
          .createHash("sha256")
          .update(artifact.serialized)
          .digest("hex"),
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects a verification receipt bound to another commit",
  () => {
    const fixture = createFixture();

    try {
      const wrongReceipt = {
        ...fixture.receipt,

        repository: {
          ...fixture.receipt.repository,
          commitSha: "b".repeat(40),
        },
      };

      assert.throws(
        () =>
          buildVerifiedDelivery({
            ...fixture,
            receipt: wrongReceipt,
          }),
        {
          code: "AIOS_DELIVERY_VERIFICATION_FAILED",
        },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects a candidate SHA that is not the checked-out HEAD",
  () => {
    const fixture = createFixture();

    try {
      const earlierCommit = git(
        fixture.root,
        ["rev-parse", `${fixture.headSha}^`],
      );

      assert.throws(
        () =>
          buildVerifiedDelivery({
            ...fixture,
            headSha: earlierCommit,
          }),
        {
          code: "AIOS_DELIVERY_CANDIDATE_NOT_HEAD",
        },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects tracked working-tree modifications before C170.2 analysis",
  () => {
    const fixture = createFixture();

    try {
      write(
        fixture.root,
        "README.md",
        "uncommitted modification\n",
      );

      assert.throws(
        () =>
          buildVerifiedDelivery(fixture),
        {
          code: "AIOS_DELIVERY_IMPACT_ANALYSIS_FAILED",
        },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects an externally supplied impact report that differs from real C170.2 output",
  () => {
    const fixture = createFixture();

    try {
      const forgedOrStaleReport = {
        schemaVersion: 1,
        analyzer: "C170.2",
        repository: {
          head: fixture.headSha,
          branch: "candidate",
        },
        changedFiles: ["README.md"],
        changedFileCount: 1,
        affectedFiles: [],
        affectedFileCount: 0,
        likelyTests: [],
        limitations: [],
        risk: {
          level: "low",
          reasons: [],
        },
        readOnly: true,
        requiresFounderReview: true,
      };

      assert.throws(
        () =>
          buildVerifiedDelivery({
            ...fixture,
            impactReport: forgedOrStaleReport,
          }),
        {
          code: "AIOS_DELIVERY_EXTERNAL_IMPACT_MISMATCH",
        },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "rejects deleted files because the current C170.2 contract cannot analyze them",
  () => {
    const fixture = createFixture();

    try {
      fs.rmSync(
        path.join(fixture.root, "README.md"),
      );

      commitAll(
        fixture.root,
        "delete tracked file",
      );

      const deletedHead = git(
        fixture.root,
        ["rev-parse", "HEAD"],
      );

      const receipt = createReceipt(deletedHead);

      assert.throws(
        () =>
          buildVerifiedDelivery({
            ...fixture,
            headSha: deletedHead,
            receipt,
          }),
        {
          code: "AIOS_DELIVERY_CHANGE_TYPE_UNSUPPORTED",
        },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "enforces the shared 100-file C170.2 and C170.5 hard limit",
  () => {
    assert.equal(
      VERIFIED_DELIVERY_LIMITS.maxChangedFiles,
      100,
    );

    const fixture = createFixture({
      extraChangedFiles: 100,
    });

    try {
      assert.throws(
        () =>
          buildVerifiedDelivery(fixture),
        {
          code: "AIOS_DELIVERY_FILE_LIMIT",
        },
      );
    } finally {
      cleanup(fixture);
    }
  },
);

test(
  "writes only outside the repository and refuses to overwrite an artifact",
  () => {
    const fixture = createFixture();

    const outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "aios-c1705-2-output-"),
    );

    const outputPath = path.join(
      outputDir,
      "delivery.json",
    );

    try {
      const artifact = buildVerifiedDelivery(fixture);

      const written = writeVerifiedDelivery(
        artifact,
        outputPath,
        fixture.root,
      );

      assert.equal(
        fs.existsSync(outputPath),
        true,
      );

      assert.equal(
        written.sha256,
        artifact.artifactSha256,
      );

      assert.equal(
        fs.statSync(outputPath).mode & 0o777,
        0o600,
      );

      assert.throws(
        () =>
          writeVerifiedDelivery(
            artifact,
            outputPath,
            fixture.root,
          ),
        {
          code: "AIOS_DELIVERY_OUTPUT_EXISTS",
        },
      );

      assert.throws(
        () =>
          writeVerifiedDelivery(
            artifact,
            path.join(
              fixture.root,
              "delivery.json",
            ),
            fixture.root,
          ),
        {
          code: "AIOS_DELIVERY_OUTPUT_INSIDE_REPOSITORY",
        },
      );
    } finally {
      cleanup(fixture);

      fs.rmSync(
        outputDir,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "secret guard blocks a credential-like value inside delivered file content",
  () => {
    const fixture = createFixture();

    try {
      const credential =
        "sk-" + "123456789012345678901234";

      write(
        fixture.root,
        "src/module.ts",
        `export const api_key = "${credential}";\n`,
      );

      commitAll(
        fixture.root,
        "credential fixture",
      );

      const headSha = git(
        fixture.root,
        ["rev-parse", "HEAD"],
      );

      const receipt = createReceipt(headSha);

      assert.throws(
        () =>
          buildVerifiedDelivery({
            ...fixture,
            headSha,
            receipt,
          }),
        {
          code: "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED",
        },
      );
    } finally {
      cleanup(fixture);
    }
  },
);
