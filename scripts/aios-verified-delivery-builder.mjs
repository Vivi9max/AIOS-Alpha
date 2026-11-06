#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  analyzeDependencyImpact,
} from "./aios-dependency-impact.mjs";

import {
  verifyVerificationReceipt,
} from "./aios-engineering-verification-runtime.mjs";

import {
  assertNoSecretsBeforeProviderDispatch,
} from "./aios-engineering-secret-guard.mjs";

export const VERIFIED_DELIVERY_BUILDER_VERSION = "C170.5.3";
export const VERIFIED_DELIVERY_SCHEMA_VERSION = 1;

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const FILE_SHA_PATTERN = /^[a-f0-9]{64}$/;

export const VERIFIED_DELIVERY_LIMITS = Object.freeze({
  maxChangedFiles: 100,
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
});

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function runGit(root, args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: options.encoding ?? "utf8",
      maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch {
    fail(
      "AIOS_DELIVERY_GIT_COMMAND_FAILED",
      `Git command failed (${args[0] || "unknown"}); verify the repository and commit references.`,
    );
  }
}

function resolveCommit(root, value, label) {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    fail(
      "AIOS_DELIVERY_COMMIT_INVALID",
      `${label} must be a full 40-character commit SHA.`,
    );
  }

  const resolved = runGit(
    root,
    ["rev-parse", "--verify", `${value}^{commit}`],
  ).trim();

  if (resolved !== value) {
    fail(
      "AIOS_DELIVERY_COMMIT_INVALID",
      `${label} does not resolve to the supplied commit SHA.`,
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
      (part) =>
        part === "" ||
        part === "." ||
        part === "..",
    )
  ) {
    fail(
      "AIOS_DELIVERY_PATH_INVALID",
      "A changed file has an invalid repository-relative path.",
    );
  }

  return value;
}

function readJsonFile(filePath, label) {
  let source;

  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch {
    fail(
      "AIOS_DELIVERY_INPUT_UNREADABLE",
      `${label} could not be read.`,
    );
  }

  try {
    return JSON.parse(source);
  } catch {
    fail(
      "AIOS_DELIVERY_INPUT_JSON_INVALID",
      `${label} is not valid JSON.`,
    );
  }
}

function parseDiff(root, baseSha, headSha) {
  const raw = runGit(
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
    {
      encoding: "buffer",
    },
  );

  const tokens = raw
    .toString("utf8")
    .split("\0")
    .filter((item) => item.length > 0);

  const entries = [];

  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    const rawPath = tokens[index++];

    if (typeof rawPath !== "string") {
      fail(
        "AIOS_DELIVERY_DIFF_INVALID",
        "Git returned an incomplete name-status diff.",
      );
    }

    const filePath = assertRepoPath(rawPath);

    if (!["A", "M", "T"].includes(status)) {
      fail(
        "AIOS_DELIVERY_CHANGE_TYPE_UNSUPPORTED",
        `Change type ${status} for ${filePath} is not supported. Deleted, copied, and renamed files require a future impact-analyzer contract.`,
      );
    }

    entries.push({
      status,
      path: filePath,
    });

    if (entries.length > VERIFIED_DELIVERY_LIMITS.maxChangedFiles) {
      fail(
        "AIOS_DELIVERY_FILE_LIMIT",
        `The change set exceeds the C170.2/C170.5 limit of ${VERIFIED_DELIVERY_LIMITS.maxChangedFiles} files.`,
      );
    }
  }

  if (entries.length === 0) {
    fail(
      "AIOS_DELIVERY_NO_CHANGES",
      "The candidate commit contains no changed files relative to the base commit.",
    );
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  const uniquePaths = new Set(entries.map((item) => item.path));

  if (uniquePaths.size !== entries.length) {
    fail(
      "AIOS_DELIVERY_DIFF_DUPLICATE_PATH",
      "Git diff returned duplicate changed paths.",
    );
  }

  return entries;
}

function assertCandidateCheckout(root, headSha) {
  const checkedOutHead = runGit(
    root,
    ["rev-parse", "HEAD"],
  ).trim();

  if (checkedOutHead !== headSha) {
    fail(
      "AIOS_DELIVERY_CANDIDATE_NOT_HEAD",
      "The candidate commit must be the exact currently checked-out Git HEAD before C170.2 analysis.",
    );
  }
}

