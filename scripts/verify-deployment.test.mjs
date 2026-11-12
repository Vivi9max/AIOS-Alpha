import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  verifyDeployment,
} from "./verify-deployment.mjs";

const baseUrl = "https://preview.example.test";

const expectedSha =
  "1bff4457ff043e8ded3f481593074b40a5cfe75c";

const wrongSha =
  "2bff4457ff043e8ded3f481593074b40a5cfe75c";

function response(status, {
  body = null,
  location = null,
  setCookies = [],
  requestId = "test-request-id",
} = {}) {
  const headers = new Headers();

  if (location) {
    headers.set("location", location);
  }

  if (requestId) {
    headers.set("x-vercel-id", requestId);
  }

  headers.getSetCookie = () => setCookies;

  return {
    status,
    statusText: "",
    ok: status >= 200 && status < 300,
    headers,

    async json() {
      if (body instanceof Error) {
        throw body;
      }

      return body;
    },
  };
}

const healthyBody = {
  ok: true,
  service: "AIOS Alpha",
  release: "0.5.1",
  commitSha: expectedSha,
  checks: {
    application: "ok",
    manifest: "ok",
  },
  timestamp: "2026-11-04T00:00:00.000Z",
};

function silentLog() {
  return {
    log() {},
    error() {},
  };
}

function validEnv(extra = {}) {
  return {
    EXPECTED_COMMIT_SHA: expectedSha,
    ...extra,
  };
}

test(
  "C170.7.1-01: exact Production Commit SHA passes",
  async () => {
    let calls = 0;

    const result = await verifyDeployment({
      baseUrl,
      env: validEnv(),
      log: silentLog(),

      fetchImpl: async () => {
        calls += 1;

        return response(200, {
          body: healthyBody,
        });
      },
    });

    assert.equal(calls, 1);
    assert.equal(result.ok, true);
    assert.equal(
      result.status,
      "PRODUCTION_VERIFIED",
    );
    assert.equal(
      result.expectedCommitSha,
      expectedSha,
    );
    assert.equal(
      result.observedCommitSha,
      expectedSha,
    );
    assert.equal(result.release, "0.5.1");
  },
);

test(
  "C170.7.1-02: missing expected SHA fails before network access",
  async () => {
    let calls = 0;

    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: {},
        log: silentLog(),

        fetchImpl: async () => {
          calls += 1;

          return response(200, {
            body: healthyBody,
          });
        },
      }),
      /EXPECTED_COMMIT_SHA must be a full 40-character/,
    );

    assert.equal(calls, 0);
  },
);

test(
  "C170.7.1-03: invalid expected SHA fails closed",
  async () => {
    let calls = 0;

    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: {
          EXPECTED_COMMIT_SHA: "1234",
        },
        log: silentLog(),

        fetchImpl: async () => {
          calls += 1;

          return response(200, {
            body: healthyBody,
          });
        },
      }),
      /EXPECTED_COMMIT_SHA must be a full 40-character/,
    );

    assert.equal(calls, 0);
  },
);

test(
  "C170.7.1-04: Production Commit SHA mismatch fails",
  async () => {
    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: validEnv(),
        log: silentLog(),

        fetchImpl: async () =>
          response(200, {
            body: {
              ...healthyBody,
              commitSha: wrongSha,
            },
          }),
      }),
      /Production Commit SHA does not match/,
    );
  },
);

test(
  "C170.7.1-05: missing runtime Commit SHA fails",
  async () => {
    const {
      commitSha,
      ...bodyWithoutSha
    } = healthyBody;

    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: validEnv(),
        log: silentLog(),

        fetchImpl: async () =>
          response(200, {
            body: bodyWithoutSha,
          }),
      }),
      /health.commitSha is missing or invalid/,
    );
  },
);

test(
  "C170.7.1-06: malformed runtime Commit SHA fails",
  async () => {
    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: validEnv(),
        log: silentLog(),

        fetchImpl: async () =>
          response(200, {
            body: {
              ...healthyBody,
              commitSha: "not-a-valid-sha",
            },
          }),
      }),
      /health.commitSha is missing or invalid/,
    );
  },
);

