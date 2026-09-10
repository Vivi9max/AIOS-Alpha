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
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  listEvolutionTargets,
  ensureAutonomousWorkQueue,
} from "@/lib/evolution/heartbeat";

import {
  listOutcomes,
} from "@/lib/outcome/store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      ...body,
      timestamp: Date.now(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

export async function GET() {
  return json({
    success: true,
    service:
      "AIOS Founder Evolution Queue",
    status: "online",
    mode: "read-only",
    endpoint:
      "/api/founder/evolution-queue",
    execution: {
      method: "POST",
      founderOnly: true,
      bounded: true,
      maxTasksPerInvocation: 1,
    },
    purpose:
      "Verify that an active Outcome can materialize exactly one pending Milestone into a persistent Task.",
  });
}

export async function POST(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isFounderConfigured()) {
    return json(
      {
        success: false,
        service:
          "AIOS Founder Evolution Queue",
        status: "not-configured",
        error:
          "Founder Access Key is not configured.",
      },
      503,
    );
  }

  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,
        service:
          "AIOS Founder Evolution Queue",
        status: "unauthorized",
        error:
          "Founder authentication required.",
      },
      401,
    );
  }

  try {
    const identity =
      resolveAlphaIdentity(request);

    const targets =
      await listEvolutionTargets();

    const registered =
      targets.includes(identity.userId);

    if (!registered) {
      return json(
        {
          success: false,
          service:
            "AIOS Founder Evolution Queue",
          status: "not-registered",
          userId: identity.userId,
          targetCount: targets.length,
          error:
            "Current Founder workspace is not registered for Evolution Heartbeats.",
        },
        409,
      );
    }

    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const beforeOutcomes =
            await listOutcomes();

          const beforeTasks =
            await listPersistentTasks();

          const queue =
            await ensureAutonomousWorkQueue();

          const afterOutcomes =
            await listOutcomes();

          const afterTasks =
            await listPersistentTasks();

          return {
            queue,
            before: {
              outcomes:
                beforeOutcomes.length,
              activeOutcomes:
                beforeOutcomes.filter(
                  (outcome) =>
                    outcome.status ===
                    "active",
                ).length,
              tasks:
                beforeTasks.length,
              todoTasks:
                beforeTasks.filter(
                  (task) =>
                    task.status ===
                    "todo",
                ).length,
              doingTasks:
                beforeTasks.filter(
                  (task) =>
                    task.status ===
                    "doing",
                ).length,
            },
            after: {
              outcomes:
                afterOutcomes.length,
              activeOutcomes:
                afterOutcomes.filter(
                  (outcome) =>
                    outcome.status ===
                    "active",
                ).length,
              tasks:
                afterTasks.length,
              todoTasks:
                afterTasks.filter(
                  (task) =>
                    task.status ===
                    "todo",
                ).length,
              doingTasks:
                afterTasks.filter(
                  (task) =>
                    task.status ===
                    "doing",
                ).length,
            },
            persistedTask:
              queue.taskId
                ? afterTasks.find(
                    (task) =>
                      task.id ===
                      queue.taskId,
                  ) ?? null
                : null,
            persistedOutcome:
              queue.outcomeId
                ? afterOutcomes.find(
                    (outcome) =>
                      outcome.id ===
                      queue.outcomeId,
                  ) ?? null
                : null,
          };
        },
      );

    return json({
      success: true,
      service:
        "AIOS Founder Evolution Queue",
      status: "verified",
      mode:
        "founder-manual-queue-verification",
      identity: {
        userId:
          identity.userId,
        isolated: true,
      },
      target: {
        registered: true,
        targetCount:
          targets.length,
      },
      verification: result,
      durationMs:
        Date.now() - startedAt,
    });
  } catch (error) {
    return json(
      {
        success: false,
        service:
          "AIOS Founder Evolution Queue",
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Founder Evolution Queue verification failed.",
        durationMs:
          Date.now() - startedAt,
      },
      500,
    );
  }
}
