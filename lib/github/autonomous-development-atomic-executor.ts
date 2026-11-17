import "server-only";

import {
  getGitHubBridgeConfig,
  resolveGitHubBridgeAuth,
} from "@/lib/github/bridge";

const DEFAULT_REPOSITORY = "Vivi9max/AIOS-Alpha";
const DEFAULT_BASE_BRANCH = "main";
const STAGING_PREFIX = "c169-8-ad-";
const MAX_FILES = 6;
const MAX_FILE_SIZE = 200_000;

const ALLOWED_PREFIXES = [
  "app/",
  "components/",
  "docs/",
  "lib/",
  "scripts/",
  "tests/",
  "test/",
  "public/",
  "styles/",
];

const BLOCKED_PATHS = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "vercel.json",
];

interface GitHubResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

interface GitHubRefResponse {
  ref?: string;
  object?: {
    sha?: string;
  };
}

/**
 * Git Database API response for:
 * GET /repos/{owner}/{repo}/git/commits/{commit_sha}
 *
 * Unlike the REST commit endpoint, the Git Database endpoint
 * returns `tree` at the top level of the response.
 */
interface GitHubCommitResponse {
  sha?: string;
  tree?: {
    sha?: string;
    url?: string;
  };
  parents?: Array<{
    sha?: string;
  }>;
}

interface GitHubBlobResponse {
  sha?: string;
}

interface GitHubTreeResponse {
  sha?: string;
}

export interface AutonomousAtomicFile {
  path: string;
  content: string;
}

export interface AutonomousAtomicSnapshot {
  repository: string;
  baseBranch: string;
  baseSha: string;
  stagingBranch: string;
  treeSha: string;
  stagingCommitSha: string;
  changedPaths: string[];
}

export type AutonomousExecutionMode =
  | "READ_ONLY_AUDIT"
  | "PRODUCT_DEVELOPMENT";

export interface AutonomousAuditReport {
  mode: "READ_ONLY_AUDIT";
  objective: string;
  repository: string;
  baseBranch: string;
  baseSha: string;
  inspectedPaths: string[];
  fileContents: Array<{
    path: string;
    content: string;
  }>;
  summary: string;
  findings: string[];
  completed: boolean;
  failed: boolean;
  failureReason?: string;
}

export interface AutonomousAtomicExecutionResult {
  success: boolean;
  code: string;
  reason: string;
  mode?: AutonomousExecutionMode;
  snapshot?: AutonomousAtomicSnapshot;
  audit?: AutonomousAuditReport;
}

function normalizeRepository(
  repository?: string,
): string {
  return (
    repository?.trim() ||
    process.env.GITHUB_REPOSITORY?.trim() ||
    DEFAULT_REPOSITORY
  ).replace(/^\/+|\/+$/g, "");
}

function normalizeBranch(
  branch?: string,
): string {
  return (
    branch?.trim() ||
    process.env.GITHUB_DEFAULT_BRANCH?.trim() ||
    DEFAULT_BASE_BRANCH
  );
}

function normalizePath(
  path: string,
): string {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
}

function isAllowedPath(
  path: string,
): boolean {
  const normalized = normalizePath(path);

  if (!normalized) {
    return false;
  }

  if (
    normalized.includes("..") ||
    normalized.includes("\0") ||
    normalized.startsWith(".git/") ||
    normalized.startsWith(".github/") ||
    normalized.startsWith(".env")
  ) {
    return false;
  }

  if (
    BLOCKED_PATHS.includes(normalized)
  ) {
    return false;
  }

  return ALLOWED_PREFIXES.some(
    (prefix) =>
      normalized.startsWith(prefix),
  );
}

