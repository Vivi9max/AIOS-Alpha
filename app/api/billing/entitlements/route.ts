import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getEntitlement,
  getCapabilityMatrix,
  type AIOSCapability,
} from "@/lib/billing/entitlements";

import {
  getUsageSnapshot,
} from "@/lib/billing/usage";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const API_VERSION =
  "v1";

function getRequestId(
  request: NextRequest,
) {
  return (
    request.headers.get(
      "x-request-id",
    ) ??
    crypto.randomUUID()
  );
}

function normalizePlan(
  value: string | null,
) {
  if (
    value ===
      "alpha" ||
    value ===
      "free" ||
    value ===
      "pro" ||
    value ===
      "business"
  ) {
    return value;
  }

  return "alpha";
}

function getUsageFromRequest(
  request: NextRequest,
) {
  const params =
    request.nextUrl.searchParams;

  const executions =
    Number(
      params.get(
        "executionsToday",
      ) ??
        "0",
    );

  const memory =
    Number(
      params.get(
        "memoryItems",
      ) ??
        "0",
    );

  const automation =
    Number(
      params.get(
        "automationJobs",
      ) ??
        "0",
    );

  return {
    executionsToday:
      Number.isFinite(
        executions,
      ) &&
      executions >= 0
        ? executions
        : 0,

    memoryItems:
      Number.isFinite(
        memory,
      ) &&
      memory >= 0
        ? memory
        : 0,

    automationJobs:
      Number.isFinite(
        automation,
      ) &&
      automation >= 0
        ? automation
        : 0,
  };
}

export async function GET(
  request: NextRequest,
) {
  const requestId =
    getRequestId(request);

  const planId =
    normalizePlan(
      request.nextUrl.searchParams.get(
        "plan",
      ),
    );

  const entitlement =
    getEntitlement(
      planId,
    );

  const usage =
    getUsageFromRequest(
      request,
    );

  const usageSnapshot =
    getUsageSnapshot(
      planId,
      usage,
    );

  return NextResponse.json({
    success: true,

    apiVersion:
      API_VERSION,

    requestId,

    product: {
      name:
        "AIOS Alpha",
      stage:
        "Alpha",
      version:
        "0.4",
    },

    plan: {
      id:
        entitlement.planId,

      name:
        entitlement.plan.name,

      description:
        entitlement.plan
          .description,

      priceLabel:
        entitlement.plan
          .priceLabel,

      active:
        entitlement.active,

      source:
        entitlement.source,
    },

    capabilities:
      entitlement.capabilities,

    limits:
      entitlement.limits,

    usage:
      usageSnapshot,

    capabilityMatrix:
      getCapabilityMatrix(),

    client: {
      web: true,
      ios: true,
      android: true,
      api: true,
    },

    future: {
      paymentProvider:
        null,

      subscriptionStatus:
        "not_connected",

      billingEnabled:
        false,
    },

    timestamp:
      Date.now(),
  });
}

export async function POST(
  request: NextRequest,
) {
  const requestId =
    getRequestId(request);

  let body:
    | {
        plan?: unknown;
        capability?: unknown;
      }
    | undefined;

  try {
    body =
      (await request.json()) as {
        plan?: unknown;
        capability?: unknown;
      };
  } catch {
    body = undefined;
  }

  const planId =
    normalizePlan(
      typeof body?.plan ===
        "string"
        ? body.plan
        : null,
    );

  const capability =
    typeof body?.capability ===
    "string"
      ? body.capability
      : null;

  if (
    !capability
  ) {
    return NextResponse.json(
      {
        success:
          false,
        apiVersion:
          API_VERSION,
        requestId,
        error:
          "Capability is required.",
        code:
          "CAPABILITY_REQUIRED",
      },
      {
        status: 400,
      },
    );
  }

  const allowedCapabilities:
    AIOSCapability[] = [
    "chat",
    "memory",
    "planner",
    "execution",
    "retry",
    "automation",
    "advanced-providers",
    "api",
    "team-workspace",
  ];

  if (
    !allowedCapabilities.includes(
      capability as AIOSCapability,
    )
  ) {
    return NextResponse.json(
      {
        success:
          false,
        apiVersion:
          API_VERSION,
        requestId,
        error:
          "Unknown AIOS capability.",
        code:
          "UNKNOWN_CAPABILITY",
      },
      {
        status: 400,
      },
    );
  }

  const entitlement =
    getEntitlement(
      planId,
    );

  const allowed =
    entitlement.capabilities.includes(
      capability as AIOSCapability,
    );

  return NextResponse.json({
    success: true,

    apiVersion:
      API_VERSION,

    requestId,

    planId,

    capability,

    allowed,

    reason:
      allowed
        ? "allowed"
        : "capability_not_in_plan",

    timestamp:
      Date.now(),
  });
}
