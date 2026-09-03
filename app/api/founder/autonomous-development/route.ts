// app/api/founder/autonomous-development/route.ts
import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

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
  dispatchGitHubTask,
  type GitHubTaskAction,
} from "@/lib/github/task-dispatch";

import {
  createFounderDevelopmentContract,
} from "@/lib/github/founder-development-contract";

export const runtime = "nodejs";

const DEFAULT_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const DEFAULT_BRANCH =
  "main";

function founderAuthorized(
  request: NextRequest,
): boolean {
  const configuredKey =
    process.env.FOUNDER_ACCESS_KEY;

  if (!configuredKey) {
    return false;
  }

  const providedKey =
    request.headers.get(
      "x-founder-access-key",
    ) ??
    request.headers
      .get("authorization")
      ?.replace(
        /^Bearer\s+/i,
        "",
      );

  return (
    Boolean(providedKey) &&
    providedKey === configuredKey
  );
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
      "feat(C142.2): execute founder autonomous development task",
  });
}

export async function GET(
  request: NextRequest,
) {
  if (!founderAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
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
      return NextResponse.json(
        {
          ok: false,
          code:
            "TASK_NOT_FOUND",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      task,
    });
  }

  return NextResponse.json({
    ok: true,
    tasks:
      listAutonomousDevelopmentTasks(),
  });
}

export async function POST(
  request: NextRequest,
) {
  if (!founderAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      await request.json();

    const action =
      body?.action;

    /*
     * C142.1 task creation remains available.
     */
    if (
      action === "create"
    ) {
      const task =
        createAutonomousDevelopmentTask({
          objective: String(
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

      return NextResponse.json(
        {
          ok: true,

          action,

          task,
        },
        {
          status: 201,
        },
      );
    }

    /*
     * C142.1 task claiming remains available.
     */
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

      return NextResponse.json({
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
     *
     * This action does not write to GitHub.
     *
     * Actual GitHub execution remains exclusively
     * behind C142.2 / dispatchGitHubTask().
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
        return NextResponse.json(
          {
            ok: false,

            action,

            ...dispatch,
          },
          {
            status:
              dispatch.eligibility ===
              "blocked"
                ? 409
                : 200,
          },
        );
      }

      return NextResponse.json({
        ok: true,

        action,

        ...dispatch,
      });
    }

    /*
     * C142.2 REAL AUTONOMOUS DEVELOPMENT EXECUTION
     *
     * This is the Control Plane action that
     * reaches the C141 GitHub Direct Bridge.
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
        return NextResponse.json(
          {
            ok: false,

            code:
              "DEVELOPMENT_OBJECTIVE_REQUIRED",
          },
          {
            status: 400,
          },
        );
      }

      if (!path) {
        return NextResponse.json(
          {
            ok: false,

            code:
              "TARGET_PATH_REQUIRED",
          },
          {
            status: 400,
          },
        );
      }

      if (
        content === undefined
      ) {
        return NextResponse.json(
          {
            ok: false,

            code:
              "WRITE_CONTENT_REQUIRED",
          },
          {
            status: 400,
          },
        );
      }

      /*
       * C142.2 currently executes one target
       * file per autonomous development task.
       *
       * This keeps the execution boundary aligned
       * with the C141 GitHub task dispatcher.
       */
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

      /*
       * Real C141 bridge execution.
       *
       * dispatchGitHubTask is the only GitHub
       * execution path used by C142.2.
       */
      let github;

      try {
        github =
          await dispatchGitHubTask({
            action:
              "write" as GitHubTaskAction,

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

        return NextResponse.json(
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
          {
            status: 502,
          },
        );
      }

      if (!github.success) {
        const reason =
          github.error ||
          github.code ||
          "GitHub autonomous development execution failed.";

        const blocked =
          blockAutonomousDevelopmentTask(
            claimed.id,
            reason,
          );

        return NextResponse.json(
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
          {
            status: 502,
          },
        );
      }

      const commitSha =
        github.write
          ?.commitSha ||
        "";

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

      return NextResponse.json({
        ok:
          github.success,

        action,

        task:
          claimed,

        github,

        receipt,
      });
    }

    /*
     * C142.1 manual completion remains
     * available for compatibility.
     */
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

      return NextResponse.json({
        ok: true,

        action,

        receipt,
      });
    }

    return NextResponse.json(
      {
        ok: false,

        code:
          "UNKNOWN_ACTION",

        allowedActions: [
          "create",
          "claim",
          "dispatch-planner",
          "execute",
          "complete",
        ],
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        code:
          "AUTONOMOUS_DEVELOPMENT_ERROR",

        message:
          error instanceof Error
            ? error.message
            : "Unknown autonomous development error.",
      },
      {
        status: 400,
      },
    );
  }
}
