import {
  NextResponse,
} from "next/server";

import {
  buildPlannerSnapshot,
} from "@/lib/planner/engine";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const tasks =
      await listPersistentTasks();

    const planner =
      buildPlannerSnapshot(
        tasks
      );

    return NextResponse.json({
      success: true,
      planner,
      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        planner: null,

        error:
          error instanceof Error
            ? error.message
            : "Planner generation failed.",

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}