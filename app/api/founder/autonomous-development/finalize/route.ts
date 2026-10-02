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

function isSuccessfulReceipt(
  result: {
    status: string;
    terminal: boolean;
    receiptValid: boolean;
    ok: boolean;
  },
) {
  return (
    result.status ===
      "completed" &&
    result.terminal &&
    result.receiptValid &&
    result.ok
  );
}

function getReceiptResponseStatus(
  result: {
    status: string;
    terminal: boolean;
    receiptValid: boolean;
    ok: boolean;
  },
) {
  if (!result.terminal) {
    return 409;
  }

  if (
    result.status ===
      "completed" &&
    !result.receiptValid
  ) {
    return 409;
  }

  if (
    result.status ===
      "completed" &&
    result.receiptValid
  ) {
    return 200;
  }

  return 409;
}

function getReceiptCode(
  result: {
    status: string;
    terminal: boolean;
    receiptValid: boolean;
  },
) {
  if (!result.terminal) {
    return "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_PENDING";
  }

  if (
    result.status ===
      "completed" &&
    result.receiptValid
  ) {
    return "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_CONFIRMED";
  }

  if (
    result.status ===
      "completed" &&
    !result.receiptValid
  ) {
    return "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_INVALID";
  }

  return "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_CONFIRMED_WITH_FAILURE";
}

function getReceiptMessage(
  result: {
    status: string;
    terminal: boolean;
    receiptValid: boolean;
  },
) {
  if (!result.terminal) {
    return "Autonomous development task is not terminal yet. No terminal receipt was issued.";
  }

  if (
    result.status ===
      "completed" &&
    result.receiptValid
  ) {
    return "Autonomous development terminal receipt confirmed.";
  }

  if (
    result.status ===
      "completed" &&
    !result.receiptValid
  ) {
    return "Autonomous development reported completed status, but its terminal receipt evidence is incomplete or invalid.";
  }

  return "Autonomous development reached a terminal non-success state.";
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

    const status =
      getReceiptResponseStatus(
        result,
      );

    const code =
      getReceiptCode(
        result,
      );

    const message =
      getReceiptMessage(
        result,
      );

    return json(
      {
        ...result,
        code,
        message,
        successfulReceipt:
          isSuccessfulReceipt(
            result,
          ),
      },
      status,
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

    const status =
      getReceiptResponseStatus(
        result,
      );

    return json(
      {
        ...result,
        code:
          getReceiptCode(
            result,
          ),
        message:
          getReceiptMessage(
            result,
          ),
        successfulReceipt:
          isSuccessfulReceipt(
            result,
          ),
      },
      status,
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

    const status =
      result.status ===
        "completed"
        ? 409
        : result.terminal
          ? 200
          : 409;

    const code =
      result.status ===
        "completed"
        ? "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_REJECTED"
        : result.terminal
          ? "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_CONFIRMED"
          : "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_PENDING";

    return json(
      {
        ...result,
        code,
        successfulReceipt: false,
      },
      status,
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
