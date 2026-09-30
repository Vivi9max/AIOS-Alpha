import "server-only";

import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

import { isFounderConfigured, isFounderRequest } from "@/lib/founder/auth";

import {
  blockAutonomousDevelopmentTask,
  claimAutonomousDevelopmentTask,
  completeAutonomousDevelopmentTask,
  createAutonomousDevelopmentTask,
  getAutonomousDevelopmentTask,
  listAutonomousDevelopmentTasks,
} from "@/lib/github/autonomous-development-control-plane";

import { dispatchNextPlannerDevelopmentTask } from "@/lib/github/planner-autonomous-dispatch";
import { executeClaimedAutonomousDevelopmentTask } from "@/lib/github/autonomous-development-executor";
import { executeAutonomousDevelopmentAgent } from "@/lib/github/autonomous-development-agent";
import { dispatchGitHubTask } from "@/lib/github/task-dispatch";
import { createFounderDevelopmentContract } from "@/lib/github/founder-development-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_REPOSITORY = "Vivi9max/AIOS-Alpha";
const DEFAULT_BRANCH = "main";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function requireFounder(
  request: NextRequest,
):
  | { ok: true }
  | { ok: false; response: NextResponse } {
  if (!isFounderConfigured()) {
    return {
      ok: false,
      response: json(
        {
          ok: false,
          code: "FOUNDER_NOT_CONFIGURED",
          error: "Founder access is not configured.",
        },
        503,
      ),
    };
  }

  if (!isFounderRequest(request)) {
    return {
      ok: false,
      response: json(
        {
          ok: false,
          code: "FOUNDER_UNAUTHORIZED",
          error: "Founder authorization failed.",
        },
        401,
      ),
    };
  }

  return {
    ok: true,
  };
}

function createContract(input: {
  objective: string;
  path: string;
  commitMessage?: string;
}) {
  return createFounderDevelopmentContract({
    objective: input.objective,
    requestedFiles: [input.path],
    actions: ["read", "write", "verify"],
    verification: ["readback", "build", "production"],
    commitMessage:
      input.commitMessage?.trim() ||
      "feat(C167.12): founder autonomous development",
  });
}

