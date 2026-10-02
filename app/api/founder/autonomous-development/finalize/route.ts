import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  finalizeAutonomousDevelopmentFailure,
  finalizeAutonomousDevelopmentTask,
} from "@/lib/github/autonomous-development-finalization";
import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export const maxDuration =
  30;

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
) {
  if (!isFounderConfigured()) {
    return {
      ok: false as const,
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

  if (!isFounderRequest(request)) {
    return {
      ok: false as const,
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
    ok: true as const,
  };
}

function normalizeTaskId(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
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

    const taskId =
      normalizeTaskId(
        body?.taskId,
      );

    if (!taskId) {
      return json(
        {
          ok: false,
          code:
            "AUTONOMOUS_DEVELOPMENT_TASK_ID_REQUIRED",
          error:
            "Autonomous development taskId is required.",
        },
        400,
      );
    }

    const result =
      await finalizeAutonomousDevelopmentTask(
        taskId,
      );

    if (
      result.reason ===
      "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND"
    ) {
      return json(
        {
          ...result,
          code:
            "TASK_NOT_FOUND",
          error:
            "Autonomous development task was not found.",
        },
        404,
      );
    }

    if (!result.terminal) {
      return json(
        {
          ...result,
          code:
            "AUTONOMOUS_DEVELOPMENT_FINALIZATION_NON_TERMINAL",
          message:
            "Autonomous development task is not terminal yet. No terminal receipt was issued.",
        },
        409,
      );
    }

    return json(
      {
        ...result,
        code:
          result.status ===
          "completed"
            ? "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_CONFIRMED"
            : "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_CONFIRMED_WITH_FAILURE",
        message:
          result.status ===
          "completed"
            ? "Autonomous development terminal receipt confirmed."
            : "Autonomous development reached a terminal non-success state.",
      },
      result.status ===
        "completed"
        ? 200
        : 409,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Autonomous development finalization failed.";

    return json(
      {
        ok: false,
        code:
          "AUTONOMOUS_DEVELOPMENT_FINALIZATION_FAILED",
        error: message,
      },
      500,
    );
  }
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
    normalizeTaskId(
      request.nextUrl.searchParams.get(
        "taskId",
      ),
    );

  if (!taskId) {
    return json(
      {
        ok: false,
        code:
          "AUTONOMOUS_DEVELOPMENT_TASK_ID_REQUIRED",
        error:
          "Autonomous development taskId is required.",
      },
      400,
    );
  }

  try {
    const result =
      await finalizeAutonomousDevelopmentTask(
        taskId,
      );

    if (
      result.reason ===
      "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND"
    ) {
      return json(
        {
          ...result,
          code:
            "TASK_NOT_FOUND",
          error:
            "Autonomous development task was not found.",
        },
        404,
      );
    }

    return json(
      {
        ...result,
        code:
          result.terminal
            ? "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT"
            : "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_PENDING",
      },
      result.terminal
        ? 200
        : 409,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Autonomous development finalization status failed.";

    return json(
      {
        ok: false,
        code:
          "AUTONOMOUS_DEVELOPMENT_FINALIZATION_STATUS_FAILED",
        error: message,
      },
      500,
    );
  }
}

export async function PATCH(
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

    const taskId =
      normalizeTaskId(
        body?.taskId,
      );

    if (!taskId) {
      return json(
        {
          ok: false,
          code:
            "AUTONOMOUS_DEVELOPMENT_TASK_ID_REQUIRED",
          error:
            "Autonomous development taskId is required.",
        },
        400,
      );
    }

    const result =
      await finalizeAutonomousDevelopmentFailure(
        taskId,
      );

    if (
      result.reason ===
      "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND"
    ) {
      return json(
        {
          ...result,
          code:
            "TASK_NOT_FOUND",
          error:
            "Autonomous development task was not found.",
        },
        404,
      );
    }

    return json(
      {
        ...result,
        code:
          result.status ===
          "completed"
            ? "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_REJECTED"
            : result.terminal
              ? "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_CONFIRMED"
              : "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_PENDING",
      },
      result.status ===
        "completed"
        ? 409
        : result.terminal
          ? 200
          : 409,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Autonomous development failure finalization failed.";

    return json(
      {
        ok: false,
        code:
          "AUTONOMOUS_DEVELOPMENT_FAILURE_FINALIZATION_FAILED",
        error: message,
      },
      500,
    );
  }
}