test(
  "C170.7.1-07: exact verification writes a write-once receipt",
  async () => {
    const directory = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "aios-production-verification-",
      ),
    );

    const outputPath = path.join(
      directory,
      "production-verification.json",
    );

    const summaryPath = path.join(
      directory,
      "step-summary.md",
    );

    try {
      const result = await verifyDeployment({
        baseUrl,

        env: validEnv({
          AIOS_PRODUCTION_VERIFICATION_OUTPUT:
            outputPath,
          GITHUB_STEP_SUMMARY: summaryPath,
        }),

        log: silentLog(),

        fetchImpl: async () =>
          response(200, {
            body: healthyBody,
          }),
      });

      const receipt = JSON.parse(
        fs.readFileSync(outputPath, "utf8"),
      );

      const summary = fs.readFileSync(
        summaryPath,
        "utf8",
      );

      assert.equal(
        receipt.status,
        "PRODUCTION_VERIFIED",
      );

      assert.equal(
        receipt.expectedCommitSha,
        expectedSha,
      );

      assert.equal(
        receipt.observedCommitSha,
        expectedSha,
      );

      assert.equal(result.ok, true);

      assert.match(
        summary,
        /PRODUCTION_VERIFIED/,
      );

      assert.match(
        summary,
        new RegExp(expectedSha),
      );

      await assert.rejects(
        verifyDeployment({
          baseUrl,

          env: validEnv({
            AIOS_PRODUCTION_VERIFICATION_OUTPUT:
              outputPath,
          }),

          log: silentLog(),

          fetchImpl: async () =>
            response(200, {
              body: healthyBody,
            }),
        }),
        /EEXIST/,
      );
    } finally {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
);

test(
  "C170.7.1-08: same-origin 307 cookie handshake retries once",
  async () => {
    const requests = [];

    const result = await verifyDeployment({
      baseUrl,

      env: validEnv({
        VERCEL_AUTOMATION_BYPASS_SECRET:
          "test-secret",
      }),

      log: silentLog(),

      fetchImpl: async (url, options) => {
        requests.push({
          url,
          options,
        });

        if (requests.length === 1) {
          return response(307, {
            location:
              "/api/health?__vercel_challenge=opaque",

            setCookies: [
              "__vercel_protection_bypass=opaque-cookie; Path=/; Secure; HttpOnly; SameSite=None",
            ],
          });
        }

        return response(200, {
          body: healthyBody,
        });
      },
    });

    assert.equal(result.ok, true);
    assert.equal(requests.length, 2);

    assert.equal(
      requests[1].url,
      `${baseUrl}/api/health`,
    );

    assert.match(
      requests[1].options.headers.Cookie,
      /__vercel_protection_bypass=opaque-cookie/,
    );

    assert.equal(
      requests[1].options.headers[
        "x-vercel-protection-bypass"
      ],
      "test-secret",
    );
  },
);

test(
  "C170.7.1-09: 307 without Set-Cookie fails closed",
  async () => {
    let calls = 0;

    await assert.rejects(
      verifyDeployment({
        baseUrl,

        env: validEnv({
          VERCEL_AUTOMATION_BYPASS_SECRET:
            "test-secret",
        }),

        log: silentLog(),

        fetchImpl: async () => {
          calls += 1;

          return response(307, {
            location: "/api/health",
            setCookies: [],
          });
        },
      }),
      /did not provide a usable Set-Cookie/,
    );

    assert.equal(calls, 1);
  },
);

test(
  "C170.7.1-10: cross-origin redirect is rejected",
  async () => {
    let calls = 0;

    await assert.rejects(
      verifyDeployment({
        baseUrl,

        env: validEnv({
          VERCEL_AUTOMATION_BYPASS_SECRET:
            "test-secret",
        }),

        log: silentLog(),

        fetchImpl: async () => {
          calls += 1;

          return response(307, {
            location:
              "https://attacker.example/api/health",

            setCookies: [
              "session=opaque; Path=/; Secure",
            ],
          });
        },
      }),
      /redirect rejected/,
    );

    assert.equal(calls, 1);
  },
);