function validateFiles(
  files: AutonomousAtomicFile[],
): AutonomousAtomicFile[] {
  if (
    files.length === 0
  ) {
    throw new Error(
      "AIOS_ATOMIC_NO_FILES",
    );
  }

  if (
    files.length > MAX_FILES
  ) {
    throw new Error(
      "AIOS_ATOMIC_FILE_LIMIT_EXCEEDED",
    );
  }

  const seen = new Set<string>();

  return files.map(
    (file) => {
      const path =
        normalizePath(
          file.path,
        );

      if (
        !isAllowedPath(path)
      ) {
        throw new Error(
          `AIOS_ATOMIC_PATH_REJECTED: ${path}`,
        );
      }

      if (
        seen.has(path)
      ) {
        throw new Error(
          `AIOS_ATOMIC_DUPLICATE_PATH: ${path}`,
        );
      }

      seen.add(path);

      if (
        typeof file.content !==
        "string"
      ) {
        throw new Error(
          `AIOS_ATOMIC_CONTENT_INVALID: ${path}`,
        );
      }

      if (
        file.content.length >
        MAX_FILE_SIZE
      ) {
        throw new Error(
          `AIOS_ATOMIC_FILE_TOO_LARGE: ${path}`,
        );
      }

      if (
        !file.content.trim()
      ) {
        throw new Error(
          `AIOS_ATOMIC_EMPTY_FILE: ${path}`,
        );
      }

      return {
        path,
        content:
          file.content,
      };
    },
  );
}

function buildStagingBranch(
  taskId?: string,
): string {
  const normalized =
    (taskId ||
      `task-${Date.now()}`)
      .trim()
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      )
      .slice(0, 48);

  return `${STAGING_PREFIX}${
    normalized ||
    `task-${Date.now()}`
  }`;
}

async function githubRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<GitHubResponse<T>> {
  const config =
    getGitHubBridgeConfig();

  const token =
    accessToken ||
    config.token;

  if (!token) {
    return {
      success: false,
      status: 503,
      error:
        "GitHub authentication is not configured.",
    };
  }

  const response =
    await fetch(
      `${config.apiBaseUrl}${path}`,
      {
        ...options,
        cache: "no-store",
        headers: {
          Accept:
            "application/vnd.github+json",
          Authorization:
            `Bearer ${token}`,
          "X-GitHub-Api-Version":
            "2022-11-28",
          ...(options.body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
          ...(options.headers || {}),
        },
      },
    );

  const body =
    await response.text();

  let data: unknown;

  if (body) {
    try {
      data = JSON.parse(
        body,
      );
    } catch {
      data = body;
    }
  }

  if (!response.ok) {
    let message =
      `GitHub API request failed with ${response.status}.`;

    if (
      typeof data ===
        "object" &&
      data !== null &&
      "message" in data &&
      typeof (
        data as {
          message?: unknown;
        }
      ).message ===
        "string"
    ) {
      message =
        (
          data as {
            message: string;
          }
        ).message;
    }

    return {
      success: false,
      status:
        response.status,
      error: message,
    };
  }

  return {
    success: true,
    status:
      response.status,
    data:
      data as T,
  };
}

async function getBranchSha(
  repository: string,
  branch: string,
  accessToken: string,
): Promise<string> {
  const result =
    await githubRequest<GitHubRefResponse>(
      `/repos/${repository}/git/ref/heads/${encodeURIComponent(
        branch,
      )}`,
      {},
      accessToken,
    );

  const sha =
    result.data?.object?.sha;

  if (
    !result.success ||
    !sha
  ) {
    throw new Error(
      result.error ||
        `AIOS_ATOMIC_BRANCH_READ_FAILED: ${branch}`,
    );
  }

  return sha;
}

async function getCommitTreeSha(
  repository: string,
  commitSha: string,
  accessToken: string,
): Promise<string> {
  const result =
    await githubRequest<GitHubCommitResponse>(
      `/repos/${repository}/git/commits/${encodeURIComponent(
        commitSha,
      )}`,
      {},
      accessToken,
    );

  const treeSha =
    result.data?.tree?.sha;

  if (
    !result.success ||
    !treeSha
  ) {
    throw new Error(
      result.error ||
        "AIOS_ATOMIC_BASE_TREE_READ_FAILED",
    );
  }

  return treeSha;
}

async function createBlob(
  repository: string,
  content: string,
  accessToken: string,
): Promise<string> {
  const result =
    await githubRequest<GitHubBlobResponse>(
      `/repos/${repository}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content,
          encoding: "utf-8",
        }),
      },
      accessToken,
    );

  const sha =
    result.data?.sha;

  if (
    !result.success ||
    !sha
  ) {
    throw new Error(
      result.error ||
        "AIOS_ATOMIC_BLOB_CREATE_FAILED",
    );
  }

  return sha;
}

async function createTree(
  repository: string,
  baseTreeSha: string,
  files: AutonomousAtomicFile[],
  accessToken: string,
): Promise<string> {
  const tree = [];

  for (
    const file of files
  ) {
    const blobSha =
      await createBlob(
        repository,
        file.content,
        accessToken,
      );

    tree.push({
      path:
        file.path,
      mode:
        "100644",
      type:
        "blob",
      sha:
        blobSha,
    });
  }

  const result =
    await githubRequest<GitHubTreeResponse>(
      `/repos/${repository}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree:
            baseTreeSha,
          tree,
        }),
      },
      accessToken,
    );

  const treeSha =
    result.data?.sha;

  if (
    !result.success ||
    !treeSha
  ) {
    throw new Error(
      result.error ||
        "AIOS_ATOMIC_TREE_CREATE_FAILED",
    );
  }

  return treeSha;
}

