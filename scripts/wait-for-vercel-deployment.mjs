import { pathToFileURL } from "node:url";

export function getExpectedEnvironment(refName) {
  return refName === "main" ? "Production" : "Preview";
}

function parseNextLink(linkHeader, currentUrl, repository) {
  if (!linkHeader) return null;

  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (!match) continue;

    const next = new URL(match[1], currentUrl);
    if (
      next.protocol !== "https:" ||
      next.hostname !== "api.github.com" ||
      !next.pathname.startsWith(`/repos/${repository}/`) ||
      next.username ||
      next.password ||
      next.hash
    ) {
      throw new Error("GitHub pagination returned an unsafe next-page URL.");
    }

    return next.href;
  }

  return null;
}

async function collectPages({ url, headers, fetchImpl, repository, maxPages = 20 }) {
  const items = [];
  const visited = new Set();
  let nextUrl = url;

  while (nextUrl) {
    if (visited.has(nextUrl)) {
      throw new Error("GitHub pagination loop detected.");
    }
    if (visited.size >= maxPages) {
      throw new Error(`GitHub pagination exceeded ${maxPages} pages.`);
    }

    visited.add(nextUrl);
    const response = await fetchImpl(nextUrl, { headers });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `GitHub API ${response.status}: ${body?.message || response.statusText}`
      );
    }
    if (!Array.isArray(body)) {
      throw new Error("GitHub deployment API returned an unexpected response.");
    }

    items.push(...body);
    nextUrl = parseNextLink(response.headers.get("link"), nextUrl, repository);
  }

  return items;
}

function parseTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : -1;
}

function validateEnvironmentUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Vercel deployment returned an invalid environment URL.");
  }

  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new Error(
      "Vercel deployment URL rejected: HTTPS without credentials or fragment is required."
    );
  }

  return parsed.origin;
}

export async function resolveDeploymentUrl({
  repository,
  sha,
  refName,
  token,
  fetchImpl = fetch,
  log = console,
}) {
  if (!repository || !sha || !refName || !token) {
    throw new Error("repository, sha, refName and token are required.");
  }

  const expectedEnvironment = getExpectedEnvironment(refName);
  const apiBase = `https://api.github.com/repos/${repository}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const deployments = await collectPages({
    url: `${apiBase}/deployments?sha=${encodeURIComponent(sha)}&per_page=100`,
    headers,
    fetchImpl,
    repository,
  });

  const matching = deployments
    .filter(
      (deployment) =>
        String(deployment.environment || "").toLowerCase() ===
        expectedEnvironment.toLowerCase()
    )
    .sort(
      (a, b) =>
        parseTimestamp(b.created_at) - parseTimestamp(a.created_at)
    );

  if (matching.length === 0) {
    log.log(`No ${expectedEnvironment} deployment is registered for this commit yet.`);
    return null;
  }

  // Only inspect the newest matching deployment. Falling back to an older
  // successful deployment could verify stale production code.
  const deployment = matching[0];
  const statuses = await collectPages({
    url: `${apiBase}/deployments/${encodeURIComponent(deployment.id)}/statuses?per_page=100`,
    headers,
    fetchImpl,
    repository,
  });

  const latestStatus = statuses.sort(
    (a, b) =>
      parseTimestamp(b.created_at) - parseTimestamp(a.created_at)
  )[0];

  if (!latestStatus) {
    log.log(`The latest ${expectedEnvironment} deployment has no status yet.`);
    return null;
  }

  if (["error", "failure", "inactive"].includes(latestStatus.state)) {
    throw new Error(
      `Vercel ${expectedEnvironment} deployment ${deployment.id} ended with state: ${latestStatus.state}`
    );
  }

  if (latestStatus.state !== "success") {
    log.log(
      `Vercel ${expectedEnvironment} deployment is not ready yet (state: ${latestStatus.state}).`
    );
    return null;
  }

  if (!latestStatus.environment_url) {
    throw new Error(
      `Vercel ${expectedEnvironment} deployment succeeded without an environment URL.`
    );
  }

  const url = validateEnvironmentUrl(latestStatus.environment_url);
  log.log(`Vercel ${expectedEnvironment} deployment is ready: ${url}`);
  return url;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  const refName = process.env.GITHUB_REF_NAME;
  const outputFile = process.env.GITHUB_OUTPUT;

  if (!token || !repository || !sha || !refName) {
    throw new Error(
      "GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA and GITHUB_REF_NAME are required."
    );
  }

  const expectedEnvironment = getExpectedEnvironment(refName);
  const timeoutMs = 10 * 60 * 1000;
  const intervalMs = 10 * 1000;
  const deadline = Date.now() + timeoutMs;

  console.log(
    `Waiting for Vercel ${expectedEnvironment} deployment for ${refName} commit ${sha}...`
  );

  while (Date.now() < deadline) {
    const url = await resolveDeploymentUrl({
      repository,
      sha,
      refName,
      token,
    });

    if (url) {
      if (outputFile) {
        const { appendFile } = await import("node:fs/promises");
        await appendFile(outputFile, `base_url=${url}\n`);
      }
      return;
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `Timed out waiting for a successful Vercel ${expectedEnvironment} deployment.`
  );
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
