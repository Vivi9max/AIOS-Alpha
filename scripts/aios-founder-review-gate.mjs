#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SHA_PATTERN = /^[a-f0-9]{40}$/;
const FILE_SHA_PATTERN = /^[a-f0-9]{64}$/;
const MAX_INPUT_BYTES = 256 * 1024 * 1024;

export const FOUNDER_REVIEW_GATE_VERSION = "C170.6.1";

const REQUIRED_MANIFEST_FILES = [
  "aios-verified-delivery.json",
  "aios-delivery-builder-summary.json",
  "aios-delivery-verification.json",
];

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readBytes(filePath, label) {
  let stat;
  let realPath;

  try {
    stat = fs.lstatSync(filePath);
    realPath = fs.realpathSync(filePath);
  } catch {
    fail(
      "AIOS_FOUNDER_REVIEW_INPUT_MISSING",
      `${label} is missing or cannot be resolved.`,
    );
  }

  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_INPUT_BYTES) {
    fail(
      "AIOS_FOUNDER_REVIEW_INPUT_INVALID",
      `${label} must be a regular file within the size limit.`,
    );
  }

  try {
    return fs.readFileSync(realPath);
  } catch {
    fail(
      "AIOS_FOUNDER_REVIEW_INPUT_UNREADABLE",
      `${label} could not be read.`,
    );
  }
}

function readJson(filePath, label) {
  const raw = readBytes(filePath, label);

  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    fail(
      "AIOS_FOUNDER_REVIEW_JSON_INVALID",
      `${label} is not valid UTF-8 JSON.`,
    );
  }
}

function assertOutsideRepository(root, targetPath, label) {
  const resolved = path.resolve(targetPath);
  const rootReal = fs.realpathSync(root);
  let targetReal;

  try {
    targetReal = fs.realpathSync(resolved);
  } catch {
    const parentReal = fs.realpathSync(path.dirname(resolved));
    targetReal = path.join(parentReal, path.basename(resolved));
  }

  const relative = path.relative(rootReal, targetReal);

  if (
    relative === "" ||
    (
      !relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative)
    )
  ) {
    fail(
      "AIOS_FOUNDER_REVIEW_PATH_INSIDE_REPOSITORY",
      `${label} must remain outside the source repository.`,
    );
  }

  return resolved;
}

function parseManifest(raw) {
  const entries = new Map();
  const lines = raw.toString("utf8").split(/\r?\n/).filter(Boolean);

  for (const line of lines) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/.exec(line);

    if (!match || entries.has(match[2])) {
      fail(
        "AIOS_FOUNDER_REVIEW_MANIFEST_INVALID",
        "SHA-256 manifest contains an invalid or duplicate entry.",
      );
    }

    entries.set(match[2], match[1]);
  }

  if (
    entries.size !== REQUIRED_MANIFEST_FILES.length ||
    REQUIRED_MANIFEST_FILES.some((name) => !entries.has(name))
  ) {
    fail(
      "AIOS_FOUNDER_REVIEW_MANIFEST_INCOMPLETE",
      "SHA-256 manifest does not contain the exact required delivery inputs.",
    );
  }

  return entries;
}

function assertSha(value, label) {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    fail(
      "AIOS_FOUNDER_REVIEW_COMMIT_INVALID",
      `${label} must be a full 40-character commit SHA.`,
    );
  }
  return value;
}

function assertSame(actual, expected, code, label) {
  if (actual !== expected) {
    fail(code, `${label} does not match the verified delivery artifact.`);
  }
}