async function createCommit(
  repository: string,
  objective: string,
  commitMessage: string | undefined,
  treeSha: string,
  parentSha: string,
  accessToken: string,
): Promise<string> {
  const normalizedObjective =
    objective
      .replace(
        /[^a-zA-Z0-9 _-]+/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim()
      .slice(0, 72);

  const message =
    commitMessage?.trim() ||
    `feat(C169.8): autonomous atomic development${
      normalizedObjective
        ? ` ${normalizedObjective}`
        : ""
    }`;

  const result =
    await githubRequest<GitHubCommitResponse>(
      `/repos/${repository}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          tree:
            treeSha,
          parents: [
            parentSha,
          ],
        }),
      },
      accessToken,
    );

  const commitSha =
    result.data?.sha;

  if (
    !result.success ||
    !commitSha
  ) {
    throw new Error(
      result.error ||
        "AIOS_ATOMIC_COMMIT_CREATE_FAILED",
    );
  }

  return commitSha;
}

async function createBranch(
  repository: string,
  branch: string,
  commitSha: string,
  accessToken: string,
): Promise<void> {
  const result =
    await githubRequest<unknown>(
      `/repos/${repository}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref:
            `refs/heads/${branch}`,
          sha:
            commitSha,
        }),
      },
      accessToken,
    );

  if (
    !result.success
  ) {
    throw new Error(
      result.error ||
        `AIOS_ATOMIC_STAGING_BRANCH_CREATE_FAILED: ${branch}`,
    );
  }
}

async function verifyStagingHead(
  repository: string,
  branch: string,
  expectedSha: string,
  accessToken: string,
  reasonCode: string,
): Promise<void> {
  const actualSha =
    await getBranchSha(
      repository,
      branch,
      accessToken,
    );

  if (
    actualSha !==
    expectedSha
  ) {
    throw new Error(
      reasonCode,
    );
  }
}

interface GitHubContentsResponse {
  type?: string;
  encoding?: string;
  content?: string;
  path?: string;
  sha?: string;
}

function decodeBase64Strict(
  value: string,
): Buffer {
  const normalized =
    value.replace(/\s+/g, "");

  if (
    !normalized ||
    normalized.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)
  ) {
    throw new Error(
      "AIOS_ATOMIC_CONTENTS_BASE64_INVALID",
    );
  }

  return Buffer.from(normalized, "base64");
}

function decodeUtf8Strict(
  bytes: Buffer,
): string {
  try {
    return new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes);
  } catch {
    throw new Error(
      "AIOS_ATOMIC_CONTENTS_UTF8_INVALID",
    );
  }
}

const AUDIT_OBJECTIVE_PATTERNS = [
  /\bread[\s-]?only\b/i,
  /\baudit\b/i,
  /\binspect\b/i,
  /\breview\b/i,
  /\banaly[sz]e\b/i,
  /\bdiagnos/i,
  /\bassess\b/i,
  /\bevaluat/i,
  /\breport\b/i,
  /\bno\s+(?:github\s+)?writes?\b/i,
  /\bdo\s+not\s+(?:write|modify|commit|change)\b/i,
];

const DEVELOPMENT_OBJECTIVE_PATTERNS = [
  /\bimplement\b/i,
  /\bbuild\b/i,
  /\badd\b/i,
  /\bcreate\b/i,
  /\brestore\b/i,
  /\brefactor\b/i,
  /\bfix\b/i,
  /\bupdate\b/i,
  /\bmodify\b/i,
  /\bcommit\b/i,
  /\bpatch\b/i,
  /\bdevelop\b/i,
];

