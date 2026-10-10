
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

import {
  getMarketResearchUsage,
} from "@/lib/billing/market-research-usage";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  APP_CONFIG,
} from "@/lib/config/app";

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

function applyIdentityCookie(
  response: NextResponse,
  userId: string,
) {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        60 * 60 * 24 * 365,
    },
  );

  return response;
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
    getRequestId(
      request,
    );

  const identity =
    resolveAlphaIdentity(
      request,
    );

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

  /*
   * C167.5.50
   *
   * Execution, memory and automation
   * usage remain compatible with the
   * existing API contract.
   *
   * Market Research usage is resolved
   * from the server-side user-scoped
   * persistent meter. Client-provided
   * research usage counters are ignored.
   */
  const usage =
    getUsageFromRequest(
      request,
    );

  const usageSnapshot =
    getUsageSnapshot(
      planId,
      usage,
    );

  let marketResearchUsage:
    Awaited<
      ReturnType<
        typeof getMarketResearchUsage
      >
    >;

  try {
    marketResearchUsage =
      await getMarketResearchUsage(
        planId,
      );
  } catch {
    const response =
      NextResponse.json(
        {
          success: false,

          apiVersion:
            API_VERSION,

          requestId,

          error:
            "Market Research usage could not be resolved.",

          code:
            "MARKET_RESEARCH_USAGE_UNAVAILABLE",

          timestamp:
            Date.now(),
        },
        {
          status: 503,
        },
      );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  }

  const response =
    NextResponse.json({
      success: true,

      apiVersion:
        API_VERSION,

      requestId,

      product: {
        name:
          APP_CONFIG.name,

        stage:
          APP_CONFIG.stage,

        version:
          APP_CONFIG.version,

        release:
          APP_CONFIG.release,

        runtime:
          APP_CONFIG.runtimeId,
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

      usage: {
        ...usageSnapshot,

        marketResearch: {
          type:
            "market-research",

          period:
            "month",

          current:
            marketResearchUsage.used,

          limit:
            marketResearchUsage.limit,

          remaining:
            marketResearchUsage.remaining,

          allowed:
            marketResearchUsage.allowed,

          reason:
            marketResearchUsage.allowed
              ? "allowed"
              : "limit_reached",
        },
      },

      marketResearch: {
        capability:
          entitlement.capabilities.includes(
            "market-research",
          ),

        monthlyLimit:
          marketResearchUsage.limit,

        reportsThisMonth:
          marketResearchUsage.used,

        remaining:
          marketResearchUsage.remaining,

        allowed:
          entitlement.capabilities.includes(
            "market-research",
          ) &&
          marketResearchUsage.allowed,
      },

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

  return applyIdentityCookie(
    response,
    identity.userId,
  );
}

export async function POST(
  request: NextRequest,
) {
  const requestId =
    getRequestId(
      request,
    );

  const identity =
    resolveAlphaIdentity(
      request,
    );

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
    body =
      undefined;
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
    const response =
      NextResponse.json(
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

    return applyIdentityCookie(
      response,
      identity.userId,
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
    "market-research",
  ];

  if (
    !allowedCapabilities.includes(
      capability as AIOSCapability,
    )
  ) {
    const response =
      NextResponse.json(
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

    return applyIdentityCookie(
      response,
      identity.userId,
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

  let marketResearchUsage:
    Awaited<
      ReturnType<
        typeof getMarketResearchUsage
      >
    > | null =
    null;

  if (
    capability ===
    "market-research"
  ) {
    try {
      marketResearchUsage =
        await getMarketResearchUsage(
          planId,
        );
    } catch {
      const response =
        NextResponse.json(
          {
            success:
              false,

            apiVersion:
              API_VERSION,

            requestId,

            error:
              "Market Research usage could not be resolved.",

            code:
              "MARKET_RESEARCH_USAGE_UNAVAILABLE",
          },
          {
            status: 503,
          },
        );

      return applyIdentityCookie(
        response,
        identity.userId,
      );
    }
  }

  const marketResearchAllowed =
    capability ===
      "market-research"
      ? allowed &&
        Boolean(
          marketResearchUsage?.allowed,
        )
      : allowed;

  const response =
    NextResponse.json({
      success: true,

      apiVersion:
        API_VERSION,

      requestId,

      planId,

      capability,

      allowed:
        marketResearchAllowed,

      reason:
        capability ===
        "market-research"
          ? !allowed
            ? "capability_not_in_plan"
            : marketResearchUsage
                ?.allowed
              ? "allowed"
              : "monthly_limit_reached"
          : allowed
            ? "allowed"
            : "capability_not_in_plan",

      usage:
        capability ===
        "market-research"
          ? marketResearchUsage
          : null,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

      release:
        APP_CONFIG.release,

      timestamp:
        Date.now(),
    });

  return applyIdentityCookie(
    response,
    identity.userId,
  );
}