function assertFileInventory(artifact, handoff, rollback, stagingPath) {
  if (!Array.isArray(artifact.files) || artifact.files.length === 0) {
    fail(
      "AIOS_FOUNDER_REVIEW_FILE_INVENTORY_INVALID",
      "Delivery artifact has no candidate files.",
    );
  }

  if (
    !Array.isArray(handoff.stagedFiles) ||
    !Array.isArray(rollback.stagedFiles) ||
    handoff.stagedFiles.length !== artifact.files.length ||
    rollback.stagedFiles.length !== artifact.files.length
  ) {
    fail(
      "AIOS_FOUNDER_REVIEW_STAGED_FILE_COUNT_MISMATCH",
      "Handoff or rollback evidence does not cover every candidate file.",
    );
  }

  let stagingRootStat;
  try {
    stagingRootStat = fs.lstatSync(stagingPath);
  } catch {
    fail(
      "AIOS_FOUNDER_REVIEW_STAGING_INVALID",
      "Isolated staging directory is missing.",
    );
  }

  if (!stagingRootStat.isDirectory() || stagingRootStat.isSymbolicLink()) {
    fail(
      "AIOS_FOUNDER_REVIEW_STAGING_INVALID",
      "Isolated staging path must be a real directory, not a symbolic link.",
    );
  }

  const inventory = [];

  for (let index = 0; index < artifact.files.length; index += 1) {
    const file = artifact.files[index];
    const handoffFile = handoff.stagedFiles[index];
    const rollbackFile = rollback.stagedFiles[index];

    if (
      !file ||
      typeof file.path !== "string" ||
      file.path.startsWith("/") ||
      file.path.includes("\\") ||
      file.path.includes("\0") ||
      file.path.split("/").some((part) => !part || part === "." || part === "..") ||
      !["A", "M", "T"].includes(file.status) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0 ||
      !FILE_SHA_PATTERN.test(file.sha256 || "")
    ) {
      fail(
        "AIOS_FOUNDER_REVIEW_CANDIDATE_FILE_INVALID",
        `Candidate file metadata is invalid at index ${index}.`,
      );
    }

    for (const staged of [handoffFile, rollbackFile]) {
      assertSame(staged?.path, file.path, "AIOS_FOUNDER_REVIEW_FILE_PATH_MISMATCH", "Staged file path");
      assertSame(staged?.status, file.status, "AIOS_FOUNDER_REVIEW_FILE_STATUS_MISMATCH", "Staged file status");
      assertSame(staged?.bytes, file.bytes, "AIOS_FOUNDER_REVIEW_FILE_SIZE_MISMATCH", "Staged file size");
      assertSame(staged?.sha256, file.sha256, "AIOS_FOUNDER_REVIEW_FILE_HASH_MISMATCH", "Staged file SHA-256");
    }

    const targetPath = path.join(stagingPath, ...file.path.split("/"));
    let targetStat;
    let targetReal;
    let stagingReal;

    try {
      targetStat = fs.lstatSync(targetPath);
      targetReal = fs.realpathSync(targetPath);
      stagingReal = fs.realpathSync(stagingPath);
    } catch {
      fail(
        "AIOS_FOUNDER_REVIEW_STAGED_FILE_MISSING",
        `Staged candidate file is missing: ${file.path}.`,
      );
    }

    const relative = path.relative(stagingReal, targetReal);

    if (
      !targetStat.isFile() ||
      targetStat.isSymbolicLink() ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      fail(
        "AIOS_FOUNDER_REVIEW_STAGED_FILE_UNSAFE",
        `Staged candidate path is not a regular file inside staging: ${file.path}.`,
      );
    }

    const content = fs.readFileSync(targetReal);

    if (
      content.byteLength !== file.bytes ||
      sha256(content) !== file.sha256
    ) {
      fail(
        "AIOS_FOUNDER_REVIEW_STAGED_FILE_CONTENT_MISMATCH",
        `Staged candidate content does not match its verified digest: ${file.path}.`,
      );
    }

    inventory.push({
      path: file.path,
      status: file.status,
      bytes: file.bytes,
      sha256: file.sha256,
    });
  }

  return inventory;
}

function resolveGitRef(root, ref, gitResolve) {
  try {
    return gitResolve(root, ref);
  } catch {
    fail(
      "AIOS_FOUNDER_REVIEW_GIT_REF_UNAVAILABLE",
      `Unable to resolve required Git reference: ${ref}.`,
    );
  }
}

