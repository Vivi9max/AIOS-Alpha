import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  listFounderFeedback,
} from "@/lib/feedback/store";

import {
  getStorageHealth,
  getStorageMode,
  getWorkspaceId,
} from "@/lib/server-storage";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function createJsonResponse(
  body:
    Record<
      string,
      unknown
    >,

  status =
    200
): NextResponse {
  return NextResponse.json(
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
}

export async function GET(
  request:
    NextRequest
) {
  if (
    !isFounderConfigured()
  ) {
    return createJsonResponse(
      {
        success:
          false,

        configured:
          false,

        error:
          "Founder access is not configured.",

        content:
          "请先在 Vercel 环境变量中设置 FOUNDER_ACCESS_KEY。",
      },
      503
    );
  }

  if (
    !isFounderRequest(
      request
    )
  ) {
    return createJsonResponse(
      {
        success:
          false,

        configured:
          true,

        error:
          "Founder authorization failed.",

        content:
          "创始人访问密钥不正确。",
      },
      401
    );
  }

  try {
    const [
      feedback,
      storageHealth,
    ] =
      await Promise.all([
        listFounderFeedback(),
        getStorageHealth(),
      ]);

    const totalFeedback =
      feedback.length;

    const bugCount =
      feedback.filter(
        (item) =>
          item.category ===
          "bug"
      ).length;

    const positiveCount =
      feedback.filter(
        (item) =>
          item.rating >= 4
      ).length;

    const criticalCount =
      feedback.filter(
        (item) =>
          item.rating <= 2
      ).length;

    const averageRating =
      totalFeedback > 0
        ? Number(
            (
              feedback.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  item.rating,
                0
              ) /
              totalFeedback
            ).toFixed(1)
          )
        : 0;

    const uniqueUsers =
      new Set(
        feedback.map(
          (item) =>
            item.userId
        )
      ).size;

    return createJsonResponse(
      {
        success:
          true,

        founder:
          true,

        version:
          process.env
            .NEXT_PUBLIC_APP_VERSION ??
          "0.4",

        environment:
          process.env
            .VERCEL_ENV ??
          process.env
            .NODE_ENV ??
          "development",

        deployment: {
          commit:
            process.env
              .VERCEL_GIT_COMMIT_SHA
              ?.slice(
                0,
                7
              ) ??
            "local",

          branch:
            process.env
              .VERCEL_GIT_COMMIT_REF ??
            "local",

          url:
            process.env
              .VERCEL_PROJECT_PRODUCTION_URL ??
            process.env
              .VERCEL_URL ??
            "localhost",
        },

        storage: {
          mode:
            getStorageMode(),

          workspaceId:
            getWorkspaceId(),

          health:
            storageHealth,
        },

        feedback: {
          total:
            totalFeedback,

          bugs:
            bugCount,

          positive:
            positiveCount,

          critical:
            criticalCount,

          averageRating,

          uniqueUsers,

          latest:
            feedback.slice(
              0,
              20
            ),
        },

        timestamp:
          Date.now(),
      }
    );
  } catch (error) {
    return createJsonResponse(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Founder overview failed.",

        timestamp:
          Date.now(),
      },
      500
    );
  }
}