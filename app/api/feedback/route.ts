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
  createFeedback,
  listFeedback,
  type FeedbackCategory,
} from "@/lib/feedback/store";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface FeedbackRequestBody {
  category?: unknown;
  rating?: unknown;
  message?: unknown;
  page?: unknown;
  runtimeVersion?: unknown;
}

function isFeedbackCategory(
  value: unknown
): value is FeedbackCategory {
  return (
    value === "great" ||
    value === "good" ||
    value === "neutral" ||
    value === "bad" ||
    value === "bug"
  );
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

export async function GET(
  request:
    NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  const records =
    await runWithUserContext(
      identity.userId,
      () =>
        listFeedback()
    );

  const response =
    NextResponse.json(
      {
        success:
          true,

        count:
          records.length,

        items:
          records,

        userId:
          identity.userId,

        isolated:
          true,

        timestamp:
          Date.now(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  return applyIdentityCookie(
    response,
    identity.userId
  );
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
      (await request.json()) as FeedbackRequestBody;

    if (
      !isFeedbackCategory(
        body.category
      )
    ) {
      const response =
        NextResponse.json(
          {
            success:
              false,

            error:
              "Invalid feedback category.",

            content:
              "请选择反馈类型。",
          },
          {
            status:
              400,
          }
        );

      return applyIdentityCookie(
        response,
        identity.userId
      );
    }

    const rating =
      typeof body.rating ===
      "number"
        ? body.rating
        : 3;

    const record =
      await runWithUserContext(
        identity.userId,
        () =>
          createFeedback({
            category:
              body.category as FeedbackCategory,

            rating,

            message:
              typeof body.message ===
              "string"
                ? body.message
                : "",

            page:
              typeof body.page ===
              "string"
                ? body.page
                : "workspace",

            runtimeVersion:
              typeof body.runtimeVersion ===
              "string"
                ? body.runtimeVersion
                : "0.4",
          })
      );

    const response =
      NextResponse.json(
        {
          success:
            true,

          content:
            "感谢你的反馈。",

          feedback:
            record,

          userId:
            identity.userId,

          isolated:
            true,

          timestamp:
            Date.now(),
        },
        {
          status:
            201,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );

    return applyIdentityCookie(
      response,
      identity.userId
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Feedback submission failed.";

    console.error(
      "[AIOS Feedback API]",
      error
    );

    const response =
      NextResponse.json(
        {
          success:
            false,

          content:
            "反馈提交失败，请稍后重试。",

          error:
            errorMessage,

          timestamp:
            Date.now(),
        },
        {
          status:
            500,
        }
      );

    return applyIdentityCookie(
      response,
      identity.userId
    );
  }
}