export function classifyAutonomousExecutionMode(
  objective: string,
): AutonomousExecutionMode {
  const normalized =
    objective
      .replace(/\s+/g, " ")
      .trim();

  if (!normalized) {
    return "PRODUCT_DEVELOPMENT";
  }

  const auditScore =
    AUDIT_OBJECTIVE_PATTERNS.reduce(
      (score, pattern) =>
        pattern.test(normalized)
          ? score + 1
          : score,
      0,
    );

  const developmentScore =
    DEVELOPMENT_OBJECTIVE_PATTERNS.reduce(
      (score, pattern) =>
        pattern.test(normalized)
          ? score + 1
          : score,
      0,
    );

  if (auditScore === 0) {
    return "PRODUCT_DEVELOPMENT";
  }

  if (
    auditScore > developmentScore
  ) {
    return "READ_ONLY_AUDIT";
  }

  return "PRODUCT_DEVELOPMENT";
}

async function readContentsFile(
  repository: string,
  path: string,
  ref: string,
  accessToken: string,
): Promise<AutonomousAtomicFile> {
  const result =
    await githubRequest<GitHubContentsResponse>(
      `/repos/${repository}/contents/${path
        .split("/")
        .map((segment) =>
          encodeURIComponent(segment),
        )
        .join("/")}?ref=${encodeURIComponent(
        ref,
      )}`,
      {},
      accessToken,
    );

  if (!result.success) {
    throw new Error(
      `AIOS_ATOMIC_AUDIT_READ_FAILED: ${path}: ${
        result.error || "unknown"
      }`,
    );
  }

  const data =
    result.data;

  if (
    !data ||
    typeof data !== "object" ||
    data.type !== "file" ||
    data.path !== path ||
    data.encoding !== "base64" ||
    typeof data.content !== "string" ||
    !data.content
  ) {
    throw new Error(
      `AIOS_ATOMIC_AUDIT_READ_INVALID: ${path}`,
    );
  }

  const bytes =
    decodeBase64Strict(
      data.content,
    );

  const decoded =
    decodeUtf8Strict(
      bytes,
    );

  return {
    path,
    content: decoded,
  };
}

async function verifyContentsReadback(
  repository: string,
  stagingCommitSha: string,
  files: AutonomousAtomicFile[],
  accessToken: string,
): Promise<void> {
  for (
    const file of files
  ) {
    const result =
      await githubRequest<GitHubContentsResponse>(
        `/repos/${repository}/contents/${file.path
          .split("/")
          .map((segment) =>
            encodeURIComponent(segment),
          )
          .join("/")}?ref=${encodeURIComponent(
          stagingCommitSha,
        )}`,
        {},
        accessToken,
      );

    if (
      !result.success
    ) {
      throw new Error(
        "AIOS_ATOMIC_CONTENTS_READ_FAILED",
      );
    }

    const data =
      result.data;

    if (
      !data ||
      typeof data !== "object"
    ) {
      throw new Error(
        "AIOS_ATOMIC_CONTENTS_READ_FAILED",
      );
    }

    if (
      data.type !== "file"
    ) {
      throw new Error(
        "AIOS_ATOMIC_CONTENTS_TYPE_INVALID",
      );
    }

    if (
      data.path !== file.path
    ) {
      throw new Error(
        "AIOS_ATOMIC_CONTENTS_PATH_MISMATCH",
      );
    }

    if (
      data.encoding !== "base64"
    ) {
      throw new Error(
        "AIOS_ATOMIC_CONTENTS_ENCODING_INVALID",
      );
    }

    if (
      typeof data.content !== "string" ||
      !data.content
    ) {
      throw new Error(
        "AIOS_ATOMIC_CONTENTS_CONTENT_MISSING",
      );
    }

    if (
      typeof data.sha !== "string" ||
      !data.sha
    ) {
      throw new Error(
        "AIOS_ATOMIC_CONTENTS_BLOB_SHA_MISSING",
      );
    }

    const bytes =
      decodeBase64Strict(
        data.content,
      );

    const decoded =
      decodeUtf8Strict(
        bytes,
      );

    if (
      decoded !== file.content
    ) {
      throw new Error(
        "AIOS_ATOMIC_CONTENTS_CONTENT_MISMATCH",
      );
    }
  }
}