test(
  "C170.7.1-11: redirect to another path is rejected",
  async () => {
    let calls = 0;

    await assert.rejects(
      verifyDeployment({
        baseUrl,

        env: validEnv({
          VERCEL_AUTOMATION_BYPASS_SECRET:
            "test-secret",
        }),

        log: silentLog(),

        fetchImpl: async () => {
          calls += 1;

          return response(307, {
            location: "/alpha",

            setCookies: [
              "session=opaque; Path=/; Secure",
            ],
          });
        },
      }),
      /redirect rejected/,
    );

    assert.equal(calls, 1);
  },
);

test(
  "C170.7.1-12: a second redirect fails closed",
  async () => {
    let calls = 0;

    await assert.rejects(
      verifyDeployment({
        baseUrl,

        env: validEnv({
          VERCEL_AUTOMATION_BYPASS_SECRET:
            "test-secret",
        }),

        log: silentLog(),

        fetchImpl: async () => {
          calls += 1;

          if (calls === 1) {
            return response(307, {
              location: "/api/health",

              setCookies: [
                "__vercel_protection_bypass=opaque; Path=/; Secure",
              ],
            });
          }

          return response(307, {
            location: "/api/health?again=1",

            setCookies: [
              "__vercel_protection_bypass=opaque2; Path=/; Secure",
            ],
          });
        },
      }),
      /retry still redirected/,
    );

    assert.equal(calls, 2);
  },
);

test(
  "C170.7.1-13: invalid health contract fails",
  async () => {
    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: validEnv(),
        log: silentLog(),

        fetchImpl: async () =>
          response(200, {
            body: {
              ...healthyBody,

              checks: {
                application: "ok",
                manifest: "failed",
              },
            },
          }),
      }),
      /manifest check failed/,
    );
  },
);

test(
  "C170.7.1-14: redirect without bypass authentication fails",
  async () => {
    let calls = 0;

    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: validEnv(),
        log: silentLog(),

        fetchImpl: async () => {
          calls += 1;

          return response(307, {
            location: "/api/health",

            setCookies: [
              "session=opaque; Path=/; Secure",
            ],
          });
        },
      }),
      /without automation-bypass authentication/,
    );

    assert.equal(calls, 1);
  },
);

test(
  "C170.7.1-15: non-HTTPS deployment URL is rejected",
  async () => {
    let calls = 0;

    await assert.rejects(
      verifyDeployment({
        baseUrl: "http://preview.example.test",
        env: validEnv(),
        log: silentLog(),

        fetchImpl: async () => {
          calls += 1;

          return response(200, {
            body: healthyBody,
          });
        },
      }),
      /HTTPS without credentials or fragment/,
    );

    assert.equal(calls, 0);
  },
);

test(
  "C170.7.1-16: HTTP 401 fails with an authentication-specific error",
  async () => {
    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: validEnv(),
        log: silentLog(),

        fetchImpl: async () =>
          response(401, {
            body: {
              error: "Unauthorized",
            },
          }),
      }),
      /no Vercel deployment authentication was provided/,
    );
  },
);

test(
  "C170.7.1-17: HTTP 403 fails closed",
  async () => {
    await assert.rejects(
      verifyDeployment({
        baseUrl,
        env: validEnv(),
        log: silentLog(),

        fetchImpl: async () =>
          response(403, {
            body: {
              error: "Forbidden",
            },
          }),
      }),
      /Vercel rejected the deployment access policy/,
    );
  },
);

test(
  "C170.7.1-18: trusted OIDC authentication is sent when configured",
  async () => {
    let capturedHeaders;

    const result = await verifyDeployment({
      baseUrl,

      env: validEnv({
        VERCEL_TRUSTED_OIDC_TOKEN:
          "test-oidc-token",
      }),

      log: silentLog(),

      fetchImpl: async (url, options) => {
        capturedHeaders = options.headers;

        return response(200, {
          body: healthyBody,
        });
      },
    });

    assert.equal(result.ok, true);
    assert.equal(
      result.authenticationMode,
      "trusted-oidc",
    );

    assert.equal(
      capturedHeaders[
        "x-vercel-trusted-oidc-idp-token"
      ],
      "test-oidc-token",
    );

    assert.equal(
      capturedHeaders[
        "x-vercel-protection-bypass"
      ],
      undefined,
    );
  },
);
