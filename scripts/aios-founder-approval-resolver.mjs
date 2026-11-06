#!/usr/bin/env node

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CONFIG = Object.freeze({
  repository: "Vivi9max/AIOS-Alpha",
  workflowId: 332656458,
  workflowPath: ".github/workflows/aios-alpha-ci.yml",
  artifactPrefix: "aios-verified-delivery-",
});

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function compareRuns(a, b) {
  const numberDiff = Number(b.run_number || 0) - Number(a.run_number || 0);
  if (numberDiff !== 0) return numberDiff;

  const attemptDiff = Number(b.run_attempt || 0) - Number(a.run_attempt || 0);
  if (attemptDiff !== 0) return attemptDiff;

  return String(b.created_at || "").localeCompare(String(a.created_at || ""));
}

function validatePullRequest(pr, repository) {
  return Boolean(
    pr &&
    pr.state === "open" &&
    pr.draft !== true &&
    pr.base?.ref === "main" &&
    pr.base?.repo?.full_name === repository &&
    pr.head?.repo?.full_name === repository &&
    typeof pr.head?.ref === "string" &&
    pr.head.ref !== "main" &&
    /^[a-f0-9]{40}$/i.test(pr.head?.sha || ""),
  );
}

function validateArtifact(artifact, run, branch, sha) {
  const expectedName = `${CONFIG.artifactPrefix}${sha}-${run.id}`;

  return Boolean(
    artifact &&
    artifact.name === expectedName &&
    artifact.expired === false &&
    Number(artifact.workflow_run?.id) === Number(run.id) &&
    artifact.workflow_run?.head_branch === branch &&
    String(artifact.workflow_run?.head_sha || "").toLowerCase() === sha &&
    /^sha256:[a-f0-9]{64}$/i.test(artifact.digest || ""),
  );
}

export function resolveFounderApprovalCandidate({
  pullRequests,
  workflowRuns,
  artifactsByRun,
  repository = CONFIG.repository,
  workflowId = CONFIG.workflowId,
  workflowPath = CONFIG.workflowPath,
}) {
  if (!Array.isArray(pullRequests) || !Array.isArray(workflowRuns)) {
    fail("INPUT_INVALID", "Pull requests and workflow runs must be arrays.");
  }

  if (!artifactsByRun || typeof artifactsByRun !== "object") {
    fail("ARTIFACT_INDEX_INVALID", "Artifact index must be an object keyed by Source Run ID.");
  }

  const openCandidates = pullRequests.filter((pr) =>
    validatePullRequest(pr, repository),
  );

  if (openCandidates.length === 0) {
    fail("NO_OPEN_CANDIDATE", "No eligible open candidate PR targeting main was found.");
  }

  const eligible = [];

  for (const pr of openCandidates) {
    const branch = pr.head.ref;
    const sha = pr.head.sha.toLowerCase();

    const matchingRuns = workflowRuns
      .filter((run) =>
        Number(run.workflow_id) === Number(workflowId) &&
        run.path === workflowPath &&
        run.event === "push" &&
        run.head_branch === branch &&
        String(run.head_sha || "").toLowerCase() === sha,
      )
      .sort(compareRuns);

    if (matchingRuns.length === 0) continue;

    // Never fall back to an older successful run if the newest run failed
    // or is still running.
    const latestRun = matchingRuns[0];

    if (
      latestRun.status !== "completed" ||
      latestRun.conclusion !== "success" ||
      !/^[0-9]+$/.test(String(latestRun.id || ""))
    ) {
      continue;
    }

    const artifactList = artifactsByRun[String(latestRun.id)];
    const artifacts = Array.isArray(artifactList)
      ? artifactList
      : artifactList?.artifacts;

    if (!Array.isArray(artifacts)) continue;

    const matches = artifacts.filter((artifact) =>
      validateArtifact(artifact, latestRun, branch, sha),
    );

    if (matches.length !== 1) continue;

    eligible.push({
      pullRequestNumber: pr.number,
      pullRequestUrl: pr.html_url || null,
      sourceRunId: String(latestRun.id),
      candidateBranch: branch,
      candidateSha: sha,
      artifactId: matches[0].id,
      artifactName: matches[0].name,
      artifactDigest: matches[0].digest,
    });
  }

  if (eligible.length === 0) {
    fail(
      "NO_VERIFIED_CANDIDATE",
      "No open PR has a latest successful CI run and exactly one matching unexpired delivery artifact.",
    );
  }

  if (eligible.length !== 1) {
    fail(
      "AMBIGUOUS_CANDIDATES",
      `Found ${eligible.length} independently eligible candidate PRs. Manual selection is required.`,
    );
  }

  return {
    status: "FOUNDER_APPROVAL_CANDIDATE_RESOLVED",
    repository,
    workflowId,
    workflowPath,
    ...eligible[0],
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
  };
}

