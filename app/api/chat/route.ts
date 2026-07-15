import { NextResponse } from "next/server";

import { executeRuntime } from "@/lib/runtime/engine";

type RequestMessage = {
  role?: string;
  content?: string;
};

interface ChatRequestBody {
  prompt?: unknown;
  messages?: unknown;
}

function getPrompt(
  body: ChatRequestBody
): string {
  if (typeof body.prompt === "string") {
    return body.prompt.trim();
  }

  const messages: RequestMessage[] =
    Array.isArray(body.messages)
      ? body.messages
      : [];

  const latestUserMessage = [
    ...messages,
  ]
    .reverse()
    .find(
      (message) =>
        message.role === "user" &&
        typeof message.content ===
          "string"
    );

  return latestUserMessage?.content?.trim() ?? "";
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as ChatRequestBody;

    const prompt = getPrompt(body);

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          provider: "mock",
          content: "请输入内容。",
          runtime: "aios-alpha",
          timestamp: Date.now(),
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

    return NextResponse.json(
      result,
      {
        status: result.success
          ? 200
          : 500,
      }
    );
  } catch (error) {
    console.error(
      "[AIOS Runtime API]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        provider: "mock",
        content:
          "AIOS Runtime Error",
        runtime: "aios-alpha",
        timestamp: Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}