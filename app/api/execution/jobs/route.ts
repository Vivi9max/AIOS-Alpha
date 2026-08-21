import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

import {
  createExecutionJob,
  getExecutionJob,
  listExecutionJobs,
  markExecutionJobCompleted,
  markExecutionJobFailed,
  markExecutionJobRunning,
  retryExecutionJob,
} from "@/lib/execution/job-store";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const API_VERSION =
  "v1";

const MAX_GOAL_LENGTH =
  1000;

interface CreateJobBody {
  goal?: unknown;
  planId?: unknown;
  taskId?: unknown;
  input?: unknown;
  execute?: unknown;
  workspaceId?: unknown;
  client?: unknown;
  platform?: unknown;
}

interface RetryBody {
  id?: unknown;
  action?: unknown;
  client?: unknown;
  platform?: unknown;
}

function getRequestId(
  request: NextRequest,
): string {
  return (
    request.headers.get(
      "x-request-id",
    ) ??
    crypto.randomUUID()
  );
}

function getClientMetadata(
  request: NextRequest,
  body?: {
    client?: unknown;
    platform?: unknown;
  },
) {
  const client =
    typeof body?.client ===
    "string"
      ? body.client
      : request.headers.get(
          "x-aios-client",
        ) ??
        "web";

  const platform =
    typeof body?.platform ===
    "string"
      ? body.platform
      : request.headers.get(
          "x-aios-platform",
        ) ??
        "web";

  return {
    client,
    platform,
  };
}

