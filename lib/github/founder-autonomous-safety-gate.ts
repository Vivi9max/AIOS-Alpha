import "server-only";

export type FounderAutonomousSafetyDecision = "allow" | "deny";

export interface FounderAutonomousSafetyInput {
  repository: string;
  branch: string;
  path: string;
  currentContent: string;
  proposedContent: string;
  objective: string;
}

export interface FounderAutonomousSafetyAudit {
  runId: string;
  decision: FounderAutonomousSafetyDecision;
  checks: string[];
  blockers: string[];
  path: string;
  repository: string;
  branch: string;
  changedBytes: number;
  currentBytes: number;
  proposedBytes: number;
}

const REPOSITORY = "Vivi9max/AIOS-Alpha";
const BRANCH = "main";
const MAX_CONTENT_BYTES = 200_000;
const MAX_CHANGE_RATIO = 0.80;

const PROTECTED_EXACT = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "vercel.json",
]);

const PROTECTED_PREFIXES = [
  ".env",
  ".git/",
  ".github/",
  "lib/github/bridge.ts",
  "lib/github/task-dispatch.ts",
  "lib/github/founder-runtime-task.ts",
  "lib/github/founder-development-contract.ts",
  "lib/github/founder-contract-enforcement.ts",
  "lib/github/founder-auth",
  "lib/github/founder-autonomous-safety-gate.ts",
];

const APPROVED_PREFIXES = [
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

const SECRET_PATTERNS: RegExp[] = [
  /ghp_[A-Za-z0-9_]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  /AWS_SECRET_ACCESS_KEY\s*[:=]/i,
  /(?:api[_-]?key|access[_-]?token|secret)\s*[:=]\s*["'][^"']{12,}["']/i,
];

const DANGEROUS_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\//,
  /git\s+push\s+--force/i,
  /git\s+reset\s+--hard/i,
  /DROP\s+DATABASE/i,
];

function normalizePath(path: string): string {
  return path.trim().replace(/^\/+/, "").replace(/\\+/g, "/");
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function createRunId(): string {
  return `c141.13-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function containsAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content));
}

export function evaluateFounderAutonomousSafety(
  input: FounderAutonomousSafetyInput,
): FounderAutonomousSafetyAudit {
  const runId = createRunId();
  const checks: string[] = [];
  const blockers: string[] = [];
  const path = normalizePath(input.path);
  const currentBytes = byteLength(input.currentContent);
  const proposedBytes = byteLength(input.proposedContent);
  const changedBytes = Math.abs(proposedBytes - currentBytes);

  if (input.repository !== REPOSITORY) {
    blockers.push("repository-not-authorized");
  } else {
    checks.push("repository-authorized");
  }

  if (input.branch !== BRANCH) {
    blockers.push("branch-not-authorized");
  } else {
    checks.push("branch-authorized");
  }

  if (!path || path.includes("..") || path.includes("\0")) {
    blockers.push("unsafe-path");
  } else {
    checks.push("path-safe");
  }

  if (!APPROVED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    blockers.push("path-outside-approved-area");
  } else {
    checks.push("approved-area");
  }

  if (
    PROTECTED_EXACT.has(path) ||
    PROTECTED_PREFIXES.some((prefix) =>
      path === prefix || path.startsWith(prefix),
    )
  ) {
    blockers.push("protected-core-path");
  } else {
    checks.push("protected-path-check");
  }

  if (!input.objective.trim()) {
    blockers.push("objective-missing");
  } else {
    checks.push("objective-present");
  }

  if (!input.proposedContent.trim()) {
    blockers.push("empty-proposal");
  } else {
    checks.push("proposal-present");
  }

  if (proposedBytes > MAX_CONTENT_BYTES) {
    blockers.push("proposal-too-large");
  } else {
    checks.push("proposal-size");
  }

  if (containsAny(input.proposedContent, SECRET_PATTERNS)) {
    blockers.push("secret-pattern-detected");
  } else {
    checks.push("secret-scan");
  }

  if (containsAny(input.proposedContent, DANGEROUS_PATTERNS)) {
    blockers.push("dangerous-operation-detected");
  } else {
    checks.push("dangerous-operation-scan");
  }

  const ratioBase = Math.max(currentBytes, 1);
  const changeRatio = changedBytes / ratioBase;
  if (currentBytes > 0 && changeRatio > MAX_CHANGE_RATIO) {
    blockers.push("change-scope-too-large");
  } else {
    checks.push("change-scope");
  }

  const decision: FounderAutonomousSafetyDecision =
    blockers.length === 0 ? "allow" : "deny";

  checks.push(decision === "allow" ? "safety-gate-allow" : "safety-gate-deny");

  return {
    runId,
    decision,
    checks,
    blockers,
    path,
    repository: input.repository,
    branch: input.branch,
    changedBytes,
    currentBytes,
    proposedBytes,
  };
}
