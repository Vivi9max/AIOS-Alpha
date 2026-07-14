import { NextResponse } from "next/server";
import { runBrain } from "@/lib/brain";

type RequestMessage = {
  role?: string;
  content?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const messages: RequestMessage[] =
      Array.isArray(body.messages)
        ? body.messages
        : [];

    const latestMessage =
      [...messages]
        .reverse()
        .find(
          (message) =>
            message.role === "user" &&
            typeof message.content === "string"
        )
        ?.content ?? "";

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : latestMessage.trim();

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          provider: "mock",
          content: "请输入内容。",
        },
        {
          status: 400,
        }
      );
    }

    const result = await runBrain({
      provider: "mock",
      prompt,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AIOS Chat API]", error);

    return NextResponse.json(
      {
        success: false,
        provider: "mock",
        content: "AIOS Runtime Error",
      },
      {
        status: 500,
      }
    );
  }
}