function ghJson(endpoint) {
  const output = execFileSync(
    "gh",
    ["api", "--paginate", "--slurp", endpoint],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );

  const pages = JSON.parse(output);
  if (!Array.isArray(pages)) {
    fail("GITHUB_API_RESPONSE_INVALID", `Unexpected response for ${endpoint}.`);
  }

  return pages.flatMap((page) => {
    if (Array.isArray(page)) return page;
    if (Array.isArray(page?.workflow_runs)) return page.workflow_runs;
    if (Array.isArray(page?.artifacts)) return page.artifacts;
    return [];
  });
}

function main() {
  const repository = process.env.GITHUB_REPOSITORY || CONFIG.repository;

  if (repository !== CONFIG.repository) {
    fail("REPOSITORY_MISMATCH", "Resolver is restricted to the configured repository.");
  }

  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    fail("GITHUB_TOKEN_MISSING", "A GitHub token is required.");
  }

  const pullRequests = ghJson(
    `repos/${repository}/pulls?state=open&base=main&per_page=100`,
  );

  const workflowRuns = ghJson(
    `repos/${repository}/actions/workflows/${CONFIG.workflowId}/runs?per_page=100`,
  );

  const candidatePRs = pullRequests.filter((pr) =>
    validatePullRequest(pr, repository),
  );

  const artifactsByRun = {};

  for (const pr of candidatePRs) {
    const sha = String(pr.head.sha || "").toLowerCase();
    const branch = pr.head.ref;

    const matchingRuns = workflowRuns
      .filter((run) =>
        Number(run.workflow_id) === CONFIG.workflowId &&
        run.path === CONFIG.workflowPath &&
        run.event === "push" &&
        run.head_branch === branch &&
        String(run.head_sha || "").toLowerCase() === sha,
      )
      .sort(compareRuns);

    if (matchingRuns.length === 0) continue;

    const latestRun = matchingRuns[0];

    if (!/^[0-9]+$/.test(String(latestRun.id || ""))) continue;

    artifactsByRun[String(latestRun.id)] = ghJson(
      `repos/${repository}/actions/runs/${latestRun.id}/artifacts?per_page=100`,
    );
  }

  const result = resolveFounderApprovalCandidate({
    pullRequests,
    workflowRuns,
    artifactsByRun,
    repository,
  });

  const json = `${JSON.stringify(result, null, 2)}\n`;
  process.stdout.write(json);

  if (process.env.GITHUB_OUTPUT) {
    const output = [
      `source_run_id=${result.sourceRunId}`,
      `candidate_branch=${result.candidateBranch}`,
      `candidate_sha=${result.candidateSha}`,
      `artifact_id=${result.artifactId}`,
      `artifact_digest=${result.artifactDigest}`,
      `pr_number=${result.pullRequestNumber}`,
    ].join("\n") + "\n";

    fs.appendFileSync(process.env.GITHUB_OUTPUT, output, "utf8");
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `${error.code || "RESOLVER_FAILED"}: ${error.message}\n`,
    );
    process.exitCode = 1;
  }
}