/**
 * C170.5.3:
 * The supplied base commit must be an ancestor of the candidate commit.
 *
 * git merge-base --is-ancestor:
 *   exit 0 = ancestor
 *   exit 1 = not an ancestor
 *   other failure = Git execution or repository error
 */
function assertBaseIsAncestor(root, baseSha, headSha) {
  try {
    execFileSync(
      "git",
      [
        "merge-base",
        "--is-ancestor",
        baseSha,
        headSha,
      ],
      {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
  } catch (error) {
    if (error?.status === 1) {
      fail(
        "AIOS_DELIVERY_BASE_NOT_ANCESTOR",
        "The base commit must be an ancestor of the candidate commit.",
      );
    }

    fail(
      "AIOS_DELIVERY_GIT_COMMAND_FAILED",
      "Git could not verify the base-to-candidate commit relationship.",
    );
  }
}

/**
 * C170.5.3:
 * Validate the exact Git Tree entry before reading its blob.
 *
 * Accepted:
 *   100644 = regular non-executable file
 *   100755 = regular executable file
 *
 * Rejected:
 *   120000 = symbolic link
 *   160000 = gitlink / submodule
 *   tree entries and all unsupported modes
 *
 * -z prevents pathname quoting.
 * :(literal) prevents Git pathspec wildcard interpretation.
 */
function assertSupportedGitTreeEntry(
  root,
  headSha,
  filePath,
) {
  const raw = runGit(
    root,
    [
      "ls-tree",
      "-z",
      headSha,
      "--",
      `:(literal)${filePath}`,
    ],
    {
      encoding: "buffer",
    },
  );

  const records = raw
    .toString("utf8")
    .split("\0")
    .filter((item) => item.length > 0);

  if (records.length !== 1) {
    fail(
      "AIOS_DELIVERY_TREE_ENTRY_INVALID",
      `Expected exactly one Git Tree entry for ${filePath}.`,
    );
  }

  const separator = records[0].indexOf("\t");

  if (separator < 0) {
    fail(
      "AIOS_DELIVERY_TREE_ENTRY_INVALID",
      `Git Tree entry is malformed for ${filePath}.`,
    );
  }

  const metadata = records[0].slice(0, separator);
  const actualPath = records[0].slice(separator + 1);
  const parts = metadata.split(" ");

  if (
    parts.length !== 3 ||
    actualPath !== filePath
  ) {
    fail(
      "AIOS_DELIVERY_TREE_ENTRY_INVALID",
      `Git Tree entry does not uniquely match ${filePath}.`,
    );
  }

  const [mode, type] = parts;

  if (
    type !== "blob" ||
    !["100644", "100755"].includes(mode)
  ) {
    fail(
      "AIOS_DELIVERY_FILE_MODE_UNSUPPORTED",
      `Unsupported Git Tree entry for ${filePath}; only regular files with mode 100644 or 100755 are supported.`,
    );
  }

  return mode;
}

function readCommitFile(root, headSha, filePath) {
  const blob = runGit(
    root,
    [
      "cat-file",
      "blob",
      `${headSha}:${filePath}`,
    ],
    {
      encoding: "buffer",
      maxBuffer: VERIFIED_DELIVERY_LIMITS.maxFileBytes + 1,
    },
  );

  if (blob.byteLength > VERIFIED_DELIVERY_LIMITS.maxFileBytes) {
    fail(
      "AIOS_DELIVERY_FILE_TOO_LARGE",
      `Changed file exceeds the ${VERIFIED_DELIVERY_LIMITS.maxFileBytes}-byte limit: ${filePath}`,
    );
  }

  const content = blob.toString("utf8");

  if (!Buffer.from(content, "utf8").equals(blob)) {
    fail(
      "AIOS_DELIVERY_BINARY_FILE_UNSUPPORTED",
      `Changed file is not valid UTF-8 text: ${filePath}`,
    );
  }

  return {
    blob,
    content,
  };
}

function validateImpactReport(report, headSha, changedPaths) {
  if (
    !report ||
    typeof report !== "object" ||
    Array.isArray(report) ||
    report.schemaVersion !== 1 ||
    report.analyzer !== "C170.2" ||
    report.repository?.head !== headSha ||
    report.readOnly !== true ||
    report.requiresFounderReview !== true ||
    !Array.isArray(report.changedFiles) ||
    !report.risk ||
    typeof report.risk.level !== "string"
  ) {
    fail(
      "AIOS_DELIVERY_IMPACT_INVALID",
      "The real C170.2 analyzer did not return a valid report for the exact candidate commit.",
    );
  }

  const reported = [...report.changedFiles].sort();
  const actual = [...changedPaths].sort();

  if (JSON.stringify(reported) !== JSON.stringify(actual)) {
    fail(
      "AIOS_DELIVERY_IMPACT_CHANGESET_MISMATCH",
      "C170.2 changedFiles must exactly match the Git base-to-candidate diff.",
    );
  }

  if (report.changedFileCount !== actual.length) {
    fail(
      "AIOS_DELIVERY_IMPACT_COUNT_MISMATCH",
      "C170.2 changedFileCount does not match the Git diff.",
    );
  }
}

function assertOutputOutsideRepository(root, outputPath) {
  const resolved = path.resolve(outputPath);

  let realRoot;
  let realParent;

  try {
    realRoot = fs.realpathSync(root);
    realParent = fs.realpathSync(path.dirname(resolved));
  } catch {
    fail(
      "AIOS_DELIVERY_OUTPUT_PARENT_INVALID",
      "The output parent directory must already exist.",
    );
  }

  const canonicalOutput = path.join(
    realParent,
    path.basename(resolved),
  );

  const relative = path.relative(
    realRoot,
    canonicalOutput,
  );

  if (
    relative === "" ||
    (
      !relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative)
    )
  ) {
    fail(
      "AIOS_DELIVERY_OUTPUT_INSIDE_REPOSITORY",
      "Delivery output must be written outside the source repository.",
    );
  }

  if (fs.existsSync(canonicalOutput)) {
    fail(
      "AIOS_DELIVERY_OUTPUT_EXISTS",
      "Delivery output already exists; choose a new path to avoid overwriting evidence.",
    );
  }

  return canonicalOutput;
}

function createRealImpactReport(root, headSha, changedPaths, suppliedReport) {
  let report;

  try {
    report = analyzeDependencyImpact(
      root,
      changedPaths,
    );
  } catch (error) {
    const code =
      typeof error?.code === "string"
        ? error.code
        : "AIOS_DELIVERY_IMPACT_ANALYSIS_FAILED";

    fail(
      "AIOS_DELIVERY_IMPACT_ANALYSIS_FAILED",
      `The real C170.2 analyzer rejected the candidate (${code}). Commit and clean the candidate checkout, then retry.`,
    );
  }

  validateImpactReport(
    report,
    headSha,
    changedPaths,
  );

  if (
    suppliedReport !== undefined &&
    !isDeepStrictEqual(suppliedReport, report)
  ) {
    fail(
      "AIOS_DELIVERY_EXTERNAL_IMPACT_MISMATCH",
      "The optional external impact report differs from the report independently recomputed by the real C170.2 analyzer.",
    );
  }

  return report;
}

export function buildVerifiedDelivery(options = {}) {
  const requestedRoot = path.resolve(
    options.root || process.cwd(),
  );

  const root = path.resolve(
    runGit(
      requestedRoot,
      ["rev-parse", "--show-toplevel"],
    ).trim(),
  );

  const baseSha = resolveCommit(
    root,
    options.baseSha,
    "baseSha",
  );

  const headSha = resolveCommit(
    root,
    options.headSha ||
      runGit(root, ["rev-parse", "HEAD"]).trim(),
    "headSha",
  );

  if (baseSha === headSha) {
    fail(
      "AIOS_DELIVERY_IDENTICAL_COMMITS",
      "Base and candidate commits must be different.",
    );
  }

  assertCandidateCheckout(root, headSha);

  assertBaseIsAncestor(
    root,
    baseSha,
    headSha,
  );

  const changes = parseDiff(
    root,
    baseSha,
    headSha,
  );

  const changedPaths = changes.map(
    (item) => item.path,
  );

  /**
   * Validate every candidate Git Tree entry before:
   * - C170.2 impact analysis
   * - C170.4 receipt processing
   * - Blob retrieval
   * - Artifact construction
   */
  for (const change of changes) {
    assertSupportedGitTreeEntry(
      root,
      headSha,
      change.path,
    );
  }

  const impactReport = createRealImpactReport(
    root,
    headSha,
    changedPaths,
    options.impactReport,
  );

  const receipt = options.receipt;

  const receiptResult = verifyVerificationReceipt(
    receipt,
    headSha,
  );

  if (!receiptResult.valid || !receiptResult.passed) {
    fail(
      "AIOS_DELIVERY_VERIFICATION_FAILED",
      `C170.4 verification receipt is invalid or not fully passing (${receiptResult.code}).`,
    );
  }

  let totalBytes = 0;

  const files = changes.map((change) => {
    const { blob, content } = readCommitFile(
      root,
      headSha,
      change.path,
    );

    totalBytes += blob.byteLength;

    if (totalBytes > VERIFIED_DELIVERY_LIMITS.maxTotalBytes) {
      fail(
        "AIOS_DELIVERY_TOTAL_SIZE_LIMIT",
        `Delivery exceeds the ${VERIFIED_DELIVERY_LIMITS.maxTotalBytes}-byte total limit.`,
      );
    }

    return {
      path: change.path,
      status: change.status,
      bytes: blob.byteLength,
      sha256: sha256(blob),
      content,
    };
  });

  const payload = {
    schemaVersion: VERIFIED_DELIVERY_SCHEMA_VERSION,
    builder: VERIFIED_DELIVERY_BUILDER_VERSION,

    createdAt: (
      options.now
        ? options.now()
        : new Date()
    ).toISOString(),

    repository: {
      baseCommitSha: baseSha,
      candidateCommitSha: headSha,
    },

    changeSummary: {
      fileCount: files.length,

      added: files.filter(
        (item) => item.status === "A",
      ).length,

      modified: files.filter(
        (item) => item.status === "M",
      ).length,

      typeChanged: files.filter(
        (item) => item.status === "T",
      ).length,

      totalBytes,
      risk: impactReport.risk,
    },

    files,

    verification: {
      verifier: receipt.verifier,
      status: receipt.status,
      runId: receipt.runId,
      commitSha: receipt.repository.commitSha,
      completedChecks: receiptResult.completedChecks,
      expectedChecks: receiptResult.expectedChecks,
      receiptSha256: receipt.receiptSha256,
      receipt,
      attestation: receipt.attestation,
      signed: false,
    },

    impact: {
      analyzer: impactReport.analyzer,
      changedFiles: [
        ...impactReport.changedFiles,
      ],
      affectedFileCount:
        impactReport.affectedFileCount,
      affectedFiles:
        impactReport.affectedFiles,
      likelyTests:
        impactReport.likelyTests,
      limitations:
        impactReport.limitations,
    },

    rollback: {
      baseCommitSha: baseSha,
      candidateCommitSha: headSha,

      guidance:
        "Do not reset or force-push main. After a reviewed merge, use a new revert pull request against the exact merged commit. For a merge commit, select the correct mainline parent in GitHub's revert workflow and verify the resulting production commit SHA.",

      automaticRollback: false,
    },

    founderApproval: {
      required: true,
      approved: false,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
    },

    limitations: [
      "File contents are read from the immutable candidate Git commit, not the working tree.",
      "The candidate commit must equal the currently checked-out HEAD.",
      "The base commit must be an ancestor of the candidate commit.",
      "Only Git Tree regular-file modes 100644 and 100755 are supported; symbolic links, submodules, and other modes are rejected.",
      "The real C170.2 analyzer is invoked during artifact generation; its current-worktree validation requires tracked files to be clean.",
      "Only added, modified, and type-changed UTF-8 text files are supported; deletions and renames are rejected because C170.2 does not model them yet.",
      "The maximum changed-file count is 100, matching the C170.2 analyzer limit.",
      "C170.4 receipt checksum is not a digital signature and does not authenticate the CI runner or receipt author.",
      "C170.2 dependency analysis is static and heuristic; it cannot prove complete runtime impact or test coverage.",
      "The C170.3 Secret Guard is heuristic and may produce false positives or false negatives.",
      "This artifact does not create branches, commits, pull requests, merges, deployments, or production mutations.",
    ],
  };

  assertNoSecretsBeforeProviderDispatch(payload);

  const serialized =
    `${JSON.stringify(payload, null, 2)}\n`;

  const artifact = {
    payload,
    serialized,
    artifactSha256: sha256(serialized),
  };

  return artifact;
}

export function writeVerifiedDelivery(
  artifact,
  outputPath,
  root = process.cwd(),
) {
  if (
    !artifact ||
    typeof artifact.serialized !== "string" ||
    !FILE_SHA_PATTERN.test(artifact.artifactSha256 || "") ||
    sha256(artifact.serialized) !== artifact.artifactSha256
  ) {
    fail(
      "AIOS_DELIVERY_ARTIFACT_INVALID",
      "A valid C170.5 delivery artifact is required.",
    );
  }

  const resolvedOutput = assertOutputOutsideRepository(
    path.resolve(root),
    outputPath,
  );

  fs.writeFileSync(
    resolvedOutput,
    artifact.serialized,
    {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    },
  );

  return {
    path: resolvedOutput,
    bytes: Buffer.byteLength(
      artifact.serialized,
      "utf8",
    ),
    sha256: sha256(artifact.serialized),
  };
}

function parseArgs(argv) {
  const values = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (
      ![
        "--base",
        "--receipt",
        "--impact",
        "--output",
      ].includes(key) ||
      !value ||
      value.startsWith("--")
    ) {
      fail(
        "AIOS_DELIVERY_USAGE",
        "Usage: node scripts/aios-verified-delivery-builder.mjs --base <base-commit-sha> --receipt <c170.4-receipt.json> [--impact <expected-c170.2-impact.json>] --output <delivery-artifact-outside-repository.json>",
      );
    }

    const field = {
      "--base": "baseSha",
      "--receipt": "receiptPath",
      "--impact": "impactPath",
      "--output": "outputPath",
    }[key];

    if (values[field]) {
      fail(
        "AIOS_DELIVERY_USAGE",
        `Duplicate argument: ${key}`,
      );
    }

    values[field] = value;
    index += 1;
  }

  for (const field of [
    "baseSha",
    "receiptPath",
    "outputPath",
  ]) {
    if (!values[field]) {
      fail(
        "AIOS_DELIVERY_USAGE",
        "The base, receipt, and output arguments are required.",
      );
    }
  }

  return values;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();

  const receipt = readJsonFile(
    path.resolve(args.receiptPath),
    "C170.4 verification receipt",
  );

  const impactReport = args.impactPath
    ? readJsonFile(
        path.resolve(args.impactPath),
        "Expected C170.2 impact report",
      )
    : undefined;

  const artifact = buildVerifiedDelivery({
    root,
    baseSha: args.baseSha,
    receipt,
    impactReport,
  });

  const written = writeVerifiedDelivery(
    artifact,
    args.outputPath,
    root,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "DELIVERY_ARTIFACT_READY",
        builder: VERIFIED_DELIVERY_BUILDER_VERSION,
        repository: artifact.payload.repository,
        fileCount: artifact.payload.changeSummary.fileCount,
        verification: artifact.payload.verification,
        impact: {
          analyzer: artifact.payload.impact.analyzer,
          changedFileCount:
            artifact.payload.impact.changedFiles.length,
          affectedFileCount:
            artifact.payload.impact.affectedFileCount,
          risk: artifact.payload.changeSummary.risk,
        },
        artifact: written,
        requiresFounderReview: true,
        mergeAuthorized: false,
        productionDeploymentAuthorized: false,
      },
      null,
      2,
    )}\n`,
  );
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";

if (
  invokedPath &&
  pathToFileURL(invokedPath).href ===
    pathToFileURL(SCRIPT_FILE).href
) {
  try {
    main();
  } catch (error) {
    const code =
      typeof error?.code === "string"
        ? error.code
        : "AIOS_DELIVERY_FAILED";

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    process.stderr.write(
      `${code}: ${message}\n`,
    );

    process.exitCode = 1;
  }
}
