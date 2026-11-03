import {
  isAllowedStagingBranch,
  isValidSha,
  selectExactPreviewDeployment,
  verifyGitHubReadback,
  verifyPreviewDeployment
} from "./lib/autonomous-staging-verification.mjs";

const API = "https://api.github.com";
const VERCEL_API = "https://api.vercel.com";
const branch = process.env.STAGING_BRANCH || process.env.GITHUB_REF_NAME || "";
const expectedSha = process.env.STAGING_COMMIT_SHA || process.env.GITHUB_SHA || "";
const repository = process.env.GITHUB_REPOSITORY || "";
const githubToken = process.env.GITHUB_TOKEN || "";
const vercelToken = process.env.VERCEL_TOKEN || "";
const projectId = process.env.VERCEL_PROJECT_ID || "";
const teamId = process.env.VERCEL_TEAM_ID || "";
const timeoutMs = Math.max(60000, Number(process.env.VERCEL_PREVIEW_TIMEOUT_MS || 900000));
const pollMs = Math.max(5000, Number(process.env.VERCEL_PREVIEW_POLL_MS || 15000));

function fail(message) {
  console.error(`AIOS_STAGING_GATE_FAILED: ${message}`);
  process.exit(1);
}

async function requestJson(url, token, label) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) {
    throw new Error(`${label}_HTTP_${response.status}: ${body.slice(0, 1200)}`);
  }
  return data;
}

async function githubReadback() {
  if (!repository || !githubToken) fail("GITHUB_REPOSITORY or GITHUB_TOKEN is missing.");
  if (!isAllowedStagingBranch(branch)) fail(`Rejected branch: ${branch}`);
  if (!isValidSha(expectedSha)) fail("A full 40-character commit SHA is required.");

  const encodedBranch = branch.split("/").map(encodeURIComponent).join("/");
  const ref = await requestJson(
    `${API}/repos/${repository}/git/ref/heads/${encodedBranch}`,
    githubToken,
    "GITHUB_REF_READ"
  );
  const branchSha = ref?.object?.sha;
  const commit = await requestJson(
    `${API}/repos/${repository}/git/commits/${encodeURIComponent(expectedSha)}`,
    githubToken,
    "GITHUB_COMMIT_READ"
  );

  const result = verifyGitHubReadback({
    branch,
    expectedSha,
    branchSha,
    commitSha: commit?.sha,
    treeSha: commit?.tree?.sha
  });
  if (!result.ok) fail(result.code);

  console.log(`GITHUB_STAGING_READBACK_PASSED branch=${branch} sha=${result.commitSha} tree=${result.treeSha}`);
  return result;
}

async function listPreviewDeployments() {
  const url = new URL(`${VERCEL_API}/v6/deployments`);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("target", "preview");
  url.searchParams.set("limit", "100");
  if (teamId) url.searchParams.set("teamId", teamId);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`VERCEL_DEPLOYMENT_LIST_HTTP_${response.status}: ${body.slice(0, 1200)}`);
  }
  const parsed = JSON.parse(body);
  return Array.isArray(parsed.deployments) ? parsed.deployments : [];
}

async function getDeployment(id) {
  const url = new URL(`${VERCEL_API}/v13/deployments/${encodeURIComponent(id)}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`VERCEL_DEPLOYMENT_READ_HTTP_${response.status}: ${body.slice(0, 1200)}`);
  }
  return JSON.parse(body);
}

async function verifyVercelPreview() {
  if (!vercelToken || !projectId) fail("VERCEL_TOKEN and VERCEL_PROJECT_ID are required.");
  const startedAt = Date.now();
  let lastState = "NOT_FOUND";

  while (Date.now() - startedAt < timeoutMs) {
    const deployments = await listPreviewDeployments();
    const match = selectExactPreviewDeployment(deployments, expectedSha, branch);

    if (match) {
      const id = match.uid || match.id;
      if (!id) fail("VERCEL_DEPLOYMENT_ID_MISSING");
      const current = await getDeployment(id);
      const result = verifyPreviewDeployment(current, expectedSha, branch);
      if (result.ok) {
        console.log(`VERCEL_EXACT_PREVIEW_VERIFIED id=${result.deploymentId} sha=${result.commitSha} branch=${result.branch} url=${result.deploymentUrl || "unavailable"}`);
        return result;
      }
      lastState = result.code + (result.state ? `:${result.state}` : "");
      if (result.code === "VERCEL_PREVIEW_BUILD_FAILED" ||
          result.code === "PRODUCTION_DEPLOYMENT_REJECTED" ||
          result.code === "VERCEL_COMMIT_SHA_MISMATCH" ||
          result.code === "VERCEL_BRANCH_MISMATCH") {
        fail(lastState);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  fail(`PREVIEW_TIMEOUT lastState=${lastState} sha=${expectedSha} branch=${branch}`);
}

try {
  await githubReadback();
  await verifyVercelPreview();
  console.log("AIOS_AUTONOMOUS_STAGING_GATE_PASSED");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
