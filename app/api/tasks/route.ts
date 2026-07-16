import {
  NextResponse,
} from "next/server";

import type {
  TaskStatus,
} from "@/lib/task/types";

import {
  clearPersistentTasks,
  createPersistentTask,
  deletePersistentTask,
  listPersistentTasks,
  updatePersistentTask,
} from "@/lib/task/server-store";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const tasks =
      await listPersistentTasks();

    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length,
      completedCount:
        tasks.filter(
          (task) =>
            task.status === "done"
        ).length,
      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        tasks: [],
        count: 0,
        completedCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "Tasks loading failed.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as {
        title?: string;
        description?: string;
      };

    const task =
      await createPersistentTask(
        body.title ?? "",
        body.description ?? ""
      );

    return NextResponse.json({
      success: true,
      task,
      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Task creation failed.",
      },
      {
        status: 400,
      }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const body =
      (await request.json()) as {
        id?: string;
        title?: string;
        description?: string;
        status?: TaskStatus;
      };

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Task id is required.",
        },
        {
          status: 400,
        }
      );
    }

    const task =
      await updatePersistentTask(
        body.id,
        {
          title:
            body.title,

          description:
            body.description,

          status:
            body.status,
        }
      );

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Task not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      task,
      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Task update failed.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const url =
      new URL(
        request.url
      );

    const id =
      url.searchParams.get(
        "id"
      );

    if (!id) {
      await clearPersistentTasks();

      return NextResponse.json({
        success: true,
        cleared: true,
        timestamp:
          Date.now(),
      });
    }

    const deleted =
      await deletePersistentTask(
        id
      );

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Task not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      timestamp:
        Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Task deletion failed.",
      },
      {
        status: 500,
      }
    );
  }
}