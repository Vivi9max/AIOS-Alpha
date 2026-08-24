import { NextRequest, NextResponse } from "next/server";
import { isFounderConfigured, isFounderRequest } from "@/lib/founder/auth";
import {
  getGitHubRepository,
  githubBridgeStatus,
  readGitHubFile,
  writeGitHubFile,
} from "@/lib/github/bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_PATH = "docs/runtime/c141-live-test.json";
const TEST_REPO = "Vivi9max/AIOS-Alpha";
const TEST_BRANCH = "main";
const READ_PATH = "docs/C141-GITHUB-DIRECT-BRIDGE.md";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getError(result: unknown, fallback: string): string {
  if (typeof result === "object" && result !== null && "error" in result) {
    const error = (result as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }
  return fallback;
}

function getData<T>(result: unknown): T | undefined {
  if (typeof result === "object" && result !== null && "data" in result) {
    return (result as { data?: T }).data;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  if (!isFounderConfigured()) {
    return json(
      { success: false, error: "Founder access is not configured.", code: "FOUNDER_NOT_CONFIGURED" },
      503,
    );
  }

  if (!isFounderRequest(request)) {
    return json(
      { success: false, error: "Founder authorization failed.", code: "FOUNDER_UNAUTHORIZED" },
      401,
    );
  }

  const startedAt = Date.now();

  try {
    const statusResult = await githubBridgeStatus();

    if (!statusResult.success) {
      return json({
        success: false,
        phase: "connection",
        checks: { connection: "PASS", authentication: "FAIL", repository: "NOT_RUN", read: "NOT_RUN", write: "NOT_RUN", commit: "NOT_RUN" },
        error: getError(statusResult, "GitHub authentication failed."),
        durationMs: Date.now() - startedAt,
      }, 502);
    }

    const repoResult = await getGitHubRepository({ repo: TEST_REPO });
    const repoData = getData<{
      full_name: string;
      private: boolean;
      default_branch: string;
      permissions?: { admin?: boolean; push?: boolean; pull?: boolean };
    }>(repoResult);

    if (!repoResult.success || !repoData) {
      return json({
        success: false,
        phase: "repository",
        checks: { connection: "PASS", authentication: "PASS", repository: "FAIL", read: "NOT_RUN", write: "NOT_RUN", commit: "NOT_RUN" },
        account: statusResult.account,
        repository: TEST_REPO,
        error: getError(repoResult, "Repository access failed."),
        durationMs: Date.now() - startedAt,
      }, 502);
    }

    const readResult = await readGitHubFile({
      repo: TEST_REPO,
      path: READ_PATH,
      ref: TEST_BRANCH,
    });
    const readData = getData<{
      path: string;
      sha: string;
      size: number;
    }>(readResult);

    if (!readResult.success || !readData) {
      return json({
        success: false,
        phase: "read",
        checks: { connection: "PASS", authentication: "PASS", repository: "PASS", read: "FAIL", write: "NOT_RUN", commit: "NOT_RUN" },
        account: statusResult.account,
        repository: TEST_REPO,
        error: getError(readResult, "GitHub read failed."),
        durationMs: Date.now() - startedAt,
      }, 502);
    }

    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({
      test: "C141 GitHub Direct Bridge Live Verification",
      status: "passed",
      timestamp,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      repository: TEST_REPO,
      branch: TEST_BRANCH,
      readPath: READ_PATH,
    }, null, 2);

    const existingTestFile = await readGitHubFile({
      repo: TEST_REPO,
      path: TEST_PATH,
      ref: TEST_BRANCH,
    });
    const existingData = getData<{ sha: string }>(existingTestFile);

    const writeResult = await writeGitHubFile({
      repo: TEST_REPO,
      path: TEST_PATH,
      content: payload,
      message: "test(c141): verify GitHub Direct Bridge live write",
      branch: TEST_BRANCH,
      sha: existingData?.sha,
    });
    const writeData = getData<{
      commit: { sha: string; html_url?: string };
      content?: { path: string; sha: string };
    }>(writeResult);

    if (!writeResult.success || !writeData) {
      return json({
        success: false,
        phase: "write",
        checks: { connection: "PASS", authentication: "PASS", repository: "PASS", read: "PASS", write: "FAIL", commit: "FAIL" },
        account: statusResult.account,
        repository: TEST_REPO,
        read: { path: readData.path, size: readData.size, sha: readData.sha },
        error: getError(writeResult, "GitHub write failed."),
        durationMs: Date.now() - startedAt,
      }, 502);
    }

    return json({
      success: true,
      phase: "complete",
      checks: { connection: "PASS", authentication: "PASS", repository: "PASS", read: "PASS", write: "PASS", commit: "PASS" },
      account: statusResult.account,
      repository: {
        fullName: repoData.full_name,
        private: repoData.private,
        defaultBranch: repoData.default_branch,
        permissions: repoData.permissions,
      },
      read: { path: readData.path, size: readData.size, sha: readData.sha },
      write: { path: TEST_PATH, sha: writeData.content?.sha },
      commit: { sha: writeData.commit.sha, url: writeData.commit.html_url },
      timestamp,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return json({
      success: false,
      phase: "error",
      error: error instanceof Error ? error.message : "GitHub live verification failed.",
      durationMs: Date.now() - startedAt,
    }, 500);
  }
}