export async function GET(request: NextRequest) {
  const auth = requireFounder(request);

  if (!auth.ok) {
    return auth.response;
  }

  const taskId = request.nextUrl.searchParams.get("taskId");
  const objective = request.nextUrl.searchParams.get("objective");

  if (taskId) {
    const task = getAutonomousDevelopmentTask(taskId);

    if (!task) {
      return json(
        {
          ok: false,
          code: "TASK_NOT_FOUND",
        },
        404,
      );
    }

    return json({
      ok: true,
      task,
    });
  }

  const tasks = listAutonomousDevelopmentTasks();

  if (objective?.trim()) {
    const matchingTasks = tasks
      .filter(
        (task) =>
          task.objective.trim() === objective.trim(),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

    return json({
      ok: true,
      repository: DEFAULT_REPOSITORY,
      branch: DEFAULT_BRANCH,
      tasks: matchingTasks,
    });
  }

  return json({
    ok: true,
    repository: DEFAULT_REPOSITORY,
    branch: DEFAULT_BRANCH,
    tasks,
  });
}

export async function POST(request: NextRequest) {
  const auth = requireFounder(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "autonomous") {
      const objective = String(
        body?.objective ?? "",
      ).trim();

      if (!objective) {
        return json(
          {
            ok: false,
            code: "AUTONOMOUS_OBJECTIVE_REQUIRED",
            error: "Development objective is required.",
          },
          400,
        );
      }

      after(async () => {
        try {
          await executeAutonomousDevelopmentAgent({
            objective,
          });
        } catch {
          return;
        }
      });

      return json(
        {
          ok: true,
          success: true,
          code: "AUTONOMOUS_DEVELOPMENT_STARTED",
          repository: DEFAULT_REPOSITORY,
          branch: DEFAULT_BRANCH,
          objective,
          status: "running",
          message:
            "Autonomous development started. The AIOS agent is running in the background.",
        },
        202,
      );
    }

    if (action === "create") {
      const task = createAutonomousDevelopmentTask({
        objective: String(body?.objective ?? ""),
        targetPaths: Array.isArray(body?.targetPaths)
          ? body.targetPaths.map(String)
          : [],
      });

      return json(
        {
          ok: true,
          action,
          task,
        },
        201,
      );
    }

    if (action === "claim") {
      const task = claimAutonomousDevelopmentTask(
        String(body?.taskId ?? ""),
      );

      return json({
        ok: true,
        action,
        task,
      });
    }

    if (action === "dispatch-planner") {
      const dispatch =
        await dispatchNextPlannerDevelopmentTask();

      return json(
        {
          ok: dispatch.success,
          action,
          ...dispatch,
        },
        dispatch.eligibility === "blocked"
          ? 409
          : 200,
      );
    }

    if (action === "execute-planner") {
      const dispatch =
        await dispatchNextPlannerDevelopmentTask();

      if (
        !dispatch.success ||
        !dispatch.autonomousTask?.id
      ) {
        return json(
          {
            ok: false,
            action,
            ...dispatch,
          },
          409,
        );
      }

      const execution =
        await executeClaimedAutonomousDevelopmentTask(
          dispatch.autonomousTask.id,
        );

      return json(
        {
          ok: execution.success,
          action,
          dispatch,
          execution,
        },
        execution.success ? 200 : 409,
      );
    }

    if (action === "execute") {
      const objective = String(
        body?.objective ?? "",
      ).trim();

      const path = String(
        body?.path ?? "",
      ).trim();

      const content =
        typeof body?.content === "string"
          ? body.content
          : null;

      if (
        !objective ||
        !path ||
        content === null
      ) {
        return json(
          {
            ok: false,
            code: "EXECUTE_INPUT_REQUIRED",
            error:
              "objective, path and content are required.",
          },
          400,
        );
      }

      const commitMessage =
        String(
          body?.commitMessage ?? "",
        ).trim() ||
        "feat(C167.12): founder autonomous development";

      const contract = createContract({
        objective,
        path,
        commitMessage,
      });

      const result =
        await dispatchGitHubTask({
          action: "write",
          repo: DEFAULT_REPOSITORY,
          branch: DEFAULT_BRANCH,
          path,
          content,
          commitMessage,
          contract,
          request,
        });

      return json(
        {
          ok: result.success,
          ...result,
        },
        result.success ? 200 : 409,
      );
    }

    if (action === "complete") {
      const receipt =
        completeAutonomousDevelopmentTask(
          String(body?.taskId ?? ""),
          {
            commitSha: String(
              body?.commitSha ?? "",
            ),
            readbackVerified:
              body?.readbackVerified === true,
            verificationPassed:
              body?.verificationPassed === true,
          },
        );

      return json({
        ok:
          receipt.status ===
          "completed",
        action,
        receipt,
      });
    }

    if (action === "block") {
      const receipt =
        blockAutonomousDevelopmentTask(
          String(body?.taskId ?? ""),
          String(
            body?.reason ??
              "Blocked by Founder.",
          ),
        );

      return json(
        {
          ok: false,
          action,
          receipt,
        },
        409,
      );
    }

    return json(
      {
        ok: false,
        code: "UNKNOWN_ACTION",
        error:
          "Unsupported autonomous development action.",
        allowedActions: [
          "autonomous",
          "create",
          "claim",
          "dispatch-planner",
          "execute-planner",
          "execute",
          "complete",
          "block",
        ],
      },
      400,
    );
  } catch (error) {
    return json(
      {
        ok: false,
        code:
          "AUTONOMOUS_DEVELOPMENT_REQUEST_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Autonomous development request failed.",
      },
      500,
    );
  }
}
