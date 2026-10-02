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
  buildAutonomousDevelopmentReceipt,
} from "@/lib/github/autonomous-development-receipt";
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

type FinalizationResult = {
  ok: boolean;
  taskId: string;
  status:
    | "todo"
    | "running"
    | "completed"
    | "failed"
    | "blocked";
  phase:
    | "QUEUED"
    | "DISCOVERING"
    | "PLANNING"
    | "READING"
    | "GENERATING"
    | "WRITING"
    | "READBACK"
    | "BUILD"
    | "REPAIR"
    | "COMPLETED"
    | "BLOCKED";
  terminal: boolean;
  receiptValid: boolean;
  commitSha?: string;
  readbackVerified: boolean;
  verificationPassed: boolean;
  reason?: string;
};

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
          "no-store, max-age=0",
        Pragma:
          "no-cache",
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

function buildReceipt(
  result: FinalizationResult,
) {
  return buildAutonomousDevelopmentReceipt({
    status:
      result.status,
    commitSha:
      result.commitSha,
    readbackVerified:
      result.readbackVerified,
    verificationPassed:
      result.verificationPassed,
  });
}

function buildReceiptResponse(
  result: FinalizationResult,
) {
  const receipt =
    buildReceipt(result);

  return {
    ...result,
    receipt,
    receiptValid:
      receipt.valid,
    successfulReceipt:
      receipt.successful,
    missingEvidence:
      receipt.missingEvidence,
  };
}

function isSuccessfulReceipt(
  result: FinalizationResult,
) {
  const receipt =
    buildReceipt(result);

  return (
    result.status ===
      "completed" &&
    result.terminal &&
    receipt.valid &&
    receipt.successful
  );
}

function getReceiptResponseStatus(
  result: FinalizationResult,
) {
  const receipt =
    buildReceipt(result);

  if (!receipt.terminal) {
    return 409;
  }

  if (
    result.status ===
      "completed" &&
    !receipt.valid
  ) {
    return 409;
  }

  if (
    result.status ===
      "completed" &&
    receipt.valid
  ) {
    return 200;
  }

  return 409;
}

function getReceiptCode(
  result: FinalizationResult,
) {
  const receipt =
    buildReceipt(result);

  if (!receipt.terminal) {
    return "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_PENDING";
  }

  if (
    result.status ===
      "completed" &&
    receipt.successful &&
    receipt.valid
  ) {
    return "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_CONFIRMED";
  }

  if (
    result.status ===
      "completed" &&
    !receipt.valid
  ) {
    return "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_INVALID";
  }

  return "AUTONOMOUS_DEVELOPMENT_TERMINAL_RECEIPT_CONFIRMED_WITH_FAILURE";
}

function getReceiptMessage(
  result: FinalizationResult,
) {
  const receipt =
    buildReceipt(result);

  if (!receipt.terminal) {
    return "Autonomous development task is not terminal yet. No terminal receipt was issued.";
  }

  if (
    result.status ===
      "completed" &&
    receipt.successful &&
    receipt.valid
  ) {
    return "Autonomous development terminal receipt confirmed.";
  }

  if (
    result.status ===
      "completed" &&
    !receipt.valid
  ) {
    return "Autonomous development reported completed status, but its terminal receipt evidence is incomplete or invalid.";
  }

  return "Autonomous development reached a terminal non-success state.";
}

function getFailureFinalizationCode(
  result: FinalizationResult,
) {
  if (
    result.status ===
      "completed"
  ) {
    return "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_REJECTED";
  }

  if (result.terminal) {
    return "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_CONFIRMED";
  }

  return "AUTONOMOUS_DEVELOPMENT_FAILURE_RECEIPT_PENDING";
}

function getFailureFinalizationStatus(
  result: FinalizationResult,
) {
  if (
    result.status ===
      "completed"
  ) {
    return 409;
  }

  if (result.terminal) {
    return 200;
  }

  return 409;
}

function getFailureFinalizationResponse(
  result: FinalizationResult,
) {
  const receipt =
    buildReceipt(result);

  return {
    ...result,
    receipt,
    receiptValid:
      receipt.valid,
    successfulReceipt: false,
    missingEvidence:
      receipt.missingEvidence,
  };
}

function getNotFoundResponse(
  result: FinalizationResult,
) {
  if (
    result.reason !==
    "AUTONOMOUS_DEVELOPMENT_TASK_NOT_FOUND"
  ) {
    return null;
  }

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

    const notFound =
      getNotFoundResponse(
        result,
      );

    if (notFound) {
      return notFound;
    }

    const response =
      buildReceiptResponse(
        result,
      );

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
        ...response,
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

    const notFound =
      getNotFoundResponse(
        result,
      );

    if (notFound) {
      return notFound;
    }

    const response =
      buildReceiptResponse(
        result,
      );

    const status =
      getReceiptResponseStatus(
        result,
      );

    return json(
      {
        ...response,
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

    const notFound =
      getNotFoundResponse(
        result,
      );

    if (notFound) {
      return notFound;
    }

    const response =
      getFailureFinalizationResponse(
        result,
      );

    return json(
      {
        ...response,
        code:
          getFailureFinalizationCode(
            result,
          ),
      },
      getFailureFinalizationStatus(
        result,
      ),
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
