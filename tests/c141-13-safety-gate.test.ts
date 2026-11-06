import { describe, expect, it } from "vitest";

import {
  evaluateFounderAutonomousSafety,
} from "@/lib/github/founder-autonomous-safety-gate";

const base = {
  repository: "Vivi9max/AIOS-Alpha",
  branch: "main",
  path: "docs/c141-autonomous-development-live-test.md",
  currentContent: "# C141.12\n\nexisting content\n",
  proposedContent: "# C141.12\n\nexisting content\n\nverified by C141.13\n",
  objective: "Verify the autonomous development safety gate.",
};

describe("C141.13 Founder Autonomous Safety Gate", () => {
  it("allows a bounded docs change", () => {
    const result = evaluateFounderAutonomousSafety(base);
    expect(result.decision).toBe("allow");
    expect(result.blockers).toEqual([]);
    expect(result.checks).toContain("safety-gate-allow");
    expect(result.runId).toMatch(/^c141\.13-/);
  });

  it("denies protected runtime files", () => {
    const result = evaluateFounderAutonomousSafety({
      ...base,
      path: "lib/github/task-dispatch.ts",
    });
    expect(result.decision).toBe("deny");
    expect(result.blockers).toContain("protected-core-path");
  });

  it("denies secret-like content", () => {
    const result = evaluateFounderAutonomousSafety({
      ...base,
      proposedContent: `${base.proposedContent}\nGITHUB_TOKEN='github_pat_abcdefghijklmnopqrstuvwxyz1234567890'\n`,
    });
    expect(result.decision).toBe("deny");
    expect(result.blockers).toContain("secret-pattern-detected");
  });

  it("denies an unauthorized repository", () => {
    const result = evaluateFounderAutonomousSafety({
      ...base,
      repository: "someone/else",
    });
    expect(result.decision).toBe("deny");
    expect(result.blockers).toContain("repository-not-authorized");
  });

  it("denies dangerous operations", () => {
    const result = evaluateFounderAutonomousSafety({
      ...base,
      proposedContent: `${base.proposedContent}\nrm -rf /\n`,
    });
    expect(result.decision).toBe("deny");
    expect(result.blockers).toContain("dangerous-operation-detected");
  });
});

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function isSha(value: unknown): value is string {
  return typeof value === "string" && SHA_PATTERN.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

type ReceiptEvidence = {
  commitSha?: string | null;
  resultCommitSha?: string | null;
  expectedCommitSha?: string | null;
  checkoutHeadSha?: string | null;
  checkoutRef?: string | null;
};

type ReceiptEvaluation = {
  complete: boolean;
  blockers: string[];
};

function evaluateReceiptEvidence(evidence: ReceiptEvidence): ReceiptEvaluation {
  const blockers: string[] = [];

  const checkoutRef = evidence.checkoutRef;
  if (!isNonEmptyString(checkoutRef)) {
    blockers.push("missing-checkout-ref");
  }

  const commitSha = evidence.commitSha;
  if (!isNonEmptyString(commitSha)) {
    blockers.push("missing-commit-sha");
  } else if (!isSha(commitSha)) {
    blockers.push("invalid-commit-sha");
  }

  const resultCommitSha = evidence.resultCommitSha;
  if (!isNonEmptyString(resultCommitSha)) {
    blockers.push("missing-result-commit-sha");
  } else if (!isSha(resultCommitSha)) {
    blockers.push("invalid-result-commit-sha");
  }

  const expectedCommitSha = evidence.expectedCommitSha;
  if (!isNonEmptyString(expectedCommitSha)) {
    blockers.push("missing-expected-commit-sha");
  } else if (!isSha(expectedCommitSha)) {
    blockers.push("invalid-expected-commit-sha");
  }

  const checkoutHeadSha = evidence.checkoutHeadSha;
  if (!isNonEmptyString(checkoutHeadSha)) {
    blockers.push("missing-checkout-head-sha");
  } else if (!isSha(checkoutHeadSha)) {
    blockers.push("invalid-checkout-head-sha");
  }

  if (
    isSha(commitSha) &&
    isSha(resultCommitSha) &&
    isSha(expectedCommitSha) &&
    isSha(checkoutHeadSha)
  ) {
    const reference = commitSha.toLowerCase();
    if (
      resultCommitSha.toLowerCase() !== reference ||
      expectedCommitSha.toLowerCase() !== reference ||
      checkoutHeadSha.toLowerCase() !== reference
    ) {
      blockers.push("mismatched-sha");
    }
  }

  return { complete: blockers.length === 0, blockers };
}

const validShaA = "a".repeat(40);
const validShaB = "b".repeat(40);

describe("C170.6.12-R2 strict receipt evidence", () => {
  it("fails closed when commitSha is missing", () => {
    const result = evaluateReceiptEvidence({
      commitSha: null,
      resultCommitSha: validShaA,
      expectedCommitSha: validShaA,
      checkoutHeadSha: validShaA,
      checkoutRef: "c169-8-ad-ad-1793971076282-vfugez-repair-2",
    });
    expect(result.complete).toBe(false);
    expect(result.blockers).toContain("missing-commit-sha");
  });

  it("fails closed when a SHA is invalid", () => {
    const result = evaluateReceiptEvidence({
      commitSha: "not-a-sha",
      resultCommitSha: validShaA,
      expectedCommitSha: validShaA,
      checkoutHeadSha: validShaA,
      checkoutRef: "c169-8-ad-ad-1793971076282-vfugez-repair-2",
    });
    expect(result.complete).toBe(false);
    expect(result.blockers).toContain("invalid-commit-sha");
  });

  it("fails closed when SHAs mismatch", () => {
    const result = evaluateReceiptEvidence({
      commitSha: validShaA,
      resultCommitSha: validShaB,
      expectedCommitSha: validShaA,
      checkoutHeadSha: validShaA,
      checkoutRef: "c169-8-ad-ad-1793971076282-vfugez-repair-2",
    });
    expect(result.complete).toBe(false);
    expect(result.blockers).toContain("mismatched-sha");
  });

  it("fails closed when checkoutRef is missing", () => {
    const result = evaluateReceiptEvidence({
      commitSha: validShaA,
      resultCommitSha: validShaA,
      expectedCommitSha: validShaA,
      checkoutHeadSha: validShaA,
      checkoutRef: null,
    });
    expect(result.complete).toBe(false);
    expect(result.blockers).toContain("missing-checkout-ref");
  });

  it("fails closed on detached checkout without SHA evidence", () => {
    const result = evaluateReceiptEvidence({
      commitSha: null,
      resultCommitSha: null,
      expectedCommitSha: null,
      checkoutHeadSha: null,
      checkoutRef: null,
    });
    expect(result.complete).toBe(false);
    expect(result.blockers).toContain("missing-checkout-ref");
    expect(result.blockers).toContain("missing-commit-sha");
    expect(result.blockers).toContain("missing-result-commit-sha");
    expect(result.blockers).toContain("missing-expected-commit-sha");
    expect(result.blockers).toContain("missing-checkout-head-sha");
  });

  it("passes when all evidence matches case-insensitively", () => {
    const upper = validShaA.toUpperCase();
    const result = evaluateReceiptEvidence({
      commitSha: validShaA,
      resultCommitSha: upper,
      expectedCommitSha: validShaA,
      checkoutHeadSha: upper,
      checkoutRef: "c169-8-ad-ad-1793971076282-vfugez-repair-2",
    });
    expect(result.complete).toBe(true);
    expect(result.blockers).toEqual([]);
  });
});
