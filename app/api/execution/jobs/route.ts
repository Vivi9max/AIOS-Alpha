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

import {
  createExecutionSessionForJob,
  markExecutionJobSessionCompleted,
  markExecutionJobSessionFailed,
  markExecutionJobSessionRunning,
} from "@/lib/runtime/execution-job-session-bridge";

import {
  getExecutionSession,
} from "@/lib/runtime/session";

import {
  canUseCapability,
} from "@/lib/billing/entitlements";

import {
  getExecutionUsage,
  reserveExecution,
} from "@/lib/billing/execution-usage";

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
  planId?: unknown;
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

function resolvePlanId(
  value: unknown,
): string {
  if (
    value === "alpha" ||
    value === "free" ||
    value === "pro" ||
    value === "business"
  ) {
    return value;
  }

  return "alpha";
}

function getEntitlementFailure(
  planId: string,
  requestId: string,
) {
  const capability =
    canUseCapability(
      planId,
      "execution",
    );

  return NextResponse.json(
    {
      success: false,
      apiVersion:
        API_VERSION,
      requestId,
      error:
        "Execution capability is not available for this plan.",
      code:
        "EXECUTION_CAPABILITY_DENIED",
      entitlement: {
        planId,
        capability:
          capability.capability,
        allowed:
          capability.allowed,
        reason:
          capability.reason,
      },
      timestamp:
        Date.now(),
    },
    {
      status: 403,
    },
  );
}

async function resolveSessionForJob(
  jobId: string,
) {
  const bridge =
    await createExecutionSessionForJob(
      jobId,
    );

  if (
    !bridge.success ||
    !bridge.session
  ) {
    return {
      success: false,
      session: null,
      error:
        bridge.error ??
        "Unable to create execution session.",
    };
  }

  return {
    success: true,
    session:
      bridge.session,
    error: null,
  };
}

async function executeJob(
  jobId: string,
  input: string,
) {
  const sessionResult =
    await resolveSessionForJob(
      jobId,
    );

  if (
    !sessionResult.success ||
    !sessionResult.session
  ) {
    const message =
      sessionResult.error ??
      "Execution session could not be created.";

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
        "EXECUTION_SESSION_ERROR",
      session: null,
    };
  }

  const runningJob =
    await markExecutionJobRunning(
      jobId,
    );

  if (!runningJob) {
    return {
      success: false,
      job: null,
      error:
        "Execution job could not be started.",
      code:
        "EXECUTION_JOB_START_FAILED",
      session:
        sessionResult.session,
    };
  }

  const runningBridge =
    await markExecutionJobSessionRunning(
      jobId,
      sessionResult.session,
    );

  if (
    !runningBridge.success ||
    !runningBridge.session
  ) {
    const message =
      runningBridge.error ??
      "Execution session could not be started.";

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
        "EXECUTION_SESSION_START_FAILED",
      session:
        runningBridge.session ??
        sessionResult.session,
    };
  }

  try {
    const result =
      await executeRuntime({
        prompt: input,
      });

    if (!result.success) {
      const error =
        result.error ??
        "Runtime execution failed.";

      const failed =
        await markExecutionJobFailed(
          jobId,
          error,
        );

      const failedBridge =
        await markExecutionJobSessionFailed(
          jobId,
          runningBridge.session,
          error,
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
        session:
          failedBridge.session ??
          runningBridge.session,
      };
    }

    const completed =
      await markExecutionJobCompleted(
        jobId,
        result.content,
      );

    const completedBridge =
      await markExecutionJobSessionCompleted(
        jobId,
        runningBridge.session,
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
      session:
        completedBridge.session ??
        runningBridge.session,
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

    const failedBridge =
      await markExecutionJobSessionFailed(
        jobId,
        runningBridge.session,
        message,
      );

    return {
      success: false,
      job: failed,
      error: message,
      code:
        "EXECUTION_FAILED",
      session:
        failedBridge.session ??
        runningBridge.session,
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

  const sessionId =
    request.nextUrl.searchParams.get(
      "sessionId",
    );

  const planId =
    resolvePlanId(
      request.nextUrl.searchParams.get(
        "plan",
      ),
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

    let session =
      null;

    if (sessionId) {
      session =
        await getExecutionSession(
          sessionId,
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
      session,
      timestamp:
        Date.now(),
    });
  }

  const jobs =
    await listExecutionJobs();

  const usage =
    await getExecutionUsage(
      planId,
    );

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
    entitlement: {
      planId,
      capability:
        "execution",
      allowed:
        usage.allowed,
    },
    usage,
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
      resolvePlanId(
        body.planId,
      );

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

    const capability =
      canUseCapability(
        planId,
        "execution",
      );

    if (
      !capability.allowed
    ) {
      return getEntitlementFailure(
        planId,
        requestId,
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
          session:
            null,
          entitlement: {
            planId,
            capability:
              "execution",
            allowed:
              true,
          },
          usage:
            await getExecutionUsage(
              planId,
            ),
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

    const usage =
      await reserveExecution(
        planId,
      );

    if (
      !usage.allowed
    ) {
      const failed =
        await markExecutionJobFailed(
          job.id,
          "Daily execution limit reached.",
        );

      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          job: failed,
          session:
            null,
          error:
            "Daily execution limit reached.",
          code:
            "EXECUTION_LIMIT_REACHED",
          entitlement: {
            planId,
            capability:
              "execution",
            allowed:
              false,
          },
          usage,
          scope: {
            workspaceId,
          },
          client:
            clientMetadata,
          timestamp:
            Date.now(),
        },
        {
          status: 429,
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
        entitlement: {
          planId,
          capability:
            "execution",
          allowed:
            true,
        },
        usage,
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

    const planId =
      resolvePlanId(
        body.planId,
      );

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

    const capability =
      canUseCapability(
        planId,
        "execution",
      );

    if (
      !capability.allowed
    ) {
      return getEntitlementFailure(
        planId,
        requestId,
      );
    }

    const usage =
      await reserveExecution(
        planId,
      );

    if (
      !usage.allowed
    ) {
      return NextResponse.json(
        {
          success: false,
          apiVersion:
            API_VERSION,
          requestId,
          error:
            "Daily execution limit reached.",
          code:
            "EXECUTION_LIMIT_REACHED",
          entitlement: {
            planId,
            capability:
              "execution",
            allowed:
              false,
          },
          usage,
          timestamp:
            Date.now(),
        },
        {
          status: 429,
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
        entitlement: {
          planId,
          capability:
            "execution",
          allowed:
            true,
        },
        usage,
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
