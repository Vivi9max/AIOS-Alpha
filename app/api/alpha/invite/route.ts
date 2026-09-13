import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ALPHA_ACCESS_COOKIE,
  ALPHA_ACCESS_VALUE,
  verifyAlphaInviteCode,
} from "@/lib/auth/invite";

import type {
  Locale,
} from "@/lib/i18n";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface InviteRequestBody {
  code?: unknown;
}

function resolveLocale(
  value: string | null
): Locale {
  if (value === "zh-CN") {
    return "zh-CN";
  }

  if (value === "ja") {
    return "ja";
  }

  return "en";
}

const copy: Record<
  Locale,
  {
    invalid: string;
    success: string;
    failure: string;
  }
> = {
  en: {
    invalid:
      "The invitation code is invalid. Please check it and try again.",
    success:
      "Welcome to AIOS Alpha.",
    failure:
      "Verification failed. Please try again later.",
  },

  "zh-CN": {
    invalid:
      "邀请码无效，请检查后重试。",
    success:
      "欢迎加入 AIOS Alpha。",
    failure:
      "验证失败，请稍后重试。",
  },

  ja: {
    invalid:
      "招待コードが無効です。確認してもう一度お試しください。",
    success:
      "AIOS Alpha へようこそ。",
    failure:
      "確認に失敗しました。しばらくしてからもう一度お試しください。",
  },
};

export async function POST(
  request: NextRequest
) {
  const locale =
    resolveLocale(
      request.headers.get(
        "x-aios-locale"
      )
    );

  const text =
    copy[locale];

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
          content: text.invalid,
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
          content: text.success,
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
        content: text.failure,
        error: errorMessage,
        timestamp:
          Date.now(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
