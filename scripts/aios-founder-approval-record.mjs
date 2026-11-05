import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HEX_40 = /^[a-f0-9]{40}$/;
const HEX_64 = /^[a-f0-9]{64}$/;
const BRANCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const DECISIONS = new Set(["APPROVE", "REJECT"]);
const SCOPES = new Set(["merge", "production_deployment"]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function parseArgs(argv) {
  const result = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];

    if (!key.startsWith("--") || key.length < 3) {
      fail("ARGUMENT_INVALID", `Unexpected argument: ${key}`);
    }

    if (result.has(key)) {
      fail("ARGUMENT_DUPLICATE", `Duplicate argument: ${key}`);
    }

    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      fail("ARGUMENT_MISSING_VALUE", `Missing value for ${key}`);
    }

    result.set(key, value);
    index += 1;
  }

  const allowed = new Set([
    "--expected-founder",
    "--actor",
    "--event-name",
    "--run-attempt",
    "--source-run-id",
    "--candidate-branch",
    "--candidate-sha",
    "--decision",
    "--approval-scope",
    "--review-report",
    "--delivery-artifact",
    "--manifest",
    "--output",
  ]);

  for (const key of result.keys()) {
    if (!allowed.has(key)) {
      fail("ARGUMENT_UNKNOWN", `Unknown argument: ${key}`);
    }
  }

  for (const key of allowed) {
    if (!result.has(key)) {
      fail("ARGUMENT_REQUIRED", `Required argument missing: ${key}`);
    }
  }

  return Object.fromEntries(
    [...result.entries()].map(([key, value]) => [
      key.slice(2).replaceAll("-", ""),
      value,
    ]),
  );
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fail("JSON_INVALID", `${label} is missing or invalid JSON.`);
  }
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function safeOutputPath(outputPath) {
  const resolved = path.resolve(outputPath);
  const cwd = path.resolve(process.cwd());
  const relative = path.relative(cwd, resolved);

  if (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  ) {
    fail("OUTPUT_INSIDE_REPOSITORY", "Output must be outside the repository.");
  }

  if (fs.existsSync(resolved)) {
    fail("OUTPUT_ALREADY_EXISTS", "Output already exists; records are write-once.");
  }

  return resolved;
}

function validateManifest(manifestText, artifactBytes) {
  const lines = manifestText.trim().split(/\r?\n/);
  const entries = new Map();

  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})  ([A-Za-z0-9._/-]+)$/);

    if (!match) {
      fail("MANIFEST_INVALID", "Manifest contains an invalid line.");
    }

    if (entries.has(match[2])) {
      fail("MANIFEST_DUPLICATE", `Duplicate manifest path: ${match[2]}`);
    }

    entries.set(match[2], match[1]);
  }

  const expected = new Map([
    ["aios-verified-delivery.json", sha256(artifactBytes)],
  ]);

  for (const [name, digest] of expected) {
    if (entries.get(name) !== digest) {
      fail("MANIFEST_ARTIFACT_MISMATCH", `Manifest hash mismatch: ${name}`);
    }
  }

  return entries;
}

