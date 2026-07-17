import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ALPHA_ACCESS_COOKIE,
  ALPHA_ACCESS_VALUE,
  verifyAlphaInviteCode,
} from "@/lib/auth/invite";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface InviteRequestBody {
  code?: unknown;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as InviteRequestBody;

    const code =
      typeof body.code ===
      "string"
        ? body.code.trim()
        : "";

    if (
      !code ||
      !verifyAlphaInviteCode(
        code
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          content:
            "邀请码无效，请检查后重试。",

          error:
            "Invalid alpha invite code.",

          timestamp:
            Date.now(),
        },
        {
          status: 401,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const response =
      NextResponse.json(
        {
          success: true,

          content:
            "欢迎加入 AIOS Alpha。",

          redirect:
            "/workspace",

          timestamp:
            Date.now(),
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );

    response.cookies.set(
      ALPHA_ACCESS_COOKIE,
      ALPHA_ACCESS_VALUE,
      {
        httpOnly: true,

        sameSite: "lax",

        secure:
          process.env
            .NODE_ENV ===
          "production",

        path: "/",

        maxAge:
          60 *
          60 *
          24 *
          30,
      }
    );

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Alpha invite verification failed.";

    return NextResponse.json(
      {
        success: false,

        content:
          "验证失败，请稍后重试。",

        error:
          errorMessage,

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}