export async function executeAtomicReadOnlyAudit(
  input: {
    objective: string;
    taskId: string;
    repository?: string;
    baseBranch?: string;
    paths: string[];
    accessToken?: string;
  },
): Promise<AutonomousAtomicExecutionResult> {
  const repository =
    normalizeRepository(
      input.repository,
    );

  const baseBranch =
    normalizeBranch(
      input.baseBranch,
    );

  const uniquePaths =
    Array.from(
      new Set(
        input.paths
          .map((path) =>
            normalizePath(path),
          )
          .filter((path) =>
            Boolean(path),
          ),
      ),
    );

  if (uniquePaths.length === 0) {
    return {
      success: false,
      mode: "READ_ONLY_AUDIT",
      code:
        "AIOS_ATOMIC_AUDIT_NO_PATHS",
      reason:
        "Read-only audit requires at least one path to inspect.",
      audit: {
        mode: "READ_ONLY_AUDIT",
        objective: input.objective,
        repository,
        baseBranch,
        baseSha: "",
        inspectedPaths: [],
        fileContents: [],
        summary: "",
        findings: [],
        completed: false,
        failed: true,
        failureReason:
          "AIOS_ATOMIC_AUDIT_NO_PATHS",
      },
    };
  }

  if (uniquePaths.length > MAX_FILES) {
    return {
      success: false,
      mode: "READ_ONLY_AUDIT",
      code:
        "AIOS_ATOMIC_AUDIT_PATH_LIMIT_EXCEEDED",
      reason:
        "Read-only audit path limit exceeded.",
      audit: {
        mode: "READ_ONLY_AUDIT",
        objective: input.objective,
        repository,
        baseBranch,
        baseSha: "",
        inspectedPaths: uniquePaths,
        fileContents: [],
        summary: "",
        findings: [],
        completed: false,
        failed: true,
        failureReason:
          "AIOS_ATOMIC_AUDIT_PATH_LIMIT_EXCEEDED",
      },
    };
  }

  const auth =
    input.accessToken
      ? {
          accessToken:
            input.accessToken,
        }
      : await resolveGitHubBridgeAuth();

  if (!auth.accessToken) {
    return {
      success: false,
      mode: "READ_ONLY_AUDIT",
      code:
        "AIOS_ATOMIC_AUTH_UNAVAILABLE",
      reason:
        "AIOS does not have an authenticated GitHub execution context.",
      audit: {
        mode: "READ_ONLY_AUDIT",
        objective: input.objective,
        repository,
        baseBranch,
        baseSha: "",
        inspectedPaths: uniquePaths,
        fileContents: [],
        summary: "",
        findings: [],
        completed: false,
        failed: true,
        failureReason:
          "AIOS_ATOMIC_AUTH_UNAVAILABLE",
      },
    };
  }

  try {
    const baseSha =
      await getBranchSha(
        repository,
        baseBranch,
        auth.accessToken,
      );

    const fileContents:
      AutonomousAtomicFile[] = [];

    for (const path of uniquePaths) {
      const file =
        await readContentsFile(
          repository,
          path,
          baseSha,
          auth.accessToken,
        );

      fileContents.push(file);
    }

    const findings =
      fileContents.map((file) => {
        const lineCount =
          file.content.split("\n").length;

        return `${file.path}: ${lineCount} lines, ${file.content.length} characters`;
      });

    const summary =
      fileContents
        .map(
          (file) =>
            `=== ${file.path} ===\n${file.content}`,
        )
        .join("\n\n");

    if (!summary.trim()) {
      return {
        success: false,
        mode: "READ_ONLY_AUDIT",
        code:
          "AIOS_ATOMIC_AUDIT_EMPTY_REPORT",
        reason:
          "Read-only audit produced no report content.",
        audit: {
          mode: "READ_ONLY_AUDIT",
          objective: input.objective,
          repository,
          baseBranch,
          baseSha,
          inspectedPaths: uniquePaths,
          fileContents: [],
          summary: "",
          findings: [],
          completed: false,
          failed: true,
          failureReason:
            "AIOS_ATOMIC_AUDIT_EMPTY_REPORT",
        },
      };
    }

    return {
      success: true,
      mode: "READ_ONLY_AUDIT",
      code:
        "AIOS_ATOMIC_AUDIT_COMPLETED",
      reason:
        "Read-only audit inspected the requested files without performing any GitHub writes.",
      audit: {
        mode: "READ_ONLY_AUDIT",
        objective: input.objective,
        repository,
        baseBranch,
        baseSha,
        inspectedPaths: uniquePaths,
        fileContents,
        summary,
        findings,
        completed: true,
        failed: false,
      },
    };
  } catch (error) {
    return {
      success: false,
      mode: "READ_ONLY_AUDIT",
      code:
        "AIOS_ATOMIC_AUDIT_FAILED",
      reason:
        error instanceof Error
          ? error.message
          : "Read-only audit execution failed.",
      audit: {
        mode: "READ_ONLY_AUDIT",
        objective: input.objective,
        repository,
        baseBranch,
        baseSha: "",
        inspectedPaths: uniquePaths,
        fileContents: [],
        summary: "",
        findings: [],
        completed: false,
        failed: true,
        failureReason:
          error instanceof Error
            ? error.message
            : "AIOS_ATOMIC_AUDIT_FAILED",
      },
    };
  }
}

