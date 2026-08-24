import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getFounderAuthDiagnostics,
  isFounderConfigured,
} from "@/lib/founder/auth";

import {
  createExecutionJob,
  markExecutionJobCompleted,
  markExecutionJobFailed,
  markExecutionJobRunning,
} from "@/lib/execution/job-store";

import {
  dispatchGitHubTask,
} from "@/lib/github/task-dispatch";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const MAX_GOAL_LENGTH =
  1000;

interface DispatchBody {
  action?: unknown;
  repo?: unknown;
  branch?: unknown;
  path?: unknown;
  content?: unknown;
  commitMessage?: unknown;
  goal?: unknown;
  planId?: unknown;
  taskId?: unknown;
}

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      ...body,
      timestamp: Date.now(),
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function text(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function validAction(
  value: unknown,
): value is "read" | "write" {
  return (
    value === "read" ||
    value === "write"
  );
}

export async function POST(
  request: NextRequest,
) {
  if (!isFounderConfigured()) {
    return json(
      {
        success: false,
        code:
          "FOUNDER_NOT_CONFIGURED",
        error:
          "Founder access is not configured.",
      },
      503,
    );
  }

  const auth =
    getFounderAuthDiagnostics(
      request,
    );

  if (!auth.authenticated) {
    return json(
      {
        success: false,
        code:
          "FOUNDER_UNAUTHORIZED",
        error:
          "Founder authorization failed.",
      },
      401,
    );
  }

  const requestId =
    request.headers.get(
      "x-request-id",
    ) ?? crypto.randomUUID();

  try {
    const body =
      (await request
        .json()
        .catch(() => ({}))) as DispatchBody;

    const action =
      body.action;

    const path =
      text(body.path);

    const repo =
      text(body.repo) ||
      "Vivi9max/AIOS-Alpha";

    const branch =
      text(body.branch) ||
      "main";

    const content =
      typeof body.content ===
      "string"
        ? body.content
        : undefined;

    const commitMessage =
      text(
        body.commitMessage,
      );

    const goal =
      text(body.goal) ||
      `Autonomous GitHub ${String(
        action,
      )} task: ${path}`;

    const planId =
      text(body.planId) ||
      "alpha";

    const taskId =
      text(body.taskId) ||
      undefined;

    if (
      !validAction(action)
    ) {
      return json(
        {
          success: false,
          requestId,
          code:
            "INVALID_ACTION",
          error:
            "Supported actions: read, write.",
        },
        400,
      );
    }

    if (!path) {
      return json(
        {
          success: false,
          requestId,
          code:
            "INVALID_PATH",
          error:
            "GitHub path is required.",
        },
        400,
      );
    }

    if (
      goal.length >
      MAX_GOAL_LENGTH
    ) {
      return json(
        {
          success: false,
          requestId,
          code:
            "GOAL_TOO_LONG",
          error:
            `Goal cannot exceed ${MAX_GOAL_LENGTH} characters.`,
        },
        400,
      );
    }

    if (
      action === "write" &&
      typeof content !==
        "string"
    ) {
      return json(
        {
          success: false,
          requestId,
          code:
            "CONTENT_REQUIRED",
          error:
            "Write content is required.",
        },
        400,
      );
    }

    const job =
      await createExecutionJob({
        goal,
        planId,
        taskId,
        input:
          JSON.stringify(
            {
              action,
              repo,
              branch,
              path,
            },
            null,
            2,
          ),
      });

    await markExecutionJobRunning(
      job.id,
    );

    const result =
      await dispatchGitHubTask({
        action,
        repo,
        branch,
        path,
        content,
        commitMessage:
          commitMessage ||
          undefined,
      });

    if (!result.success) {
      const failed =
        await markExecutionJobFailed(
          job.id,
          result.error ||
            "GitHub autonomous dispatch failed.",
        );

      return json(
        {
          success: false,
          requestId,
          code:
            "GITHUB_DISPATCH_FAILED",
          job: failed,
          dispatch: result,
        },
        502,
      );
    }

    const completed =
      await markExecutionJobCompleted(
        job.id,
        JSON.stringify(
          result,
          null,
          2,
        ),
      );

    return json({
      success: true,
      requestId,
      code:
        "GITHUB_TASK_DISPATCHED",
      job: completed,
      dispatch: result,
      capability: {
        founderAuthorized:
          true,
        githubAuthenticated:
          true,
        executionRecorded:
          true,
      },
    });
  } catch (error) {
    return json(
      {
        success: false,
        requestId,
        code:
          "GITHUB_DISPATCH_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "GitHub autonomous dispatch failed.",
      },
      500,
    );
  }
}
