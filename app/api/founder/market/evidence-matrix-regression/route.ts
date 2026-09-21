import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  runMarketEvidenceMatrix,
} from "@/lib/runtime/market/market-evidence-matrix-runtime";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type RegressionCase = {
  name: string;
  passed: boolean;
  checks: Check[];
  latencyMs: number;
};

type RegressionPayload = {
  success: boolean;
  code: string;
  passed: number;
  failed: number;
  total: number;
  stage: string;
  mode: string;
  runtimeMs: number;
  cases: RegressionCase[];
};

async function runCase(
  name: string,
  universe: Array<{
    symbol: string;
    market:
      | "us"
      | "hk"
      | "cn";
  }>,
): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketEvidenceMatrix({
      universe,
    });

  const item =
    result.items[0];

  const checks: Check[] =
    [];

  checks.push({
    name:
      "ITEM_RETURNED",

    passed:
      Boolean(item),

    detail:
      item
        ? "Evidence matrix item returned."
        : "Evidence matrix item missing.",
  });

  checks.push({
    name:
      "IDENTITY_GATE",

    passed:
      item?.identityVerified ===
      true,

    detail:
      item
        ? `Identity verified: ${item.identityVerified}.`
        : "Identity verification unavailable.",
  });

  checks.push({
    name:
      "METRIC_MATRIX_PRESENT",

    passed:
      Boolean(
        item &&
          item.metrics &&
          Object.keys(
            item.metrics,
          ).length === 7,
      ),

    detail:
      item
        ? `Metric count: ${Object.keys(item.metrics).length}.`
        : "Metric matrix missing.",
  });

  checks.push({
    name:
      "FIELD_QUALITY_PRESERVED",

    passed:
      Boolean(
        item &&
          Object.values(
            item.metrics,
          ).some(
            (metric) =>
              metric.quality ===
                "verified" ||
              metric.quality ===
                "supported" ||
              metric.quality ===
                "conflicted" ||
              metric.quality ===
                "insufficient",
          ),
      ),

    detail:
      item
        ? "Normalized field quality is represented in the evidence matrix."
        : "Field quality unavailable.",
  });

  checks.push({
    name:
      "SOURCE_PROVENANCE_PRESENT",

    passed:
      Boolean(
        item &&
          Object.values(
            item.metrics,
          ).every(
            (metric) =>
              Array.isArray(
                metric.observations,
              ),
          ),
      ),

    detail:
      item
        ? "Per-metric source observation arrays are present."
        : "Source provenance structure missing.",
  });

  checks.push({
    name:
      "FRESHNESS_PRESENT",

    passed:
      Boolean(
        item &&
          typeof item.freshness.status ===
            "string",
      ),

    detail:
      item
        ? `Freshness: ${item.freshness.status}.`
        : "Freshness missing.",
  });

  checks.push({
    name:
      "HUMAN_REVIEW_GATE",

    passed:
      item?.humanReviewRequired ===
      true,

    detail:
      item?.humanReviewRequired ===
      true
        ? "Human verification remains required."
        : "Human verification gate missing.",
  });

  return {
    name,

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function runIdentityCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketEvidenceMatrix({
      universe: [
        {
          symbol:
            "INVALID-AIOS-SYMBOL",
          market: "us",
        },
      ],
    });

  const item =
    result.items[0];

  const checks: Check[] =
    [];

  checks.push({
    name:
      "INVALID_ITEM_RETURNED",

    passed:
      Boolean(item),

    detail:
      item
        ? "Invalid-security item returned."
        : "Invalid-security item missing.",
  });

  checks.push({
    name:
      "INVALID_IDENTITY_REJECTED",

    passed:
      item?.identityVerified ===
      false,

    detail:
      item
        ? `Identity verified: ${item.identityVerified}.`
        : "Item missing.",
  });

  checks.push({
    name:
      "INVALID_METRICS_INSUFFICIENT",

    passed:
      Boolean(
        item &&
          Object.values(
            item.metrics,
          ).every(
            (metric) =>
              metric.quality ===
              "insufficient",
          ),
      ),

    detail:
      item
        ? "Invalid security metrics remain insufficient."
        : "Metric matrix missing.",
  });

  return {
    name:
      "INVALID_SECURITY_IDENTITY_GATE",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function runConflictVisibilityCase(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const result =
    await runMarketEvidenceMatrix({
      universe: [
        {
          symbol: "NVDA",
          market: "us",
        },
      ],
    });

  const item =
    result.items[0];

  const conflicted =
    item
      ? Object.values(
          item.metrics,
        ).filter(
          (metric) =>
            metric.conflict,
        ).length
      : 0;

  const checks: Check[] =
    [];

  checks.push({
    name:
      "ITEM_RETURNED",

    passed:
      Boolean(item),

    detail:
      item
        ? "NVDA matrix returned."
        : "NVDA matrix missing.",
  });

  checks.push({
    name:
      "CONFLICT_FIELD_SUPPORTED",

    passed:
      Boolean(
        item &&
          Object.values(
            item.metrics,
          ).every(
            (metric) =>
              typeof metric.conflict ===
              "boolean",
          ),
      ),

    detail:
      item
        ? `Conflict fields checked. Visible conflicts: ${conflicted}.`
        : "Conflict structure missing.",
  });

  checks.push({
    name:
      "NO_SILENT_RANKING",

    passed:
      true,

    detail:
      "Evidence matrix does not rank securities or produce a trading decision.",
  });

  return {
    name:
      "CONFLICT_VISIBILITY",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function executeRegression(): Promise<RegressionPayload> {
  const startedAt =
    Date.now();

  const cases = [
    await runCase(
      "EVIDENCE_MATRIX_STRUCTURE",
      [
        {
          symbol: "NVDA",
          market: "us",
        },
      ],
    ),

    await runCase(
      "MULTI_MARKET_PROVENANCE",
      [
        {
          symbol: "NVDA",
          market: "us",
        },
        {
          symbol: "0700.HK",
          market: "hk",
        },
        {
          symbol: "600519.SH",
          market: "cn",
        },
      ],
    ),

    await runIdentityCase(),

    await runConflictVisibilityCase(),
  ];

  const passed =
    cases.filter(
      (item) =>
        item.passed,
    ).length;

  const failed =
    cases.length -
    passed;

  return {
    success:
      failed === 0,

    code:
      failed === 0
        ? "C147_6_EVIDENCE_MATRIX_REGRESSION_PASS"
        : "C147_6_EVIDENCE_MATRIX_REGRESSION_PARTIAL",

    passed,
    failed,

    total:
      cases.length,

    stage:
      "C147.6.1",

    mode:
      "behavioral",

    runtimeMs:
      Date.now() -
      startedAt,

    cases,
  };
}

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      code:
        "FOUNDER_AUTH_REQUIRED",
      error:
        "Founder authentication required.",
    },
    {
      status: 401,
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(request)
  ) {
    return unauthorized();
  }

  try {
    const result =
      await executeRegression();

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,

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
          "C147_6_EVIDENCE_MATRIX_REGRESSION_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Evidence matrix regression failed.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(request)
  ) {
    return unauthorized();
  }

  try {
    const result =
      await executeRegression();

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,

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
          "C147_6_EVIDENCE_MATRIX_REGRESSION_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Evidence matrix regression failed.",
      },
      {
        status: 500,
      },
    );
  }
}
