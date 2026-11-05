#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const BRANCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

const DEFAULTS = Object.freeze({
  repository: "Vivi9max/AIOS-Alpha",
  workflowId: 332656458,
  workflowPath: ".github/workflows/aios-alpha-ci.yml",
  artifactPrefix: "aios-verified-delivery-",
  expectedActor: "Vivi9max",
});

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function readJson(filePath, label) {
  try {
    const stat = fs.lstatSync(filePath);

    if (!stat.isFile() || stat.isSymbolicLink()) {
      fail("INPUT_FILE_INVALID", `${label} must be a regular file.`);
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "INPUT_FILE_INVALID") throw error;

    fail(
      "INPUT_FILE_INVALID",
      `${label} is missing, unreadable, or invalid JSON.`,
    );
  }
}

export function verifyArtifactArchiveDigest({
  artifactDigest,
  artifactArchivePath,
}) {
  if (
    typeof artifactDigest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/i.test(artifactDigest)
  ) {
    fail(
      "ARTIFACT_DIGEST_INVALID",
      "GitHub Artifact SHA-256 digest is missing or invalid.",
    );
  }

  if (
    typeof artifactArchivePath !== "string" ||
    artifactArchivePath.length === 0
  ) {
    fail(
      "ARTIFACT_ARCHIVE_PATH_INVALID",
      "A downloaded Artifact archive path is required.",
    );
  }

  let stat;

  try {
    stat = fs.lstatSync(artifactArchivePath);
  } catch {
    fail(
      "ARTIFACT_ARCHIVE_INVALID",
      "Downloaded Artifact archive is missing or unreadable.",
    );
  }

  if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0) {
    fail(
      "ARTIFACT_ARCHIVE_INVALID",
      "Downloaded Artifact archive must be a non-empty regular file.",
    );
  }

  let actualDigest;

  try {
    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(artifactArchivePath));
    actualDigest = hash.digest("hex");
  } catch {
    fail(
      "ARTIFACT_ARCHIVE_INVALID",
      "Downloaded Artifact archive could not be hashed.",
    );
  }

  const expectedDigest = artifactDigest.slice("sha256:".length).toLowerCase();

  if (actualDigest !== expectedDigest) {
    fail(
      "ARTIFACT_DIGEST_MISMATCH",
      "Downloaded Artifact archive SHA-256 does not match GitHub Artifact metadata.",
    );
  }

  return {
    valid: true,
    algorithm: "sha256",
    expectedDigest,
    actualDigest,
  };
}