export async function createFounderReviewReport(options = {}, dependencies = {}) {
  const root = path.resolve(options.root || process.cwd());
  const artifactPath = assertOutsideRepository(root, options.artifactPath || "", "Artifact");
  const manifestPath = assertOutsideRepository(root, options.manifestPath || "", "Manifest");
  const builderSummaryPath = assertOutsideRepository(root, options.builderSummaryPath || "", "Builder summary");
  const verificationPath = assertOutsideRepository(root, options.verificationPath || "", "Verification report");
  const handoffPath = assertOutsideRepository(root, options.handoffPath || "", "Founder handoff");
  const rollbackPath = assertOutsideRepository(root, options.rollbackPath || "", "Rollback evidence");
  const auditPath = assertOutsideRepository(root, options.auditPath || "", "Audit record");
  const stagingPath = assertOutsideRepository(root, options.stagingPath || "", "Staging directory");

  for (const [key, value] of Object.entries({
    artifactPath,
    manifestPath,
    builderSummaryPath,
    verificationPath,
    handoffPath,
    rollbackPath,
    auditPath,
    stagingPath,
  })) {
    if (!options[key] || !value) {
      fail(
        "AIOS_FOUNDER_REVIEW_USAGE",
        `Required Founder Review input is missing: ${key}.`,
      );
    }
  }

  const artifactBytes = readBytes(artifactPath, "Delivery artifact");
  const artifact = readJson(artifactPath, "Delivery artifact");
  const builderSummary = readJson(builderSummaryPath, "Builder summary");
  const verification = readJson(verificationPath, "Independent verification report");
  const handoff = readJson(handoffPath, "Founder handoff");
  const rollback = readJson(rollbackPath, "Rollback evidence");
  const audit = readJson(auditPath, "Audit record");
  const manifestBytes = readBytes(manifestPath, "SHA-256 manifest");
  const manifest = parseManifest(manifestBytes);

  const baseSha = assertSha(artifact.repository?.baseCommitSha, "Base Commit");
  const headSha = assertSha(artifact.repository?.candidateCommitSha, "Candidate Commit");
  const artifactSha256 = sha256(artifactBytes);
  const manifestSha256 = sha256(manifestBytes);

  for (const name of REQUIRED_MANIFEST_FILES) {
    const filePath = {
      "aios-verified-delivery.json": artifactPath,
      "aios-delivery-builder-summary.json": builderSummaryPath,
      "aios-delivery-verification.json": verificationPath,
    }[name];

    assertSame(
      manifest.get(name),
      sha256(readBytes(filePath, name)),
      "AIOS_FOUNDER_REVIEW_MANIFEST_HASH_MISMATCH",
      `${name} manifest digest`,
    );
  }

  const gitResolve = dependencies.gitResolve || ((repoRoot, ref) => execFileSync(
    "git",
    ["rev-parse", ref],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  ).trim());

  const checkedOutHead = resolveGitRef(root, "HEAD", gitResolve);
  const currentMainSha = resolveGitRef(root, "refs/remotes/origin/main", gitResolve);

  assertSame(checkedOutHead, headSha, "AIOS_FOUNDER_REVIEW_HEAD_MISMATCH", "Checked-out Candidate Commit");
  assertSame(currentMainSha, baseSha, "AIOS_FOUNDER_REVIEW_BASE_STALE", "Current origin/main Commit");

  let verifyArtifact = dependencies.verifyArtifact;

  if (!verifyArtifact) {
    const verifierModule = await import("./aios-verified-delivery-artifact-verifier.mjs");
    verifyArtifact = verifierModule.verifyVerifiedDeliveryArtifact;
  }

  const independentVerification = await verifyArtifact({
    root,
    artifactPath,
    baseSha,
    headSha,
  });

  if (
    independentVerification?.status !== "VERIFIED" ||
    independentVerification?.baseCommitSha !== baseSha ||
    independentVerification?.candidateCommitSha !== headSha ||
    independentVerification?.artifactSha256 !== artifactSha256 ||
    independentVerification?.mergeAuthorized !== false ||
    independentVerification?.productionDeploymentAuthorized !== false
  ) {
    fail(
      "AIOS_FOUNDER_REVIEW_INDEPENDENT_VERIFICATION_FAILED",
      "C170.5.4 independent artifact verification did not pass for this exact candidate.",
    );
  }

  assertSame(builderSummary.status, "DELIVERY_ARTIFACT_READY", "AIOS_FOUNDER_REVIEW_BUILDER_STATUS_INVALID", "Builder status");
  assertSame(builderSummary.repository?.baseCommitSha, baseSha, "AIOS_FOUNDER_REVIEW_BUILDER_BINDING_MISMATCH", "Builder Base Commit");
  assertSame(builderSummary.repository?.candidateCommitSha, headSha, "AIOS_FOUNDER_REVIEW_BUILDER_BINDING_MISMATCH", "Builder Candidate Commit");
  assertSame(builderSummary.fileCount, artifact.files?.length, "AIOS_FOUNDER_REVIEW_BUILDER_FILE_COUNT_MISMATCH", "Builder file count");
  assertSame(builderSummary.mergeAuthorized, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Builder merge authority");
  assertSame(builderSummary.productionDeploymentAuthorized, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Builder production authority");

  assertSame(verification.status, "VERIFIED", "AIOS_FOUNDER_REVIEW_VERIFICATION_STATUS_INVALID", "Independent verification status");
  assertSame(verification.artifactSha256, artifactSha256, "AIOS_FOUNDER_REVIEW_ARTIFACT_HASH_MISMATCH", "Verification artifact SHA-256");
  assertSame(verification.baseCommitSha, baseSha, "AIOS_FOUNDER_REVIEW_VERIFICATION_BINDING_MISMATCH", "Verification Base Commit");
  assertSame(verification.candidateCommitSha, headSha, "AIOS_FOUNDER_REVIEW_VERIFICATION_BINDING_MISMATCH", "Verification Candidate Commit");
  assertSame(verification.verifiedFileCount, artifact.files?.length, "AIOS_FOUNDER_REVIEW_VERIFIED_FILE_COUNT_MISMATCH", "Verified file count");
  assertSame(verification.mergeAuthorized, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Verification merge authority");
  assertSame(verification.productionDeploymentAuthorized, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Verification production authority");

  assertSame(handoff.status, "STAGED_FOR_FOUNDER_REVIEW", "AIOS_FOUNDER_REVIEW_HANDOFF_STATUS_INVALID", "Handoff status");
  assertSame(handoff.repository?.baseCommitSha, baseSha, "AIOS_FOUNDER_REVIEW_HANDOFF_BINDING_MISMATCH", "Handoff Base Commit");
  assertSame(handoff.repository?.candidateCommitSha, headSha, "AIOS_FOUNDER_REVIEW_HANDOFF_BINDING_MISMATCH", "Handoff Candidate Commit");
  assertSame(handoff.verification?.artifactSha256, artifactSha256, "AIOS_FOUNDER_REVIEW_HANDOFF_ARTIFACT_MISMATCH", "Handoff artifact SHA-256");
  assertSame(handoff.verification?.manifestSha256, manifestSha256, "AIOS_FOUNDER_REVIEW_HANDOFF_MANIFEST_MISMATCH", "Handoff manifest SHA-256");
  assertSame(handoff.founderApproval?.required, true, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Founder approval requirement");
  assertSame(handoff.founderApproval?.approved, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Founder approval state");
  assertSame(handoff.founderApproval?.mergeAuthorized, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Handoff merge authority");
  assertSame(handoff.founderApproval?.productionDeploymentAuthorized, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Handoff production authority");
  assertSame(handoff.productionMutation?.allowed, false, "AIOS_FOUNDER_REVIEW_PRODUCTION_BOUNDARY_FAILED", "Production mutation permission");
  assertSame(handoff.productionMutation?.performed, false, "AIOS_FOUNDER_REVIEW_PRODUCTION_BOUNDARY_FAILED", "Production mutation result");
  assertSame(handoff.audit?.appendOnly, false, "AIOS_FOUNDER_REVIEW_AUDIT_SEMANTICS_INVALID", "Audit append-only flag");
  assertSame(handoff.audit?.writeOnce, true, "AIOS_FOUNDER_REVIEW_AUDIT_SEMANTICS_INVALID", "Audit write-once flag");

  assertSame(rollback.baseCommitSha, baseSha, "AIOS_FOUNDER_REVIEW_ROLLBACK_BINDING_MISMATCH", "Rollback Base Commit");
  assertSame(rollback.candidateCommitSha, headSha, "AIOS_FOUNDER_REVIEW_ROLLBACK_BINDING_MISMATCH", "Rollback Candidate Commit");
  assertSame(rollback.artifactSha256, artifactSha256, "AIOS_FOUNDER_REVIEW_ROLLBACK_ARTIFACT_MISMATCH", "Rollback artifact SHA-256");
  assertSame(rollback.manifestSha256, manifestSha256, "AIOS_FOUNDER_REVIEW_ROLLBACK_MANIFEST_MISMATCH", "Rollback manifest SHA-256");
  assertSame(rollback.productionFilesModified, false, "AIOS_FOUNDER_REVIEW_PRODUCTION_BOUNDARY_FAILED", "Rollback production mutation state");

  assertSame(audit.status, "STAGED_FOR_FOUNDER_REVIEW", "AIOS_FOUNDER_REVIEW_AUDIT_STATUS_INVALID", "Audit status");
  assertSame(audit.repository?.baseCommitSha, baseSha, "AIOS_FOUNDER_REVIEW_AUDIT_BINDING_MISMATCH", "Audit Base Commit");
  assertSame(audit.repository?.candidateCommitSha, headSha, "AIOS_FOUNDER_REVIEW_AUDIT_BINDING_MISMATCH", "Audit Candidate Commit");
  assertSame(audit.artifactSha256, artifactSha256, "AIOS_FOUNDER_REVIEW_AUDIT_ARTIFACT_MISMATCH", "Audit artifact SHA-256");
  assertSame(audit.manifestSha256, manifestSha256, "AIOS_FOUNDER_REVIEW_AUDIT_MANIFEST_MISMATCH", "Audit manifest SHA-256");
  assertSame(audit.founderApprovalRequired, true, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Audit approval requirement");
  assertSame(audit.founderApproved, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Audit approval state");
  assertSame(audit.mergeAuthorized, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Audit merge authority");
  assertSame(audit.productionDeploymentAuthorized, false, "AIOS_FOUNDER_REVIEW_AUTHORITY_BOUNDARY_FAILED", "Audit production authority");
  assertSame(audit.productionFilesModified, false, "AIOS_FOUNDER_REVIEW_PRODUCTION_BOUNDARY_FAILED", "Audit production mutation state");
  assertSame(audit.storage?.mode, "exclusive-create", "AIOS_FOUNDER_REVIEW_AUDIT_SEMANTICS_INVALID", "Audit storage mode");
  assertSame(audit.storage?.writeOnce, true, "AIOS_FOUNDER_REVIEW_AUDIT_SEMANTICS_INVALID", "Audit write-once state");
  assertSame(audit.storage?.appendOnly, false, "AIOS_FOUNDER_REVIEW_AUDIT_SEMANTICS_INVALID", "Audit append-only state");

  const inventory = assertFileInventory(artifact, handoff, rollback, stagingPath);
  const riskLevel = artifact.changeSummary?.risk?.level;

  if (!["low", "moderate", "high", "critical"].includes(riskLevel)) {
    fail(
      "AIOS_FOUNDER_REVIEW_RISK_INVALID",
      "Artifact does not contain a supported C170.2 risk level.",
    );
  }

  const integrationBlockers = [];
  const mainProtected = options.mainProtected === true || options.mainProtected === "true";
  const parsedRulesetsCount = Number(options.rulesetsCount);
  const rulesetsCountKnown = Number.isSafeInteger(parsedRulesetsCount) && parsedRulesetsCount >= 0;

  if (!mainProtected) {
    integrationBlockers.push(
      "GitHub does not confirm an active native protection rule for main. Configure and verify main branch protection before controlled integration.",
    );
  }

  if (!rulesetsCountKnown) {
    integrationBlockers.push(
      "Repository ruleset status is unknown; a Founder must verify that no bypass path weakens main protection.",
    );
  }

  return {
    schemaVersion: 1,
    reviewGate: FOUNDER_REVIEW_GATE_VERSION,
    generatedAt: new Date().toISOString(),
    status: integrationBlockers.length === 0 ? "FOUNDER_REVIEW_READY" : "FOUNDER_REVIEW_BLOCKED",
    repository: {
      name: options.repository || null,
      branch: options.branch || null,
      baseCommitSha: baseSha,
      candidateCommitSha: headSha,
      checkedOutHead,
      currentMainSha,
    },
    workflow: {
      runId: options.runId || null,
      runAttempt: options.runAttempt || null,
      actor: options.actor || null,
    },
    artifact: {
      builder: artifact.builder,
      sha256: artifactSha256,
      bytes: artifactBytes.byteLength,
      manifestSha256,
      fileCount: inventory.length,
      totalBytes: artifact.changeSummary?.totalBytes ?? null,
    },
    verification: {
      status: independentVerification.status,
      verifier: independentVerification.verifier,
      verifiedFileCount: independentVerification.verifiedFileCount,
      signed: verification.verificationReceipt?.signed === true,
      attestation: builderSummary.verification?.attestation || null,
    },
    impact: {
      analyzer: artifact.impact?.analyzer || null,
      risk: riskLevel,
      reasons: artifact.changeSummary?.risk?.reasons || [],
      affectedFileCount: artifact.impact?.affectedFileCount ?? null,
    },
    files: inventory,
    branchProtection: {
      mainProtected,
      rulesetsCount: rulesetsCountKnown ? parsedRulesetsCount : null,
      verificationScope: "presence-only",
      policyReviewRequired: true,
      integrationBlockers,
    },
    founderApproval: {
      required: true,
      decision: "PENDING",
      approved: false,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
    },
    productionMutation: {
      allowed: false,
      performed: false,
    },
    mergeExecuted: false,
    nextRequiredActions: [
      "Review every file path, status, and SHA-256 against the GitHub candidate diff.",
      "Verify main branch protection and ensure direct pushes, force pushes, and bypass paths are blocked.",
      "Record explicit Founder approval against this exact Candidate Commit and artifact SHA-256.",
      "Only after explicit approval may a separate controlled integration procedure be started.",
      "After integration, verify the exact Production Commit SHA and runtime health.",
    ],
  };
}

export function writeFounderReviewReport(report, outputPath, root = process.cwd()) {
  const safeOutputPath = assertOutsideRepository(root, outputPath, "Founder review report");

  try {
    fs.writeFileSync(
      safeOutputPath,
      `${JSON.stringify(report, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      },
    );
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail(
        "AIOS_FOUNDER_REVIEW_OUTPUT_EXISTS",
        "Founder review report output already exists and cannot be overwritten.",
      );
    }
    fail(
      "AIOS_FOUNDER_REVIEW_OUTPUT_WRITE_FAILED",
      "Founder review report could not be written.",
    );
  }

  return safeOutputPath;
}

function parseArgs(argv) {
  const values = {};
  const mapping = {
    "--root": "root",
    "--artifact": "artifactPath",
    "--manifest": "manifestPath",
    "--builder-summary": "builderSummaryPath",
    "--verification": "verificationPath",
    "--handoff": "handoffPath",
    "--rollback": "rollbackPath",
    "--audit": "auditPath",
    "--staging": "stagingPath",
    "--output": "outputPath",
    "--main-protected": "mainProtected",
    "--rulesets-count": "rulesetsCount",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!mapping[key] || !value || value.startsWith("--")) {
      fail(
        "AIOS_FOUNDER_REVIEW_USAGE",
        "Invalid arguments. Required: --artifact --manifest --builder-summary --verification --handoff --rollback --audit --staging --output --main-protected --rulesets-count.",
      );
    }

    values[mapping[key]] = value;
    index += 1;
  }

  return values;
}

export async function runFounderReviewGate(argv = process.argv.slice(2), environment = process.env) {
  const options = parseArgs(argv);
  const root = path.resolve(options.root || process.cwd());

  const report = await createFounderReviewReport({
    ...options,
    root,
    repository: environment.GITHUB_REPOSITORY || null,
    branch: environment.GITHUB_REF_NAME || null,
    runId: environment.GITHUB_RUN_ID || null,
    runAttempt: environment.GITHUB_RUN_ATTEMPT || null,
    actor: environment.GITHUB_ACTOR || null,
  });

  const outputPath = writeFounderReviewReport(report, options.outputPath, root);

  return {
    status: report.status,
    reviewGate: report.reviewGate,
    candidateCommitSha: report.repository.candidateCommitSha,
    artifactSha256: report.artifact.sha256,
    fileCount: report.artifact.fileCount,
    risk: report.impact.risk,
    founderApproval: report.founderApproval,
    mergeExecuted: false,
    outputPath,
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await runFounderReviewGate();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.code || "AIOS_FOUNDER_REVIEW_FAILED"}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
