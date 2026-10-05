import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";
import {
  runWithUserContext,
} from "@/lib/runtime/request-context";
import {
  getOutcome,
  updateOutcome,
} from "@/lib/outcome/store";
import {
  createOutcomeReview,
  getLatestOutcomeReview,
  getOutcomeReview,
  listOutcomeReviews,
  updateOutcomeReview,
} from "@/lib/outcome/review-store";
import {
  listPersistentTasks,
} from "@/lib/task/server-store";
import {
  appendExecutionLedger,
  listExecutionLedger,
} from "@/lib/planner/execution-ledger";
import {
  buildExecutionReview,
} from "@/lib/planner/execution-review";
import {
  addAndSaveExecutionMemory,
} from "@/lib/memory/execution-memory";
import type {
  Outcome,
} from "@/lib/outcome/types";
import type {
  OutcomeReviewDecision,
} from "@/lib/outcome/review-store";
export const dynamic =
  "force-dynamic";
export const runtime =
  "nodejs";
const MAX_TEXT_LENGTH =
  2000;
interface OutcomeReviewRequestBody {
  action?:
    unknown;
  outcomeId?:
    unknown;
  reviewId?:
    unknown;
  decision?:
    unknown;
  nextGoal?:
    unknown;
  summary?:
    unknown;
  lessons?:
    unknown;
  blockers?:
    unknown;
}
interface ReviewContext {
  outcome:
    Outcome;
  tasks:
    Awaited<
      ReturnType<
        typeof listPersistentTasks
      >
    >;
  executionReview:
    ReturnType<
      typeof buildExecutionReview
    >;
  reviews:
    Awaited<
      ReturnType<
        typeof listOutcomeReviews
      >
    >;
  latestReview:
    Awaited<
      ReturnType<
        typeof getLatestOutcomeReview
      >
    >;
}
function applyIdentityCookie(
  response:
    NextResponse,
  userId:
    string
): NextResponse {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly:
        true,
      sameSite:
        "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path:
        "/",
      maxAge:
        60 *
        60 *
        24 *
        365,
    }
  );
  return response;
}
function jsonResponse(
  body:
    Record<
      string,
      unknown
    >,
  userId:
    string,
  status =
    200
): NextResponse {
  const response =
    NextResponse.json(
      body,
      {
        status,
        headers: {
          "Cache-Control":
            "no-store",
          "Content-Type":
            "application/json; charset=utf-8",
        },
      }
    );
  return applyIdentityCookie(
    response,
    userId
  );
}
function normalizeId(
  value:
    unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }
  return value
    .trim()
    .slice(
      0,
      200
    );
}
function normalizeText(
  value:
    unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }
  return value
    .replace(
      /\r\n/g,
      "\n"
    )
    .trim()
    .slice(
      0,
      MAX_TEXT_LENGTH
    );
}
function normalizeList(
  value:
    unknown
): string[] | undefined {
  if (
    !Array.isArray(
      value
    )
  ) {
    return undefined;
  }
  return Array.from(
    new Set(
      value
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        )
        .map(
          (
            item
          ) =>
            item
              .trim()
              .slice(
                0,
                500
              )
        )
        .filter(
          Boolean
        )
    )
  ).slice(
    0,
    20
  );
}
function normalizeDecision(
  value:
    unknown
):
  | OutcomeReviewDecision
  | null {
  if (
    value ===
      "continue" ||
    value ===
      "revise" ||
    value ===
      "stop"
  ) {
    return value;
  }
  return null;
}
function buildReviewContext(
  outcome:
    Outcome,
  tasks:
    Awaited<
      ReturnType<
        typeof listPersistentTasks
      >
    >,
  executionReview:
    ReturnType<
      typeof buildExecutionReview
    >,
  reviews:
    Awaited<
      ReturnType<
        typeof listOutcomeReviews
      >
    >,
  latestReview:
    Awaited<
      ReturnType<
        typeof getLatestOutcomeReview
      >
    >
): ReviewContext {
  return {
    outcome,
    tasks,
    executionReview,
    reviews,
    latestReview,
  };
}
function buildEvidence(
  context:
    ReviewContext
): string[] {
  const {
    outcome,
    tasks,
    executionReview,
  } =
    context;
  const completedTasks =
    tasks.filter(
      (
        task
      ) =>
        task.status ===
        "done"
    ).length;
  const activeTasks =
    tasks.filter(
      (
        task
      ) =>
        task.status ===
        "doing"
    ).length;
  const evidence = [
    `Outcome progress: ${outcome.progress}%`,
    `Outcome status: ${outcome.status}`,
    `Completed tasks: ${completedTasks}`,
    `Active tasks: ${activeTasks}`,
    `Execution sample size: ${executionReview.sampleSize}`,
    `Execution allowed rate: ${executionReview.allowedRate}%`,
    `Execution completion rate: ${executionReview.completionRate}%`,
  ];
  if (
    executionReview.trend !==
    "insufficient-data"
  ) {
    evidence.push(
      `Execution trend: ${executionReview.trend}`
    );
  }
  if (
    executionReview.health !==
    "insufficient-data"
  ) {
    evidence.push(
      `Execution health: ${executionReview.health}`
    );
  }
  return evidence;
}
function buildBlockers(
  context:
    ReviewContext
): string[] {
  const blockers: string[] =
    [];
  const {
    outcome,
    tasks,
    executionReview,
  } =
    context;
  if (
    outcome.status ===
    "blocked"
  ) {
    blockers.push(
      "The current Outcome is blocked."
    );
  }
  const activeTasks =
    tasks.filter(
      (
        task
      ) =>
        task.status ===
        "doing"
    );
  if (
    activeTasks.length >
    0
  ) {
    blockers.push(
      `${activeTasks.length} task(s) are still in progress.`
    );
  }
  if (
    executionReview.primaryBlockCode
  ) {
    blockers.push(
      `Primary execution block: ${executionReview.primaryBlockCode}`
    );
  }
  if (
    executionReview.health ===
    "blocked"
  ) {
    blockers.push(
      executionReview.priorityAction
    );
  }
  return blockers;
}
function buildLessons(
  context:
    ReviewContext
): string[] {
  const {
    outcome,
    executionReview,
  } =
    context;
  const lessons: string[] =
    [];
  if (
    executionReview.insight
  ) {
    lessons.push(
      executionReview.insight
    );
  }
  if (
    executionReview.priorityAction
  ) {
    lessons.push(
      executionReview.priorityAction
    );
  }
  if (
    outcome.successCriteria
  ) {
    lessons.push(
      `Success criteria: ${outcome.successCriteria}`
    );
  }
  return lessons.slice(
    0,
    20
  );
}
function buildDefaultSummary(
  context:
    ReviewContext
): string {
  const {
    outcome,
    executionReview,
  } =
    context;
  return [
    `Outcome "${outcome.title}" is at ${outcome.progress}% progress.`,
    `Current status: ${outcome.status}.`,
    executionReview.headline,
    executionReview.insight,
  ].join(
    " "
  );
}
function countDoingTasks(
  tasks:
    Awaited<
      ReturnType<
        typeof listPersistentTasks
      >
    >
): number {
  return tasks.filter(
    (
      task
    ) =>
      task.status ===
      "doing"
  ).length;
}
async function loadReviewContext(
  outcomeId:
    string
): Promise<ReviewContext | null> {
  const outcome =
    await getOutcome(
      outcomeId
    );
  if (
    !outcome
  ) {
    return null;
  }
  const [
    tasks,
    ledger,
    reviews,
    latestReview,
  ] =
    await Promise.all([
      listPersistentTasks(),
      listExecutionLedger(
        50
      ),
      listOutcomeReviews(
        outcomeId
      ),
      getLatestOutcomeReview(
        outcomeId
      ),
    ]);
  const executionReview =
    buildExecutionReview(
      ledger
    );
  return buildReviewContext(
    outcome,
    tasks,
    executionReview,
    reviews,
    latestReview
  );
}
export async function GET(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );
  try {
    const url =
      new URL(
        request.url
      );
    const outcomeId =
      normalizeId(
        url.searchParams.get(
          "outcomeId"
        )
      );
    const reviewId =
      normalizeId(
        url.searchParams.get(
          "reviewId"
        )
      );
    if (
      reviewId
    ) {
      const review =
        await runWithUserContext(
          identity.userId,
          () =>
            getOutcomeReview(
              reviewId
            )
        );
      if (
        !review
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "Outcome review not found.",
            timestamp:
              Date.now(),
          },
          identity.userId,
          404
        );
      }
      return jsonResponse(
        {
          success:
            true,
          review,
          identity: {
            userId:
              identity.userId,
            isolated:
              true,
          },
          timestamp:
            Date.now(),
        },
        identity.userId
      );
    }
    if (
      !outcomeId
    ) {
      return jsonResponse(
        {
          success:
            false,
          error:
            "Outcome id is required.",
          timestamp:
            Date.now(),
        },
        identity.userId,
        400
      );
    }
    const context =
      await runWithUserContext(
        identity.userId,
        () =>
          loadReviewContext(
            outcomeId
          )
      );
    if (
      !context
    ) {
      return jsonResponse(
        {
          success:
            false,
          error:
            "Outcome not found.",
          timestamp:
            Date.now(),
        },
        identity.userId,
        404
      );
    }
    return jsonResponse(
      {
        success:
          true,
        outcome:
          context.outcome,
        executionReview:
          context.executionReview,
        reviews:
          context.reviews,
        latestReview:
          context.latestReview,
        evidence:
          buildEvidence(
            context
          ),
        blockers:
          buildBlockers(
            context
          ),
        lessons:
          buildLessons(
            context
          ),
        identity: {
          userId:
            identity.userId,
          isolated:
            true,
        },
        timestamp:
          Date.now(),
      },
      identity.userId
    );
  } catch (error) {
    return jsonResponse(
      {
        success:
          false,
        error:
          error instanceof Error
            ? error.message
            : "Outcome review loading failed.",
        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}
export async function POST(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );
  try {
    const body =
      (await request.json()) as
        OutcomeReviewRequestBody;
    const action =
      typeof body.action ===
      "string"
        ? body.action.trim()
        : "inspect";
    const outcomeId =
      normalizeId(
        body.outcomeId
      );
    if (
      !outcomeId
    ) {
      return jsonResponse(
        {
          success:
            false,
          error:
            "Outcome id is required.",
          timestamp:
            Date.now(),
        },
        identity.userId,
        400
      );
    }
    const context =
      await runWithUserContext(
        identity.userId,
        () =>
          loadReviewContext(
            outcomeId
          )
      );
    if (
      !context
    ) {
      return jsonResponse(
        {
          success:
            false,
          error:
            "Outcome not found.",
          timestamp:
            Date.now(),
        },
        identity.userId,
        404
      );
    }
    if (
      action ===
      "inspect"
    ) {
      return jsonResponse(
        {
          success:
            true,
          action:
            "inspect",
          outcome:
            context.outcome,
          executionReview:
            context.executionReview,
          reviews:
            context.reviews,
          latestReview:
            context.latestReview,
          evidence:
            buildEvidence(
              context
            ),
          blockers:
            buildBlockers(
              context
            ),
          lessons:
            buildLessons(
              context
            ),
          nextPlanner:
            {
              ready:
                false,
              goal:
                null,
              endpoint:
                "/api/planner",
              mode:
                "plan",
            },
          timestamp:
            Date.now(),
        },
        identity.userId
      );
    }
    if (
      action ===
      "create"
    ) {
      const summary =
        normalizeText(
          body.summary
        ) ||
        buildDefaultSummary(
          context
        );
      const evidence =
        buildEvidence(
          context
        );
      const blockers =
        normalizeList(
          body.blockers
        ) ??
        buildBlockers(
          context
        );
      const lessons =
        normalizeList(
          body.lessons
        ) ??
        buildLessons(
          context
        );
      const review =
        await runWithUserContext(
          identity.userId,
          () =>
            createOutcomeReview({
              outcomeId,
              summary,
              evidence,
              blockers,
              lessons,
            })
        );
      return jsonResponse(
        {
          success:
            true,
          action:
            "create",
          review,
          outcome:
            context.outcome,
          executionReview:
            context.executionReview,
          timestamp:
            Date.now(),
        },
        identity.userId,
        201
      );
    }
    if (
      action ===
      "decide"
    ) {
      const reviewId =
        normalizeId(
          body.reviewId
        );
      if (
        !reviewId
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "Review id is required.",
            timestamp:
              Date.now(),
          },
          identity.userId,
          400
        );
      }
      const decision =
        normalizeDecision(
          body.decision
        );
      if (
        !decision
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "A valid review decision is required: continue, revise, or stop.",
            timestamp:
              Date.now(),
          },
          identity.userId,
          400
        );
      }
      const nextGoal =
        normalizeText(
          body.nextGoal
        );
      if (
        (
          decision ===
            "continue" ||
          decision ===
            "revise"
        ) &&
        !nextGoal
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "nextGoal is required for continue or revise decisions.",
            timestamp:
              Date.now(),
          },
          identity.userId,
          400
        );
      }
      const existingReview =
        await runWithUserContext(
          identity.userId,
          () =>
            getOutcomeReview(
              reviewId
            )
        );
      if (
        !existingReview
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "Outcome review not found.",
            timestamp:
              Date.now(),
          },
          identity.userId,
          404
        );
      }
      if (
        existingReview.outcomeId !==
        outcomeId
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "Outcome review does not belong to the specified Outcome.",
            timestamp:
              Date.now(),
          },
          identity.userId,
          400
        );
      }
      if (
        existingReview.status ===
        "decided"
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "This Outcome review has already been decided.",
            review:
              existingReview,
            timestamp:
              Date.now(),
          },
          identity.userId,
          409
        );
      }
      const review =
        await runWithUserContext(
          identity.userId,
          () =>
            updateOutcomeReview(
              reviewId,
              {
                decision,
                nextGoal:
                  decision ===
                  "stop"
                    ? null
                    : nextGoal,
                summary:
                  normalizeText(
                    body.summary
                  ) ||
                  undefined,
                lessons:
                  normalizeList(
                    body.lessons
                  ),
                blockers:
                  normalizeList(
                    body.blockers
                  ),
              }
            )
        );
      if (
        !review
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "Outcome review could not be updated.",
            timestamp:
              Date.now(),
          },
          identity.userId,
          404
        );
      }
      const completedOutcome =
        await runWithUserContext(
          identity.userId,
          () =>
            updateOutcome(
              outcomeId,
              {
                status:
                  "completed",
                progress:
                  decision ===
                    "stop"
                    ? Math.max(
                        context
                          .outcome
                          .progress,
                        0
                      )
                    : 100,
              }
            )
        );
      if (
        !completedOutcome
      ) {
        return jsonResponse(
          {
            success:
              false,
            error:
              "Outcome could not be updated after the review decision.",
            review,
            timestamp:
              Date.now(),
          },
          identity.userId,
          500
        );
      }
      const currentTasks =
        await runWithUserContext(
          identity.userId,
          () =>
            listPersistentTasks()
        );
      const doingCount =
        countDoingTasks(
          currentTasks
        );
      const ledger =
        await runWithUserContext(
          identity.userId,
          () =>
            appendExecutionLedger({
              action:
                "outcome-complete-current",
              decision:
                "allowed",
              mode:
                "baseline",
              code:
                `OUTCOME_REVIEW_${decision.toUpperCase()}`,
              message:
                `Outcome review decision: ${decision}.`,
              outcomeId,
              maxConcurrentTasks:
                1,
              doingCount,
            })
        );
      const memory =
        await runWithUserContext(
          identity.userId,
          () =>
            addAndSaveExecutionMemory({
              eventType:
                "outcome-completed",
              source:
                "outcome",
              title:
                "Outcome review decision recorded",
              summary:
                `Outcome review decided: ${decision}.`,
              outcome:
                completedOutcome,
              outcomeId,
              metadata: {
                decision,
                reviewId:
                  review.id,
                nextGoal:
                  review.nextGoal,
              },
              success:
                true,
            })
        );
      const nextPlannerReady =
        (
          decision ===
            "continue" ||
          decision ===
            "revise"
        ) &&
        Boolean(
          review.nextGoal
        );
      return jsonResponse(
        {
          success:
            true,
          action:
            "decide",
          decision,
          review,
          outcome:
            completedOutcome,
          ledger,
          memory,
          nextPlanner: {
            ready:
              nextPlannerReady,
            goal:
              nextPlannerReady
                ? review.nextGoal
                : null,
            endpoint:
              "/api/planner",
            mode:
              "plan",
          },
          timestamp:
            Date.now(),
        },
        identity.userId
      );
    }
    return jsonResponse(
      {
        success:
          false,
        error:
          "Unsupported review action. Use inspect, create, or decide.",
        timestamp:
          Date.now(),
      },
      identity.userId,
      400
    );
  } catch (error) {
    return jsonResponse(
      {
        success:
          false,
        error:
          error instanceof Error
            ? error.message
            : "Outcome review request failed.",
        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}
