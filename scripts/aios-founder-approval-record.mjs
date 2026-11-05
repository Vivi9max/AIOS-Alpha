import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HEX_40 = /^[a-f0-9]{40}$/;
const HEX_64 = /^[a-f0-9]{64}$/;
const BRANCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const DECISIONS = new Set(["APPROVE", "REJECT"]);
const SCOPES = new Set(["merge", "production_deployment"]);
const REPOSITORY = "Vivi9max/AIOS-Alpha";
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

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--") || key.length < 3) {
      fail("ARGUMENT_INVALID", `Unexpected argument: ${key}`);
    }
    if (values.has(key)) fail("ARGUMENT_DUPLICATE", `Duplicate argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("ARGUMENT_MISSING_VALUE", `Missing value for ${key}`);
    values.set(key, value);
    index += 1;
  }

  const allowed = new Set([
    "--expected-founder", "--actor", "--event-name", "--run-attempt",
    "--source-run-id", "--candidate-branch", "--candidate-sha", "--decision",
    "--approval-scope", "--review-report", "--delivery-artifact",
    "--builder-summary", "--verification", "--manifest", "--output",
  ]);
  for (const key of values.keys()) {
    if (!allowed.has(key)) fail("ARGUMENT_UNKNOWN", `Unknown argument: ${key}`);
  }
  for (const key of allowed) {
    if (!values.has(key)) fail("ARGUMENT_REQUIRED", `Required argument missing: ${key}`);
  }
  return Object.fromEntries([...values].map(([key, value]) => [
    key.slice(2).replaceAll("-", ""), value,
  ]));
}

function readBytes(filePath, label) {
  try {
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      fail("EVIDENCE_FILE_INVALID", `${label} must be a regular file.`);
    }
    return fs.readFileSync(filePath);
  } catch (error) {
    if (error?.code?.startsWith("EVIDENCE_")) throw error;
    fail("EVIDENCE_FILE_MISSING", `${label} is missing or unreadable.`);
  }
}

function readJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("JSON_INVALID", `${label} is not valid JSON.`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function parseManifest(manifestText) {
  const entries = new Map();
  const lines = manifestText.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length !== REQUIRED_MANIFEST_FILES.length) {
    fail("MANIFEST_ENTRY_COUNT_INVALID", "Manifest must contain exactly the three required evidence files.");
  }
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/.exec(line);
    if (!match || entries.has(match[2])) {
      fail("MANIFEST_INVALID", "Manifest contains an invalid or duplicate entry.");
    }
    entries.set(match[2], match[1]);
  }
  for (const name of REQUIRED_MANIFEST_FILES) {
    if (!entries.has(name)) fail("MANIFEST_INCOMPLETE", `Manifest is missing ${name}.`);
  }
  return entries;
}

function assertHash(actual, bytes, code, label) {
  const expected = sha256(bytes);
  if (actual !== expected) fail(code, `${label} SHA-256 does not match the manifest.`);
  return expected;
}

function validateFileInventory(artifact, report) {
  if (!Array.isArray(artifact.files) || !Array.isArray(report.files) ||
      artifact.files.length === 0 || artifact.files.length !== report.files.length) {
    fail("FILE_INVENTORY_INVALID", "Artifact and Founder Review file inventories are missing or have different counts.");
  }
  const reviewFiles = new Map();
  for (const file of report.files) {
    if (!file || typeof file.path !== "string" ||
        !HEX_64.test(file.sha256 || "") || reviewFiles.has(file.path)) {
      fail("REVIEW_FILE_INVALID", "Founder Review contains an invalid or duplicate file entry.");
    }
    reviewFiles.set(file.path, file);
  }
  const seen = new Set();
  for (const file of artifact.files) {
    if (!file || typeof file.path !== "string" ||
        typeof file.content !== "string" || !HEX_64.test(file.sha256 || "") ||
        seen.has(file.path)) {
      fail("ARTIFACT_FILE_INVALID", "Delivery artifact contains an invalid or duplicate file entry.");
    }
    if (!file.path || file.path.startsWith("/") || file.path.includes("\\") ||
        file.path.split("/").some((part) => !part || part === "." || part === "..")) {
      fail("ARTIFACT_FILE_PATH_INVALID", "Delivery artifact contains an unsafe repository-relative path.");
    }
    seen.add(file.path);
    const reviewFile = reviewFiles.get(file.path);
    if (!reviewFile || reviewFile.sha256 !== file.sha256 ||
        reviewFile.status !== file.status || reviewFile.bytes !== file.bytes) {
      fail("FILE_INVENTORY_MISMATCH", `Founder Review inventory mismatch: ${file.path}`);
    }
    const content = Buffer.from(file.content, "utf8");
    if (sha256(content) !== file.sha256) {
      fail("FILE_CONTENT_HASH_MISMATCH", `Embedded file content hash mismatch: ${file.path}`);
    }
    if (!Number.isSafeInteger(file.bytes) || content.byteLength !== file.bytes) {
      fail("FILE_CONTENT_SIZE_MISMATCH", `Embedded file size mismatch: ${file.path}`);
    }
  }
  if (seen.size !== reviewFiles.size) {
    fail("FILE_INVENTORY_MISMATCH", "Founder Review contains unmatched file entries.");
  }
}

function safeOutputPath(outputPath) {
  const resolved = path.resolve(outputPath);
  const cwd = path.resolve(process.cwd());
  const relative = path.relative(cwd, resolved);
  if (relative === "" ||
      (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    fail("OUTPUT_INSIDE_REPOSITORY", "Output must be outside the repository.");
  }
  if (fs.existsSync(resolved)) {
    fail("OUTPUT_ALREADY_EXISTS", "Output already exists; records are write-once.");
  }
  return resolved;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const expectedFounder = args.expectedfounder;
  const actor = args.actor;
  const eventName = args.eventname;
  const runAttempt = args.runattempt;
  const sourceRunId = args.sourcerunid;
  const candidateBranch = args.candidatebranch;
  const candidateSha = args.candidatesha.toLowerCase();
  const decision = args.decision;
  const approvalScope = args.approvalscope;

  if (actor !== expectedFounder) fail("FOUNDER_IDENTITY_REJECTED", "GitHub actor is not the expected Founder.");
  if (eventName !== "workflow_dispatch") fail("EVENT_REJECTED", "Only workflow_dispatch events are accepted.");
  if (runAttempt !== "1") fail("RERUN_REJECTED", "Workflow reruns cannot create Founder approval records.");
  if (!/^[0-9]+$/.test(sourceRunId)) fail("SOURCE_RUN_ID_INVALID", "Source Run ID must contain digits only.");
  if (!BRANCH_PATTERN.test(candidateBranch) || candidateBranch.includes("..")) {
    fail("CANDIDATE_BRANCH_INVALID", "Candidate branch name is invalid.");
  }
  if (!HEX_40.test(candidateSha)) fail("CANDIDATE_SHA_INVALID", "Candidate SHA must be a 40-character Git SHA.");
  if (!DECISIONS.has(decision)) fail("DECISION_INVALID", "Decision must be APPROVE or REJECT.");
  if (!SCOPES.has(approvalScope)) fail("APPROVAL_SCOPE_INVALID", "Approval scope must be merge or production_deployment.");

  const report = readJsonBytes(readBytes(args.reviewreport, "Founder Review report"), "Founder Review report");
  const artifactBytes = readBytes(args.deliveryartifact, "Verified delivery artifact");
  const builderBytes = readBytes(args.buildersummary, "Builder summary");
  const verificationBytes = readBytes(args.verification, "Independent verification report");
  const manifestBytes = readBytes(args.manifest, "SHA-256 manifest");
  const artifact = readJsonBytes(artifactBytes, "Verified delivery artifact");
  const builder = readJsonBytes(builderBytes, "Builder summary");
  const verification = readJsonBytes(verificationBytes, "Independent verification report");
  const manifest = parseManifest(manifestBytes.toString("utf8"));

  const artifactHash = assertHash(
    manifest.get("aios-verified-delivery.json"),
    artifactBytes,
    "MANIFEST_ARTIFACT_MISMATCH",
    "Artifact",
  );
  assertHash(
    manifest.get("aios-delivery-builder-summary.json"),
    builderBytes,
    "MANIFEST_BUILDER_SUMMARY_MISMATCH",
    "Builder summary",
  );
  assertHash(
    manifest.get("aios-delivery-verification.json"),
    verificationBytes,
    "MANIFEST_VERIFICATION_MISMATCH",
    "Verification report",
  );
  const manifestHash = sha256(manifestBytes);

  if (report.status !== "FOUNDER_REVIEW_READY") {
    fail("REVIEW_STATUS_REJECTED", "Founder Review is not ready.");
  }
  const pending = report.founderApproval;
  if (!pending || pending.required !== true || pending.decision !== "PENDING" ||
      pending.approved !== false || pending.mergeAuthorized !== false ||
      pending.productionDeploymentAuthorized !== false) {
    fail("REVIEW_NOT_PENDING", "Founder Review is not in the expected pending state.");
  }
  if (report.repository?.name !== REPOSITORY) {
    fail("REPOSITORY_MISMATCH", "Founder Review repository does not match.");
  }
  if (report.repository?.branch !== candidateBranch ||
      report.repository?.candidateCommitSha !== candidateSha) {
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
  if (artifact.repository?.candidateCommitSha !== candidateSha ||
      artifact.repository?.baseCommitSha !== report.repository?.baseCommitSha) {
    fail("ARTIFACT_COMMIT_MISMATCH", "Artifact commit binding does not match Founder Review.");
  }
  if (artifact.changeSummary?.fileCount !== report.artifact?.fileCount ||
      builder.fileCount !== artifact.files?.length) {
    fail("ARTIFACT_FILE_COUNT_MISMATCH", "Artifact, builder summary, and Founder Review file counts do not match.");
  }
  if (builder.status !== "DELIVERY_ARTIFACT_READY" ||
      builder.repository?.baseCommitSha !== artifact.repository.baseCommitSha ||
      builder.repository?.candidateCommitSha !== candidateSha ||
      builder.mergeAuthorized !== false ||
      builder.productionDeploymentAuthorized !== false) {
    fail("BUILDER_SUMMARY_INVALID", "Builder summary status, commit binding, or authority boundary is invalid.");
  }
  if (verification.status !== "VERIFIED" ||
      verification.baseCommitSha !== artifact.repository.baseCommitSha ||
      verification.candidateCommitSha !== candidateSha ||
      verification.verifiedFileCount !== artifact.files.length ||
      verification.mergeAuthorized !== false ||
      verification.productionDeploymentAuthorized !== false ||
      verification.artifactSha256 !== artifactHash) {
    fail("INDEPENDENT_VERIFICATION_INVALID", "Independent verification status, commit binding, artifact hash, or authority boundary is invalid.");
  }

  validateFileInventory(artifact, report);
  const outputPath = safeOutputPath(args.output);
  const approved = decision === "APPROVE";
  const record = {
    schemaVersion: 1,
    recordType: "AIOS_FOUNDER_APPROVAL_RECORD",
    recordVersion: "C170.6.3",
    createdAt: new Date().toISOString(),
    repository: REPOSITORY,
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
      builderSummarySha256: sha256(builderBytes),
      verificationSha256: sha256(verificationBytes),
      manifestSha256: manifestHash,
      fileCount: artifact.files.length,
      filesVerified: true,
      manifestEntriesVerified: REQUIRED_MANIFEST_FILES.length,
    },
    decision,
    approvalScope,
    approved,
    approvalRecorded: true,
    mergeAuthorized: approved && approvalScope === "merge",
    productionDeploymentAuthorized: approved && approvalScope === "production_deployment",
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
    recordDigest: { algorithm: "SHA-256", value: digest },
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  process.stdout.write(`${JSON.stringify({
    status: "APPROVAL_RECORD_CREATED",
    decision,
    approvalScope,
    candidateSha,
    recordPath: outputPath,
    recordDigest: digest,
    executionPerformed: false,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    status: "APPROVAL_RECORD_REJECTED",
    code: error.code || "UNEXPECTED_ERROR",
    message: error.message,
  }, null, 2)}\n`);
  process.exitCode = 1;
}
