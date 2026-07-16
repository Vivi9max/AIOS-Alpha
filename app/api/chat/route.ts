import {
  NextResponse,
} from "next/server";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

export const dynamic =
  "force-dynamic";

interface ChatRequestBody {
  prompt?: unknown;
}

export async function POST(
  request: Request
) {
  try {
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
          provider: "mock",
          requestedProvider:
            "mock",
          fallbackUsed: false,
          actionHandled: false,
          content:
            "请输入内容。",
          error:
            "Prompt is required.",
          timestamp:
            Date.now(),
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await executeRuntime({
        prompt,
      });

    return NextResponse.json({
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

      latencyMs:
        result.latencyMs,

      timestamp:
        result.timestamp,
    });
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
        provider: "mock",
        requestedProvider:
          "deepseek",
        fallbackUsed: false,
        actionHandled: false,
        content:
          "AIOS Runtime 暂时不可用。",
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