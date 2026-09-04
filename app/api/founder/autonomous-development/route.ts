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
  blockAutonomousDevelopmentTask,
  claimAutonomousDevelopmentTask,
  completeAutonomousDevelopmentTask,
  createAutonomousDevelopmentTask,
  getAutonomousDevelopmentTask,
  listAutonomousDevelopmentTasks,
} from "@/lib/github/autonomous-development-control-plane";

import {
  dispatchNextPlannerDevelopmentTask,
} from "@/lib/github/planner-autonomous-dispatch";

import {
  executeClaimedAutonomousDevelopmentTask,
} from "@/lib/github/autonomous-development-executor";

import {
  dispatchGitHubTask,
} from "@/lib/github/task-dispatch";

import {
  createFounderDevelopmentContract,
} from "@/lib/github/founder-development-contract";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const DEFAULT_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const DEFAULT_BRANCH =
  "main";

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

function requireFounder(
  request: NextRequest,
):
  | {
      ok: true;
    }
  | {
      ok: false;
      response: NextResponse;
    } {
  if (
    !isFounderConfigured()
  ) {
    return {
      ok: false,
      response: json(
        {
          ok: false,
          code:
            "FOUNDER_NOT_CONFIGURED",
          error:
            "Founder access is not configured.",
        },
        503,
      ),
    };
  }

  if (
    !isFounderRequest(request)
  ) {
    return {
      ok: false,
      response: json(
        {
          ok: false,
          code:
            "FOUNDER_UNAUTHORIZED",
          error:
            "Founder authorization failed.",
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
    objective:
      input.objective,

    requestedFiles: [
      input.path,
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

    commitMessage:
      input.commitMessage?.trim() ||
      "feat(C142.4): execute founder autonomous development task",
  });
}

export async function GET(
  request: NextRequest,
) {
  const auth =
    requireFounder(request);

  if (!auth.ok) {
    return auth.response;
  }

  const taskId =
    request.nextUrl.searchParams.get(
      "taskId",
    );

  if (taskId) {
    const task =
      getAutonomousDevelopmentTask(
        taskId,
      );

    if (!task) {
      return json(
        {
          ok: false,
          code:
            "TASK_NOT_FOUND",
        },
        404,
      );
    }

    return json({
      ok: true,
      task,
    });
  }

  return json({
    ok: true,
    tasks:
      listAutonomousDevelopmentTasks(),
  });
}

export async function POST(
  request: NextRequest,
) {
  const auth =
    requireFounder(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body =
      await request.json();

    const action =
      body?.action;

    if (
      action === "create"
    ) {
      const task =
        createAutonomousDevelopmentTask({
          objective:
            String(
              body?.objective ??
                "",
            ),

          targetPaths:
            Array.isArray(
              body?.targetPaths,
            )
              ? body.targetPaths.map(
                  String,
                )
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

    if (
      action === "claim"
    ) {
      const task =
        claimAutonomousDevelopmentTask(
          String(
            body?.taskId ??
              "",
          ),
        );

      return json({
        ok: true,
        action,
        task,
      });
    }

    /*
     * C142.3
     *
     * Planner
     *   →
     * Eligibility
     *   →
     * Autonomous Development Task
     *   →
     * Claim
     */
    if (
      action ===
      "dispatch-planner"
    ) {
      const dispatch =
        await dispatchNextPlannerDevelopmentTask();

      if (
        !dispatch.success
      ) {
        return json(
          {
            ok: false,
            action,
            ...dispatch,
          },
          dispatch.eligibility ===
            "blocked"
            ? 409
            : 200,
        );
      }

      return json({
        ok: true,
        action,
        ...dispatch,
      });
    }

    /*
     * C142.4
     *
     * Planner
     *   →
     * Development Intent
     *   →
     * Target Path
     *   →
     * Eligibility
     *   →
     * Claim
     *   →
     * READ
     *   →
     * ANALYZE
     *   →
     * PLAN
     *   →
     * GENERATE
     *   →
     * C141 WRITE
     *   →
     * COMMIT
     *   →
     * READBACK
     *   →
     * VERIFY
     */
    if (
      action ===
      "execute-planner"
    ) {
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
          dispatch.eligibility ===
            "blocked"
            ? 409
            : 200,
        );
      }

      const execution =
        await executeClaimedAutonomousDevelopmentTask(
          dispatch.autonomousTask.id,
        );

      return json(
        {
          ok:
            execution.success,
          action,
          planner:
            dispatch,
          execution,
        },
        execution.success
          ? 200
          : 502,
      );
    }

    /*
     * C142.2
     *
     * Manual Founder autonomous execution.
     *
     * This existing path remains available.
     */
    if (
      action === "execute"
    ) {
      const objective =
        String(
          body?.objective ??
            "",
        ).trim();

      const path =
        String(
          body?.path ??
            "",
        ).trim();

      const content =
        typeof body?.content ===
        "string"
          ? body.content
          : undefined;

      const commitMessage =
        typeof body?.commitMessage ===
        "string"
          ? body.commitMessage.trim()
          : undefined;

      if (!objective) {
        return json(
          {
            ok: false,
            code:
              "DEVELOPMENT_OBJECTIVE_REQUIRED",
          },
          400,
        );
      }

      if (!path) {
        return json(
          {
            ok: false,
            code:
              "TARGET_PATH_REQUIRED",
          },
          400,
        );
      }

      if (
        content === undefined
      ) {
        return json(
          {
            ok: false,
            code:
              "WRITE_CONTENT_REQUIRED",
          },
          400,
        );
      }

      const task =
        createAutonomousDevelopmentTask({
          objective,
          targetPaths: [
            path,
          ],
        });

      const claimed =
        claimAutonomousDevelopmentTask(
          task.id,
        );

      const contract =
        createContract({
          objective,
          path,
          commitMessage,
        });

      let github;

      try {
        github =
          await dispatchGitHubTask({
            action: "write",
            repo:
              DEFAULT_REPOSITORY,
            branch:
              DEFAULT_BRANCH,
            path,
            content,
            commitMessage,
            contract,
          });
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message
            : "GitHub autonomous execution failed.";

        const blocked =
          blockAutonomousDevelopmentTask(
            claimed.id,
            reason,
          );

        return json(
          {
            ok: false,
            action,
            code:
              "AUTONOMOUS_EXECUTION_BLOCKED",
            task:
              getAutonomousDevelopmentTask(
                claimed.id,
              ),
            blocked,
            error:
              reason,
          },
          502,
        );
      }

      if (
        !github.success
      ) {
        const reason =
          github.error ||
          github.code ||
          "GitHub autonomous development execution failed.";

        const blocked =
          blockAutonomousDevelopmentTask(
            claimed.id,
            reason,
          );

        return json(
          {
            ok: false,
            action,
            code:
              "AUTONOMOUS_EXECUTION_FAILED",
            task:
              getAutonomousDevelopmentTask(
                claimed.id,
              ),
            blocked,
            github,
            error:
              reason,
          },
          502,
        );
      }

      const commitSha =
        github.write
          ?.commitSha || "";

      const readbackVerified =
        github.write
          ?.readbackVerified ===
        true;

      const verificationPassed =
        github.success === true &&
        readbackVerified === true;

      const receipt =
        completeAutonomousDevelopmentTask(
          claimed.id,
          {
            commitSha,
            readbackVerified,
            verificationPassed,
          },
        );

      return json({
        ok:
          github.success,
        action,
        task:
          claimed,
        github,
        receipt,
      });
    }

    if (
      action === "complete"
    ) {
      const receipt =
        completeAutonomousDevelopmentTask(
          String(
            body?.taskId ??
              "",
          ),
          {
            commitSha:
              String(
                body?.commitSha ??
                  "",
              ),

            readbackVerified:
              body?.readbackVerified ===
              true,

            verificationPassed:
              body?.verificationPassed ===
              true,
          },
        );

      return json({
        ok: true,
        action,
        receipt,
      });
    }

    return json(
      {
        ok: false,
        code:
          "UNKNOWN_ACTION",
        allowedActions: [
          "create",
          "claim",
          "dispatch-planner",
          "execute-planner",
          "execute",
          "complete",
        ],
      },
      400,
    );
  } catch (error) {
    return json(
      {
        ok: false,
        code:
          "AUTONOMOUS_DEVELOPMENT_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Unknown autonomous development error.",
      },
      400,
    );
  }
}
