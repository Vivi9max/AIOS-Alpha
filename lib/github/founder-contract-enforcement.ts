// lib/github/founder-contract-enforcement.ts
import "server-only";
import {
  assertFounderDevelopmentContract,
  isPathAuthorizedByFounderContract,
  FounderDevelopmentContract,
} from "@/lib/github/founder-development-contract";

export type FounderContractTask = {
  contract: FounderDevelopmentContract;
  action: "read" | "write";
  repo: string;
  branch: string;
  path: string;
};

export function enforceFounderContract(task: FounderContractTask): void {
  const { contract, action, repo, branch, path } = task;

  assertFounderDevelopmentContract(contract);

  if (contract.version !== "C141.8") {
    throw new Error(`FounderContract: invalid contract version. Expected C141.8, got ${contract.version}`);
  }

  if (contract.founderOnly !== true) {
    throw new Error("FounderContract: founderOnly must be true");
  }

  if (repo !== "Vivi9max/AIOS-Alpha") {
    throw new Error(`FounderContract: invalid repository, got ${repo}`);
  }

  if (branch !== "main") {
    throw new Error(`FounderContract: invalid branch, got ${branch}`);
  }

  if (!contract.actions.includes(action)) {
    throw new Error(`FounderContract: action "${action}" is not allowed in contract.actions`);
  }

  if (!isPathAuthorizedByFounderContract(contract, path)) {
    throw new Error(`FounderContract: path "${path}" not in allowed requestedFiles`);
  }

  // Protected paths block
  const protectedExact = new Set([
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "vercel.json",
    ".env",
  ]);
  if (
    protectedExact.has(path) ||
    path.startsWith(".env.") ||
    path.startsWith(".git/") ||
    path.startsWith(".github/")
  ) {
    throw new Error(`FounderContract: protected path forbidden: ${path}`);
  }

  // write scope checks — C141.10 correct: use contract.verification.checks
  if (action === "write") {
    if (!contract.actions.includes("read")) throw new Error("FounderContract: write requires read action");
    if (!contract.actions.includes("write")) throw new Error("FounderContract: write requires write action");
    if (!contract.actions.includes("verify")) throw new Error("FounderContract: write requires verify action");
    if (!contract.verification.checks.includes("readback")) throw new Error("FounderContract: write requires readback check");
    if (!contract.verification.checks.includes("build")) throw new Error("FounderContract: write requires build check");
  }
}
