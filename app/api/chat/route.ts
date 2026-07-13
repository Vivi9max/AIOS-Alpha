import { NextResponse } from "next/server";
import { chat } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const result = await chat(prompt);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        content: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}