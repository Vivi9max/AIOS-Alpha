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
