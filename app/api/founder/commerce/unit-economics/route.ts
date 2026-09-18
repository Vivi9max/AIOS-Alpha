import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  createC145_5RegressionFixture,
  executeCommerceUnitEconomics,
  type SupplierVerificationInput,
} from "@/lib/runtime/commerce-unit-economics-runtime";

import {
  APP_CONFIG,
} from "@/lib/config/app";

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

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

      release:
        APP_CONFIG.release,
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

function moneyEquals(
  actual: number | undefined,
  expected: number,
): boolean {
  if (
    typeof actual !== "number" ||
    !Number.isFinite(actual)
  ) {
    return false;
  }

  return (
    Math.round(actual * 100) ===
    Math.round(expected * 100)
  );
}

function runRegression() {
  const startedAt =
    Date.now();

  const input =
    createC145_5RegressionFixture();

  const result =
    executeCommerceUnitEconomics(
      input,
    );

  const unitCostPass =
    moneyEquals(
      result.economics
        .totalUnitCost,
      30,
    );

  const sellingPricePass =
    moneyEquals(
      result.economics
        .sellingPrice,
      39.9,
    );

  const contributionPass =
    moneyEquals(
      result.economics
        .contributionSpacePerUnit,
      9.9,
    );

  const economicsPass =
    unitCostPass &&
    sellingPricePass &&
    contributionPass;

  const supplierPass =
    result.supplierVerification
      .verification
      .overallSupplierVerified;

  const boundariesPass =
    result.boundaries.length >=
    8;

  const noProfitClaimPass =
    result.economics
      .profitabilityVerified ===
    false;

  const testConditionPass =
    result.testConditions
      .canCalculateUnitEconomics ===
    true;

  const finalPass =
    result.success &&
    economicsPass &&
    supplierPass &&
    boundariesPass &&
    noProfitClaimPass &&
    testConditionPass;

  return {
    success:
      finalPass,

    verified:
      finalPass,

    code:
      finalPass
        ? "C145_5_SUPPLIER_UNIT_ECONOMICS_REGRESSION_PASS"
        : "C145_5_SUPPLIER_UNIT_ECONOMICS_REGRESSION_FAILED",

    runtime:
      APP_CONFIG.runtimeId,

    runtimeVersion:
      APP_CONFIG.version,

    release:
      APP_CONFIG.release,

    latencyMs:
      Date.now() -
      startedAt,

    testMode:
      "deterministic-unit-economics-fixture",

    pipeline: {
      founderAuth: true,

      supplierVerification:
        supplierPass,

      purchaseCost: true,

      shippingCost: true,

      platformCost: true,

      logisticsCost: true,

      returnReserve: true,

      acquisitionCost: true,

      unitCostCalculation:
        unitCostPass,

      contributionSpaceCalculation:
        contributionPass,

      profitabilityBoundary:
        noProfitClaimPass,

      testCondition:
        testConditionPass,

      boundaries:
        boundariesPass,
    },

    expected: {
      sellingPrice:
        39.9,

      totalUnitCost:
        30,

      contributionSpace:
        9.9,
    },

    actual: {
      sellingPrice:
        result.economics
          .sellingPrice,

      totalUnitCost:
        result.economics
          .totalUnitCost,

      contributionSpace:
        result.economics
          .contributionSpacePerUnit,
    },

    result,
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
      "C145_5_REGRESSION_ERROR",

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
      (await request.json()) as Partial<SupplierVerificationInput>;

    if (
      !body ||
      typeof body !== "object"
    ) {
      return errorResponse(
        "C145_5_INVALID_INPUT",
        "JSON object input is required.",
      );
    }

    const result =
      executeCommerceUnitEconomics(
        body as SupplierVerificationInput,
      );

    return NextResponse.json(
      {
        success:
          result.success,

        verified:
          result
            .supplierVerification
            .verification
            .overallSupplierVerified,

        code:
          result.code,

        runtime:
          APP_CONFIG.runtimeId,

        runtimeVersion:
          APP_CONFIG.version,

        release:
          APP_CONFIG.release,

        result,
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
      "C145_5_INPUT_PROCESSING_ERROR",

      error instanceof Error
        ? error.message
        : "Unable to process supplier verification input.",

      500,
    );
  }
}
