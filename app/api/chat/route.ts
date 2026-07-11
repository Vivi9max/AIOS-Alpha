import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    return NextResponse.json({
      success: true,
      content: `🧠 AIOS Runtime\n\n收到任务：\n${prompt}`,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        content: "Invalid Request",
      },
      {
        status: 400,
      }
    );
  }
}