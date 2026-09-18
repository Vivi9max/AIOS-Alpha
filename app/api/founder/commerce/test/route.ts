import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  createC145_6RegressionFixture,
  executeCommerceTestPlan,
  recordCommerceActualTest,
  type CommerceTestPlanInput,
  type CommerceActualTestInput,
} from "@/lib/runtime/commerce-test-runtime";

import {
  APP_CONFIG,
} from "@/lib/config/app";

function runtimeIdentity() {
  return {
    runtime:
      APP_CONFIG.runtimeId,
    runtimeVersion:
      APP_CONFIG.version,
    release:
      APP_CONFIG.release,
  };
}

function errorResponse(
  code: string,
  error: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      verified: false,
      code,
      error,
      ...runtimeIdentity(),
      timestamp:
        Date.now(),
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function runRegression() {
  const startedAt =
    Date.now();

  const fixture =
    createC145_6RegressionFixture();

  const plan =
    executeCommerceTestPlan(
      fixture.plan,
    );

  const actual =
    recordCommerceActualTest(
      fixture.plan,
      fixture.actual,
    );

  const planPass =
    plan.success &&
    plan.code ===
      "C145_6_COMMERCE_TEST_PLAN_READY";

  const actualPass =
    actual.success &&
    actual.code ===
      "C145_6_COMMERCE_ACTUAL_TEST_RECORDED";

  const realityLoopPass =
    actual.realityLoop
      .realOrderDataAvailable ===
      true &&
    actual.realityLoop
      .actualUnitEconomicsAvailable ===
      true;

  const boundaryPass =
    actual.realityLoop
      .profitabilityVerified ===
      false &&
    actual.boundaries.length >=
      7;

  const contributionPass =
    actual.actualResults
      ?.actualContribution ===
    31.8;

  const finalPass =
    planPass &&
    actualPass &&
    realityLoopPass &&
    boundaryPass &&
    contributionPass;

  return {
    success: finalPass,
    verified: finalPass,
    code: finalPass
      ? "C145_6_COMMERCE_TEST_REGRESSION_PASS"
      : "C145_6_COMMERCE_TEST_REGRESSION_FAILED",

    ...runtimeIdentity(),

    latencyMs:
      Date.now() -
      startedAt,

    testMode:
      "deterministic-commerce-test-fixture",

    pipeline: {
      founderAuth: true,

      testPlan:
        planPass,

      testQuantity:
        plan.testPlan
          .recommendedTestQuantity ===
        5,

      testBudget:
        plan.testPlan
          .testBudget ===
        600,

      actualOrderData:
        realityLoopPass,

      actualUnitEconomics:
        actual.realityLoop
          .actualUnitEconomicsAvailable,

      actualContribution:
        contributionPass,

      profitabilityBoundary:
        boundaryPass,

      noAutomaticOrder:
        actual.boundaries.some(
          (item) =>
            item.includes(
              "不自动下单",
            ),
        ),

      noAutomaticPayment:
        actual.boundaries.some(
          (item) =>
            item.includes(
              "不自动付款",
            ),
        ),
    },

    expected: {
      recommendedTestQuantity:
        5,

      maximumInitialTestQuantity:
        20,

      testBudget:
        600,

      actualOrders:
        2,

      actualRevenue:
        79.8,

      actualTotalCost:
        48,

      actualContribution:
        31.8,
    },

    plan,
    actual,

    timestamp:
      Date.now(),
  };
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return errorResponse(
      "FOUNDER_AUTH_REQUIRED",
      "Founder access required.",
      401,
    );
  }

  try {
    return NextResponse.json(
      runRegression(),
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return errorResponse(
      "C145_6_REGRESSION_ERROR",
      error instanceof Error
        ? error.message
        : "Unknown regression error.",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return errorResponse(
      "FOUNDER_AUTH_REQUIRED",
      "Founder access required.",
      401,
    );
  }

  try {
    const body =
      (await request.json()) as {
        plan?: CommerceTestPlanInput;
        actual?: CommerceActualTestInput;
      };

    if (
      !body ||
      typeof body !==
        "object"
    ) {
      return errorResponse(
        "C145_6_INVALID_INPUT",
        "JSON object input is required.",
      );
    }

    if (
      !body.plan ||
      typeof body.plan !==
        "object"
    ) {
      return errorResponse(
        "C145_6_TEST_PLAN_REQUIRED",
        "Test plan input is required.",
      );
    }

    if (
      body.actual &&
      typeof body.actual ===
        "object"
    ) {
      const result =
        recordCommerceActualTest(
          body.plan,
          body.actual,
        );

      return NextResponse.json(
        {
          success:
            result.success,

          verified:
            result.success,

          code:
            result.code,

          ...runtimeIdentity(),

          result,

          timestamp:
            Date.now(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const result =
      executeCommerceTestPlan(
        body.plan,
      );

    return NextResponse.json(
      {
        success:
          result.success,

        verified:
          result.success,

        code:
          result.code,

        ...runtimeIdentity(),

        result,

        timestamp:
          Date.now(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return errorResponse(
      "C145_6_PROCESSING_ERROR",
      error instanceof Error
        ? error.message
        : "Unable to process commerce test input.",
      500,
    );
  }
}
