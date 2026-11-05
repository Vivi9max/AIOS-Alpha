#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  verifyVerifiedDeliveryArtifact,
} from "./aios-verified-delivery-artifact-verifier.mjs";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const FILE_SHA_PATTERN = /^[a-f0-9]{64}$/;

export const VERIFIED_DELIVERY_CONSUMER_VERSION = "C170.5.5";

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

function readJson(filePath, label) {
  let source;

  try {
    source = fs.readFileSync(filePath);
  } catch {
    fail(
      "AIOS_HANDOFF_INPUT_UNREADABLE",
      `${label} could not be read.`,
    );
  }

  try {
    return JSON.parse(source.toString("utf8"));
  } catch {
    fail(
      "AIOS_HANDOFF_JSON_INVALID",
      `${label} is not valid JSON.`,
    );
  }
}

function assertOutsideRepository(root, targetPath, label) {
  const resolved = path.resolve(targetPath);

  let realRoot;
  let realParent;

  try {
    realRoot = fs.realpathSync(root);
    realParent = fs.realpathSync(path.dirname(resolved));
  } catch {
    fail(
      "AIOS_HANDOFF_PATH_INVALID",
      `${label} parent directory must already exist.`,
    );
  }

  const canonicalTarget = path.join(
    realParent,
    path.basename(resolved),
  );

  const relative = path.relative(
    realRoot,
    canonicalTarget,
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
      "AIOS_HANDOFF_PRODUCTION_PATH_REJECTED",
      `${label} must remain outside the source repository.`,
    );
  }

  return canonicalTarget;
}

function parseManifest(manifestPath) {
  let source;

  try {
    source = fs.readFileSync(manifestPath, "utf8");
  } catch {
    fail(
      "AIOS_HANDOFF_MANIFEST_UNREADABLE",
      "SHA-256 manifest could not be read.",
    );
  }

  const entries = new Map();

  for (const line of source.split(/\r?\n/)) {
    if (!line) {
      continue;
    }

    const match = line.match(
      /^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/,
    );

    if (!match) {
      fail(
        "AIOS_HANDOFF_MANIFEST_INVALID",
        "SHA-256 manifest contains an invalid entry.",
      );
    }

    const [, digest, filename] = match;

    if (entries.has(filename)) {
      fail(
        "AIOS_HANDOFF_MANIFEST_DUPLICATE",
        `Duplicate manifest entry: ${filename}`,
      );
    }

    entries.set(filename, digest);
  }

  if (
    entries.size !== REQUIRED_MANIFEST_FILES.length ||
    REQUIRED_MANIFEST_FILES.some(
      (filename) => !entries.has(filename),
    )
  ) {
    fail(
      "AIOS_HANDOFF_MANIFEST_INCOMPLETE",
      "Manifest must contain exactly the three required delivery files.",
    );
  }

  const manifestDirectory = path.dirname(manifestPath);

  for (const filename of REQUIRED_MANIFEST_FILES) {
    const filePath = path.join(
      manifestDirectory,
      filename,
    );

    let content;

    try {
      content = fs.readFileSync(filePath);
    } catch {
      fail(
        "AIOS_HANDOFF_MANIFEST_FILE_MISSING",
        `Manifest file is missing: ${filename}`,
      );
    }

    if (sha256(content) !== entries.get(filename)) {
      fail(
        "AIOS_HANDOFF_MANIFEST_HASH_MISMATCH",
        `SHA-256 verification failed: ${filename}`,
      );
    }
  }

  return {
    entries,
    manifestSha256: sha256(Buffer.from(source, "utf8")),
  };
}

function assertRepositoryBinding(
  builderSummary,
  verification,
  baseSha,
  headSha,
  artifactVerification,
) {
  if (
    builderSummary.status !== "DELIVERY_ARTIFACT_READY" ||
    builderSummary.repository?.baseCommitSha !== baseSha ||
    builderSummary.repository?.candidateCommitSha !== headSha ||
    builderSummary.mergeAuthorized !== false ||
    builderSummary.productionDeploymentAuthorized !== false
  ) {
    fail(
      "AIOS_HANDOFF_BUILDER_BINDING_FAILED",
      "Builder summary does not match the requested commits or approval boundary.",
    );
  }

  if (
    verification.status !== "VERIFIED" ||
    verification.baseCommitSha !== baseSha ||
    verification.candidateCommitSha !== headSha ||
    verification.artifactSha256 !== artifactVerification.artifactSha256 ||
    verification.mergeAuthorized !== false ||
    verification.productionDeploymentAuthorized !== false
  ) {
    fail(
      "AIOS_HANDOFF_VERIFIER_BINDING_FAILED",
      "Independent verifier result does not match the verified artifact.",
    );
  }
}

