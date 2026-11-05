#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  analyzeDependencyImpact,
} from "./aios-dependency-impact.mjs";

import {
  verifyVerificationReceipt,
} from "./aios-engineering-verification-runtime.mjs";

import {
  assertNoSecretsBeforeProviderDispatch,
} from "./aios-engineering-secret-guard.mjs";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const FILE_SHA_PATTERN = /^[a-f0-9]{64}$/;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(root, args, encoding = "utf8", maxBuffer = 64 * 1024 * 1024) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding,
      maxBuffer,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch {
    fail(
      "AIOS_DELIVERY_VERIFY_GIT_FAILED",
      `Git verification failed: ${args[0] || "unknown"}.`,
    );
  }
}

function assertCommit(root, value, label) {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    fail(
      "AIOS_DELIVERY_VERIFY_COMMIT_INVALID",
      `${label} must be a full 40-character commit SHA.`,
    );
  }

  const resolved = git(
    root,
    ["rev-parse", "--verify", `${value}^{commit}`],
  ).trim();

  if (resolved !== value) {
    fail(
      "AIOS_DELIVERY_VERIFY_COMMIT_INVALID",
      `${label} does not resolve to the supplied commit.`,
    );
  }

  return resolved;
}

function assertRepoPath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 1024 ||
    value.includes("\0") ||
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    value.split("/").some(
      (part) => part === "" || part === "." || part === "..",
    )
  ) {
    fail(
      "AIOS_DELIVERY_VERIFY_PATH_INVALID",
      "Artifact contains an invalid repository-relative path.",
    );
  }

  return value;
}

function assertBaseAncestor(root, baseSha, headSha) {
  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", baseSha, headSha],
      {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
  } catch {
    fail(
      "AIOS_DELIVERY_VERIFY_BASE_NOT_ANCESTOR",
      "The Base Commit is not an ancestor of the Candidate Commit.",
    );
  }
}

function readGitDiff(root, baseSha, headSha) {
  const raw = git(
    root,
    [
      "diff",
      "--no-ext-diff",
      "--no-renames",
      "--name-status",
      "-z",
      baseSha,
      headSha,
      "--",
    ],
    "buffer",
  );

  const tokens = raw.toString("utf8").split("\0").filter(Boolean);
  const changes = [];

  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    const filePath = assertRepoPath(tokens[index++]);

    if (!["A", "M", "T"].includes(status)) {
      fail(
        "AIOS_DELIVERY_VERIFY_CHANGE_UNSUPPORTED",
        `Unsupported Git change type: ${status}.`,
      );
    }

    changes.push({ status, path: filePath });
  }

  if (changes.length === 0 || changes.length > 100) {
    fail(
      "AIOS_DELIVERY_VERIFY_CHANGE_COUNT_INVALID",
      "Git change count is empty or exceeds the 100-file limit.",
    );
  }

  changes.sort((a, b) => a.path.localeCompare(b.path));

  if (new Set(changes.map((item) => item.path)).size !== changes.length) {
    fail(
      "AIOS_DELIVERY_VERIFY_DUPLICATE_PATH",
      "Git diff contains duplicate paths.",
    );
  }

  return changes;
}

function readVerifiedBlob(root, headSha, filePath) {
  const tree = git(
    root,
    [
      "ls-tree",
      "-z",
      headSha,
      "--",
      `:(literal)${filePath}`,
    ],
    "buffer",
  );

  const records = tree.toString("utf8").split("\0").filter(Boolean);

  if (records.length !== 1) {
    fail(
      "AIOS_DELIVERY_VERIFY_TREE_INVALID",
      `Expected one Git Tree entry for ${filePath}.`,
    );
  }

  const separator = records[0].indexOf("\t");
  if (separator < 0) {
    fail(
      "AIOS_DELIVERY_VERIFY_TREE_INVALID",
      `Malformed Git Tree entry for ${filePath}.`,
    );
  }

  const metadata = records[0].slice(0, separator).split(" ");
  const actualPath = records[0].slice(separator + 1);

  if (
    metadata.length !== 3 ||
    actualPath !== filePath ||
    metadata[1] !== "blob" ||
    !["100644", "100755"].includes(metadata[0])
  ) {
    fail(
      "AIOS_DELIVERY_VERIFY_TREE_INVALID",
      `Unsupported or mismatched Git Tree entry for ${filePath}.`,
    );
  }

  const blob = git(
    root,
    ["cat-file", "blob", `${headSha}:${filePath}`],
    "buffer",
    5 * 1024 * 1024 + 1,
  );

  if (blob.byteLength > 5 * 1024 * 1024) {
    fail(
      "AIOS_DELIVERY_VERIFY_FILE_TOO_LARGE",
      `File exceeds the 5 MiB limit: ${filePath}.`,
    );
  }

  return blob;
}

