import {
  NextResponse,
} from "next/server";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface ChatRequestBody {
  prompt?: unknown;
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,

      service:
        "AIOS Alpha Chat API",

      status:
        "online",

      runtime:
        "aios-alpha",

      runtimeVersion:
        "0.3",

      methods: {
        GET:
          "Runtime status",
        POST:
          "Execute AIOS Runtime",
      },

      usage: {
        method:
          "POST",

        contentType:
          "application/json",

        body: {
          prompt:
            "你好",
        },
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
}

export async function POST(
  request: Request
) {
  const startedAt =
    Date.now();

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
      return NextResponse.json(
        {
          success: false,

          provider:
            "mock",

          requestedProvider:
            "mock",

          fallbackUsed:
            false,

          actionHandled:
            false,

          content:
            "请求格式错误。",

          error:
            "Content-Type must be application/json.",

          runtime:
            "aios-alpha",

          runtimeVersion:
            "0.3",

          timestamp:
            Date.now(),

          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status: 415,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
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
      return NextResponse.json(
        {
          success: false,

          provider:
            "mock",

          requestedProvider:
            "mock",

          fallbackUsed:
            false,

          actionHandled:
            false,

          content:
            "请输入内容。",

          error:
            "Prompt is required.",

          runtime:
            "aios-alpha",

          runtimeVersion:
            "0.3",

          timestamp:
            Date.now(),

          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const result =
      await executeRuntime({
        prompt,
      });

    return NextResponse.json(
      {
        success:
          result.success,

        provider:
          result.provider,

        requestedProvider:
          result.requestedProvider,

        fallbackUsed:
          result.fallbackUsed ??
          false,

        actionHandled:
          result.actionHandled ??
          false,

        content:
          result.content,

        error:
          result.error,

        runtime:
          result.runtime,

        runtimeVersion:
          result.runtimeVersion,

        planId:
          result.planId,

        planType:
          result.planType,

        steps:
          result.steps,

        latencyMs:
          result.latencyMs,

        timestamp:
          result.timestamp,
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
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "AIOS Chat API failed.";

    console.error(
      "[AIOS Chat API]",
      error
    );

    return NextResponse.json(
      {
        success: false,

        provider:
          "mock",

        requestedProvider:
          "deepseek",

        fallbackUsed:
          false,

        actionHandled:
          false,

        content:
          "AIOS Runtime 暂时不可用。",

        error:
          errorMessage,

        runtime:
          "aios-alpha",

        runtimeVersion:
          "0.3",

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
  }
}