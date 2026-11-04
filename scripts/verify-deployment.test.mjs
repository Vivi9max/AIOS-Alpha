import test from "node:test";
import assert from "node:assert/strict";
import { verifyDeployment } from "./verify-deployment.mjs";

const baseUrl = "https://preview.example.test";

function response(status, {
  body = null,
  location = null,
  setCookies = [],
  requestId = "test-request-id",
} = {}) {
  const headers = new Headers();
  if (location) headers.set("location", location);
  if (requestId) headers.set("x-vercel-id", requestId);

  // Node 24 Headers supports getSetCookie(). Define it explicitly so the
  // tests remain deterministic across supported Node runtimes.
  headers.getSetCookie = () => setCookies;

  return {
    status,
    statusText: "",
    ok: status >= 200 && status < 300,
    headers,
    async json() {
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

const healthyBody = {
  ok: true,
  service: "AIOS Alpha",
  release: "0.5.1",
  checks: { application: "ok", manifest: "ok" },
  timestamp: "2026-11-04T00:00:00.000Z",
};

function silentLog() {
  return { log() {}, error() {} };
}

test("R8-01: direct HTTP 200 health response passes", async () => {
  let calls = 0;
  const result = await verifyDeployment({
    baseUrl,
    env: {},
    log: silentLog(),
    fetchImpl: async () => {
      calls += 1;
      return response(200, { body: healthyBody });
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.release, "0.5.1");
});

test("R8-02: same-origin same-path 307 cookie handshake retries once", async () => {
  const requests = [];
  const result = await verifyDeployment({
    baseUrl,
    env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-secret" },
    log: silentLog(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (requests.length === 1) {
        return response(307, {
          location: "/api/health?__vercel_challenge=opaque",
          setCookies: [
            "__vercel_protection_bypass=opaque-cookie; Path=/; Secure; HttpOnly; SameSite=None",
          ],
        });
      }
      return response(200, { body: healthyBody });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, `${baseUrl}/api/health`);
  assert.match(
    requests[1].options.headers.Cookie,
    /__vercel_protection_bypass=opaque-cookie/
  );
  assert.equal(
    requests[1].options.headers["x-vercel-protection-bypass"],
    "test-secret"
  );
});

test("R8-03: 307 without Set-Cookie fails closed and does not retry", async () => {
  let calls = 0;
  await assert.rejects(
    verifyDeployment({
      baseUrl,
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-secret" },
      log: silentLog(),
      fetchImpl: async () => {
        calls += 1;
        return response(307, {
          location: "/api/health",
          setCookies: [],
        });
      },
    }),
    /did not provide a usable Set-Cookie/
  );
  assert.equal(calls, 1);
});

test("R8-04: cross-origin redirect is rejected", async () => {
  let calls = 0;
  await assert.rejects(
    verifyDeployment({
      baseUrl,
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-secret" },
      log: silentLog(),
      fetchImpl: async () => {
        calls += 1;
        return response(307, {
          location: "https://attacker.example/api/health",
          setCookies: ["session=opaque; Path=/; Secure"],
        });
      },
    }),
    /redirect rejected/
  );
  assert.equal(calls, 1);
});

test("R8-05: redirect to a different path is rejected", async () => {
  let calls = 0;
  await assert.rejects(
    verifyDeployment({
      baseUrl,
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-secret" },
      log: silentLog(),
      fetchImpl: async () => {
        calls += 1;
        return response(307, {
          location: "/alpha",
          setCookies: ["session=opaque; Path=/; Secure"],
        });
      },
    }),
    /redirect rejected/
  );
  assert.equal(calls, 1);
});

test("R8-06: a second redirect fails and is never followed", async () => {
  let calls = 0;
  await assert.rejects(
    verifyDeployment({
      baseUrl,
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-secret" },
      log: silentLog(),
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return response(307, {
            location: "/api/health",
            setCookies: ["__vercel_protection_bypass=opaque; Path=/; Secure"],
          });
        }
        return response(307, {
          location: "/api/health?again=1",
          setCookies: ["__vercel_protection_bypass=opaque2; Path=/; Secure"],
        });
      },
    }),
    /retry still redirected/
  );
  assert.equal(calls, 2);
});

test("R8-07: a 200 response with invalid health contract fails", async () => {
  await assert.rejects(
    verifyDeployment({
      baseUrl,
      env: {},
      log: silentLog(),
      fetchImpl: async () =>
        response(200, {
          body: {
            ok: true,
            service: "AIOS Alpha",
            release: "0.5.1",
            checks: { application: "ok", manifest: "failed" },
          },
        }),
    }),
    /manifest check failed/
  );
});

test("R8-08: redirect without bypass authentication fails closed", async () => {
  let calls = 0;
  await assert.rejects(
    verifyDeployment({
      baseUrl,
      env: {},
      log: silentLog(),
      fetchImpl: async () => {
        calls += 1;
        return response(307, {
          location: "/api/health",
          setCookies: ["session=opaque; Path=/; Secure"],
        });
      },
    }),
    /without automation-bypass authentication/
  );
  assert.equal(calls, 1);
});