export function verifySourceRunIdentity({
  run,
  artifacts,
  review,
  artifactArchivePath,
  repository = DEFAULTS.repository,
  workflowId = DEFAULTS.workflowId,
  workflowPath = DEFAULTS.workflowPath,
  expectedActor = DEFAULTS.expectedActor,
  sourceRunId,
  candidateBranch,
  candidateSha,
}) {
  const sha = String(candidateSha || "").toLowerCase();
  const runId = String(sourceRunId || "");

  if (!/^\d+$/.test(runId)) {
    fail(
      "SOURCE_RUN_ID_INVALID",
      "Source Run ID must contain digits only.",
    );
  }

  if (!SHA40.test(sha)) {
    fail(
      "CANDIDATE_SHA_INVALID",
      "Candidate SHA must be a full 40-character Git SHA.",
    );
  }

  if (
    typeof candidateBranch !== "string" ||
    !BRANCH_PATTERN.test(candidateBranch) ||
    candidateBranch === "main" ||
    candidateBranch.includes("..") ||
    candidateBranch.includes("//") ||
    candidateBranch.endsWith("/") ||
    candidateBranch.endsWith(".") ||
    candidateBranch.includes("@{")
  ) {
    fail(
      "CANDIDATE_BRANCH_INVALID",
      "A valid non-main candidate branch is required.",
    );
  }

  if (!run || String(run.id) !== runId) {
    fail(
      "SOURCE_RUN_ID_MISMATCH",
      "Fetched workflow Run ID does not match the requested Source Run ID.",
    );
  }

  if (run.repository?.full_name !== repository) {
    fail(
      "SOURCE_REPOSITORY_MISMATCH",
      "Source Run belongs to a different repository.",
    );
  }

  if (run.status !== "completed" || run.conclusion !== "success") {
    fail(
      "SOURCE_RUN_NOT_SUCCESSFUL",
      "Source Run must be completed successfully.",
    );
  }

  if (run.event !== "push") {
    fail(
      "SOURCE_EVENT_INVALID",
      "Source Run must originate from a push event.",
    );
  }

  if (Number(run.workflow_id) !== Number(workflowId)) {
    fail(
      "SOURCE_WORKFLOW_ID_MISMATCH",
      "Source Run workflow ID is not the approved CI workflow.",
    );
  }

  if (run.path !== workflowPath) {
    fail(
      "SOURCE_WORKFLOW_PATH_MISMATCH",
      "Source Run workflow path is not the approved CI workflow.",
    );
  }

  if (run.head_branch !== candidateBranch) {
    fail(
      "SOURCE_BRANCH_MISMATCH",
      "Source Run branch does not match the candidate branch.",
    );
  }

  if (String(run.head_sha || "").toLowerCase() !== sha) {
    fail(
      "SOURCE_SHA_MISMATCH",
      "Source Run commit does not match the candidate SHA.",
    );
  }

  if (run.actor?.login !== expectedActor) {
    fail(
      "SOURCE_ACTOR_MISMATCH",
      "Source Run actor does not match the expected Founder actor.",
    );
  }

  if (!Number.isInteger(run.run_attempt) || run.run_attempt < 1) {
    fail(
      "SOURCE_ATTEMPT_INVALID",
      "Source Run attempt metadata is invalid.",
    );
  }

  const expectedArtifactName =
    `${DEFAULTS.artifactPrefix}${sha}-${runId}`;

  const list = Array.isArray(artifacts)
    ? artifacts
    : artifacts?.artifacts;

  if (!Array.isArray(list)) {
    fail(
      "SOURCE_ARTIFACT_LIST_INVALID",
      "Source Run artifact listing is invalid.",
    );
  }

  const matches = list.filter(
    (item) => item?.name === expectedArtifactName,
  );

  if (matches.length !== 1) {
    fail(
      "SOURCE_ARTIFACT_MISSING_OR_DUPLICATE",
      "Exactly one candidate-bound verified delivery artifact must belong to the Source Run.",
    );
  }

  const artifact = matches[0];

  if (artifact.expired !== false) {
    fail(
      "SOURCE_ARTIFACT_EXPIRED",
      "Verified delivery artifact is expired or its expiry state is unknown.",
    );
  }

  if (String(artifact.workflow_run?.id) !== runId) {
    fail(
      "SOURCE_ARTIFACT_RUN_MISMATCH",
      "Artifact is not owned by the requested Source Run.",
    );
  }

  if (artifact.workflow_run?.head_branch !== candidateBranch) {
    fail(
      "SOURCE_ARTIFACT_BRANCH_MISMATCH",
      "Artifact branch metadata does not match the candidate.",
    );
  }

  if (
    String(artifact.workflow_run?.head_sha || "").toLowerCase() !== sha
  ) {
    fail(
      "SOURCE_ARTIFACT_SHA_MISMATCH",
      "Artifact commit metadata does not match the candidate.",
    );
  }

  const archiveIntegrity = verifyArtifactArchiveDigest({
    artifactDigest: artifact.digest,
    artifactArchivePath,
  });

  if (!review || review.status !== "FOUNDER_REVIEW_READY") {
    fail(
      "REVIEW_STATUS_INVALID",
      "Founder Review report is not ready for review.",
    );
  }

  if (
    review.repository?.name !== repository ||
    review.repository?.branch !== candidateBranch ||
    String(review.repository?.candidateCommitSha || "").toLowerCase() !== sha ||
    String(review.repository?.checkedOutHead || "").toLowerCase() !== sha
  ) {
    fail(
      "REVIEW_CANDIDATE_MISMATCH",
      "Founder Review report is not bound to the requested candidate.",
    );
  }

  if (String(review.workflow?.runId) !== runId) {
    fail(
      "REVIEW_SOURCE_RUN_MISMATCH",
      "Founder Review report Source Run ID does not match.",
    );
  }

  if (String(review.workflow?.runAttempt) !== String(run.run_attempt)) {
    fail(
      "REVIEW_SOURCE_ATTEMPT_MISMATCH",
      "Founder Review report Source Run attempt does not match GitHub metadata.",
    );
  }

  if (review.workflow?.actor !== expectedActor) {
    fail(
      "REVIEW_SOURCE_ACTOR_MISMATCH",
      "Founder Review report actor does not match GitHub metadata.",
    );
  }

  if (
    review.founderApproval?.decision !== "PENDING" ||
    review.founderApproval?.approved !== false ||
    review.founderApproval?.mergeAuthorized !== false ||
    review.founderApproval?.productionDeploymentAuthorized !== false
  ) {
    fail(
      "REVIEW_NOT_PENDING",
      "Founder Review report must remain pending and non-authorizing.",
    );
  }

  return {
    valid: true,
    repository,
    sourceRunId: runId,
    sourceRunAttempt: run.run_attempt,
    sourceWorkflowId: Number(run.workflow_id),
    sourceWorkflowPath: run.path,
    sourceEvent: run.event,
    sourceActor: run.actor.login,
    candidateBranch,
    candidateSha: sha,
    artifactId: artifact.id,
    artifactName: artifact.name,
    artifactDigest: artifact.digest,
    artifactArchiveIntegrity: archiveIntegrity,
    reviewStatus: review.status,
    approvalDecision: "PENDING",
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
  };
}

