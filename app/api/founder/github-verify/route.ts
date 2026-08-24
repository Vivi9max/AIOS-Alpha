import { NextRequest, NextResponse } from "next/server";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

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
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isFounderConfigured()) {
    return json(
      {
        success: false,
        error: "Founder access is not configured.",
        code: "FOUNDER_NOT_CONFIGURED",
      },
      503,
    );
  }

  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,
        error: "Founder authorization failed.",
        code: "FOUNDER_UNAUTHORIZED",
      },
      401,
    );
  }

  const startedAt = Date.now();

  try {
    const statusResult = await githubBridgeStatus();

    if (!statusResult.success) {
      return json(
        {
          success: false,
          phase: "connection",
          checks: {
            connection: "PASS",
            authentication: "FAIL",
            repository: "NOT_RUN",
            read: "NOT_RUN",
            write: "NOT_RUN",
            commit: "NOT_RUN",
          },
          error:
            statusResult.error || "GitHub authentication failed.",
          durationMs: Date.now() - startedAt,
        },
        502,
      );
    }

    const repoResult = await getGitHubRepository({
      repo: TEST_REPO,
    });

    if (!repoResult.success || !repoResult.data) {
      return json(
        {
          success: false,
          phase: "repository",
          checks: {
            connection: "PASS",
            authentication: "PASS",
            repository: "FAIL",
            read: "NOT_RUN",
            write: "NOT_RUN",
            commit: "NOT_RUN",
          },
          account: statusResult.account,
          repository: TEST_REPO,
          error:
            repoResult.error || "Repository access failed.",
          durationMs: Date.now() - startedAt,
        },
        502,
      );
    }

    const readResult = await readGitHubFile({
      repo: TEST_REPO,
      path: READ_PATH,
      ref: TEST_BRANCH,
    });

    if (!readResult.success || !readResult.data) {
      return json(
        {
          success: false,
          phase: "read",
          checks: {
            connection: "PASS",
            authentication: "PASS",
            repository: "PASS",
            read: "FAIL",
            write: "NOT_RUN",
            commit: "NOT_RUN",
          },
          account: statusResult.account,
          repository: TEST_REPO,
          error:
            readResult.error || "GitHub read failed.",
          durationMs: Date.now() - startedAt,
        },
        502,
      );
    }

    const timestamp = new Date().toISOString();

    const payload = JSON.stringify(
      {
        test: "C141 GitHub Direct Bridge Live Verification",
        status: "passed",
        timestamp,
        environment:
          process.env.VERCEL_ENV ||
          process.env.NODE_ENV ||
          "unknown",
        repository: TEST_REPO,
        branch: TEST_BRANCH,
        readPath: READ_PATH,
      },
      null,
      2,
    );

    const existingTestFile = await readGitHubFile({
      repo: TEST_REPO,
      path: TEST_PATH,
      ref: TEST_BRANCH,
    });

    const writeResult = await writeGitHubFile({
      repo: TEST_REPO,
      path: TEST_PATH,
      content: payload,
      message:
        "test(c141): verify GitHub Direct Bridge live write",
      branch: TEST_BRANCH,
      sha: existingTestFile.success
        ? existingTestFile.data?.sha
        : undefined,
    });

    if (!writeResult.success || !writeResult.data) {
      return json(
        {
          success: false,
          phase: "write",
          checks: {
            connection: "PASS",
            authentication: "PASS",
            repository: "PASS",
            read: "PASS",
            write: "FAIL",
            commit: "FAIL",
          },
          account: statusResult.account,
          repository: TEST_REPO,
          read: {
            path: READ_PATH,
            size: readResult.data.size,
            sha: readResult.data.sha,
          },
          error:
            writeResult.error || "GitHub write failed.",
          durationMs: Date.now() - startedAt,
        },
        502,
      );
    }

    return json({
      success: true,
      phase: "complete",
      checks: {
        connection: "PASS",
        authentication: "PASS",
        repository: "PASS",
        read: "PASS",
        write: "PASS",
        commit: "PASS",
      },
      account: statusResult.account,
      repository: {
        fullName: repoResult.data.full_name,
        private: repoResult.data.private,
        defaultBranch: repoResult.data.default_branch,
        permissions: repoResult.data.permissions,
      },
      read: {
        path: READ_PATH,
        size: readResult.data.size,
        sha: readResult.data.sha,
      },
      write: {
        path: TEST_PATH,
        sha: writeResult.data.content?.sha,
      },
      commit: {
        sha: writeResult.data.commit.sha,
        url: writeResult.data.commit.html_url,
      },
      timestamp,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return json(
      {
        success: false,
        phase: "error",
        error:
          error instanceof Error
            ? error.message
            : "GitHub live verification failed.",
        durationMs: Date.now() - startedAt,
      },
      500,
    );
  }
}
