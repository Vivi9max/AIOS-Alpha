export type RealityEvidenceStatus =
  | "real_data"
  | "baseline"
  | "delta"
  | "unknown";
export interface CommerceBaselineInput {
  productName: string;
  category?: string;
  currency?: string;
  sellingPrice: number;
  unitCost: number;
  contributionSpace: number;
  contributionMarginPercent: number;
}
export interface CommerceRealityInput {
  orders: number;
  unitsSold: number;
  grossRevenue: number;
  refunds: number;
  refundAmount: number;
  acquisitionSpend: number;
  fulfillmentCost: number;
  productCost: number;
  platformCost: number;
  otherCost: number;
  impressions?: number;
  clicks?: number;
  contentViews?: number;
  currency?: string;
}
export interface CommerceRealityResult {
  success: boolean;
  code: string;
  product: {
    name: string;
    category: string;
    currency: string;
  };
  baseline: {
    sellingPrice: number;
    unitCost: number;
    contributionSpace: number;
    contributionMarginPercent: number;
    evidenceStatus: RealityEvidenceStatus;
  };
  actual: {
    orders: number;
    unitsSold: number;
    grossRevenue: number;
    refundAmount: number;
    netRevenue: number;
    totalActualCost: number;
    actualUnitCost: number;
    actualContribution: number;
    actualContributionPerUnit: number;
    actualContributionMarginPercent: number;
    averageOrderValue: number;
    acquisitionCostPerOrder: number;
    refundRatePercent: number;
    conversionRatePercent?: number;
    evidenceStatus: RealityEvidenceStatus;
  };
  delta: {
    sellingPriceDelta: number;
    unitCostDelta: number;
    contributionSpaceDelta: number;
    contributionMarginDeltaPercent: number;
    acquisitionCostDelta?: number;
    refundRateDeltaPercent?: number;
    evidenceStatus: RealityEvidenceStatus;
  };
  evidence: {
    baseline: RealityEvidenceStatus;
    actual: RealityEvidenceStatus;
    delta: RealityEvidenceStatus;
  };
  realityLoop: {
    realOrderDataAvailable: boolean;
    realRevenueDataAvailable: boolean;
    realCostDataAvailable: boolean;
    realRefundDataAvailable: boolean;
    realAcquisitionDataAvailable: boolean;
    realConversionDataAvailable: boolean;
    actualUnitEconomicsAvailable: boolean;
    profitabilityVerified: false;
  };
  decision: {
    state:
      | "insufficient_data"
      | "positive_delta"
      | "negative_delta"
      | "mixed_delta"
      | "neutral";
    reasons: string[];
    nextExperiment: string[];
  };
  boundaries: string[];
  unknowns: string[];
  error?: string;
}
function clean(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}
function toNumber(
  value: unknown,
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(
      value.replace(/,/g, "").trim(),
    );
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}
function money(
  value: number,
): number {
  return (
    Math.round(value * 100) /
    100
  );
}
function percent(
  value: number,
): number {
  return money(value);
}
function nonNegative(
  value: number,
): number {
  return Math.max(0, value);
}
function buildDecision(
  baseline: CommerceBaselineInput,
  actual: CommerceRealityResult["actual"],
  delta: CommerceRealityResult["delta"],
): CommerceRealityResult["decision"] {
  const reasons: string[] = [];
  const nextExperiment: string[] = [];
  if (actual.orders <= 0) {
    return {
      state: "insufficient_data",
      reasons: [
        "尚未产生真实订单。",
      ],
      nextExperiment: [
        "继续进行小规模人工测试。",
        "取得第一笔真实订单后重新计算 Reality Delta。",
      ],
    };
  }
  if (delta.unitCostDelta > 0) {
    reasons.push(
      "实际单位成本高于基准。",
    );
  } else if (
    delta.unitCostDelta < 0
  ) {
    reasons.push(
      "实际单位成本低于基准。",
    );
  } else {
    reasons.push(
      "实际单位成本与基准基本一致。",
    );
  }
  if (
    delta.contributionSpaceDelta >
    0
  ) {
    reasons.push(
      "实际单位贡献空间高于基准。",
    );
  } else if (
    delta.contributionSpaceDelta <
    0
  ) {
    reasons.push(
      "实际单位贡献空间低于基准。",
    );
  } else {
    reasons.push(
      "实际单位贡献空间与基准一致。",
    );
  }
  if (
    actual.refundRatePercent >
    0
  ) {
    reasons.push(
      "已经出现真实退款数据。",
    );
  }
  if (
    typeof actual.acquisitionCostPerOrder ===
      "number" &&
    actual.acquisitionCostPerOrder >
      baseline.contributionSpace
  ) {
    reasons.push(
      "当前实际单笔获客成本高于基准单位贡献空间。",
    );
  }
  if (
    delta.contributionSpaceDelta >
      0 &&
    delta.unitCostDelta <= 0
  ) {
    nextExperiment.push(
      "保持当前供应链条件，继续增加小规模测试样本。",
    );
  }
  if (
    delta.contributionSpaceDelta <
      0
  ) {
    nextExperiment.push(
      "优先拆解采购、履约、平台或获客成本差异。",
    );
  }
  if (
    actual.refundRatePercent >
      0
  ) {
    nextExperiment.push(
      "记录退款原因并判断是否存在商品或内容问题。",
    );
  }
  nextExperiment.push(
    "继续累计真实订单数据后重新计算 Reality Delta。",
  );
  const positive =
    delta.contributionSpaceDelta >
      0 &&
    delta.unitCostDelta <= 0;
  const negative =
    delta.contributionSpaceDelta <
      0 ||
    delta.unitCostDelta > 0;
  let state:
    | "positive_delta"
    | "negative_delta"
    | "mixed_delta"
    | "neutral";
  if (positive) {
    state = "positive_delta";
  } else if (
    negative &&
    delta.contributionSpaceDelta <
      0
  ) {
    state = "negative_delta";
  } else if (
    delta.unitCostDelta !== 0 ||
    delta.contributionSpaceDelta !== 0
  ) {
    state = "mixed_delta";
  } else {
    state = "neutral";
  }
  return {
    state,
    reasons,
    nextExperiment,
  };
}
export function executeCommerceRealityLoop(
  baselineInput: CommerceBaselineInput,
  actualInput: CommerceRealityInput,
): CommerceRealityResult {
  const productName =
    clean(baselineInput.productName);
  const currency =
    clean(
      actualInput.currency ||
        baselineInput.currency,
    ) || "CNY";
  if (!productName) {
    return {
      success: false,
      code:
        "C145_7_REALITY_PRODUCT_REQUIRED",
      product: {
        name: "",
        category: "",
        currency,
      },
      baseline: {
        sellingPrice: 0,
        unitCost: 0,
        contributionSpace: 0,
        contributionMarginPercent: 0,
        evidenceStatus: "unknown",
      },
      actual: {
        orders: 0,
        unitsSold: 0,
        grossRevenue: 0,
        refundAmount: 0,
        netRevenue: 0,
        totalActualCost: 0,
        actualUnitCost: 0,
        actualContribution: 0,
        actualContributionPerUnit: 0,
        actualContributionMarginPercent: 0,
        averageOrderValue: 0,
        acquisitionCostPerOrder: 0,
        refundRatePercent: 0,
        evidenceStatus: "unknown",
      },
      delta: {
        sellingPriceDelta: 0,
        unitCostDelta: 0,
        contributionSpaceDelta: 0,
        contributionMarginDeltaPercent: 0,
        evidenceStatus: "unknown",
      },
      evidence: {
        baseline: "unknown",
        actual: "unknown",
        delta: "unknown",
      },
      realityLoop: {
        realOrderDataAvailable: false,
        realRevenueDataAvailable: false,
        realCostDataAvailable: false,
        realRefundDataAvailable: false,
        realAcquisitionDataAvailable: false,
        realConversionDataAvailable: false,
        actualUnitEconomicsAvailable: false,
        profitabilityVerified: false,
      },
      decision: {
        state: "insufficient_data",
        reasons: [
          "缺少商品名称。",
        ],
        nextExperiment: [],
      },
      boundaries: [],
      unknowns: [
        "商品名称。",
      ],
    };
  }
  const sellingPrice =
    toNumber(
      baselineInput.sellingPrice,
    );
  const unitCost =
    toNumber(
      baselineInput.unitCost,
    );
  const contributionSpace =
    toNumber(
      baselineInput.contributionSpace,
    );
  const contributionMarginPercent =
    toNumber(
      baselineInput.contributionMarginPercent,
    );
  if (
    sellingPrice === undefined ||
    unitCost === undefined ||
    contributionSpace ===
      undefined ||
    contributionMarginPercent ===
      undefined ||
    sellingPrice <= 0 ||
    unitCost < 0
  ) {
    return {
      success: false,
      code:
        "C145_7_BASELINE_DATA_INVALID",
      product: {
        name: productName,
        category:
          clean(baselineInput.category),
        currency,
      },
      baseline: {
        sellingPrice: 0,
        unitCost: 0,
        contributionSpace: 0,
        contributionMarginPercent: 0,
        evidenceStatus: "unknown",
      },
      actual: {
        orders: 0,
        unitsSold: 0,
        grossRevenue: 0,
        refundAmount: 0,
        netRevenue: 0,
        totalActualCost: 0,
        actualUnitCost: 0,
        actualContribution: 0,
        actualContributionPerUnit: 0,
        actualContributionMarginPercent: 0,
        averageOrderValue: 0,
        acquisitionCostPerOrder: 0,
        refundRatePercent: 0,
        evidenceStatus: "unknown",
      },
      delta: {
        sellingPriceDelta: 0,
        unitCostDelta: 0,
        contributionSpaceDelta: 0,
        contributionMarginDeltaPercent: 0,
        evidenceStatus: "unknown",
      },
      evidence: {
        baseline: "unknown",
        actual: "unknown",
        delta: "unknown",
      },
      realityLoop: {
        realOrderDataAvailable: false,
        realRevenueDataAvailable: false,
        realCostDataAvailable: false,
        realRefundDataAvailable: false,
        realAcquisitionDataAvailable: false,
        realConversionDataAvailable: false,
        actualUnitEconomicsAvailable: false,
        profitabilityVerified: false,
      },
      decision: {
        state: "insufficient_data",
        reasons: [
          "C145.5 基准单位经济数据不完整。",
        ],
        nextExperiment: [
          "先完成 C145.5 基准数据核验。",
        ],
      },
      boundaries: [
        "没有可靠 Baseline 时不得计算商业 Delta。",
      ],
      unknowns: [
        "Baseline 售价。",
        "Baseline 单位成本。",
        "Baseline 单位贡献空间。",
        "Baseline 贡献率。",
      ],
    };
  }
  const orders =
    toNumber(actualInput.orders) ?? 0;
  const unitsSold =
    toNumber(actualInput.unitsSold) ?? 0;
  const grossRevenue =
    toNumber(
      actualInput.grossRevenue,
    ) ?? 0;
  const refunds =
    toNumber(actualInput.refunds) ?? 0;
  const refundAmount =
    toNumber(
      actualInput.refundAmount,
    ) ?? 0;
  const acquisitionSpend =
    toNumber(
      actualInput.acquisitionSpend,
    ) ?? 0;
  const fulfillmentCost =
    toNumber(
      actualInput.fulfillmentCost,
    ) ?? 0;
  const productCost =
    toNumber(
      actualInput.productCost,
    ) ?? 0;
  const platformCost =
    toNumber(
      actualInput.platformCost,
    ) ?? 0;
  const otherCost =
    toNumber(
      actualInput.otherCost,
    ) ?? 0;
  const impressions =
    toNumber(
      actualInput.impressions,
    );
  const clicks =
    toNumber(
      actualInput.clicks,
    );
  const contentViews =
    toNumber(
      actualInput.contentViews,
    );
  const numbers = [
    orders,
    unitsSold,
    grossRevenue,
    refunds,
    refundAmount,
    acquisitionSpend,
    fulfillmentCost,
    productCost,
    platformCost,
    otherCost,
  ];
  if (
    numbers.some(
      (value) => value < 0,
    )
  ) {
    return {
      success: false,
      code:
        "C145_7_REALITY_DATA_INVALID",
      product: {
        name: productName,
        category:
          clean(baselineInput.category),
        currency,
      },
      baseline: {
        sellingPrice:
          money(sellingPrice),
        unitCost:
          money(unitCost),
        contributionSpace:
          money(contributionSpace),
        contributionMarginPercent:
          percent(
            contributionMarginPercent,
          ),
        evidenceStatus: "baseline",
      },
      actual: {
        orders: 0,
        unitsSold: 0,
        grossRevenue: 0,
        refundAmount: 0,
        netRevenue: 0,
        totalActualCost: 0,
        actualUnitCost: 0,
        actualContribution: 0,
        actualContributionPerUnit: 0,
        actualContributionMarginPercent: 0,
        averageOrderValue: 0,
        acquisitionCostPerOrder: 0,
        refundRatePercent: 0,
        evidenceStatus: "unknown",
      },
      delta: {
        sellingPriceDelta: 0,
        unitCostDelta: 0,
        contributionSpaceDelta: 0,
        contributionMarginDeltaPercent: 0,
        evidenceStatus: "unknown",
      },
      evidence: {
        baseline: "baseline",
        actual: "unknown",
        delta: "unknown",
      },
      realityLoop: {
        realOrderDataAvailable: false,
        realRevenueDataAvailable: false,
        realCostDataAvailable: false,
        realRefundDataAvailable: false,
        realAcquisitionDataAvailable: false,
        realConversionDataAvailable: false,
        actualUnitEconomicsAvailable: false,
        profitabilityVerified: false,
      },
      decision: {
        state: "insufficient_data",
        reasons: [
          "真实数据不能包含负数。",
        ],
        nextExperiment: [],
      },
      boundaries: [],
      unknowns: [
        "有效真实测试数据。",
      ],
    };
  }
  if (
    unitsSold === 0 &&
    grossRevenue > 0
  ) {
    return {
      success: false,
      code:
        "C145_7_REALITY_DATA_INCONSISTENT",
      product: {
        name: productName,
        category:
          clean(baselineInput.category),
        currency,
      },
      baseline: {
        sellingPrice:
          money(sellingPrice),
        unitCost:
          money(unitCost),
        contributionSpace:
          money(contributionSpace),
        contributionMarginPercent:
          percent(
            contributionMarginPercent,
          ),
        evidenceStatus: "baseline",
      },
      actual: {
        orders,
        unitsSold,
        grossRevenue,
        refundAmount,
        netRevenue: 0,
        totalActualCost: 0,
        actualUnitCost: 0,
        actualContribution: 0,
        actualContributionPerUnit: 0,
        actualContributionMarginPercent: 0,
        averageOrderValue: 0,
        acquisitionCostPerOrder: 0,
        refundRatePercent: 0,
        evidenceStatus: "unknown",
      },
      delta: {
        sellingPriceDelta: 0,
        unitCostDelta: 0,
        contributionSpaceDelta: 0,
        contributionMarginDeltaPercent: 0,
        evidenceStatus: "unknown",
      },
      evidence: {
        baseline: "baseline",
        actual: "unknown",
        delta: "unknown",
      },
      realityLoop: {
        realOrderDataAvailable: orders > 0,
        realRevenueDataAvailable: true,
        realCostDataAvailable: false,
        realRefundDataAvailable: false,
        realAcquisitionDataAvailable: false,
        realConversionDataAvailable:
          false,
        actualUnitEconomicsAvailable:
          false,
        profitabilityVerified: false,
      },
      decision: {
        state: "insufficient_data",
        reasons: [
          "成交金额存在，但成交件数为 0。",
        ],
        nextExperiment: [],
      },
      boundaries: [],
      unknowns: [
        "真实成交件数。",
      ],
    };
  }
  const netRevenue =
    money(
      grossRevenue -
        refundAmount,
    );
  const totalActualCost =
    money(
      productCost +
        fulfillmentCost +
        platformCost +
        acquisitionSpend +
        otherCost,
    );
  const actualUnitCost =
    unitsSold > 0
      ? money(
          totalActualCost /
            unitsSold,
        )
      : 0;
  const actualContribution =
    money(
      netRevenue -
        totalActualCost,
    );
  const actualContributionPerUnit =
    unitsSold > 0
      ? money(
          actualContribution /
            unitsSold,
        )
      : 0;
  const actualContributionMarginPercent =
    netRevenue > 0
      ? percent(
          (actualContribution /
            netRevenue) *
            100,
        )
      : 0;
  const averageOrderValue =
    orders > 0
      ? money(
          grossRevenue /
            orders,
        )
      : 0;
  const acquisitionCostPerOrder =
    orders > 0
      ? money(
          acquisitionSpend /
            orders,
        )
      : 0;
  const refundRatePercent =
    orders > 0
      ? percent(
          (refunds /
            orders) *
            100,
        )
      : 0;
  const actualAverageSellingPrice =
    unitsSold > 0
      ? money(
          grossRevenue /
            unitsSold,
        )
      : money(sellingPrice);
  const conversionRatePercent =
    impressions !== undefined &&
    impressions > 0 &&
    orders >= 0
      ? percent(
          (orders /
            impressions) *
            100,
        )
      : undefined;
  const actual: CommerceRealityResult["actual"] =
    {
      orders,
      unitsSold,
      grossRevenue:
        money(grossRevenue),
      refundAmount:
        money(refundAmount),
      netRevenue,
      totalActualCost,
      actualUnitCost,
      actualContribution,
      actualContributionPerUnit,
      actualContributionMarginPercent,
      averageOrderValue,
      acquisitionCostPerOrder,
      refundRatePercent,
      conversionRatePercent,
      evidenceStatus: "real_data",
    };
  const delta: CommerceRealityResult["delta"] =
    {
      sellingPriceDelta:
        money(
          actualAverageSellingPrice -
            sellingPrice,
        ),
      unitCostDelta:
        money(
          actualUnitCost -
            unitCost,
        ),
      contributionSpaceDelta:
        money(
          actualContributionPerUnit -
            contributionSpace,
        ),
      contributionMarginDeltaPercent:
        percent(
          actualContributionMarginPercent -
            contributionMarginPercent,
        ),
      acquisitionCostDelta:
        money(
          acquisitionCostPerOrder -
            contributionSpace,
        ),
      refundRateDeltaPercent:
        percent(
          refundRatePercent,
        ),
      evidenceStatus: "delta",
    };
  const realOrderDataAvailable =
    orders > 0 &&
    unitsSold > 0;
  const realRevenueDataAvailable =
    grossRevenue > 0;
  const realCostDataAvailable =
    unitsSold > 0 &&
    totalActualCost >= 0;
  const realRefundDataAvailable =
    orders > 0;
  const realAcquisitionDataAvailable =
    orders > 0;
  const realConversionDataAvailable =
    conversionRatePercent !==
    undefined;
  const actualUnitEconomicsAvailable =
    realOrderDataAvailable &&
    realRevenueDataAvailable &&
    realCostDataAvailable;
  const result: CommerceRealityResult = {
    success:
      actualUnitEconomicsAvailable,
    code:
      actualUnitEconomicsAvailable
        ? "C145_7_COMMERCE_REALITY_LOOP_PASS"
        : "C145_7_COMMERCE_REALITY_DATA_INCOMPLETE",
    product: {
      name: productName,
      category:
        clean(baselineInput.category),
      currency,
    },
    baseline: {
      sellingPrice:
        money(sellingPrice),
      unitCost:
        money(unitCost),
      contributionSpace:
        money(contributionSpace),
      contributionMarginPercent:
        percent(
          contributionMarginPercent,
        ),
      evidenceStatus: "baseline",
    },
    actual,
    delta,
    evidence: {
      baseline: "baseline",
      actual: "real_data",
      delta: "delta",
    },
    realityLoop: {
      realOrderDataAvailable,
      realRevenueDataAvailable,
      realCostDataAvailable,
      realRefundDataAvailable,
      realAcquisitionDataAvailable,
      realConversionDataAvailable,
      actualUnitEconomicsAvailable,
      profitabilityVerified: false,
    },
    decision: {
      state: "insufficient_data",
      reasons: [],
      nextExperiment: [],
    },
    boundaries: [
      "REAL_DATA 仅表示用户提供的真实测试数据，不代表 AIOS 独立验证交易真实性。",
      "BASELINE 来自此前建立的商业基准数据。",
      "DELTA 只是 Baseline 与 Actual 的数学差异，不是商业结论保证。",
      "Unknown 不允许由模型猜测补齐。",
      "C145.7 不预测销量。",
      "C145.7 不预测转化率。",
      "C145.7 不保证利润。",
      "C145.7 不自动采购。",
      "C145.7 不自动下单。",
      "C145.7 不自动付款。",
      "profitabilityVerified 永远保持 false。",
    ],
    unknowns: [],
  };
  if (
    impressions ===
      undefined
  ) {
    result.unknowns.push(
      "真实曝光量。",
    );
  }
  if (
    clicks === undefined
  ) {
    result.unknowns.push(
      "真实点击量。",
    );
  }
  if (
    contentViews ===
      undefined
  ) {
    result.unknowns.push(
      "真实内容播放量。",
    );
  }
  if (
    !realConversionDataAvailable
  ) {
    result.unknowns.push(
      "真实转化率。",
    );
  }
  result.decision =
    buildDecision(
      baselineInput,
      actual,
      delta,
    );
  return result;
}
export function createC145_7RegressionFixture() {
  return {
    baseline: {
      productName:
        "便携小风扇",
      category:
        "小家电",
      currency:
        "CNY",
      sellingPrice:
        39.9,
      unitCost:
        30,
      contributionSpace:
        9.9,
      contributionMarginPercent:
        24.81,
    } satisfies CommerceBaselineInput,
    actual: {
      orders: 2,
      unitsSold: 2,
      grossRevenue: 79.8,
      refunds: 0,
      refundAmount: 0,
      acquisitionSpend: 8,
      fulfillmentCost: 10,
      productCost: 24,
      platformCost: 6,
      otherCost: 0,
      impressions: 1000,
      clicks: 80,
      contentViews: 800,
      currency:
        "CNY",
    } satisfies CommerceRealityInput,
  };
}
