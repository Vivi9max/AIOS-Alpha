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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_GOAL_LENGTH = 1000;

interface CreateJobBody {
  goal?: unknown;
  planId?: unknown;
  taskId?: unknown;
  input?: unknown;
  execute?: unknown;
}

export async function GET(
  request: NextRequest,
) {
  const id =
    request.nextUrl.searchParams.get("id");

  if (id) {
    const job = await getExecutionJob(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "Execution job not found.",
          code: "JOB_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      job,
      timestamp: Date.now(),
    });
  }

  const jobs = await listExecutionJobs();

  return NextResponse.json({
    success: true,
    jobs,
    count: jobs.length,
    timestamp: Date.now(),
  });
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as CreateJobBody;

    const goal =
      typeof body.goal === "string"
        ? body.goal.trim()
        : "";

    const input =
      typeof body.input === "string"
        ? body.input.trim()
        : goal;

    const planId =
      typeof body.planId === "string"
        ? body.planId
        : undefined;

    const taskId =
      typeof body.taskId === "string"
        ? body.taskId
        : undefined;

    const execute = body.execute !== false;

    if (!goal) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Execution goal is required.",
          code: "INVALID_GOAL",
        },
        { status: 400 },
      );
    }

    if (goal.length > MAX_GOAL_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Execution goal cannot exceed ${MAX_GOAL_LENGTH} characters.`,
          code: "GOAL_TOO_LONG",
        },
        { status: 400 },
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
          job,
          execution: null,
          message: "Execution job queued.",
        },
        { status: 201 },
      );
    }

    await markExecutionJobRunning(job.id);

    try {
      const result = await executeRuntime({
        prompt: input,
      });

      if (!result.success) {
        const failed =
          await markExecutionJobFailed(
            job.id,
            result.error ??
              "Runtime execution failed.",
          );

        return NextResponse.json(
          {
            success: false,
            job: failed,
            execution: {
              requestId: result.requestId,
              provider: result.provider,
              fallbackUsed:
                result.fallbackUsed ?? false,
              content: result.content,
              error: result.error,
              capabilityTrace:
                result.capabilityTrace ?? [],
            },
            timestamp: Date.now(),
          },
          { status: 502 },
        );
      }

      const completed =
        await markExecutionJobCompleted(
          job.id,
          result.content,
        );

      return NextResponse.json({
        success: true,
        job: completed,
        execution: {
          requestId: result.requestId,
          planId: result.planId,
          provider: result.provider,
          fallbackUsed:
            result.fallbackUsed ?? false,
          content: result.content,
          capabilityTrace:
            result.capabilityTrace ?? [],
          latencyMs: result.latencyMs,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Execution failed.";

      const failed =
        await markExecutionJobFailed(
          job.id,
          message,
        );

      return NextResponse.json(
        {
          success: false,
          job: failed,
          error: message,
          code: "EXECUTION_FAILED",
          timestamp: Date.now(),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid execution request.";

    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "EXECUTION_JOB_ERROR",
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        id?: unknown;
        action?: unknown;
      };

    const id =
      typeof body.id === "string"
        ? body.id
        : "";

    const action =
      typeof body.action === "string"
        ? body.action
        : "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Execution job id is required.",
          code: "INVALID_JOB_ID",
        },
        { status: 400 },
      );
    }

    if (action !== "retry") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supported action: retry",
          code: "INVALID_ACTION",
        },
        { status: 400 },
      );
    }

    const job =
      await retryExecutionJob(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Execution job not found.",
          code: "JOB_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    if (job.status !== "queued") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only failed jobs can be retried.",
          code: "JOB_NOT_RETRYABLE",
          job,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      job,
      message:
        "Execution job queued for retry.",
      timestamp: Date.now(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Execution retry failed.";

    return NextResponse.json(
      {
        success: false,
        error: message,
        code: "EXECUTION_RETRY_ERROR",
      },
      { status: 500 },
    );
  }
}
