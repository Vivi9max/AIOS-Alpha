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
} from "./aios-verified-delivery-builder.mjs";

import {
  runIndependentVerification,
} from "./aios-engineering-verification-runtime.mjs";

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

function createFixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "aios-c1705-"),
  );

  git(root, ["init"]);
  git(root, ["config", "user.email", "aios-test@example.invalid"]);
  git(root, ["config", "user.name", "AIOS Test"]);

  fs.writeFileSync(
    path.join(root, "README.md"),
    "base fixture\n",
  );

  git(root, ["add", "README.md"]);
  git(root, ["commit", "-m", "base"]);

  const baseSha = git(
    root,
    ["rev-parse", "HEAD"],
  );

  fs.writeFileSync(
    path.join(root, "module.mjs"),
    "export const value = 42;\n",
  );

  git(root, ["add", "module.mjs"]);
  git(root, ["commit", "-m", "candidate"]);

  const headSha = git(
    root,
    ["rev-parse", "HEAD"],
  );

  const receipt = runIndependentVerification({
    getRepositoryState: () => ({
      head: headSha,
      branch: "candidate",
    }),

    runCommand: () => ({
      exitCode: 0,
      signal: null,
      errorCode: null,
      stdout: "ok",
      stderr: "",
      durationMs: 1,
    }),

    idFactory: () => "c1705-test-run",

    now: (() => {
      let second = 0;

      return () =>
        new Date(
          Date.UTC(2026, 10, 5, 0, 0, second++),
        );
    })(),
  });

  const impactReport = {
    schemaVersion: 1,
    analyzer: "C170.2",

    repository: {
      head: headSha,
      branch: "candidate",
    },

    changedFiles: ["module.mjs"],
    affectedFiles: [],
    affectedFileCount: 0,
    likelyTests: [],
    limitations: ["fixture limitation"],

    risk: {
      level: "low",
      reasons: [],
    },

    readOnly: true,
    requiresFounderReview: true,
  };

  return {
    root,
    baseSha,
    headSha,
    receipt,
    impactReport,
  };
}

test(
  "builds a complete immutable-commit delivery with verified file hashes",
  () => {
    const fixture = createFixture();

    try {
      const artifact = buildVerifiedDelivery({
        ...fixture,

        now: () =>
          new Date("2026-11-05T00:00:00.000Z"),
      });

      assert.equal(
        artifact.payload.builder,
        "C170.5",
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
        "module.mjs",
      );

      assert.equal(
        artifact.payload.files[0].content,
        "export const value = 42;\n",
      );

      assert.equal(
        artifact.payload.files[0].sha256,
        crypto
          .createHash("sha256")
          .update("export const value = 42;\n")
          .digest("hex"),
      );

      assert.equal(
        artifact.payload.verification.receipt.receiptSha256,
        fixture.receipt.receiptSha256,
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
        artifact.payload.rollback.automaticRollback,
        false,
      );
    } finally {
      fs.rmSync(
        fixture.root,
        {
          recursive: true,
          force: true,
        },
      );
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
      fs.rmSync(
        fixture.root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "rejects an impact report whose changed-file list differs from Git",
  () => {
    const fixture = createFixture();

    try {
      const impactReport = {
        ...fixture.impactReport,
        changedFiles: ["README.md"],
      };

      assert.throws(
        () =>
          buildVerifiedDelivery({
            ...fixture,
            impactReport,
          }),
        {
          code: "AIOS_DELIVERY_IMPACT_CHANGESET_MISMATCH",
        },
      );
    } finally {
      fs.rmSync(
        fixture.root,
        {
          recursive: true,
          force: true,
        },
      );
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

      git(fixture.root, ["add", "-A"]);
      git(fixture.root, ["commit", "-m", "delete tracked file"]);

      const deletedHead = git(
        fixture.root,
        ["rev-parse", "HEAD"],
      );

      const receipt = runIndependentVerification({
        getRepositoryState: () => ({
          head: deletedHead,
          branch: "candidate",
        }),

        runCommand: () => ({
          exitCode: 0,
          stdout: "ok",
          stderr: "",
          durationMs: 1,
        }),
      });

      assert.throws(
        () =>
          buildVerifiedDelivery({
            ...fixture,

            headSha: deletedHead,
            receipt,

            impactReport: {
              ...fixture.impactReport,

              repository: {
                head: deletedHead,
              },

              changedFiles: ["README.md"],
            },
          }),
        {
          code: "AIOS_DELIVERY_CHANGE_TYPE_UNSUPPORTED",
        },
      );
    } finally {
      fs.rmSync(
        fixture.root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "writes only outside the repository and refuses to overwrite an artifact",
  () => {
    const fixture = createFixture();

    const outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "aios-c1705-output-"),
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
      fs.rmSync(
        fixture.root,
        {
          recursive: true,
          force: true,
        },
      );

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

      fs.writeFileSync(
        path.join(fixture.root, "module.mjs"),
        `export const api_key = "${credential}";\n`,
      );

      git(fixture.root, ["add", "module.mjs"]);
      git(fixture.root, ["commit", "-m", "credential fixture"]);

      const headSha = git(
        fixture.root,
        ["rev-parse", "HEAD"],
      );

      const receipt = runIndependentVerification({
        getRepositoryState: () => ({
          head: headSha,
          branch: "candidate",
        }),

        runCommand: () => ({
          exitCode: 0,
          stdout: "ok",
          stderr: "",
          durationMs: 1,
        }),
      });

      assert.throws(
        () =>
          buildVerifiedDelivery({
            ...fixture,

            headSha,
            receipt,

            impactReport: {
              ...fixture.impactReport,

              repository: {
                head: headSha,
              },
            },
          }),
        {
          code: "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED",
        },
      );
    } finally {
      fs.rmSync(
        fixture.root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);
