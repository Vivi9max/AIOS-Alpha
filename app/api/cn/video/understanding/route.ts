import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
  AIOS_USER_COOKIE,
} from "@/lib/auth/identity";

import {
  analyzeAIOSCNVideoFrames,
  type AIOSCNVideoFrame,
} from "@/lib/runtime/cn/aios-cn-video-runtime";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function applyIdentityCookie(
  response: NextResponse,
  userId: string,
): NextResponse {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        60 *
        60 *
        24 *
        365,
    },
  );

  return response;
}

export async function POST(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  const identity =
    resolveAlphaIdentity(
      request,
    );

  try {
    const body =
      await request.json();

    const frames =
      Array.isArray(
        body?.frames,
      )
        ? body.frames
        : [];

    const prompt =
      typeof body?.prompt ===
      "string"
        ? body.prompt
        : "";

    if (
      frames.length ===
      0 ||
      frames.length >
        5
    ) {
      const response =
        NextResponse.json(
          {
            success: false,
            error:
              "AIOS_CN_VIDEO_FRAME_LIMIT_INVALID",
          },
          {
            status: 400,
          },
        );

      return applyIdentityCookie(
        response,
        identity.userId,
      );
    }

    const normalizedFrames:
      AIOSCNVideoFrame[] =
      frames.map(
        (
          frame: AIOSCNVideoFrame,
        ) => ({
          index:
            Number(frame.index),
          timestampSeconds:
            Number(
              frame.timestampSeconds,
            ),
          ratio:
            Number(frame.ratio),
          mimeType:
            typeof frame.mimeType ===
            "string"
              ? frame.mimeType
              : "image/jpeg",
          imageBase64:
            typeof frame.imageBase64 ===
            "string"
              ? frame.imageBase64
              : "",
        }),
      );

    const result =
      await analyzeAIOSCNVideoFrames(
        prompt,
        normalizedFrames,
      );

    const response =
      NextResponse.json(
        {
          ...result,
          runtime:
            "aios-cn-video-understanding",
          identity: {
            userId:
              identity.userId,
            isolated: true,
          },
          locale:
            request.headers.get(
              "x-aios-locale",
            ) ??
            "zh-CN",
          transient: true,
          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status:
            result.success
              ? 200
              : 500,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  } catch (
    error
  ) {
    const response =
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "AIOS CN video understanding failed.",
          identity: {
            userId:
              identity.userId,
            isolated: true,
          },
          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  }
}