function assertArtifactOutsideRepository(root, artifactPath) {
  let realRoot;
  let realArtifact;

  try {
    realRoot = fs.realpathSync(root);
    realArtifact = fs.realpathSync(artifactPath);
  } catch {
    fail(
      "AIOS_DELIVERY_VERIFY_ARTIFACT_UNREADABLE",
      "Artifact file or repository path could not be resolved.",
    );
  }

  const relative = path.relative(realRoot, realArtifact);

  if (
    relative === "" ||
    (
      !relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative)
    )
  ) {
    fail(
      "AIOS_DELIVERY_VERIFY_ARTIFACT_INSIDE_REPOSITORY",
      "The delivery artifact must remain outside the source repository.",
    );
  }
}

export function verifyVerifiedDeliveryArtifact(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const artifactPath = path.resolve(options.artifactPath || "");

  if (!options.artifactPath) {
    fail(
      "AIOS_DELIVERY_VERIFY_USAGE",
      "An artifact path is required.",
    );
  }

  const baseSha = assertCommit(root, options.baseSha, "baseSha");
  const headSha = assertCommit(root, options.headSha, "headSha");

  const checkedOutHead = git(root, ["rev-parse", "HEAD"]).trim();

  if (checkedOutHead !== headSha) {
    fail(
      "AIOS_DELIVERY_VERIFY_HEAD_MISMATCH",
      "The checked-out HEAD does not equal the Candidate Commit.",
    );
  }

  assertBaseAncestor(root, baseSha, headSha);
  assertArtifactOutsideRepository(root, artifactPath);

  const rawArtifact = fs.readFileSync(artifactPath);

  if (rawArtifact.byteLength > 256 * 1024 * 1024) {
    fail(
      "AIOS_DELIVERY_VERIFY_ARTIFACT_TOO_LARGE",
      "Artifact exceeds the 256 MiB verification limit.",
    );
  }

  let payload;

  try {
    payload = JSON.parse(rawArtifact.toString("utf8"));
  } catch {
    fail(
      "AIOS_DELIVERY_VERIFY_JSON_INVALID",
      "Artifact is not valid UTF-8 JSON.",
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.schemaVersion !== 1 ||
    typeof payload.builder !== "string" ||
    !payload.builder.startsWith("C170.5.") ||
    !payload.repository ||
    payload.repository.baseCommitSha !== baseSha ||
    payload.repository.candidateCommitSha !== headSha ||
    !Array.isArray(payload.files) ||
    !payload.changeSummary ||
    !payload.impact ||
    !payload.verification
  ) {
    fail(
      "AIOS_DELIVERY_VERIFY_SCHEMA_INVALID",
      "Artifact schema or repository binding is invalid.",
    );
  }

  const changes = readGitDiff(root, baseSha, headSha);

  if (payload.files.length !== changes.length) {
    fail(
      "AIOS_DELIVERY_VERIFY_FILE_COUNT_MISMATCH",
      "Artifact file count does not match the real Git diff.",
    );
  }

  let totalBytes = 0;

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index];
    const file = payload.files[index];

    if (
      !file ||
      file.path !== change.path ||
      file.status !== change.status ||
      typeof file.content !== "string" ||
      !FILE_SHA_PATTERN.test(file.sha256 || "")
    ) {
      fail(
        "AIOS_DELIVERY_VERIFY_FILE_MANIFEST_MISMATCH",
        `Artifact manifest does not match Git diff at ${change.path}.`,
      );
    }

    const blob = readVerifiedBlob(root, headSha, change.path);
    const contentBytes = Buffer.from(file.content, "utf8");

    if (!contentBytes.equals(blob)) {
      fail(
        "AIOS_DELIVERY_VERIFY_CONTENT_MISMATCH",
        `Artifact content differs from the immutable Git blob: ${change.path}.`,
      );
    }

    if (
      file.bytes !== blob.byteLength ||
      file.sha256 !== sha256(blob)
    ) {
      fail(
        "AIOS_DELIVERY_VERIFY_FILE_HASH_MISMATCH",
        `File byte count or SHA-256 mismatch: ${change.path}.`,
      );
    }

    totalBytes += blob.byteLength;

    if (totalBytes > 50 * 1024 * 1024) {
      fail(
        "AIOS_DELIVERY_VERIFY_TOTAL_SIZE_LIMIT",
        "Artifact exceeds the 50 MiB total content limit.",
      );
    }
  }

  if (
    payload.changeSummary.fileCount !== changes.length ||
    payload.changeSummary.totalBytes !== totalBytes ||
    payload.changeSummary.added !== changes.filter((x) => x.status === "A").length ||
    payload.changeSummary.modified !== changes.filter((x) => x.status === "M").length ||
    payload.changeSummary.typeChanged !== changes.filter((x) => x.status === "T").length
  ) {
    fail(
      "AIOS_DELIVERY_VERIFY_SUMMARY_MISMATCH",
      "Artifact change summary does not match verified Git content.",
    );
  }

  const impactReport = analyzeDependencyImpact(
    root,
    changes.map((item) => item.path),
  );

  const expectedImpact = {
    analyzer: impactReport.analyzer,
    changedFiles: [...impactReport.changedFiles],
    affectedFileCount: impactReport.affectedFileCount,
    affectedFiles: impactReport.affectedFiles,
    likelyTests: impactReport.likelyTests,
    limitations: impactReport.limitations,
  };

  if (
    !isDeepStrictEqual(payload.impact, expectedImpact) ||
    !isDeepStrictEqual(payload.changeSummary.risk, impactReport.risk)
  ) {
    fail(
      "AIOS_DELIVERY_VERIFY_IMPACT_MISMATCH",
      "Artifact impact report differs from independently recomputed C170.2 output.",
    );
  }

  const receipt = payload.verification.receipt;
  const receiptResult = verifyVerificationReceipt(receipt, headSha);

  if (
    !receiptResult.valid ||
    !receiptResult.passed ||
    payload.verification.status !== "passed" ||
    payload.verification.commitSha !== headSha ||
    payload.verification.receiptSha256 !== receipt.receiptSha256 ||
    payload.verification.completedChecks !== receiptResult.completedChecks ||
    payload.verification.expectedChecks !== receiptResult.expectedChecks ||
    payload.verification.signed !== false
  ) {
    fail(
      "AIOS_DELIVERY_VERIFY_RECEIPT_INVALID",
      "Embedded C170.4 receipt is invalid, failed, or bound to another commit.",
    );
  }

  if (
    payload.founderApproval?.required !== true ||
    payload.founderApproval?.approved !== false ||
    payload.founderApproval?.mergeAuthorized !== false ||
    payload.founderApproval?.productionDeploymentAuthorized !== false ||
    payload.rollback?.automaticRollback !== false
  ) {
    fail(
      "AIOS_DELIVERY_VERIFY_APPROVAL_BOUNDARY_FAILED",
      "Artifact must not grant Founder approval, merge authority, deployment authority, or automatic rollback.",
    );
  }

  assertNoSecretsBeforeProviderDispatch(payload);

  return {
    status: "VERIFIED",
    verifier: "C170.5.4",
    artifactSha256: sha256(rawArtifact),
    artifactBytes: rawArtifact.byteLength,
    baseCommitSha: baseSha,
    candidateCommitSha: headSha,
    verifiedFileCount: changes.length,
    verifiedContentBytes: totalBytes,
    impactAnalyzer: impactReport.analyzer,
    verificationReceipt: {
      status: receipt.status,
      completedChecks: receiptResult.completedChecks,
      expectedChecks: receiptResult.expectedChecks,
      signed: false,
    },
    founderApprovalRequired: true,
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
  };
}

function parseArgs(argv) {
  const values = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    const field = {
      "--artifact": "artifactPath",
      "--base": "baseSha",
      "--head": "headSha",
    }[key];

    if (!field || !value || value.startsWith("--") || values[field]) {
      fail(
        "AIOS_DELIVERY_VERIFY_USAGE",
        "Usage: node scripts/aios-verified-delivery-artifact-verifier.mjs --artifact <artifact.json> --base <base-sha> --head <candidate-sha>",
      );
    }

    values[field] = value;
    index += 1;
  }

  if (!values.artifactPath || !values.baseSha || !values.headSha) {
    fail(
      "AIOS_DELIVERY_VERIFY_USAGE",
      "Artifact, base, and head arguments are required.",
    );
  }

  return values;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = verifyVerifiedDeliveryArtifact(args);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";

if (
  invokedPath &&
  pathToFileURL(invokedPath).href === pathToFileURL(SCRIPT_FILE).href
) {
  try {
    main();
  } catch (error) {
    const code =
      typeof error?.code === "string"
        ? error.code
        : "AIOS_DELIVERY_VERIFY_FAILED";

    process.stderr.write(
      `${code}: ${error?.message || "Artifact verification failed."}\n`,
    );

    process.exitCode = 1;
  }
}
