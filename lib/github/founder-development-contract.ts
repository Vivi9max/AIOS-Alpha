import "server-only";

export const FOUNDER_DEVELOPMENT_CONTRACT_VERSION = "C141.8" as const;

export type FounderDevelopmentAction = "read" | "write" | "verify";

export interface FounderDevelopmentContract {
  version: typeof FOUNDER_DEVELOPMENT_CONTRACT_VERSION;
  founderOnly: true;
  repository: "Vivi9max/AIOS-Alpha";
  branch: "main";
  objective: string;
  actions: FounderDevelopmentAction[];
  allowedPaths: string[];
  requestedFiles: string[];
  verification: {
    required: true;
    checks: Array<"readback" | "build" | "production">;
  };
  commitPolicy: {
    allowed: true;
    message: string;
  };
}

const APPROVED_PREFIXES = [
  "app/", "components/", "docs/", "lib/", "scripts/",
  "tests/", "test/", "public/", "styles/",
] as const;

const PROTECTED_PATHS = [
  "package.json", "package-lock.json", "pnpm-lock.yaml",
  "yarn.lock", "vercel.json",
] as const;

function normalizePath(path: string): string {
  return path.trim().replace(/^\/+/, "").replace(/\\+/g, "/");
}

function assertSafePath(path: string): string {
  const normalized = normalizePath(path);

  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.includes("\0") ||
    normalized.startsWith(".git/") ||
    normalized.startsWith(".env")
  ) {
    throw new Error(`Unsafe Founder Development Contract path: ${path}`);
  }

  if (PROTECTED_PATHS.includes(
    normalized as (typeof PROTECTED_PATHS)[number]
  )) {
    throw new Error(
      `Protected project configuration is not contract-writable: ${normalized}`
    );
  }

  if (!APPROVED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    throw new Error(
      `Path is outside approved Founder development areas: ${normalized}`
    );
  }

  return normalized;
}

export function createFounderDevelopmentContract(input: {
  objective: string;
  requestedFiles: string[];
  actions?: FounderDevelopmentAction[];
  verification?: Array<"readback" | "build" | "production">;
  commitMessage: string;
}): FounderDevelopmentContract {
  const objective = input.objective.trim();
  const commitMessage = input.commitMessage.trim();

  if (!objective) throw new Error("Founder Development objective is required.");
  if (!commitMessage) throw new Error("Founder Development commit message is required.");

  const requestedFiles = Array.from(
    new Set(input.requestedFiles.map(assertSafePath))
  );

  if (requestedFiles.length === 0) {
    throw new Error("At least one requested file is required.");
  }

  const actions: FounderDevelopmentAction[] = Array.from(
  new Set<FounderDevelopmentAction>(
    input.actions ?? ["read", "write", "verify"]
  )
);

  if (!actions.includes("read") || !actions.includes("write")) {
    throw new Error(
      "Founder Development contracts require read and write actions."
    );
  }

  const checks: Array<
  "readback" | "build" | "production"
> = Array.from(
  new Set<"readback" | "build" | "production">(
    input.verification ?? [
      "readback",
      "build",
      "production",
    ]
  )
);

  if (!checks.includes("readback") || !checks.includes("build")) {
    throw new Error(
      "Founder Development contracts require readback and build verification."
    );
  }

  return {
    version: FOUNDER_DEVELOPMENT_CONTRACT_VERSION,
    founderOnly: true,
    repository: "Vivi9max/AIOS-Alpha",
    branch: "main",
    objective,
    actions,
    allowedPaths: requestedFiles,
    requestedFiles,
    verification: { required: true, checks },
    commitPolicy: { allowed: true, message: commitMessage },
  };
}

export function assertFounderDevelopmentContract(
  contract: FounderDevelopmentContract
): void {
  if (contract.version !== FOUNDER_DEVELOPMENT_CONTRACT_VERSION) {
    throw new Error("Unsupported Founder Development Contract version.");
  }

  if (contract.founderOnly !== true) {
    throw new Error(
      "Founder Development Contract requires founderOnly=true."
    );
  }

  if (contract.repository !== "Vivi9max/AIOS-Alpha") {
    throw new Error(
      "Founder Development Contract repository is restricted to AIOS-Alpha."
    );
  }

  if (contract.branch !== "main") {
    throw new Error(
      "Founder Development Contract branch is restricted to main."
    );
  }

  if (!contract.verification.required) {
    throw new Error("Founder Development Contract requires verification.");
  }

  for (const path of contract.allowedPaths) {
    assertSafePath(path);
  }
}

export function isPathAuthorizedByFounderContract(
  contract: FounderDevelopmentContract,
  path: string
): boolean {
  assertFounderDevelopmentContract(contract);
  return contract.allowedPaths.includes(normalizePath(path));
}
