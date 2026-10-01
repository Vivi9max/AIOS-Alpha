import "server-only";

import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

import { isFounderConfigured, isFounderRequest } from "@/lib/founder/auth";
import {
  blockAutonomousDevelopmentTask,
  createAutonomousDevelopmentTask,
  getAutonomousDevelopmentTask,
  listAutonomousDevelopmentTasks,
} from "@/lib/github/autonomous-development-control-plane";
import { executeAutonomousDevelopmentAgent } from "@/lib/github/autonomous-development-agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_REPOSITORY = "Vivi9max/AIOS-Alpha";
const DEFAULT_BRANCH = "main";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function requireFounder(request: NextRequest) {
  if (!isFounderConfigured()) {
    return {
      ok: false as const,
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
      ok: false as const,
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

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const auth = requireFounder(request);
  if (!auth.ok) return auth.response;

  const taskId = request.nextUrl.searchParams.get("taskId");
  const objective = request.nextUrl.searchParams.get("objective");

  if (taskId) {
    const task = getAutonomousDevelopmentTask(taskId);
    if (!task) {
      return json({ ok: false, code: "TASK_NOT_FOUND" }, 404);
    }
    return json({ ok: true, task });
  }

  let tasks = listAutonomousDevelopmentTasks();
  if (objective?.trim()) {
    tasks = tasks.filter(
      (task) => task.objective.trim() === objective.trim(),
    );
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
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    if (body?.action !== "autonomous") {
      return json(
        {
          ok: false,
          code: "UNKNOWN_ACTION",
          error: "Only the autonomous development action is exposed by this route.",
        },
        400,
      );
    }

    const objective = String(body?.objective ?? "").trim();
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

    const task = createAutonomousDevelopmentTask({
      objective,
      targetPaths: [],
    });

    after(async () => {
      try {
        await executeAutonomousDevelopmentAgent({
          objective,
          taskId: task.id,
        });
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message
            : "Autonomous development execution failed.";
        try {
          blockAutonomousDevelopmentTask(task.id, reason);
        } catch {
          // Preserve the original execution failure.
        }
      }
    });

    return json(
      {
        ok: true,
        success: true,
        code: "AUTONOMOUS_DEVELOPMENT_RUNNING",
        repository: DEFAULT_REPOSITORY,
        branch: DEFAULT_BRANCH,
        objective,
        taskId: task.id,
        status: "running",
        message:
          "Autonomous development started. AIOS is discovering the repository and executing the development loop.",
      },
      202,
    );
  } catch (error) {
    return json(
      {
        ok: false,
        code: "AUTONOMOUS_DEVELOPMENT_REQUEST_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Autonomous development request failed.",
      },
      500,
    );
  }
}
