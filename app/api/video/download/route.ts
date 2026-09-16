import {
  NextRequest,
} from "next/server";

import {
  downloadVideoMedia,
} from "@/lib/video/video-resolver";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function encodeFilename(
  filename: string,
): string {
  return encodeURIComponent(
    filename,
  );
}

function errorResponse(
  message: string,
  status = 400,
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      timestamp: Date.now(),
    }),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  const mediaUrl =
    request.nextUrl.searchParams.get(
      "url",
    );

  const filename =
    request.nextUrl.searchParams.get(
      "filename",
    ) || undefined;

  if (!mediaUrl) {
    return errorResponse(
      "Use ?url=<resolved-video-url>.",
    );
  }

  if (
    mediaUrl.length > 8192
  ) {
    return errorResponse(
      "The media URL is too long.",
    );
  }

  try {
    const result =
      await downloadVideoMedia(
        mediaUrl,
        filename,
      );

    const headers =
      new Headers();

    headers.set(
      "Content-Type",
      result.contentType,
    );

    headers.set(
      "Content-Disposition",
      `attachment; filename="aios-video"; filename*=UTF-8''${encodeFilename(result.filename)}`,
    );

    headers.set(
      "Cache-Control",
      "no-store",
    );

    headers.set(
      "X-AIOS-Video-Source",
      result.mediaUrl,
    );

    if (
      result.contentLength !==
      undefined
    ) {
      headers.set(
        "Content-Length",
        String(
          result.contentLength,
        ),
      );
    }

    return new Response(
      result.response.body,
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Video download failed.",
      422,
    );
  }
}
