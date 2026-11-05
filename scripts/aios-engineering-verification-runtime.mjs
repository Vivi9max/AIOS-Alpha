#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VERIFICATION_RUNTIME_VERSION = "C170.4";
export const VERIFICATION_RECEIPT_SCHEMA_VERSION = 1;

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Fixed, repository-owned verification plan.
 * Provider output, task input, and environment variables cannot add commands.
 */
export const VERIFICATION_PLAN = Object.freeze([
  Object.freeze({
    id: "c170-1-repository-intelligence",
    command: "node",
    args: Object.freeze(["--test", "scripts/aios-engineering-context.test.mjs"]),
  }),
  Object.freeze({
    id: "c170-2-dependency-impact",
    command: "node",
    args: Object.freeze(["--test", "scripts/aios-dependency-impact.test.mjs"]),
  }),
  Object.freeze({
    id: "c170-3-secret-guard",
    command: "node",
    args: Object.freeze(["--test", "scripts/aios-engineering-secret-guard.test.mjs"]),
  }),
  Object.freeze({
    id: "c170-3-provider-security",
    command: "node",
    args: Object.freeze(["--test", "scripts/aios-engineering-provider-security.test.mjs"]),
  }),
  Object.freeze({
    id: "c170-3-provider-adapter",
    command: "node",
    args: Object.freeze(["--test", "scripts/aios-engineering-provider-adapter.test.mjs"]),
  }),
  Object.freeze({
    id: "c169-8-d2-1-control-plane",
    command: "node",
    args: Object.freeze(["scripts/verify-autonomous-development-control-plane.mjs"]),
  }),
  Object.freeze({
    id: "project-continuity",
    command: "npm",
    args: Object.freeze(["run", "verify"]),
  }),
  Object.freeze({
    id: "typescript-typecheck",
    command: "npm",
    args: Object.freeze(["run", "typecheck"]),
  }),
  Object.freeze({
    id: "production-build",
    command: "npm",
    args: Object.freeze(["run", "build"]),
  }),
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toText(value) {
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return typeof value === "string" ? value : "";
}

function getRepositoryState(root) {
  let head;
  let branch;

  try {
    head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    branch = execFileSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    fail(
      "AIOS_VERIFICATION_GIT_UNAVAILABLE",
      "Unable to read repository HEAD and branch.",
    );
  }

  if (!COMMIT_PATTERN.test(head)) {
    fail(
      "AIOS_VERIFICATION_COMMIT_INVALID",
      "Repository HEAD is not a full 40-character commit SHA.",
    );
  }

  if (!branch) {
    branch =
      process.env.GITHUB_HEAD_REF ||
      process.env.GITHUB_REF_NAME ||
      "DETACHED";
  }

  return { head, branch };
}

function safeEnvironment() {
  const allowed = [
    "PATH",
    "HOME",
    "CI",
    "NODE_ENV",
    "TMPDIR",
    "TEMP",
    "TMP",
    "SYSTEMROOT",
    "WINDIR",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "npm_config_cache",
    "GITHUB_ACTIONS",
    "GITHUB_WORKSPACE",
    "GITHUB_REF",
    "GITHUB_REF_NAME",
    "GITHUB_HEAD_REF",
    "GITHUB_SHA",
    "GITHUB_RUN_ID",
    "GITHUB_RUN_ATTEMPT",
  ];

  const environment = {};

  for (const key of allowed) {
    if (typeof process.env[key] === "string") {
      environment[key] = process.env[key];
    }
  }

  return environment;
}

function runCommand(command, args, options) {
  const started = Date.now();

  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: safeEnvironment(),
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    exitCode: Number.isInteger(result.status) ? result.status : null,
    signal: result.signal || null,
    stdout: toText(result.stdout),
    stderr: toText(result.stderr),
    errorCode: result.error?.code || null,
    durationMs: Math.max(0, Date.now() - started),
  };
}

function canonicalReceiptPayload(receipt) {
  const { receiptSha256, ...payload } = receipt;
  return JSON.stringify(payload);
}

function finalizeReceipt(payload) {
  return {
    ...payload,
    receiptSha256: sha256(JSON.stringify(payload)),
  };
}

/**
 * Runs only the fixed verification plan above.
 * Injectable dependencies exist for deterministic tests.
 * Production CLI callers cannot supply them.
 */
export function runIndependentVerification(options = {}) {
  const root = path.resolve(options.root || process.cwd());

  const readRepositoryState =
    options.getRepositoryState || getRepositoryState;

  const execute = options.runCommand || runCommand;
  const now = options.now || (() => new Date());
  const makeId = options.idFactory || (() => crypto.randomUUID());

  const repository = readRepositoryState(root);

  if (!repository || !COMMIT_PATTERN.test(repository.head || "")) {
    fail(
      "AIOS_VERIFICATION_COMMIT_INVALID",
      "A valid full repository commit SHA is required.",
    );
  }

  if (
    typeof repository.branch !== "string" ||
    repository.branch.length === 0
  ) {
    fail(
      "AIOS_VERIFICATION_BRANCH_INVALID",
      "A repository branch identifier is required.",
    );
  }

  const startedAt = now().toISOString();
  const checks = [];
  let failed = false;

  for (const step of VERIFICATION_PLAN) {
    if (failed) break;

    let result;

    try {
      result = execute(step.command, [...step.args], {
        cwd: root,
      });
    } catch (error) {
      result = {
        exitCode: null,
        signal: null,
        stdout: "",
        stderr: "",
        errorCode:
          typeof error?.code === "string"
            ? error.code
            : "COMMAND_RUNNER_ERROR",
        durationMs: 0,
      };
    }

    const stdout = toText(result?.stdout);
    const stderr = toText(result?.stderr);

    const exitCode = Number.isInteger(result?.exitCode)
      ? result.exitCode
      : null;

    const passed =
      exitCode === 0 &&
      !result?.signal &&
      !result?.errorCode;

    const outputBytes =
      Buffer.byteLength(stdout, "utf8") +
      Buffer.byteLength(stderr, "utf8");

    checks.push({
      id: step.id,
      command: step.command,
      args: [...step.args],
      status: passed ? "passed" : "failed",
      exitCode,
      signal: result?.signal || null,
      errorCode: result?.errorCode || null,
      durationMs:
        Number.isFinite(result?.durationMs) &&
        result.durationMs >= 0
          ? Math.floor(result.durationMs)
          : 0,
      stdoutSha256: sha256(stdout),
      stderrSha256: sha256(stderr),
      outputBytes,
    });

    if (!passed) failed = true;
  }

  const completedAt = now().toISOString();

  const payload = {
    schemaVersion: VERIFICATION_RECEIPT_SCHEMA_VERSION,
    verifier: VERIFICATION_RUNTIME_VERSION,
    runId: makeId(),

    repository: {
      commitSha: repository.head,
      branch: repository.branch,
    },

    profile: "full",
    status: failed ? "failed" : "passed",

    startedAt,
    completedAt,

    checks,
    executedCheckCount: checks.length,
    expectedCheckCount: VERIFICATION_PLAN.length,

    repositorySourceReadOnly: true,
    requiresFounderReview: true,

    attestation: "local-process-observation-not-signed",

    limitations: [
      "The receipt records local process exit states and output hashes; it is not a signed CI attestation.",
      "A receipt checksum detects accidental or unsophisticated edits but does not prove who created it.",
      "Static analysis, tests, and builds cannot prove the absence of every runtime defect.",
      "A passing verification does not authorize repository writes, merges, or production deployment.",
    ],
  };

  return finalizeReceipt(payload);
}

/**
 * Validates receipt structure, fixed-plan identity, output digests,
 * checksum, and optional expected commit SHA.
 *
 * It does not authenticate the receipt signer.
 */
export function verifyVerificationReceipt(
  receipt,
  expectedCommitSha = undefined,
) {
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt)
  ) {
    return {
      valid: false,
      passed: false,
      code: "AIOS_RECEIPT_INVALID",
    };
  }

  if (
    receipt.schemaVersion !== VERIFICATION_RECEIPT_SCHEMA_VERSION ||
    receipt.verifier !== VERIFICATION_RUNTIME_VERSION ||
    receipt.profile !== "full" ||
    !receipt.repository ||
    !COMMIT_PATTERN.test(receipt.repository.commitSha || "") ||
    typeof receipt.repository.branch !== "string" ||
    !receipt.repository.branch ||
    !Array.isArray(receipt.checks) ||
    receipt.checks.length < 1 ||
    receipt.checks.length > VERIFICATION_PLAN.length ||
    receipt.checks.length !== receipt.executedCheckCount ||
    receipt.expectedCheckCount !== VERIFICATION_PLAN.length ||
    receipt.attestation !== "local-process-observation-not-signed" ||
    receipt.requiresFounderReview !== true ||
    receipt.repositorySourceReadOnly !== true ||
    !Array.isArray(receipt.limitations) ||
    Number.isNaN(Date.parse(receipt.startedAt)) ||
    Number.isNaN(Date.parse(receipt.completedAt)) ||
    !SHA256_PATTERN.test(receipt.receiptSha256 || "")
  ) {
    return {
      valid: false,
      passed: false,
      code: "AIOS_RECEIPT_SCHEMA_INVALID",
    };
  }

  if (
    expectedCommitSha !== undefined &&
    receipt.repository.commitSha !== expectedCommitSha
  ) {
    return {
      valid: false,
      passed: false,
      code: "AIOS_RECEIPT_COMMIT_MISMATCH",
    };
  }

  for (let index = 0; index < receipt.checks.length; index += 1) {
    const check = receipt.checks[index];
    const expected = VERIFICATION_PLAN[index];

    if (
      !check ||
      check.id !== expected.id ||
      check.command !== expected.command ||
      JSON.stringify(check.args) !== JSON.stringify(expected.args) ||
      !["passed", "failed"].includes(check.status) ||
      (!Number.isInteger(check.exitCode) && check.exitCode !== null) ||
      !Number.isInteger(check.durationMs) ||
      check.durationMs < 0 ||
      !SHA256_PATTERN.test(check.stdoutSha256 || "") ||
      !SHA256_PATTERN.test(check.stderrSha256 || "") ||
      !Number.isInteger(check.outputBytes) ||
      check.outputBytes < 0
    ) {
      return {
        valid: false,
        passed: false,
        code: "AIOS_RECEIPT_CHECK_INVALID",
      };
    }
  }

  if (
    sha256(canonicalReceiptPayload(receipt)) !==
    receipt.receiptSha256
  ) {
    return {
      valid: false,
      passed: false,
      code: "AIOS_RECEIPT_CHECKSUM_MISMATCH",
    };
  }

  const allChecksPassed =
    receipt.checks.length === VERIFICATION_PLAN.length &&
    receipt.checks.every(
      (check) =>
        check.status === "passed" &&
        check.exitCode === 0,
    );

  const statusMatches =
    receipt.status === (allChecksPassed ? "passed" : "failed");

  if (!statusMatches) {
    return {
      valid: false,
      passed: false,
      code: "AIOS_RECEIPT_STATUS_MISMATCH",
    };
  }

  return {
    valid: true,
    passed: allChecksPassed,
    code: allChecksPassed
      ? "AIOS_VERIFICATION_PASSED"
      : "AIOS_VERIFICATION_FAILED",
    commitSha: receipt.repository.commitSha,
    completedChecks: receipt.checks.length,
    expectedChecks: VERIFICATION_PLAN.length,
    requiresFounderReview: true,
    attestation: receipt.attestation,
  };
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--help") {
    return { command: "help" };
  }

  if (argv.length === 1 && argv[0] === "verify") {
    return { command: "verify" };
  }

  fail(
    "AIOS_VERIFICATION_USAGE",
    [
      "Usage:",
      "  node scripts/aios-engineering-verification-runtime.mjs verify",
      "  node scripts/aios-engineering-verification-runtime.mjs --help",
    ].join("\n"),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "help") {
    process.stdout.write(
      "C170.4 Independent Verification Runtime\n" +
      "Runs a fixed, repository-owned verification plan.\n" +
      "No provider-supplied commands are accepted.\n",
    );
    return;
  }

  const receipt = runIndependentVerification();

  process.stdout.write(
    `${JSON.stringify(receipt, null, 2)}\n`,
  );

  const result = verifyVerificationReceipt(receipt);

  if (!result.valid || !result.passed) {
    process.exitCode = 1;
  }
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
        : "AIOS_VERIFICATION_FAILED";

    process.stderr.write(
      `${code}: ${error?.message || "Verification failed."}\n`,
    );

    process.exitCode = 1;
  }
}
