import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveVideoFromPage,
} from "@/lib/video/video-resolver";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

interface ResolveBody {
  url?: string;
}

function jsonError(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: Date.now(),
    },
    {
      status,
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as ResolveBody;

    const url =
      typeof body.url === "string"
        ? body.url.trim()
        : "";

    if (!url) {
      return jsonError(
        "A source page URL is required.",
      );
    }

    if (
      url.length > 4096
    ) {
      return jsonError(
        "The source URL is too long.",
      );
    }

    const result =
      await resolveVideoFromPage(
        url,
      );

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Video resolution failed.",
      500,
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  const url =
    request.nextUrl.searchParams.get(
      "url",
    );

  if (!url) {
    return jsonError(
      "Use ?url=<source-page-url>.",
    );
  }

  const result =
    await resolveVideoFromPage(
      url,
    );

  return NextResponse.json(
    result,
    {
      status:
        result.success
          ? 200
          : 422,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
