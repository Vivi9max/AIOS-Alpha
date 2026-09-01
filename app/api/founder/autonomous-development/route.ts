import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  claimAutonomousDevelopmentTask,
  completeAutonomousDevelopmentTask,
  createAutonomousDevelopmentTask,
  getAutonomousDevelopmentTask,
  listAutonomousDevelopmentTasks,
} from "@/lib/github/autonomous-development-control-plane";

export const runtime = "nodejs";

function founderAuthorized(request: NextRequest) {
  const configuredKey = process.env.FOUNDER_ACCESS_KEY;

  if (!configuredKey) {
    return false;
  }

  const providedKey =
    request.headers.get("x-founder-access-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return Boolean(providedKey) && providedKey === configuredKey;
}

export async function GET(request: NextRequest) {
  if (!founderAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        code: "FOUNDER_AUTH_REQUIRED",
      },
      { status: 401 },
    );
  }

  const taskId = request.nextUrl.searchParams.get("taskId");

  if (taskId) {
    const task = getAutonomousDevelopmentTask(taskId);

    if (!task) {
      return NextResponse.json(
        {
          ok: false,
          code: "TASK_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      task,
    });
  }

  return NextResponse.json({
    ok: true,
    tasks: listAutonomousDevelopmentTasks(),
  });
}

export async function POST(request: NextRequest) {
  if (!founderAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        code: "FOUNDER_AUTH_REQUIRED",
      },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const action = body?.action;

    if (action === "create") {
      const task = createAutonomousDevelopmentTask({
        objective: String(body?.objective ?? ""),
        targetPaths: Array.isArray(body?.targetPaths)
          ? body.targetPaths.map(String)
          : [],
      });

      return NextResponse.json(
        {
          ok: true,
          action,
          task,
        },
        { status: 201 },
      );
    }

    if (action === "claim") {
      const task = claimAutonomousDevelopmentTask(String(body?.taskId ?? ""));

      return NextResponse.json({
        ok: true,
        action,
        task,
      });
    }

    if (action === "complete") {
      const receipt = completeAutonomousDevelopmentTask(
        String(body?.taskId ?? ""),
        {
          commitSha: String(body?.commitSha ?? ""),
          readbackVerified: body?.readbackVerified === true,
          verificationPassed: body?.verificationPassed === true,
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
        code: "UNKNOWN_ACTION",
        allowedActions: ["create", "claim", "complete"],
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "AUTONOMOUS_DEVELOPMENT_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Unknown autonomous development error.",
      },
      { status: 400 },
    );
  }
}
