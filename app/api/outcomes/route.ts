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
  createOutcome,
  deleteOutcome,
  getOutcome,
  getOutcomeSummary,
  listOutcomes,
  updateOutcome,
  updateOutcomeMilestone,
} from "@/lib/outcome/store";

import type {
  CreateOutcomeInput,
  OutcomeMilestone,
  OutcomePriority,
  OutcomeStatus,
} from "@/lib/outcome/types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface OutcomeRequestBody {
  action?:
    unknown;

  id?:
    unknown;

  milestoneId?:
    unknown;

  title?:
    unknown;

  description?:
    unknown;

  successCriteria?:
    unknown;

  status?:
    unknown;

  priority?:
    unknown;

  progress?:
    unknown;

  targetDate?:
    unknown;

  taskIds?:
    unknown;

  milestones?:
    unknown;
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
        process.env
          .NODE_ENV ===
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

function normalizeStatus(
  value:
    unknown
):
  | OutcomeStatus
  | undefined {
  if (
    value ===
      "planned" ||
    value ===
      "active" ||
    value ===
      "blocked" ||
    value ===
      "completed" ||
    value ===
      "archived"
  ) {
    return value;
  }

  return undefined;
}

function normalizePriority(
  value:
    unknown
):
  | OutcomePriority
  | undefined {
  if (
    value ===
      "low" ||
    value ===
      "normal" ||
    value ===
      "high" ||
    value ===
      "critical"
  ) {
    return value;
  }

  return undefined;
}

function normalizeMilestoneStatus(
  value:
    unknown
):
  | OutcomeMilestone["status"]
  | undefined {
  if (
    value ===
      "pending" ||
    value ===
      "active" ||
    value ===
      "completed" ||
    value ===
      "blocked"
  ) {
    return value;
  }

  return undefined;
}

function normalizeTaskIds(
  value:
    unknown
):
  | string[]
  | undefined {
  if (
    !Array.isArray(
      value
    )
  ) {
    return undefined;
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item ===
        "string" &&
      Boolean(
        item.trim()
      )
  );
}

function normalizeMilestones(
  value:
    unknown
): CreateOutcomeInput["milestones"] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return null;
        }

        const milestone =
          item as {
            title?:
              unknown;

            description?:
              unknown;
          };

        if (
          typeof milestone.title !==
          "string"
        ) {
          return null;
        }

        return {
          title:
            milestone.title,

          description:
            typeof milestone.description ===
            "string"
              ? milestone.description
              : "",
        };
      }
    )
    .filter(
      (
        item
      ): item is {
        title: string;
        description: string;
      } =>
        Boolean(
          item
        )
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

    const id =
      url.searchParams.get(
        "id"
      );

    if (
      id
    ) {
      const outcome =
        await runWithUserContext(
          identity.userId,
          () =>
            getOutcome(
              id
            )
        );

      if (
        !outcome
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

          outcome,

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

    const [
      outcomes,
      summary,
    ] =
      await runWithUserContext(
        identity.userId,
        async () =>
          Promise.all([
            listOutcomes(),
            getOutcomeSummary(),
          ])
      );

    return jsonResponse(
      {
        success:
          true,

        outcomes,

        summary,

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

        outcomes:
          [],

        error:
          error instanceof Error
            ? error.message
            : "Outcome loading failed.",

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
        OutcomeRequestBody;

    const outcome =
      await runWithUserContext(
        identity.userId,
        () =>
          createOutcome({
            title:
              typeof body.title ===
              "string"
                ? body.title
                : "",

            description:
              typeof body.description ===
              "string"
                ? body.description
                : "",

            successCriteria:
              typeof body.successCriteria ===
              "string"
                ? body.successCriteria
                : "",

            priority:
              normalizePriority(
                body.priority
              ),

            targetDate:
              typeof body.targetDate ===
                "number"
                ? body.targetDate
                : null,

            milestones:
              normalizeMilestones(
                body.milestones
              ),
          })
      );

    return jsonResponse(
      {
        success:
          true,

        outcome,

        identity: {
          userId:
            identity.userId,

          isolated:
            true,
        },

        timestamp:
          Date.now(),
      },
      identity.userId,
      201
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Outcome creation failed.";

    return jsonResponse(
      {
        success:
          false,

        error:
          message,

        code:
          message.startsWith(
            "DUPLICATE_OUTCOME:"
          )
            ? "DUPLICATE_OUTCOME"
            : "OUTCOME_CREATE_ERROR",

        timestamp:
          Date.now(),
      },
      identity.userId,
      400
    );
  }
}

export async function PATCH(
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
        OutcomeRequestBody;

    const id =
      typeof body.id ===
      "string"
        ? body.id.trim()
        : "";

    if (
      !id
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

    if (
      body.action ===
      "update-milestone"
    ) {
      const milestoneId =
        typeof body.milestoneId ===
        "string"
          ? body.milestoneId.trim()
          : "";

      if (
        !milestoneId
      ) {
        return jsonResponse(
          {
            success:
              false,

            error:
              "Milestone id is required.",

            timestamp:
              Date.now(),
          },
          identity.userId,
          400
        );
      }

      const outcome =
        await runWithUserContext(
          identity.userId,
          () =>
            updateOutcomeMilestone(
              id,
              milestoneId,
              {
                title:
                  typeof body.title ===
                  "string"
                    ? body.title
                    : undefined,

                description:
                  typeof body.description ===
                  "string"
                    ? body.description
                    : undefined,

                status:
                  normalizeMilestoneStatus(
                    body.status
                  ),

                taskIds:
                  normalizeTaskIds(
                    body.taskIds
                  ),
              }
            )
        );

      if (
        !outcome
      ) {
        return jsonResponse(
          {
            success:
              false,

            error:
              "Outcome or milestone not found.",

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

          outcome,

          timestamp:
            Date.now(),
        },
        identity.userId
      );
    }

    const outcome =
      await runWithUserContext(
        identity.userId,
        () =>
          updateOutcome(
            id,
            {
              title:
                typeof body.title ===
                "string"
                  ? body.title
                  : undefined,

              description:
                typeof body.description ===
                "string"
                  ? body.description
                  : undefined,

              successCriteria:
                typeof body.successCriteria ===
                "string"
                  ? body.successCriteria
                  : undefined,

              status:
                normalizeStatus(
                  body.status
                ),

              priority:
                normalizePriority(
                  body.priority
                ),

              progress:
                typeof body.progress ===
                "number"
                  ? body.progress
                  : undefined,

              targetDate:
                body.targetDate ===
                  null ||
                typeof body.targetDate ===
                  "number"
                  ? body.targetDate
                  : undefined,

              taskIds:
                normalizeTaskIds(
                  body.taskIds
                ),
            }
          )
      );

    if (
      !outcome
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

        outcome,

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
            : "Outcome update failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}

export async function DELETE(
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

    const id =
      url.searchParams.get(
        "id"
      );

    if (
      !id
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

    const deleted =
      await runWithUserContext(
        identity.userId,
        () =>
          deleteOutcome(
            id
          )
      );

    if (
      !deleted
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

        deleted:
          true,

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
            : "Outcome deletion failed.",

        timestamp:
          Date.now(),
      },
      identity.userId,
      500
    );
  }
}