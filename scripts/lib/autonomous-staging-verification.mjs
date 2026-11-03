export const STAGING_BRANCH_PREFIX = "c169-8-ad-";

export function normalizeSha(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || "").trim());
}

export function isAllowedStagingBranch(branch) {
  return typeof branch === "string" &&
    branch.startsWith(STAGING_BRANCH_PREFIX) &&
    /^[a-zA-Z0-9_-]+$/.test(branch);
}

export function verifyGitHubReadback(input) {
  const expectedSha = normalizeSha(input.expectedSha);
  const branchSha = normalizeSha(input.branchSha);
  const commitSha = normalizeSha(input.commitSha);
  const treeSha = normalizeSha(input.treeSha);

  if (!isAllowedStagingBranch(input.branch)) {
    return { ok: false, code: "STAGING_BRANCH_REJECTED" };
  }
  if (!isValidSha(expectedSha)) {
    return { ok: false, code: "EXPECTED_SHA_INVALID" };
  }
  if (!isValidSha(branchSha) || branchSha !== expectedSha) {
    return { ok: false, code: "STAGING_BRANCH_SHA_MISMATCH" };
  }
  if (!isValidSha(commitSha) || commitSha !== expectedSha) {
    return { ok: false, code: "COMMIT_READBACK_SHA_MISMATCH" };
  }
  if (!isValidSha(treeSha)) {
    return { ok: false, code: "COMMIT_TREE_SHA_MISSING" };
  }
  return {
    ok: true,
    code: "GITHUB_STAGING_READBACK_PASSED",
    commitSha: expectedSha,
    treeSha,
    branch: input.branch
  };
}

export function selectExactPreviewDeployment(deployments, expectedSha, expectedBranch) {
  const sha = normalizeSha(expectedSha);
  if (!isValidSha(sha) || !isAllowedStagingBranch(expectedBranch)) return null;

  return (Array.isArray(deployments) ? deployments : []).find((deployment) => {
    const deploymentSha = normalizeSha(
      deployment?.gitSource?.sha ||
      deployment?.meta?.githubCommitSha ||
      deployment?.meta?.gitCommitSha
    );
    const deploymentBranch = deployment?.gitSource?.ref ||
      deployment?.meta?.githubCommitRef ||
      deployment?.meta?.gitBranch;
    const target = deployment?.target;

    return deploymentSha === sha &&
      deploymentBranch === expectedBranch &&
      target !== "production";
  }) || null;
}

export function verifyPreviewDeployment(deployment, expectedSha, expectedBranch) {
  if (!deployment) return { ok: false, code: "VERCEL_PREVIEW_NOT_FOUND" };

  const deploymentSha = normalizeSha(
    deployment?.gitSource?.sha ||
    deployment?.meta?.githubCommitSha ||
    deployment?.meta?.gitCommitSha
  );
  const deploymentBranch = deployment?.gitSource?.ref ||
    deployment?.meta?.githubCommitRef ||
    deployment?.meta?.gitBranch;

  if (deployment?.target === "production") {
    return { ok: false, code: "PRODUCTION_DEPLOYMENT_REJECTED" };
  }
  if (deploymentSha !== normalizeSha(expectedSha)) {
    return { ok: false, code: "VERCEL_COMMIT_SHA_MISMATCH" };
  }
  if (deploymentBranch !== expectedBranch) {
    return { ok: false, code: "VERCEL_BRANCH_MISMATCH" };
  }

  const state = deployment?.readyState || deployment?.state || "UNKNOWN";
  if (state !== "READY") {
    return {
      ok: false,
      code: state === "ERROR" || state === "CANCELED"
        ? "VERCEL_PREVIEW_BUILD_FAILED"
        : "VERCEL_PREVIEW_NOT_READY",
      state
    };
  }

  return {
    ok: true,
    code: "VERCEL_EXACT_PREVIEW_VERIFIED",
    deploymentId: deployment.uid || deployment.id,
    deploymentUrl: deployment.url ? `https://${deployment.url}` : undefined,
    commitSha: normalizeSha(expectedSha),
    branch: expectedBranch,
    target: "preview",
    readyState: state
  };
}
