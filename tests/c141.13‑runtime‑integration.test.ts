import { dispatchGitHubTask } from "../lib/github/task-dispatch";
import { readGitHubFile, writeGitHubFile } from "@/lib/github/bridge";
import type { FounderDevelopmentContract } from "../lib/github/founder-development-contract";

jest.mock("../lib/github/c141.13-safety-gate", () => ({
  evaluateFounderAutonomousSafety: jest.fn(),
}));

jest.mock("@/lib/github/bridge", () => ({
  getGitHubRepository: jest.fn().mockResolvedValue({ success: true }),
  githubBridgeStatus: jest.fn().mockResolvedValue({ success: true }),
  readGitHubFile: jest.fn().mockResolvedValue({
    success: true,
    data: { sha: "mock-sha", size: 100, content: "old content" },
  }),
  writeGitHubFile: jest.fn(),
}));

jest.mock("../lib/github/founder-contract-enforcement", () => ({
  enforceFounderContract: jest.fn(),
}));

const mockContract: FounderDevelopmentContract = {
  founderId: "test-founder",
  authorized: true,
  contractVersion: "C141.12",
};

describe("C141.13 Runtime Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Case A: Safety Gate ALLOW → writeGitHubFile is called", async () => {
    const { evaluateFounderAutonomousSafety } = require("../lib/github/c141.13-safety-gate");
    evaluateFounderAutonomousSafety.mockResolvedValue({ allowed: true, reason: "ok" });

    const res = await dispatchGitHubTask({
      action: "write",
      path: "lib/test.ts",
      content: "new content",
      contract: mockContract,
    });

    expect(res.success).toBe(true);
    expect(writeGitHubFile).toHaveBeenCalled();
  });

  test("Case B: Safety Gate DENY → writeGitHubFile NOT called, return AUTONOMOUS_SAFETY_GATE_DENIED", async () => {
    const { evaluateFounderAutonomousSafety } = require("../lib/github/c141.13-safety-gate");
    evaluateFounderAutonomousSafety.mockResolvedValue({ allowed: false, reason: "unsafe operation" });

    const res = await dispatchGitHubTask({
      action: "write",
      path: "lib/test.ts",
      content: "new content",
      contract: mockContract,
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe("AUTONOMOUS_SAFETY_GATE_DENIED");
    expect(res.error).toBe("unsafe operation");
    // 核心断言：writeGitHubFile 完全没有被调用
    expect(writeGitHubFile).not.toHaveBeenCalled();
  });
});
