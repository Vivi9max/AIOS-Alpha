import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCommercialOverview,
  createCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithFounderContext,
} from "@/lib/runtime/request-context";

import {
  APP_CONFIG,
} from "@/lib/config/app";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      code: "FOUNDER_AUTH_REQUIRED",
      error: "Founder authentication is required.",
      timestamp: Date.now(),
    },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function runtimeMetadata() {
  return {
    runtime: APP_CONFIG.runtimeId,
    runtimeVersion: APP_CONFIG.version,
    release: APP_CONFIG.release,
    timestamp: Date.now(),
  };
}

export async function GET(
  request: NextRequest,
) {
  if (!isFounderRequest(request)) {
    return unauthorizedResponse();
  }

  const identity =
    resolveAlphaIdentity(request);

  try {
    const overview =
      await runWithFounderContext(
        identity.userId,
        () => getCommercialOverview(),
      );

    return NextResponse.json(
      {
        success: true,
        ...overview,
        ...runtimeMetadata(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code: "COMMERCIAL_OVERVIEW_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Failed to load commercial overview.",
        ...runtimeMetadata(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  if (!isFounderRequest(request)) {
    return unauthorizedResponse();
  }

  const identity =
    resolveAlphaIdentity(request);

  try {
    const body =
      await request.json();

    const objective =
      await runWithFounderContext(
        identity.userId,
        () =>
          createCommercialObjective({
            title: body?.title,
            description: body?.description,
            status: body?.status ?? "active",
            stage: body?.stage ?? "validation",
            currency: body?.currency ?? "USD",
            revenueTarget: body?.revenueTarget,
            costTarget: body?.costTarget,
            customerTarget: body?.customerTarget,
            outcomeId: body?.outcomeId ?? null,
            taskId: body?.taskId ?? null,
            successCriteria: body?.successCriteria,
          }),
      );

    return NextResponse.json(
      {
        success: true,
        objective,
        ...runtimeMetadata(),
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
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
        ...runtimeMetadata(),
      },
      {
        status: duplicate ? 409 : 400,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