function parseArgs(argv) {
  const values = new Map();

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];

    if (!key.startsWith("--") || values.has(key)) {
      fail(
        "ARGUMENT_INVALID",
        `Invalid or duplicate argument: ${key}`,
      );
    }

    const value = argv[i + 1];

    if (!value || value.startsWith("--")) {
      fail(
        "ARGUMENT_MISSING_VALUE",
        `Missing value for ${key}`,
      );
    }

    values.set(key, value);
    i += 1;
  }

  const allowed = new Set([
    "--run",
    "--artifacts",
    "--review",
    "--artifact-archive",
    "--source-run-id",
    "--candidate-branch",
    "--candidate-sha",
  ]);

  for (const key of values.keys()) {
    if (!allowed.has(key)) {
      fail("ARGUMENT_UNKNOWN", `Unknown argument: ${key}`);
    }
  }

  for (const key of allowed) {
    if (!values.has(key)) {
      fail("ARGUMENT_REQUIRED", `Required argument missing: ${key}`);
    }
  }

  return Object.fromEntries(
    [...values].map(([key, value]) => [
      key.slice(2).replaceAll(/-([a-z])/g, (_, c) => c.toUpperCase()),
      value,
    ]),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const result = verifySourceRunIdentity({
    run: readJson(args.run, "Source Run metadata"),
    artifacts: readJson(args.artifacts, "Source Run artifact listing"),
    review: readJson(args.review, "Founder Review report"),
    artifactArchivePath: args.artifactArchive,
    sourceRunId: args.sourceRunId,
    candidateBranch: args.candidateBranch,
    candidateSha: args.candidateSha,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invoked = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";

if (
  invoked &&
  pathToFileURL(invoked).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href
) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `${error?.code || "SOURCE_RUN_VERIFICATION_FAILED"}: ${error?.message || "Source Run verification failed."}\n`,
    );

    process.exitCode = 1;
  }
}
