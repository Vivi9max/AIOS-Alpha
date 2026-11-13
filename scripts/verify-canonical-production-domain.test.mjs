import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CANONICAL_PRODUCTION_URL,
  verifyCanonicalProductionDomain,
} from "./verify-canonical-production-domain.mjs";

const expectedSha =
  "bc2a59bb46b6951a403f78cdd722dbccb160210b";

function createTempReceipt() {
  const directory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "aios-canonical-production-",
    ),
  );

  return {
    directory,
    outputPath: path.join(
      directory,
      "canonical-verification.json",
    ),
  };
}

function validEnv(outputPath, extra = {}) {
  return {
    EXPECTED_COMMIT_SHA: expectedSha,
    AIOS_CANONICAL_DOMAIN_VERIFICATION_OUTPUT:
      outputPath,
    ...extra,
  };
}

function createVerifiedResult(baseUrl, env) {
  const receipt = {
    schemaVersion: 1,
    status: "PRODUCTION_VERIFIED",
    repository: "Vivi9max/AIOS-Alpha",
    expectedCommitSha: expectedSha,
    observedCommitSha: expectedSha,
    release: "C170",
    service: "AIOS Alpha",
    authenticationMode: "automation-bypass",
    deploymentUrl: baseUrl,
    requestId: "test-request-id",
    verifiedAt: "2026-11-12T12:00:00.000Z",
  };

  fs.writeFileSync(
    env.AIOS_PRODUCTION_VERIFICATION_OUTPUT,
    `${JSON.stringify(receipt, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx",
    },
  );

  return {
    ok: true,
    status: "PRODUCTION_VERIFIED",
    expectedCommitSha: expectedSha,
    observedCommitSha: expectedSha,
    deploymentUrl: baseUrl,
  };
}

test(
  "C170.7.2-01: canonical domain uses the exact production origin",
  async () => {
    const temp = createTempReceipt();

    try {
      let capturedBaseUrl;
      let capturedEnv;

      const result =
        await verifyCanonicalProductionDomain({
          env: validEnv(temp.outputPath),

          verifyImpl: async (options) => {
            capturedBaseUrl = options.baseUrl;
            capturedEnv = options.env;

            return createVerifiedResult(
              options.baseUrl,
              options.env,
            );
          },

          log: {
            log() {},
            error() {},
          },
        });

      assert.equal(
        capturedBaseUrl,
        CANONICAL_PRODUCTION_URL,
      );

      assert.equal(
        capturedEnv.EXPECTED_COMMIT_SHA,
        expectedSha,
      );

      assert.equal(result.ok, true);

      assert.equal(
        result.verificationType,
        "CANONICAL_DOMAIN_ALIAS",
      );

      assert.equal(
        result.canonicalDomain,
        CANONICAL_PRODUCTION_URL,
      );

      assert.equal(
        result.observedCommitSha,
        expectedSha,
      );

      assert.ok(
        fs.existsSync(temp.outputPath),
      );
    } finally {
      fs.rmSync(temp.directory, {
        recursive: true,
        force: true,
      });
    }
  },
);

test(
  "C170.7.2-02: missing receipt output path fails closed",
  async () => {
    let verifyCalls = 0;

    await assert.rejects(
      verifyCanonicalProductionDomain({
        env: {
          EXPECTED_COMMIT_SHA: expectedSha,
        },

        verifyImpl: async () => {
          verifyCalls += 1;
        },
      }),
      /AIOS_CANONICAL_DOMAIN_VERIFICATION_OUTPUT is required/,
    );

    assert.equal(verifyCalls, 0);
  },
);

test(
  "C170.7.2-03: invalid expected Commit SHA fails closed",
  async () => {
    const temp = createTempReceipt();

    try {
      let verifyCalls = 0;

      await assert.rejects(
        verifyCanonicalProductionDomain({
          env: validEnv(temp.outputPath, {
            EXPECTED_COMMIT_SHA: "invalid",
          }),

          verifyImpl: async () => {
            verifyCalls += 1;
          },
        }),
        /full 40-character Git commit SHA/,
      );

      assert.equal(verifyCalls, 0);
    } finally {
      fs.rmSync(temp.directory, {
        recursive: true,
        force: true,
      });
    }
  },
);

test(
  "C170.7.2-04: mismatched observed Commit SHA fails",
  async () => {
    const temp = createTempReceipt();

    try {
      await assert.rejects(
        verifyCanonicalProductionDomain({
          env: validEnv(temp.outputPath),

          verifyImpl: async (options) => ({
            ok: true,
            status: "PRODUCTION_VERIFIED",
            expectedCommitSha: expectedSha,
            observedCommitSha:
              "1bff4457ff043e8ded3f481593074b40a5cfe75c",
            deploymentUrl: options.baseUrl,
          }),
        }),
        /Canonical Production domain Commit SHA mismatch/,
      );
    } finally {
      fs.rmSync(temp.directory, {
        recursive: true,
        force: true,
      });
    }
  },
);

test(
  "C170.7.2-05: mismatched canonical receipt fails",
  async () => {
    const temp = createTempReceipt();

    try {
      await assert.rejects(
        verifyCanonicalProductionDomain({
          env: validEnv(temp.outputPath),

          verifyImpl: async (options) => {
            const result = createVerifiedResult(
              options.baseUrl,
              options.env,
            );

            const receipt = JSON.parse(
              fs.readFileSync(
                temp.outputPath,
                "utf8",
              ),
            );

            receipt.deploymentUrl =
              "https://attacker.example";

            fs.writeFileSync(
              temp.outputPath,
              JSON.stringify(receipt),
            );

            return result;
          },
        }),
        /Canonical Production domain receipt validation failed/,
      );
    } finally {
      fs.rmSync(temp.directory, {
        recursive: true,
        force: true,
      });
    }
  },
);
