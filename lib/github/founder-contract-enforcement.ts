// lib/github/founder-contract-enforcement.ts
import "server-only";

import {
  assertFounderDevelopmentContract,
  isPathAuthorizedByFounderContract,
  type FounderDevelopmentContract,
} from "@/lib/github/founder-development-contract";

/**
 * C141.9 — Founder Contract Enforcement
 */
export type FounderContractTask = {
  contract: FounderDevelopmentContract;
  action: "read" | "write";
  repo: string;
  branch: string;
  path: string;
};

/**
 * Enforces Founder Contract constraints for a given task.
 * Throws Error on any validation failure.
 */
export function enforceFounderContract(task: FounderContractTask): void {
  const { contract, action, repo, branch, path } = task;

  // 1. Validate contract version must be C141.8
  if (contract.version !== "C141.8") {
    throw new Error(`FounderContract: invalid contract version. Expected C141.8, got ${contract.version}`);
  }

  // 2. founderOnly must be true
  if (contract.founderOnly !== true) {
    throw new Error("FounderContract: founderOnly must be true");
  }

  // 3. repository strictly Vivi9max/AIOS‑Alpha
  if (repo !== "Vivi9max/AIOS‑Alpha") {
    throw new Error(`FounderContract: invalid repository. Expected Vivi9max/AIOS‑Alpha, got ${repo}`);
  }

  // 4. branch strictly main
  if (branch !== "main") {
    throw new Error(`FounderContract: invalid branch. Expected main, got ${branch}`);
  }

  // 5. action must exist inside contract.actions
  if (!contract.actions.includes(action)) {
    throw new Error(`FounderContract: action "${action}" not permitted in contract.actions`);
  }

  // 6. path must be inside contract.allowedPaths
  if (!isPathAuthorizedByFounderContract(contract, path)) {
    throw new Error(`FounderContract: path "${path}" is not in contract.allowedPaths`);
  }

  // 7. Protect forbidden files: package.json, vercel.json, .env, .git (any path under .git)
  const protectedPaths = [
    "package.json",
    "vercel.json",
    ".env",
  ];
  const isProtected =
    protectedPaths.some((p) => path === p) || path.startsWith(".git/");

  if (isProtected) {
    throw new Error(`FounderContract: path "${path}" is in protected scope, modification forbidden`);
  }

  // 8. WRITE additional requirements
  if (action === "write") {
    // read action authorized
    if (!contract.actions.includes("read")) {
      throw new Error("FounderContract: write requires read action to be authorized");
    }
    // readback verification authorized
    if (!contract.actions.includes("readback verification")) {
      throw new Error("FounderContract: write requires readback verification action to be authorized");
    }
    // build verification authorized
    if (!contract.actions.includes("build verification")) {
      throw new Error("FounderContract: write requires build verification action to be authorized");
    }
  }

  // All checks passed
}
