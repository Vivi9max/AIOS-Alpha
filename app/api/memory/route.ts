import { NextResponse } from "next/server";

import {
  clearMemory,
  getMemory,
} from "@/lib/memory/store";

export async function GET() {
  return NextResponse.json({
    success: true,
    items: getMemory(),
  });
}

export async function DELETE() {
  clearMemory();

  return NextResponse.json({
    success: true,
    items: [],
  });
}