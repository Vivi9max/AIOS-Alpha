import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface ChatRequestBody {
  prompt?: unknown;
}

function applyIdentityCookie(
  response: NextResponse,
  userId: string
): NextResponse {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
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
        365,
    }
  );

  return response;
}

export async function GET(
  request: NextRequest
) {
  const identity =
    resolveAlphaIdentity(
      request
    );

  const response =
    NextResponse.json(
      {
        success: true,

        service:
          "AIOS Alpha Chat API",

        status:
          "online",

        runtime:
          "aios-alpha",

        runtimeVersion:
          "0.4",

        identity: {
          userId:
            identity.userId,

          mode:
            "anonymous-alpha",

          isolated:
            true,
        },

        methods: {
          GET:
            "Runtime and identity status",

          POST:
            "Execute isolated AIOS Runtime",
        },

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

  return applyIdentityCookie(
    response,
    identity.userId
  );
}

export async function POST(
  request: NextRequest
) {
  const startedAt =
    Date.now();

  const identity =
    resolveAlphaIdentity(
      request
    );

  try {
    const contentType =
      request.headers.get(
        "content-type"
      ) ?? "";

    if (
      !contentType.includes(
        "application/json"
      )
    ) {
      const response =
        NextResponse.json(
          {
            success: false,

            content:
              "请求格式错误。",

            error:
              "Content-Type must be application/json.",

            userId:
              identity.userId,

            timestamp:
              Date.now(),
          },
          {
            status: 415,
          }
        );

      return applyIdentityCookie(
        response,
        identity.userId
      );
    }

    const body =
      (await request.json()) as ChatRequestBody;

    const prompt =
      typeof body.prompt ===
      "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      const response =
        NextResponse.json(
          {
            success: false,

            content:
              "请输入内容。",

            error:
              "Prompt is required.",

            userId:
              identity.userId,

            timestamp:
              Date.now(),
          },
          {
            status: 400,
          }
        );

      return applyIdentityCookie(
        response,
        identity.userId
      );
    }

    const result =
      await runWithUserContext(
        identity.userId,
        () =>
          executeRuntime({
            prompt,
          })
      );

    const response =
      NextResponse.json(
        {
          ...result,

          userId:
            identity.userId,

          identityMode:
            "anonymous-alpha",

          dataIsolated:
            true,
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
        : "AIOS Chat API failed.";

    console.error(
      "[AIOS Chat API]",
      error
    );

    const response =
      NextResponse.json(
        {
          success: false,

          content:
            "AIOS Runtime 暂时不可用。",

          error:
            errorMessage,

          runtime:
            "aios-alpha",

          runtimeVersion:
            "0.4",

          userId:
            identity.userId,

          timestamp:
            Date.now(),

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
        }
      );

    return applyIdentityCookie(
      response,
      identity.userId
    );
  }
}