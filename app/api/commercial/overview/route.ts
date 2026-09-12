import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCommercialOverview,
  createCommercialObjective,
} from "@/lib/commercial/operating-layer";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const overview =
      await getCommercialOverview();

    return NextResponse.json(
      {
        success: true,
        ...overview,
        runtime:
          "aios-alpha",
        runtimeVersion:
          "0.5",
        timestamp:
          Date.now(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code:
          "COMMERCIAL_OVERVIEW_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Failed to load commercial overview.",
        timestamp:
          Date.now(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const objective =
      await createCommercialObjective(
        {
          title:
            body?.title,

          description:
            body?.description,

          status:
            body?.status ??
            "active",

          stage:
            body?.stage ??
            "validation",

          currency:
            body?.currency ??
            "USD",

          revenueTarget:
            body?.revenueTarget,

          costTarget:
            body?.costTarget,

          customerTarget:
            body?.customerTarget,

          outcomeId:
            body?.outcomeId ??
            null,

          taskId:
            body?.taskId ??
            null,

          successCriteria:
            body?.successCriteria,
        },
      );

    return NextResponse.json(
      {
        success: true,
        objective,
        runtime:
          "aios-alpha",
        runtimeVersion:
          "0.5",
        timestamp:
          Date.now(),
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create commercial objective.";

    const duplicate =
      message.startsWith(
        "DUPLICATE_COMMERCIAL_OBJECTIVE:",
      );

    return NextResponse.json(
      {
        success: false,
        code: duplicate
          ? "DUPLICATE_COMMERCIAL_OBJECTIVE"
          : "COMMERCIAL_OBJECTIVE_CREATE_FAILED",
        error: message,
        timestamp:
          Date.now(),
      },
      {
        status:
          duplicate
            ? 409
            : 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
