import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  dispatchGitHubTask,
  type GitHubTaskRequest,
} from "@/lib/github/task-dispatch";

import {
  createFounderDevelopmentContract,
} from "@/lib/github/founder-development-contract";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderConfigured()
  ) {
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

  if (
    !isFounderRequest(request)
  ) {
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

  try {
    const body =
      await request.json();

    const action =
      body?.action;

    if (
      action !== "read" &&
      action !== "write"
    ) {
      return json(
        {
          success: false,
          code:
            "INVALID_GITHUB_ACTION",
          error:
            "GitHub action must be read or write.",
        },
        400,
      );
    }

    const path =
      typeof body?.path ===
      "string"
        ? body.path.trim()
        : "";

    if (!path) {
      return json(
        {
          success: false,
          code:
            "GITHUB_PATH_REQUIRED",
          error:
            "GitHub path is required.",
        },
        400,
      );
    }

    const content =
      typeof body?.content ===
      "string"
        ? body.content
        : undefined;

    if (
      action === "write" &&
      content === undefined
    ) {
      return json(
        {
          success: false,
          code:
            "WRITE_CONTENT_REQUIRED",
          error:
            "Write operations require content.",
        },
        400,
      );
    }

    const objective =
      typeof body?.objective ===
      "string"
        ? body.objective.trim()
        : `Founder-authorized GitHub ${action} operation for ${path}.`;

    const commitMessage =
      typeof body?.commitMessage ===
        "string" &&
      body.commitMessage.trim()
        ? body.commitMessage.trim()
        : "feat(C166.3): execute founder GitHub OAuth bridge task";

    const contract =
      createFounderDevelopmentContract({
        objective,
        requestedFiles: [
          path,
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

    const dispatchReq:
      GitHubTaskRequest = {
      action,
      repo:
        "Vivi9max/AIOS-Alpha",
      branch:
        "main",
      path,
      content,
      commitMessage,
      contract,
      request,
    };

    const result =
      await dispatchGitHubTask(
        dispatchReq,
      );

    const httpStatus =
      result.code ===
      "FOUNDER_CONTRACT_REJECTED"
        ? 403
        : result.success
          ? 200
          : 502;

    return NextResponse.json(
      result,
      {
        status:
          httpStatus,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return json(
      {
        success: false,
        code:
          "FOUNDER_GITHUB_DISPATCH_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Unknown dispatch error.",
      },
      400,
    );
  }
}
