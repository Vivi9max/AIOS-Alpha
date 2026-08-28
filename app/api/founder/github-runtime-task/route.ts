import { NextRequest, NextResponse } from "next/server";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  executeFounderRuntimeGitHubTask,
  type FounderRuntimeGitHubTask,
} from "@/lib/github/founder-runtime-task";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      ...body,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isValidAction(
  value: unknown,
): value is FounderRuntimeGitHubTask["action"] {
  return value === "read" || value === "write";
}

export async function POST(
  request: NextRequest,
) {
  if (!isFounderConfigured()) {
    return response(
      {
        success: false,
        code: "FOUNDER_NOT_CONFIGURED",
        error:
          "Founder access is not configured.",
      },
      503,
    );
  }

  if (!isFounderRequest(request)) {
    return response(
      {
        success: false,
        code: "FOUNDER_UNAUTHORIZED",
        error:
          "Founder authorization failed.",
      },
      401,
    );
  }

  try {
    const body =
      (await request
        .json()
        .catch(() => null)) as
        | Record<string, unknown>
        | null;

    if (!body) {
      return response(
        {
          success: false,
          code: "INVALID_REQUEST_BODY",
          error:
            "A JSON request body is required.",
        },
        400,
      );
    }

    const action = body.action;

    if (!isValidAction(action)) {
      return response(
        {
          success: false,
          code: "INVALID_GITHUB_ACTION",
          error:
            'Action must be "read" or "write".',
        },
        400,
      );
    }

    const path =
      typeof body.path === "string"
        ? body.path.trim()
        : "";

    if (!path) {
      return response(
        {
          success: false,
          code: "GITHUB_PATH_REQUIRED",
          error:
            "A GitHub repository path is required.",
        },
        400,
      );
    }

    const content =
      typeof body.content === "string"
        ? body.content
        : undefined;

    if (
      action === "write" &&
      typeof content !== "string"
    ) {
      return response(
        {
          success: false,
          code: "WRITE_CONTENT_REQUIRED",
          error:
            "Write operations require content.",
        },
        400,
      );
    }

    const commitMessage =
      typeof body.commitMessage === "string" &&
      body.commitMessage.trim()
        ? body.commitMessage.trim()
        : undefined;

    const objective =
      typeof body.objective === "string" &&
      body.objective.trim()
        ? body.objective.trim()
        : undefined;

    const result =
      await executeFounderRuntimeGitHubTask({
        action,
        path,
        content,
        commitMessage,
        objective,
      });

    return response(
      {
        success: result.success,
        code: result.code,
        task: result.task,
        github: result.github,
      },
      result.success ? 200 : 502,
    );
  } catch (error) {
    return response(
      {
        success: false,
        code:
          "FOUNDER_RUNTIME_GITHUB_TASK_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Founder Runtime GitHub task failed.",
      },
      500,
    );
  }
}