async function executeJob(
  jobId: string,
  input: string,
) {
  await markExecutionJobRunning(
    jobId,
  );

  try {
    const result =
      await executeRuntime({
        prompt: input,
      });

    if (!result.success) {
      const failed =
        await markExecutionJobFailed(
          jobId,
          result.error ??
            "Runtime execution failed.",
        );

      return {
        success: false,
        job: failed,
        execution: {
          requestId:
            result.requestId,
          planId:
            result.planId,
          provider:
            result.provider,
          fallbackUsed:
            result.fallbackUsed ??
            false,
          content:
            result.content,
          error:
            result.error,
          capabilityTrace:
            result.capabilityTrace ??
            [],
          latencyMs:
            result.latencyMs,
        },
      };
    }

    const completed =
      await markExecutionJobCompleted(
        jobId,
        result.content,
      );

    return {
      success: true,
      job: completed,
      execution: {
        requestId:
          result.requestId,
        planId:
          result.planId,
        provider:
          result.provider,
        fallbackUsed:
          result.fallbackUsed ??
          false,
        content:
          result.content,
        capabilityTrace:
          result.capabilityTrace ??
          [],
        latencyMs:
          result.latencyMs,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Execution failed.";

    const failed =
      await markExecutionJobFailed(
        jobId,
        message,
      );

    return {
      success: false,
      job: failed,
      error: message,
      code:
        "EXECUTION_FAILED",
    };
  }
}

export async function GET(
  request: NextRequest,
) {
  const requestId =
    getRequestId(request);

  const id =
    request.nextUrl.searchParams.get(
      "id",
    );

  const workspaceId =
    request.nextUrl.searchParams.get(
      "workspaceId",
    );

  if (id) {
    const job =
      await getExecutionJob(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          error:
            "Execution job not found.",
          code:
            "JOB_NOT_FOUND",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      apiVersion:
        API_VERSION,
      requestId,
      scope: {
        workspaceId:
          workspaceId ??
          "default",
      },
      job,
      timestamp:
        Date.now(),
    });
  }

  const jobs =
    await listExecutionJobs();

  return NextResponse.json({
    success: true,
    apiVersion:
      API_VERSION,
    requestId,
    scope: {
      workspaceId:
        workspaceId ??
        "default",
    },
    jobs,
    count:
      jobs.length,
    timestamp:
      Date.now(),
  });
}

export async function POST(
  request: NextRequest,
) {
  const requestId =
    getRequestId(request);

  try {
    const body =
      (await request.json()) as
        CreateJobBody;

    const goal =
      typeof body.goal ===
      "string"
        ? body.goal.trim()
        : "";

    const input =
      typeof body.input ===
      "string"
        ? body.input.trim()
        : goal;

    const planId =
      typeof body.planId ===
      "string"
        ? body.planId
        : undefined;

    const taskId =
      typeof body.taskId ===
      "string"
        ? body.taskId
        : undefined;

    const workspaceId =
      typeof body.workspaceId ===
      "string"
        ? body.workspaceId.trim()
        : "default";

    const execute =
      body.execute !== false;

    const clientMetadata =
      getClientMetadata(
        request,
        body,
      );

    if (!goal) {
      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          error:
            "Execution goal is required.",
          code:
            "INVALID_GOAL",
        },
        {
          status: 400,
        },
      );
    }

    if (
      goal.length >
      MAX_GOAL_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          error:
            `Execution goal cannot exceed ${MAX_GOAL_LENGTH} characters.`,
          code:
            "GOAL_TOO_LONG",
        },
        {
          status: 400,
        },
      );
    }

    const job =
      await createExecutionJob({
        goal,
        planId,
        taskId,
        input,
      });

    if (!execute) {
      return NextResponse.json(
        {
          success: true,
          apiVersion:
            API_VERSION,
          requestId,
          job,
          execution:
            null,
          scope: {
            workspaceId,
          },
          client:
            clientMetadata,
          message:
            "Execution job queued.",
          timestamp:
            Date.now(),
        },
        {
          status: 201,
        },
      );
    }

    const result =
      await executeJob(
        job.id,
        input,
      );

    return NextResponse.json(
      {
        ...result,
        apiVersion:
          API_VERSION,
        requestId,
        scope: {
          workspaceId,
        },
        client:
          clientMetadata,
        timestamp:
          Date.now(),
      },
      {
        status:
          result.success
            ? 200
            : 502,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid execution request.";

    return NextResponse.json(
      {
        success: false,
        apiVersion:
          API_VERSION,
        requestId,
        error: message,
        code:
          "EXECUTION_JOB_ERROR",
        timestamp:
          Date.now(),
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  const requestId =
    getRequestId(request);

  try {
    const body =
      (await request.json()) as
        RetryBody;

    const id =
      typeof body.id ===
      "string"
        ? body.id
        : "";

    const action =
      typeof body.action ===
      "string"
        ? body.action
        : "";

    const clientMetadata =
      getClientMetadata(
        request,
        body,
      );

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          error:
            "Execution job id is required.",
          code:
            "INVALID_JOB_ID",
        },
        {
          status: 400,
        },
      );
    }

    if (
      action !==
      "retry"
    ) {
      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          error:
            "Supported action: retry",
          code:
            "INVALID_ACTION",
        },
        {
          status: 400,
        },
      );
    }

    const queuedJob =
      await retryExecutionJob(
        id,
      );

    if (!queuedJob) {
      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          error:
            "Execution job not found.",
          code:
            "JOB_NOT_FOUND",
        },
        {
          status: 404,
        },
      );
    }

    if (
      queuedJob.status !==
      "queued"
    ) {
      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          error:
            "Only failed jobs can be retried.",
          code:
            "JOB_NOT_RETRYABLE",
          job:
            queuedJob,
        },
        {
          status: 409,
        },
      );
    }

    const result =
      await executeJob(
        queuedJob.id,
        queuedJob.input,
      );

    return NextResponse.json(
      {
        ...result,
        retry:
          true,
        apiVersion:
          API_VERSION,
        requestId,
        client:
          clientMetadata,
        timestamp:
          Date.now(),
      },
      {
        status:
          result.success
            ? 200
            : 502,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Execution retry failed.";

    return NextResponse.json(
      {
        success: false,
        apiVersion:
          API_VERSION,
        requestId,
        error: message,
        code:
          "EXECUTION_RETRY_ERROR",
        timestamp:
          Date.now(),
      },
      {
        status: 500,
      },
    );
  }
}
