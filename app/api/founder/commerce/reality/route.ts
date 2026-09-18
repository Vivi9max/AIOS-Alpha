import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  createC145_7RegressionFixture,
  executeCommerceRealityLoop,
  type CommerceBaselineInput,
  type CommerceRealityInput,
} from "@/lib/runtime/commerce-reality-runtime";

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
    typeof actual !==
      "number" ||
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

  const fixture =
    createC145_7RegressionFixture();

  const result =
    executeCommerceRealityLoop(
      fixture.baseline,
      fixture.actual,
    );

  const actualContributionPass =
    moneyEquals(
      result.actual
        .actualContribution,
      31.8,
    );

  const actualUnitCostPass =
    moneyEquals(
      result.actual
        .actualUnitCost,
      24,
    );

  const deltaContributionPass =
    moneyEquals(
      result.delta
        .contributionSpaceDelta,
      6,
    );

  const deltaUnitCostPass =
    moneyEquals(
      result.delta
        .unitCostDelta,
      -6,
    );

  const realDataPass =
    result.realityLoop
      .realOrderDataAvailable &&
    result.realityLoop
      .realRevenueDataAvailable &&
    result.realityLoop
      .realCostDataAvailable;

  const boundaryPass =
    result.realityLoop
      .profitabilityVerified ===
      false &&
    result.boundaries.length >=
      8;

  const evidencePass =
    result.evidence.baseline ===
      "baseline" &&
    result.evidence.actual ===
      "real_data" &&
    result.evidence.delta ===
      "delta";

  const finalPass =
    result.success &&
    actualContributionPass &&
    actualUnitCostPass &&
    deltaContributionPass &&
    deltaUnitCostPass &&
    realDataPass &&
    boundaryPass &&
    evidencePass;

  return {
    success:
      finalPass,

    verified:
      finalPass,

    code:
      finalPass
        ? "C145_7_COMMERCE_REALITY_REGRESSION_PASS"
        : "C145_7_COMMERCE_REALITY_REGRESSION_FAILED",

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
      "deterministic-reality-delta-fixture",

    pipeline: {
      founderAuth: true,

      baseline:
        result.evidence
          .baseline ===
        "baseline",

      realOrderData:
        result.realityLoop
          .realOrderDataAvailable,

      realRevenueData:
        result.realityLoop
          .realRevenueDataAvailable,

      realCostData:
        result.realityLoop
          .realCostDataAvailable,

      actualUnitEconomics:
        result.realityLoop
          .actualUnitEconomicsAvailable,

      actualUnitCost:
        actualUnitCostPass,

      actualContribution:
        actualContributionPass,

      deltaUnitCost:
        deltaUnitCostPass,

      deltaContribution:
        deltaContributionPass,

      evidenceBinding:
        evidencePass,

      profitabilityBoundary:
        boundaryPass,
    },

    expected: {
      actualUnitCost:
        24,

      actualContribution:
        31.8,

      contributionDelta:
        6,

      unitCostDelta:
        -6,
    },

    actual: {
      actualUnitCost:
        result.actual
          .actualUnitCost,

      actualContribution:
        result.actual
          .actualContribution,

      contributionDelta:
        result.delta
          .contributionSpaceDelta,

      unitCostDelta:
        result.delta
          .unitCostDelta,
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
      "C145_7_REGRESSION_ERROR",
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
        baseline?:
          CommerceBaselineInput;

        actual?:
          CommerceRealityInput;
      };

    if (
      !body ||
      typeof body !==
        "object"
    ) {
      return errorResponse(
        "C145_7_INVALID_INPUT",
        "JSON object input is required.",
      );
    }

    if (
      !body.baseline ||
      typeof body.baseline !==
        "object"
    ) {
      return errorResponse(
        "C145_7_BASELINE_REQUIRED",
        "Baseline input is required.",
      );
    }

    if (
      !body.actual ||
      typeof body.actual !==
        "object"
    ) {
      return errorResponse(
        "C145_7_ACTUAL_DATA_REQUIRED",
        "Actual commerce data is required.",
      );
    }

    const result =
      executeCommerceRealityLoop(
        body.baseline,
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
      "C145_7_PROCESSING_ERROR",
      error instanceof Error
        ? error.message
        : "Unable to process reality data.",
      500,
    );
  }
}
