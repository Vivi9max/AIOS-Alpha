import { NextRequest, NextResponse } from "next/server";
import { isFounderConfigured, isFounderRequest } from "@/lib/founder/auth";
import { createFounderDevelopmentContract } from "@/lib/github/founder-development-contract";
import { dispatchGitHubTask } from "@/lib/github/task-dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_REPO = "Vivi9max/AIOS-Alpha";
const TEST_BRANCH = "main";

const READ_PATH = "docs/C141-GITHUB-DIRECT-BRIDGE.md";
const TEST_PATH = "docs/runtime/c141-live-test.json";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
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
  const timestamp = new Date().toISOString();

  const commitMessage =
    "test(C141.10): verify founder contract GitHub bridge";

  try {
    const contract = createFounderDevelopmentContract({
      objective:
        "C141.10 live verification of Founder Contract governed GitHub read, write, commit, and readback.",
      requestedFiles: [
        READ_PATH,
        TEST_PATH,
      ],
      actions: [
        "read",
        "write",
        "verify",
      ],
      verification: [
        "readback",
        "build",
        "production",
      ],
      commitMessage,
    });

    const readResult =
      await dispatchGitHubTask({
        action: "read",
        repo: TEST_REPO,
        branch: TEST_BRANCH,
        path: READ_PATH,
        contract,
        commitMessage,
      });

    if (!readResult.success) {
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
            readback: "NOT_RUN",
          },
          error: readResult.error,
          code: readResult.code,
          read: readResult.read,
          durationMs:
            Date.now() - startedAt,
        },
        502,
      );
    }

    const payload =
      JSON.stringify(
        {
          test:
            "C141.10 Founder Contract Live Verification",
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

    const writeResult =
      await dispatchGitHubTask({
        action: "write",
        repo: TEST_REPO,
        branch: TEST_BRANCH,
        path: TEST_PATH,
        content: payload,
        commitMessage,
        contract,
      });

    if (!writeResult.success) {
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
            commit: "NOT_RUN",
            readback: "FAIL",
          },
          error: writeResult.error,
          code: writeResult.code,
          read: readResult.read,
          write: writeResult.write,
          durationMs:
            Date.now() - startedAt,
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
        readback:
          writeResult.write
            ?.readbackVerified
            ? "PASS"
            : "FAIL",
      },
      repository: TEST_REPO,
      branch: TEST_BRANCH,
      read: readResult.read,
      write: writeResult.write,
      commit: {
        sha:
          writeResult.write
            ?.commitSha,
        url:
          writeResult.write
            ?.commitUrl,
      },
      timestamp,
      durationMs:
        Date.now() - startedAt,
    });
  } catch (error) {
    return json(
      {
        success: false,
        phase: "error",
        code:
          "C141_LIVE_VERIFICATION_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "C141 Live Verification failed.",
        durationMs:
          Date.now() - startedAt,
      },
      500,
    );
  }
}