function assertSafeRelativePath(value) {
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
      "AIOS_HANDOFF_FILE_PATH_INVALID",
      "Candidate artifact contains an unsafe relative file path.",
    );
  }

  return value;
}

function writeExclusive(filePath, content) {
  fs.writeFileSync(
    filePath,
    content,
    {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    },
  );
}

function writeAudit(auditPath, record) {
  writeExclusive(
    auditPath,
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

function createAuditRecord(input) {
  return {
    schemaVersion: 1,
    consumer: VERIFIED_DELIVERY_CONSUMER_VERSION,
    recordedAt: new Date().toISOString(),
    status: input.status,
    code: input.code || null,
    repository: {
      baseCommitSha: input.baseSha || null,
      candidateCommitSha: input.headSha || null,
    },
    artifactSha256: input.artifactSha256 || null,
    manifestSha256: input.manifestSha256 || null,
    stagedFileCount: input.stagedFileCount || 0,
    productionFilesModified: false,
    founderApprovalRequired: true,
    founderApproved: false,
    mergeAuthorized: false,
    productionDeploymentAuthorized: false,
  };
}

function stageCandidateFiles(
  payload,
  stagingPath,
) {
  fs.mkdirSync(stagingPath, {
    recursive: false,
    mode: 0o700,
  });

  const stagedFiles = [];

  for (const file of payload.files) {
    const relativePath = assertSafeRelativePath(file.path);
    const targetPath = path.join(
      stagingPath,
      ...relativePath.split("/"),
    );

    const parentPath = path.dirname(targetPath);

    fs.mkdirSync(parentPath, {
      recursive: true,
      mode: 0o700,
    });

    const content = Buffer.from(file.content, "utf8");

    if (
      content.byteLength !== file.bytes ||
      sha256(content) !== file.sha256
    ) {
      fail(
        "AIOS_HANDOFF_STAGED_CONTENT_MISMATCH",
        `Candidate file changed before staging: ${relativePath}`,
      );
    }

    writeExclusive(
      targetPath,
      content,
    );

    stagedFiles.push({
      path: relativePath,
      status: file.status,
      bytes: content.byteLength,
      sha256: sha256(content),
    });
  }

  return stagedFiles;
}

export function consumeVerifiedDelivery(options = {}) {
  const root = path.resolve(options.root || process.cwd());

  const baseSha = options.baseSha;
  const headSha = options.headSha;

  if (
    !SHA_PATTERN.test(baseSha || "") ||
    !SHA_PATTERN.test(headSha || "") ||
    baseSha === headSha
  ) {
    fail(
      "AIOS_HANDOFF_COMMIT_INVALID",
      "Full Base Commit and Candidate Commit SHAs are required.",
    );
  }

  const artifactPath = path.resolve(options.artifactPath || "");
  const manifestPath = path.resolve(options.manifestPath || "");
  const builderSummaryPath = path.resolve(
    options.builderSummaryPath || "",
  );
  const verificationPath = path.resolve(
    options.verificationPath || "",
  );

  const stagingPath = path.resolve(options.stagingPath || "");
  const auditPath = path.resolve(options.auditPath || "");

  if (
    !options.artifactPath ||
    !options.manifestPath ||
    !options.builderSummaryPath ||
    !options.verificationPath ||
    !options.stagingPath ||
    !options.auditPath
  ) {
    fail(
      "AIOS_HANDOFF_USAGE",
      "Artifact, manifest, builder summary, verification, staging and audit paths are required.",
    );
  }

  const safeArtifactPath = assertOutsideRepository(
    root,
    artifactPath,
    "Artifact",
  );

  const safeManifestPath = assertOutsideRepository(
    root,
    manifestPath,
    "Manifest",
  );

  const safeSummaryPath = assertOutsideRepository(
    root,
    builderSummaryPath,
    "Builder summary",
  );

  const safeVerificationPath = assertOutsideRepository(
    root,
    verificationPath,
    "Verification report",
  );

  const safeStagingPath = assertOutsideRepository(
    root,
    stagingPath,
    "Staging directory",
  );

  const safeAuditPath = assertOutsideRepository(
    root,
    auditPath,
    "Audit record",
  );

  let auditWritten = false;

  try {
    if (
      fs.existsSync(safeStagingPath) ||
      fs.existsSync(safeAuditPath)
    ) {
      fail(
        "AIOS_HANDOFF_OVERWRITE_REJECTED",
        "Existing staging or audit paths cannot be overwritten.",
      );
    }

    let checkedOutHead;

    try {
      checkedOutHead = execFileSync(
        "git",
        ["rev-parse", "HEAD"],
        {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        },
      ).trim();
    } catch {
      fail(
        "AIOS_DELIVERY_VERIFY_GIT_FAILED",
        "Unable to read the checked-out Candidate Commit.",
      );
    }

    if (checkedOutHead !== headSha) {
      fail(
        "AIOS_DELIVERY_VERIFY_COMMIT_INVALID",
        "The checked-out HEAD does not equal the supplied Candidate Commit.",
      );
    }

    const manifest = parseManifest(safeManifestPath);

    const artifactVerification = verifyVerifiedDeliveryArtifact({
      root,
      artifactPath: safeArtifactPath,
      baseSha,
      headSha,
    });

    if (
      artifactVerification.status !== "VERIFIED" ||
      artifactVerification.candidateCommitSha !== headSha ||
      artifactVerification.baseCommitSha !== baseSha ||
      artifactVerification.mergeAuthorized !== false ||
      artifactVerification.productionDeploymentAuthorized !== false
    ) {
      fail(
        "AIOS_HANDOFF_INDEPENDENT_VERIFICATION_FAILED",
        "C170.5.4 independent verification did not pass.",
      );
    }

    const builderSummary = readJson(
      safeSummaryPath,
      "Builder summary",
    );

    const verification = readJson(
      safeVerificationPath,
      "Independent verification report",
    );

    assertRepositoryBinding(
      builderSummary,
      verification,
      baseSha,
      headSha,
      artifactVerification,
    );

    const payload = readJson(
      safeArtifactPath,
      "Delivery artifact",
    );

    if (
      payload.repository?.baseCommitSha !== baseSha ||
      payload.repository?.candidateCommitSha !== headSha ||
      payload.founderApproval?.required !== true ||
      payload.founderApproval?.approved !== false ||
      payload.founderApproval?.mergeAuthorized !== false ||
      payload.founderApproval?.productionDeploymentAuthorized !== false
    ) {
      fail(
        "AIOS_HANDOFF_APPROVAL_BOUNDARY_FAILED",
        "Artifact does not preserve the Founder approval boundary.",
      );
    }

    const stagedFiles = stageCandidateFiles(
      payload,
      safeStagingPath,
    );

    const handoff = {
      schemaVersion: 1,
      handoffVersion: VERIFIED_DELIVERY_CONSUMER_VERSION,
      status: "STAGED_FOR_FOUNDER_REVIEW",
      createdAt: new Date().toISOString(),

      repository: {
        baseCommitSha: baseSha,
        candidateCommitSha: headSha,
      },

      verification: {
        status: "VERIFIED",
        verifier: artifactVerification.verifier,
        artifactSha256: artifactVerification.artifactSha256,
        manifestSha256: manifest.manifestSha256,
        verifiedFileCount: artifactVerification.verifiedFileCount,
      },

      stagedFiles,

      founderApproval: {
        required: true,
        approved: false,
        mergeAuthorized: false,
        productionDeploymentAuthorized: false,
      },

      productionMutation: {
        allowed: false,
        performed: false,
      },

      audit: {
        path: safeAuditPath,
        appendOnly: true,
      },

      rollback: {
        automaticRollback: false,
        preMergeAction:
          "Discard the isolated candidate staging directory. Do not modify main or production files.",
        postMergeAction:
          "If a reviewed merge is later approved, create a new revert pull request against the exact merged commit. Verify the resulting production commit SHA.",
      },
    };

    const rollbackEvidence = {
      schemaVersion: 1,
      evidenceVersion: VERIFIED_DELIVERY_CONSUMER_VERSION,
      createdAt: new Date().toISOString(),

      baseCommitSha: baseSha,
      candidateCommitSha: headSha,

      artifactSha256: artifactVerification.artifactSha256,
      manifestSha256: manifest.manifestSha256,

      stagedFiles,

      productionFilesModified: false,

      rollback: {
        automatic: false,
        preMerge:
          "Remove or quarantine the isolated staging directory only after preserving its audit evidence.",
        postMerge:
          "Use a new revert pull request against the exact merged commit. Never force-push or reset main.",
      },
    };

    writeExclusive(
      path.join(safeStagingPath, "handoff.json"),
      `${JSON.stringify(handoff, null, 2)}\n`,
    );

    writeExclusive(
      path.join(safeStagingPath, "rollback-evidence.json"),
      `${JSON.stringify(rollbackEvidence, null, 2)}\n`,
    );

    const auditRecord = createAuditRecord({
      status: "STAGED_FOR_FOUNDER_REVIEW",
      baseSha,
      headSha,
      artifactSha256: artifactVerification.artifactSha256,
      manifestSha256: manifest.manifestSha256,
      stagedFileCount: stagedFiles.length,
    });

    writeAudit(safeAuditPath, auditRecord);
    auditWritten = true;

    return {
      status: "STAGED_FOR_FOUNDER_REVIEW",
      consumer: VERIFIED_DELIVERY_CONSUMER_VERSION,
      baseCommitSha: baseSha,
      candidateCommitSha: headSha,
      artifactSha256: artifactVerification.artifactSha256,
      manifestSha256: manifest.manifestSha256,
      stagedFileCount: stagedFiles.length,
      stagingPath: safeStagingPath,
      auditPath: safeAuditPath,
      founderApprovalRequired: true,
      mergeAuthorized: false,
      productionDeploymentAuthorized: false,
      productionFilesModified: false,
    };
  } catch (error) {
    if (!auditWritten && !fs.existsSync(safeAuditPath)) {
      try {
        writeAudit(
          safeAuditPath,
          createAuditRecord({
            status: "REJECTED",
            code: error?.code || "AIOS_HANDOFF_FAILED",
            baseSha,
            headSha,
          }),
        );
      } catch {
        error.auditWriteFailed = true;
      }
    }

    throw error;
  }
}

function parseArgs(argv) {
  const values = {};

  const mapping = {
    "--artifact": "artifactPath",
    "--manifest": "manifestPath",
    "--builder-summary": "builderSummaryPath",
    "--verification": "verificationPath",
    "--base": "baseSha",
    "--head": "headSha",
    "--staging": "stagingPath",
    "--audit": "auditPath",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    const field = mapping[key];

    if (
      !field ||
      !value ||
      value.startsWith("--") ||
      values[field]
    ) {
      fail(
        "AIOS_HANDOFF_USAGE",
        "Invalid or duplicate command-line argument.",
      );
    }

    values[field] = value;
    index += 1;
  }

  for (const field of Object.values(mapping)) {
    if (!values[field]) {
      fail(
        "AIOS_HANDOFF_USAGE",
        "All eight command-line arguments are required.",
      );
    }
  }

  return values;
}

function main() {
  const result = consumeVerifiedDelivery(
    parseArgs(process.argv.slice(2)),
  );

  process.stdout.write(
    `${JSON.stringify(result, null, 2)}\n`,
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
    process.stderr.write(
      `${error?.code || "AIOS_HANDOFF_FAILED"}: ${error?.message || "Handoff failed."}\n`,
    );

    if (error?.auditWriteFailed) {
      process.stderr.write(
        "AIOS_HANDOFF_AUDIT_WRITE_FAILED: Failure audit could not be persisted.\n",
      );
    }

    process.exitCode = 1;
  }
}