export async function executeAtomicStaging(
  input: {
    objective: string;
    taskId: string;
    repository?: string;
    baseBranch?: string;
    files: AutonomousAtomicFile[];
    accessToken?: string;
    commitMessage?: string;
  },
): Promise<AutonomousAtomicExecutionResult> {
  const repository =
    normalizeRepository(
      input.repository,
    );

  const baseBranch =
    normalizeBranch(
      input.baseBranch,
    );

  let files:
    AutonomousAtomicFile[];

  try {
    files =
      validateFiles(
        input.files,
      );
  } catch (error) {
    return {
      success: false,
      code:
        "AIOS_ATOMIC_INPUT_REJECTED",
      reason:
        error instanceof Error
          ? error.message
          : "Atomic staging input rejected.",
    };
  }

  const auth =
    input.accessToken
      ? {
          accessToken:
            input.accessToken,
        }
      : await resolveGitHubBridgeAuth();

  if (
    !auth.accessToken
  ) {
    return {
      success: false,
      code:
        "AIOS_ATOMIC_AUTH_UNAVAILABLE",
      reason:
        "AIOS does not have an authenticated GitHub execution context.",
    };
  }

  try {
    const baseSha =
      await getBranchSha(
        repository,
        baseBranch,
        auth.accessToken,
      );

    const baseTreeSha =
      await getCommitTreeSha(
        repository,
        baseSha,
        auth.accessToken,
      );

    const stagingBranch =
      buildStagingBranch(
        input.taskId,
      );

    const treeSha =
      await createTree(
        repository,
        baseTreeSha,
        files,
        auth.accessToken,
      );

    const stagingCommitSha =
      await createCommit(
        repository,
        input.objective,
        input.commitMessage,
        treeSha,
        baseSha,
        auth.accessToken,
      );

    await createBranch(
      repository,
      stagingBranch,
      stagingCommitSha,
      auth.accessToken,
    );

    await verifyStagingHead(
      repository,
      stagingBranch,
      stagingCommitSha,
      auth.accessToken,
      "AIOS_ATOMIC_STAGING_HEAD_BEFORE_CONTENTS_FAILED",
    );

    await verifyContentsReadback(
      repository,
      stagingCommitSha,
      files,
      auth.accessToken,
    );

    await verifyStagingHead(
      repository,
      stagingBranch,
      stagingCommitSha,
      auth.accessToken,
      "AIOS_ATOMIC_STAGING_HEAD_AFTER_CONTENTS_FAILED",
    );

    return {
      success: true,
      code:
        "AIOS_ATOMIC_STAGING_READY",
      reason:
        "AIOS created one atomic tree and one staging commit without modifying main.",
      snapshot: {
        repository,
        baseBranch,
        baseSha,
        stagingBranch,
        treeSha,
        stagingCommitSha,
        changedPaths:
          files.map(
            (file) =>
              file.path,
          ),
      },
    };
  } catch (error) {
    return {
      success: false,
      code:
        "AIOS_ATOMIC_STAGING_FAILED",
      reason:
        error instanceof Error
          ? error.message
          : "Atomic staging execution failed.",
    };
  }
}