function validateFileInventory(artifact, report) {
  if (!Array.isArray(artifact.files) || !Array.isArray(report.files)) {
    fail("FILE_INVENTORY_INVALID", "Artifact or Founder Review file inventory is missing.");
  }

  if (artifact.files.length === 0 || artifact.files.length !== report.files.length) {
    fail("FILE_INVENTORY_COUNT_MISMATCH", "File inventory counts do not match.");
  }

  const reportFiles = new Map();

  for (const file of report.files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      !HEX_64.test(file.sha256 || "") ||
      reportFiles.has(file.path)
    ) {
      fail("REVIEW_FILE_INVALID", "Founder Review contains an invalid file entry.");
    }

    reportFiles.set(file.path, file);
  }

  const seen = new Set();

  for (const file of artifact.files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      typeof file.content !== "string" ||
      !HEX_64.test(file.sha256 || "") ||
      seen.has(file.path)
    ) {
      fail("ARTIFACT_FILE_INVALID", "Delivery artifact contains an invalid file entry.");
    }

    seen.add(file.path);

    const reviewFile = reportFiles.get(file.path);

    if (!reviewFile || reviewFile.sha256 !== file.sha256) {
      fail("FILE_INVENTORY_MISMATCH", `Review inventory mismatch: ${file.path}`);
    }

    const contentHash = sha256(Buffer.from(file.content, "utf8"));

    if (contentHash !== file.sha256) {
      fail("FILE_CONTENT_HASH_MISMATCH", `Embedded file content hash mismatch: ${file.path}`);
    }

    if (
      Number.isInteger(file.bytes) &&
      Buffer.byteLength(file.content, "utf8") !== file.bytes
    ) {
      fail("FILE_CONTENT_SIZE_MISMATCH", `Embedded file size mismatch: ${file.path}`);
    }
  }

  if (seen.size !== reportFiles.size) {
    fail("FILE_INVENTORY_MISMATCH", "Founder Review contains unmatched file entries.");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const expectedFounderLogin = args.expectedfounder;
  const actor = args.actor;
  const eventName = args.eventname;
  const runAttempt = args.runattempt;
  const sourceRunId = args.sourcerunid;
  const candidateBranch = args.candidatebranch;
  const candidateSha = args.candidatesha.toLowerCase();
  const decision = args.decision;
  const approvalScope = args.approvalscope;

  if (actor !== expectedFounderLogin) {
    fail("FOUNDER_IDENTITY_REJECTED", "GitHub actor is not the expected Founder.");
  }

  if (eventName !== "workflow_dispatch") {
    fail("EVENT_REJECTED", "Only workflow_dispatch events are accepted.");
  }

  if (runAttempt !== "1") {
    fail("RERUN_REJECTED", "Workflow reruns cannot create Founder approval records.");
  }

  if (!/^[0-9]+$/.test(sourceRunId)) {
    fail("SOURCE_RUN_ID_INVALID", "Source Run ID must contain digits only.");
  }

  if (!BRANCH_PATTERN.test(candidateBranch) || candidateBranch.includes("..")) {
    fail("CANDIDATE_BRANCH_INVALID", "Candidate branch name is invalid.");
  }

  if (!HEX_40.test(candidateSha)) {
    fail("CANDIDATE_SHA_INVALID", "Candidate SHA must be a 40-character Git SHA.");
  }

  if (!DECISIONS.has(decision)) {
    fail("DECISION_INVALID", "Decision must be APPROVE or REJECT.");
  }

  if (!SCOPES.has(approvalScope)) {
    fail("APPROVAL_SCOPE_INVALID", "Approval scope must be merge or production_deployment.");
  }

  const report = readJson(args.reviewreport, "Founder Review report");
  const artifactBytes = fs.readFileSync(args.deliveryartifact);
  const artifact = readJson(args.deliveryartifact, "Verified delivery artifact");
  const manifestText = fs.readFileSync(args.manifest, "utf8");

  const artifactHash = sha256(artifactBytes);
  const manifestHash = sha256(Buffer.from(manifestText, "utf8"));

  if (report.status !== "FOUNDER_REVIEW_READY") {
    fail("REVIEW_STATUS_REJECTED", "Founder Review is not ready.");
  }

  const pending = report.founderApproval;

  if (
    !pending ||
    pending.required !== true ||
    pending.decision !== "PENDING" ||
    pending.approved !== false ||
    pending.mergeAuthorized !== false ||
    pending.productionDeploymentAuthorized !== false
  ) {
    fail("REVIEW_NOT_PENDING", "Founder Review is not in the expected pending state.");
  }

  if (report.repository?.name !== "Vivi9max/AIOS-Alpha") {
    fail("REPOSITORY_MISMATCH", "Founder Review repository does not match.");
  }

  if (
    report.repository?.branch !== candidateBranch ||
    report.repository?.candidateCommitSha !== candidateSha
  ) {
    fail("CANDIDATE_BINDING_MISMATCH", "Candidate branch or SHA does not match Founder Review.");
  }

  if (report.workflow?.runId !== sourceRunId) {
    fail("SOURCE_RUN_MISMATCH", "Source Run ID does not match Founder Review.");
  }

  if (report.artifact?.sha256 !== artifactHash) {
    fail("ARTIFACT_HASH_MISMATCH", "Delivery artifact SHA-256 does not match Founder Review.");
  }

  if (report.artifact?.manifestSha256 !== manifestHash) {
    fail("MANIFEST_HASH_MISMATCH", "Manifest SHA-256 does not match Founder Review.");
  }

  if (
    artifact.repository?.candidateCommitSha !== candidateSha ||
    artifact.repository?.baseCommitSha !== report.repository?.baseCommitSha
  ) {
    fail("ARTIFACT_COMMIT_MISMATCH", "Artifact commit binding does not match Founder Review.");
  }

  if (artifact.changeSummary?.fileCount !== report.artifact?.fileCount) {
    fail("ARTIFACT_FILE_COUNT_MISMATCH", "Artifact file count does not match Founder Review.");
  }

  const manifestEntries = validateManifest(manifestText, artifactBytes);

  if (manifestEntries.size !== 3) {
    fail("MANIFEST_ENTRY_COUNT_INVALID", "Expected exactly three manifest entries.");
  }

  validateFileInventory(artifact, report);

  const outputPath = safeOutputPath(args.output);

  const approved = decision === "APPROVE";
  const record = {
    schemaVersion: 1,
    recordType: "AIOS_FOUNDER_APPROVAL_RECORD",
    recordVersion: "C170.6.3",
    createdAt: new Date().toISOString(),
    repository: "Vivi9max/AIOS-Alpha",
    source: {
      eventName,
      actor,
      runAttempt: 1,
      approvalWorkflowRunId: process.env.GITHUB_RUN_ID || null,
      approvalWorkflowRef: process.env.GITHUB_REF || null,
    },
    candidate: {
      sourceRunId,
      branch: candidateBranch,
      commitSha: candidateSha,
      baseCommitSha: report.repository.baseCommitSha,
    },
    evidence: {
      reviewStatus: report.status,
      reviewGate: report.reviewGate,
      artifactSha256: artifactHash,
      manifestSha256: manifestHash,
      fileCount: artifact.files.length,
      filesVerified: true,
    },
    decision,
    approvalScope,
    approved,
    approvalRecorded: true,
    mergeAuthorized: approved && approvalScope === "merge",
    productionDeploymentAuthorized:
      approved && approvalScope === "production_deployment",
    executionPerformed: false,
    repositoryWritePerformed: false,
    mergeExecuted: false,
    productionMutationPerformed: false,
    cryptographicSignature: {
      signed: false,
      method: "none",
      note: "GitHub workflow event identity evidence; this record is not a cryptographic signature.",
    },
  };

  const digest = sha256(Buffer.from(canonicalJson(record), "utf8"));
  const output = {
    ...record,
    recordDigest: {
      algorithm: "SHA-256",
      value: digest,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  process.stdout.write(
    `${JSON.stringify({
      status: "APPROVAL_RECORD_CREATED",
      decision,
      approvalScope,
      candidateSha,
      recordPath: outputPath,
      recordDigest: digest,
      executionPerformed: false,
    }, null, 2)}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      status: "APPROVAL_RECORD_REJECTED",
      code: error.code || "UNEXPECTED_ERROR",
      message: error.message,
    }, null, 2)}\n`,
  );
  process.exitCode = 1;
}
