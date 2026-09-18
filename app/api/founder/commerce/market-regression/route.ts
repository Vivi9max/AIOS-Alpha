import {
  NextRequest,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  executeCommerceMarketIntelligence,
} from "@/lib/runtime/commerce-market-intelligence-runtime";

import type {
  CommerceProductIntelligence,
} from "@/lib/runtime/commerce-product-intelligence-runtime";

const TEST_PRODUCT: CommerceProductIntelligence = {
  success: true,

  code:
    "C145_1_COMMERCE_PRODUCT_INTELLIGENCE_PASS",

  product: {
    name: "便携小风扇",
    category: "小家电",
    type: "便携风扇",
  },

  visualSignals: {
    appearance: [
      "Founder regression deterministic commerce seed",
    ],
    packaging: [],
    demonstration: [],
    peopleActions: [],
    textOverlays: [],
    priceSignals: [],
  },

  sellingPoints: [
    "便携",
  ],

  targetCustomer:
    "未在 C145.2 中进行推断。",

  marketingPattern: {
    hook: "",
    demonstration: "",
    emotionalTrigger: "",
    purchaseTrigger: "",
  },

  evidence: [
    {
      claim:
        "测试商品名称由 Founder Regression 显式提供。",
      basis:
        "Deterministic regression seed.",
      confidence: "high",
    },
  ],

  confidence: {
    product: 100,
    sellingPoints: 20,
    price: 0,
    commercialSignal: 0,
  },

  unknowns: [
    "商品真实市场价格由 C145.2 外部检索确认。",
    "1688供应商由 C145.2 外部检索确认。",
  ],

  nextActions: [
    "执行 C145.2 市场与供应链检索。",
  ],

  source: {
    type: "video-vision",
  },
};

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

function response(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(
    {
      ...body,
      ...runtimeIdentity(),
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

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (
    !isFounderRequest(
      request,
    )
  ) {
    return response(
      {
        success: false,
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        message:
          "Founder access required.",
      },
      401,
    );
  }

  try {
    const result =
      await executeCommerceMarketIntelligence(
        TEST_PRODUCT,
      );

    const checks = {
      founderAuth: true,

      productInput:
        TEST_PRODUCT.success &&
        Boolean(
          TEST_PRODUCT.product.name,
        ),

      marketRetrieval:
        result.retrieval.market
          .success,

      priceRetrieval:
        result.retrieval.price
          .success,

      supply1688Retrieval:
        result.retrieval.supply1688
          .success,

      marketEvidence:
        result.marketEvidence.length >
        0,

      supplyEvidence:
        result.supplyEvidence.length >
        0,

      priceEvidence:
        result.priceSignals.length >
        0,

      competitorEvidence:
        result.competitorSignals.length >
        0,

      supplierEvidence:
        result.supplierSignals.length >
        0,

      verificationExecuted:
        result.verification
          .independentMarketSources >=
          0 &&
        result.verification
          .independentSupplySources >=
          0,

      finalRegressionPass:
        result.success &&
        result.code ===
          "C145_2_COMMERCE_MARKET_SUPPLY_INTELLIGENCE_PASS",
    };

    const finalPass =
      Object.values(
        checks,
      ).every(Boolean);

    return response(
      {
        success:
          finalPass,

        verified:
          finalPass,

        code:
          finalPass
            ? "C145_2_COMMERCE_MARKET_SUPPLY_REGRESSION_PASS"
            : "C145_2_COMMERCE_MARKET_SUPPLY_REGRESSION_FAILED",

        latencyMs:
          Date.now() -
          startedAt,

        testProduct:
          TEST_PRODUCT.product,

        result,

        checks,
      },
      finalPass
        ? 200
        : 500,
    );
  } catch (error) {
    return response(
      {
        success: false,

        verified: false,

        code:
          "C145_2_COMMERCE_MARKET_SUPPLY_REGRESSION_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "Regression execution failed.",

        latencyMs:
          Date.now() -
          startedAt,
      },
      500,
    );
  }
}
