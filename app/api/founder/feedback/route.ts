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

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200
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
  request: NextRequest
) {
  if (
    !isFounderConfigured()
  ) {
    return jsonResponse(
      {
        success: false,

        configured: false,

        error:
          "Founder access is not configured.",

        content:
          "请先设置 FOUNDER_ACCESS_KEY。",
      },
      503
    );
  }

  if (
    !isFounderRequest(
      request
    )
  ) {
    return jsonResponse(
      {
        success: false,

        configured: true,

        error:
          "Founder authorization failed.",

        content:
          "创始人访问密钥不正确。",
      },
      401
    );
  }

  try {
    const url =
      new URL(
        request.url
      );

    const category =
      url.searchParams
        .get(
          "category"
        )
        ?.trim();

    const page =
      url.searchParams
        .get(
          "page"
        )
        ?.trim()
        .toLowerCase();

    const search =
      url.searchParams
        .get(
          "search"
        )
        ?.trim()
        .toLowerCase();

    const ratingValue =
      Number(
        url.searchParams.get(
          "rating"
        )
      );

    const limitValue =
      Number(
        url.searchParams.get(
          "limit"
        )
      );

    const limit =
      Number.isFinite(
        limitValue
      )
        ? Math.min(
            500,
            Math.max(
              1,
              Math.round(
                limitValue
              )
            )
          )
        : 200;

    const allRecords =
      await listFounderFeedback();

    const filteredRecords =
      allRecords.filter(
        (item) => {
          if (
            category &&
            category !==
              "all" &&
            item.category !==
              category
          ) {
            return false;
          }

          if (
            Number.isFinite(
              ratingValue
            ) &&
            ratingValue > 0 &&
            item.rating !==
              ratingValue
          ) {
            return false;
          }

          if (
            page &&
            !item.page
              .toLowerCase()
              .includes(
                page
              )
          ) {
            return false;
          }

          if (
            search
          ) {
            const searchable =
              [
                item.message,
                item.page,
                item.userId,
                item.runtimeVersion,
                item.category,
              ]
                .join(
                  " "
                )
                .toLowerCase();

            if (
              !searchable.includes(
                search
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );

    const total =
      filteredRecords.length;

    const bugs =
      filteredRecords.filter(
        (item) =>
          item.category ===
          "bug"
      ).length;

    const positive =
      filteredRecords.filter(
        (item) =>
          item.rating >= 4
      ).length;

    const negative =
      filteredRecords.filter(
        (item) =>
          item.rating <= 2
      ).length;

    const neutral =
      filteredRecords.filter(
        (item) =>
          item.rating === 3
      ).length;

    const averageRating =
      total > 0
        ? Number(
            (
              filteredRecords.reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  item.rating,
                0
              ) /
              total
            ).toFixed(
              1
            )
          )
        : 0;

    const uniqueUsers =
      new Set(
        filteredRecords.map(
          (item) =>
            item.userId
        )
      ).size;

    return jsonResponse({
      success: true,

      founder: true,

      filters: {
        category:
          category ||
          "all",

        rating:
          Number.isFinite(
            ratingValue
          )
            ? ratingValue
            : null,

        page:
          page || "",

        search:
          search || "",

        limit,
      },

      summary: {
        total,
        bugs,
        positive,
        negative,
        neutral,
        averageRating,
        uniqueUsers,
      },

      items:
        filteredRecords.slice(
          0,
          limit
        ),

      timestamp:
        Date.now(),
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Founder feedback loading failed.",

        timestamp:
          Date.now(),
      },
      500
    );
  }
}