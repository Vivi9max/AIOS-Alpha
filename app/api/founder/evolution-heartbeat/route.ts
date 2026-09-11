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
  runEvolutionHeartbeat,
} from "@/lib/evolution/heartbeat";

import {
  ensureAutonomousWorkQueue,
} from "@/lib/evolution/work-queue";

import {
  listOutcomes,
} from "@/lib/outcome/store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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

function unique<T>(
  values: T[],
): T[] {
  return Array.from(
    new Set(values),
  );
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
          "AIOS Founder Evolution Heartbeat",
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
          "AIOS Founder Evolution Heartbeat",
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
      targets.includes(
        identity.userId,
      );

    if (!registered) {
      return json(
        {
          success: false,
          service:
            "AIOS Founder Evolution Heartbeat",
          status: "not-registered",
          userId:
            identity.userId,
          targetCount:
            targets.length,
          error:
            "Current Founder workspace is not registered for Evolution Heartbeats.",
        },
        409,
      );
    }

    const verification =
      await runWithUserContext(
        identity.userId,
        async () => {
          /*
           * -------------------------------------------------------
           * C142.11.6 — BEFORE SNAPSHOT
           * -------------------------------------------------------
           */

          const beforeOutcomes =
            await listOutcomes();

          const beforeTasks =
            await listPersistentTasks();

          /*
           * -------------------------------------------------------
           * STEP 1
           * Ensure the bounded Work Queue has exactly one
           * eligible work item.
           *
           * The queue itself never creates a new Outcome.
           */

          const queue =
            await ensureAutonomousWorkQueue();

          /*
           * -------------------------------------------------------
           * STEP 2
           * Snapshot the queue-created/reused lineage.
           * -------------------------------------------------------
           */

          let lineageTaskId =
            queue.taskId;

          let lineageOutcomeId =
            queue.outcomeId;

          let lineageMilestoneId =
            queue.milestoneId;

          let outcomes =
            await listOutcomes();

          let tasks =
            await listPersistentTasks();

          /*
           * If Queue reused an existing Todo Task,
           * resolve its Outcome/Milestone from persisted lineage.
           */

          if (
            lineageTaskId &&
            (
              !lineageOutcomeId ||
              !lineageMilestoneId
            )
          ) {
            for (
              const outcome of outcomes
            ) {
              const milestone =
                outcome.milestones.find(
                  (item) =>
                    item.taskIds.includes(
                      lineageTaskId!,
                    ),
                );

              if (milestone) {
                lineageOutcomeId =
                  outcome.id;

                lineageMilestoneId =
                  milestone.id;

                break;
              }
            }
          }

          /*
           * -------------------------------------------------------
           * STEP 3
           * Execute ONE bounded Heartbeat.
           * -------------------------------------------------------
           */

          const heartbeat =
            await runEvolutionHeartbeat(
              identity.userId,
            );

          /*
           * -------------------------------------------------------
           * STEP 4
           * AFTER SNAPSHOT
           * -------------------------------------------------------
           */

          outcomes =
            await listOutcomes();

          tasks =
            await listPersistentTasks();

          const autonomousExecution =
            heartbeat.autonomousExecution;

          const executedTaskId =
            autonomousExecution.taskId ??
            lineageTaskId;

          const executedOutcomeId =
            autonomousExecution.outcomeId ??
            lineageOutcomeId;

          /*
           * -------------------------------------------------------
           * STEP 5
           * Resolve final persisted lineage.
           * -------------------------------------------------------
           */

          let finalOutcome =
            executedOutcomeId
              ? (
                  outcomes.find(
                    (outcome) =>
                      outcome.id ===
                      executedOutcomeId,
                  ) ?? null
                )
              : null;

          let finalTask =
            executedTaskId
              ? (
                  tasks.find(
                    (task) =>
                      task.id ===
                      executedTaskId,
                  ) ?? null
                )
              : null;

          let finalMilestone =
            finalOutcome &&
            executedTaskId
              ? (
                  finalOutcome.milestones.find(
                    (milestone) =>
                      milestone.taskIds.includes(
                        executedTaskId!,
                      ),
                  ) ?? null
                )
              : null;

          /*
           * -------------------------------------------------------
           * STEP 6
           * If the exact IDs were not returned by Heartbeat,
           * recover them from the persisted graph.
           * -------------------------------------------------------
           */

          if (
            !finalTask &&
            lineageTaskId
          ) {
            finalTask =
              tasks.find(
                (task) =>
                  task.id ===
                  lineageTaskId,
              ) ?? null;
          }

          if (
            !finalOutcome &&
            finalTask
          ) {
            finalOutcome =
              outcomes.find(
                (outcome) =>
                  outcome.taskIds.includes(
                    finalTask!.id,
                  ) ||
                  outcome.milestones.some(
                    (milestone) =>
                      milestone.taskIds.includes(
                        finalTask!.id,
                      ),
                  ),
              ) ?? null;
          }

          if (
            !finalMilestone &&
            finalOutcome &&
            finalTask
          ) {
            finalMilestone =
              finalOutcome.milestones.find(
                (milestone) =>
                  milestone.taskIds.includes(
                    finalTask!.id,
                  ),
              ) ?? null;
          }

          /*
           * -------------------------------------------------------
           * STEP 7
           * Count lineage references.
           * -------------------------------------------------------
           */

          const matchingOutcomes =
            finalTask
              ? outcomes.filter(
                  (outcome) =>
                    outcome.taskIds.includes(
                      finalTask!.id,
                    ) ||
                    outcome.milestones.some(
                      (milestone) =>
                        milestone.taskIds.includes(
                          finalTask!.id,
                        ),
                    ),
                )
              : [];

          const matchingMilestones =
            finalTask
              ? outcomes.flatMap(
                  (outcome) =>
                    outcome.milestones.filter(
                      (milestone) =>
                        milestone.taskIds.includes(
                          finalTask!.id,
                        ),
                    ),
                )
              : [];

          const duplicateOutcomeCount =
            matchingOutcomes.length;

          const duplicateMilestoneCount =
            matchingMilestones.length;

          /*
           * -------------------------------------------------------
           * STEP 8
           * Verify the actual closed loop.
           * -------------------------------------------------------
           */

          const checks = {
            founderAuthenticated:
              true,

            workspaceRegistered:
              registered,

            queueReturnedWork:
              Boolean(
                queue.taskId,
              ),

            heartbeatAttempted:
              Boolean(
                autonomousExecution.attempted,
              ),

            taskResolved:
              Boolean(
                finalTask,
              ),

            outcomeResolved:
              Boolean(
                finalOutcome,
              ),

            milestoneResolved:
              Boolean(
                finalMilestone,
              ),

            taskCompleted:
              finalTask?.status ===
              "done",

            milestoneCompleted:
              finalMilestone?.status ===
              "completed",

            outcomeCompleted:
              finalOutcome?.status ===
              "completed",

            outcomeProgressComplete:
              finalOutcome?.progress ===
              100,

            uniqueOutcomeLineage:
              duplicateOutcomeCount ===
              1,

            uniqueMilestoneLineage:
              duplicateMilestoneCount ===
              1,

            noNewOutcomeFromLifecycle:
              outcomes.length <=
              beforeOutcomes.length + 1,
          };

          const passed =
            Object.values(
              checks,
            ).every(
              Boolean,
            );

          /*
           * -------------------------------------------------------
           * STEP 9
           * Bounded idempotency probe.
           *
           * A second Heartbeat is allowed only once.
           * It must NOT manufacture another Outcome or duplicate
           * unfinished Task after the first completed loop.
           * -------------------------------------------------------
           */

          let secondHeartbeat:
            Awaited<
              ReturnType<
                typeof runEvolutionHeartbeat
              >
            > | null = null;

          let secondOutcomes =
            outcomes;

          let secondTasks =
            tasks;

          let idempotencyPassed =
            true;

          if (passed) {
            secondHeartbeat =
              await runEvolutionHeartbeat(
                identity.userId,
              );

            secondOutcomes =
              await listOutcomes();

            secondTasks =
              await listPersistentTasks();

            const newOutcomeIds =
              secondOutcomes
                .filter(
                  (outcome) =>
                    !outcomes.some(
                      (existing) =>
                        existing.id ===
                        outcome.id,
                    ),
                )
                .map(
                  (outcome) =>
                    outcome.id,
                );

            const newUnfinishedTasks =
              secondTasks.filter(
                (task) =>
                  !tasks.some(
                    (existing) =>
                      existing.id ===
                      task.id,
                  ) &&
                  task.status !==
                    "done",
              );

            idempotencyPassed =
              newOutcomeIds.length ===
                0 &&
              newUnfinishedTasks.length ===
                0;
          }

          /*
           * -------------------------------------------------------
           * FINAL RESULT
           * -------------------------------------------------------
           */

          return {
            before: {
              outcomeCount:
                beforeOutcomes.length,
              taskCount:
                beforeTasks.length,
            },

            queue: {
              status:
                queue.status,
              created:
                queue.created,
              taskId:
                lineageTaskId,
              outcomeId:
                lineageOutcomeId,
              milestoneId:
                lineageMilestoneId,
              message:
                queue.message,
            },

            heartbeat: {
              heartbeatId:
                heartbeat.heartbeatId,
              healthScore:
                heartbeat.healthScore,
              storageMode:
                heartbeat.storageMode,
              nextAction:
                heartbeat.nextAction,
              autonomousExecution,
            },

            lineage: {
              outcomeId:
                finalOutcome?.id ??
                null,
              outcomeTitle:
                finalOutcome?.title ??
                null,
              milestoneId:
                finalMilestone?.id ??
                null,
              milestoneTitle:
                finalMilestone?.title ??
                null,
              taskId:
                finalTask?.id ??
                null,
              taskTitle:
                finalTask?.title ??
                null,
            },

            persistedState: {
              taskStatus:
                finalTask?.status ??
                null,
              milestoneStatus:
                finalMilestone?.status ??
                null,
              outcomeStatus:
                finalOutcome?.status ??
                null,
              outcomeProgress:
                finalOutcome?.progress ??
                null,
            },

            duplication: {
              matchingOutcomeCount:
                duplicateOutcomeCount,
              matchingMilestoneCount:
                duplicateMilestoneCount,
              outcomeLineageUnique:
                duplicateOutcomeCount ===
                1,
              milestoneLineageUnique:
                duplicateMilestoneCount ===
                1,
            },

            checks,

            idempotency: {
              checked:
                passed,
              passed:
                idempotencyPassed,
              secondHeartbeatAttempted:
                secondHeartbeat
                  ?.autonomousExecution
                  .attempted ??
                false,
              secondHeartbeatTaskId:
                secondHeartbeat
                  ?.autonomousExecution
                  .taskId ??
                null,
              secondHeartbeatOutcomeId:
                secondHeartbeat
                  ?.autonomousExecution
                  .outcomeId ??
                null,
              newOutcomeCount:
                Math.max(
                  0,
                  secondOutcomes.length -
                    outcomes.length,
                ),
            },

            after: {
              outcomeCount:
                secondOutcomes.length,
              taskCount:
                secondTasks.length,
            },

            passed:
              passed &&
              idempotencyPassed,
          };
        },
      );

    return json(
      {
        success:
          verification.passed,
        service:
          "AIOS Founder Evolution Heartbeat",
        status:
          verification.passed
            ? "closed-loop-verified"
            : "closed-loop-failed",
        mode:
          "founder-manual-verification",
        identity: {
          userId:
            identity.userId,
          isolated: true,
        },
        verification,
        durationMs:
          Date.now() - startedAt,
      },
      verification.passed
        ? 200
        : 409,
    );
  } catch (error) {
    return json(
      {
        success: false,
        service:
          "AIOS Founder Evolution Heartbeat",
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Founder Evolution Heartbeat verification failed.",
        durationMs:
          Date.now() - startedAt,
      },
      500,
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  return json(
    {
      success: true,
      service:
        "AIOS Founder Evolution Heartbeat",
      status: "online",
      mode: "read-only",
      endpoint:
        "/api/founder/evolution-heartbeat",
      execution: {
        method: "POST",
        founderOnly: true,
        bounded: true,
        maxHeartbeatsPerInvocation: 2,
      },
      purpose:
        "C142.11.6 real closed-loop verification: Outcome -> Milestone -> Task -> Heartbeat -> Lifecycle -> Safety Gate -> Runtime -> Verification -> Evidence -> Done.",
      verification:
        "The POST response proves persisted lineage, completion state, uniqueness, and bounded idempotency.",
    },
  );
}
