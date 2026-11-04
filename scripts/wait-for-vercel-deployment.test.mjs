import test from "node:test";
import assert from "node:assert/strict";
import {
  getExpectedEnvironment,
  resolveDeploymentUrl,
} from "./wait-for-vercel-deployment.mjs";

const repo = "Vivi9max/AIOS-Alpha";
const sha = "1bff4457ff043e8ded3f481593074b40a5cfe75c";
const quietLog = { log() {}, error() {} };

function jsonResponse(body, { status = 200, link = null } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers(link ? { link } : {}),
    async json() { return body; },
  };
}

function mockFetch(routes) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    const parsed = new URL(url);
    const route = routes.find((item) =>
      typeof item.match === "string"
        ? parsed.pathname + parsed.search === item.match
        : item.match.test(parsed.pathname + parsed.search)
    );
    if (!route) throw new Error(`Unexpected request: ${url}`);
    return route.response;
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

const deploymentsPath = `/repos/${repo}/deployments?sha=${sha}&per_page=100`;
const statusPath = `/repos/${repo}/deployments/77/statuses?per_page=100`;
const deployment = {
  id: 77,
  environment: "Production",
  created_at: "2026-11-04T12:57:00Z",
};
const successStatus = {
  state: "success",
  created_at: "2026-11-04T12:58:00Z",
  environment_url: "https://aiosalpha.com",
};

 test("R10-01 main resolves to Production", () => {
  assert.equal(getExpectedEnvironment("main"), "Production");
});

test("R10-02 non-main branches resolve to Preview", () => {
  assert.equal(getExpectedEnvironment("feature/test"), "Preview");
});

test("R10-03 main resolves the successful Production URL", async () => {
  const fetchImpl = mockFetch([
    { match: deploymentsPath, response: jsonResponse([deployment]) },
    { match: statusPath, response: jsonResponse([successStatus]) },
  ]);
  const url = await resolveDeploymentUrl({
    repository: repo, sha, refName: "main", token: "test-token", fetchImpl, log: quietLog,
  });
  assert.equal(url, "https://aiosalpha.com");
  assert.equal(fetchImpl.calls.length, 2);
});

test("R10-04 feature branch resolves Preview rather than Production", async () => {
  const preview = { ...deployment, environment: "Preview" };
  const fetchImpl = mockFetch([
    { match: deploymentsPath, response: jsonResponse([deployment, preview]) },
    { match: statusPath, response: jsonResponse([successStatus]) },
  ]);
  const url = await resolveDeploymentUrl({
    repository: repo, sha, refName: "feature/test", token: "test-token", fetchImpl, log: quietLog,
  });
  assert.equal(url, "https://aiosalpha.com");
});

test("R10-05 pending latest Production deployment does not fall back to stale success", async () => {
  const latest = { ...deployment, id: 78, created_at: "2026-11-04T13:00:00Z" };
  const old = { ...deployment, id: 77, created_at: "2026-11-04T12:00:00Z" };
  const fetchImpl = mockFetch([
    { match: deploymentsPath, response: jsonResponse([old, latest]) },
    { match: /\/deployments\/78\/statuses\?per_page=100$/, response: jsonResponse([{ state: "pending", created_at: "2026-11-04T13:01:00Z" }]) },
  ]);
  const url = await resolveDeploymentUrl({
    repository: repo, sha, refName: "main", token: "test-token", fetchImpl, log: quietLog,
  });
  assert.equal(url, null);
  assert.equal(fetchImpl.calls.length, 2);
});

test("R10-06 failed Production deployment fails closed", async () => {
  const fetchImpl = mockFetch([
    { match: deploymentsPath, response: jsonResponse([deployment]) },
    { match: statusPath, response: jsonResponse([{ state: "failure", created_at: "2026-11-04T12:58:00Z" }]) },
  ]);
  await assert.rejects(
    resolveDeploymentUrl({ repository: repo, sha, refName: "main", token: "test-token", fetchImpl, log: quietLog }),
    /ended with state: failure/
  );
});

test("R10-07 unsafe HTTP environment URL is rejected", async () => {
  const fetchImpl = mockFetch([
    { match: deploymentsPath, response: jsonResponse([deployment]) },
    { match: statusPath, response: jsonResponse([{ ...successStatus, environment_url: "http://aiosalpha.com" }]) },
  ]);
  await assert.rejects(
    resolveDeploymentUrl({ repository: repo, sha, refName: "main", token: "test-token", fetchImpl, log: quietLog }),
    /HTTPS without credentials or fragment/
  );
});

test("R10-08 paginated deployment results are collected", async () => {
  const firstUrl = `https://api.github.com${deploymentsPath}`;
  const nextUrl = `https://api.github.com/repos/${repo}/deployments?sha=${sha}&per_page=100&page=2`;
  const fetchImpl = mockFetch([
    { match: deploymentsPath, response: jsonResponse([], { link: `<${nextUrl}>; rel="next"` }) },
    { match: `/repos/${repo}/deployments?sha=${sha}&per_page=100&page=2`, response: jsonResponse([deployment]) },
    { match: statusPath, response: jsonResponse([successStatus]) },
  ]);
  const url = await resolveDeploymentUrl({
    repository: repo, sha, refName: "main", token: "test-token", fetchImpl, log: quietLog,
  });
  assert.equal(url, "https://aiosalpha.com");
  assert.equal(fetchImpl.calls[0], firstUrl);
  assert.equal(fetchImpl.calls.length, 3);
});
