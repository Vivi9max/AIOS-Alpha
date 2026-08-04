import { NextRequest, NextResponse } from "next/server";

import {
  createKnowledge,
  deleteKnowledge,
  getKnowledge,
  listKnowledge,
  searchKnowledge,
  summarizeKnowledge,
  updateKnowledge,
} from "@/lib/knowledge/store";

import type {
  KnowledgeEntry,
  KnowledgeQuery,
} from "@/lib/knowledge/types";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

function success(data: unknown) {
  return NextResponse.json({
    success: true,
    ...((data as object) ?? {}),
    timestamp: Date.now(),
  });
}

function failure(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: Date.now(),
    },
    { status }
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const url = new URL(request.url);

    const id =
      url.searchParams.get("id");

    const summary =
      url.searchParams.get(
        "summary"
      );

    if (summary === "true") {
      return success({
        summary:
          await summarizeKnowledge(),
      });
    }

    if (id) {
      const item =
        await getKnowledge(id);

      if (!item) {
        return failure(
          "Knowledge not found.",
          404
        );
      }

      return success({
        knowledge: item,
      });
    }

    const query: KnowledgeQuery =
      {
        keyword:
          url.searchParams.get(
            "keyword"
          ) ?? undefined,

        category:
          (url.searchParams.get(
            "category"
          ) as any) ??
          undefined,

        source:
          (url.searchParams.get(
            "source"
          ) as any) ??
          undefined,

        importance:
          (url.searchParams.get(
            "importance"
          ) as any) ??
          undefined,

        limit:
          Number(
            url.searchParams.get(
              "limit"
            )
          ) || undefined,
      };

    if (
      query.keyword ||
      query.category ||
      query.source ||
      query.importance
    ) {
      return success(
        await searchKnowledge(
          query
        )
      );
    }

    return success({
      entries:
        await listKnowledge(),
    });
  } catch (error) {
    return failure(
      error instanceof Error
        ? error.message
        : "Unknown error",
      500
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as KnowledgeEntry;

    await createKnowledge(body);

    return success({
      knowledge: body,
    });
  } catch (error) {
    return failure(
      error instanceof Error
        ? error.message
        : "Unknown error",
      500
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    if (!body.id) {
      return failure(
        "Knowledge id required."
      );
    }

    const updated =
      await updateKnowledge(
        body.id,
        body
      );

    if (!updated) {
      return failure(
        "Knowledge not found.",
        404
      );
    }

    return success({
      knowledge: updated,
    });
  } catch (error) {
    return failure(
      error instanceof Error
        ? error.message
        : "Unknown error",
      500
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const url = new URL(request.url);

    const id =
      url.searchParams.get("id");

    if (!id) {
      return failure(
        "Knowledge id required."
      );
    }

    const deleted =
      await deleteKnowledge(id);

    return success({
      deleted,
    });
  } catch (error) {
    return failure(
      error instanceof Error
        ? error.message
        : "Unknown error",
      500
    );
  }
}