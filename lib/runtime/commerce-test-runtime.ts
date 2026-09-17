export type CommerceTestStatus =
  | "ready"
  | "running"
  | "completed"
  | "blocked";
export interface CommerceTestPlanInput {
  productName: string;
  category?: string;
  currency?: string;
  sellingPrice: number;
  unitCost: number;
  contributionSpace: number;
  contributionMarginPercent?: number;
  supplierVerified: boolean;
  economicsVerified: boolean;
}
export interface CommerceActualTestInput {
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
  currency?: string;
}
export interface CommerceTestResult {
  success: boolean;
  code: string;
  status: CommerceTestStatus;
  product: {
    name: string;
    category: string;
    currency: string;
  };
  testPlan: {
    targetSellingPrice: number;
    baselineUnitCost: number;
    baselineContributionSpace: number;
    baselineContributionMarginPercent: number;
    recommendedTestQuantity: number;
    maximumInitialTestQuantity: number;
    testBudget: number;
    requiredMetrics: string[];
    stopConditions: string[];
    continueConditions: string[];
  };
  actualResults?: {
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
    netRevenue: number;
    totalActualCost: number;
    actualContribution: number;
    actualContributionMarginPercent: number;
    actualAverageOrderValue: number;
    actualAcquisitionCostPerOrder: number;
    actualRefundRatePercent: number;
  };
  realityLoop: {
    realOrderDataAvailable: boolean;
    realConversionDataAvailable: boolean;
    realRefundDataAvailable: boolean;
    realAcquisitionCostAvailable: boolean;
    actualUnitEconomicsAvailable: boolean;
    profitabilityVerified: false;
  };
  blockers: string[];
  nextActions: string[];
  boundaries: string[];
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
function nonNegative(
  value: number,
): number {
  return Math.max(0, value);
}
function buildTestPlan(
  input: CommerceTestPlanInput,
): CommerceTestResult["testPlan"] {
  const sellingPrice =
    nonNegative(input.sellingPrice);
  const unitCost =
    nonNegative(input.unitCost);
  const contributionSpace =
    money(
      sellingPrice -
      unitCost,
    );
  const contributionMarginPercent =
    sellingPrice > 0
      ? money(
          (contributionSpace /
            sellingPrice) *
            100,
        )
      : 0;
  const recommendedTestQuantity =
    5;
  const maximumInitialTestQuantity =
    20;
  const testBudget =
    money(
      unitCost *
        maximumInitialTestQuantity,
    );
  return {
    targetSellingPrice:
      money(sellingPrice),
    baselineUnitCost:
      money(unitCost),
    baselineContributionSpace:
      contributionSpace,
    baselineContributionMarginPercent:
      contributionMarginPercent,
    recommendedTestQuantity,
    maximumInitialTestQuantity,
    testBudget,
    requiredMetrics: [
      "真实订单数",
      "真实成交件数",
      "真实成交金额",
      "真实退款金额",
      "真实退款率",
      "真实获客成本",
      "真实履约物流成本",
      "真实采购成本",
      "真实平台成本",
      "真实单位经济",
    ],
    stopConditions: [
      "供应商无法稳定供货。",
      "实际采购成本明显高于基准成本。",
      "实际履约成本明显高于基准成本。",
      "实际退款或售后成本异常升高。",
      "实际获客成本使单位贡献空间持续为负。",
      "出现商品质量、合规或平台风险。",
    ],
    continueConditions: [
      "产生真实订单。",
      "真实成交数据可以持续记录。",
      "实际单位经济可以计算。",
      "供应链能够稳定履约。",
      "实际数据没有触发停止条件。",
    ],
  };
}
export function executeCommerceTestPlan(
  input: CommerceTestPlanInput,
): CommerceTestResult {
  const productName =
    clean(input.productName);
  if (!productName) {
    return {
      success: false,
      code:
        "C145_6_COMMERCE_TEST_PRODUCT_REQUIRED",
      status: "blocked",
      product: {
        name: "",
        category: "",
        currency:
          clean(input.currency) ||
          "CNY",
      },
      testPlan: {
        targetSellingPrice: 0,
        baselineUnitCost: 0,
        baselineContributionSpace: 0,
        baselineContributionMarginPercent: 0,
        recommendedTestQuantity: 0,
        maximumInitialTestQuantity: 0,
        testBudget: 0,
        requiredMetrics: [],
        stopConditions: [],
        continueConditions: [],
      },
      realityLoop: {
        realOrderDataAvailable: false,
        realConversionDataAvailable: false,
        realRefundDataAvailable: false,
        realAcquisitionCostAvailable: false,
        actualUnitEconomicsAvailable: false,
        profitabilityVerified: false,
      },
      blockers: [
        "缺少商品名称。",
      ],
      nextActions: [
        "提供商品名称后重新建立测试计划。",
      ],
      boundaries: [
        "C145.6 不自动下单。",
        "C145.6 不自动付款。",
        "C145.6 不预测销量或利润。",
      ],
    };
  }
  const sellingPrice =
    toNumber(input.sellingPrice);
  const unitCost =
    toNumber(input.unitCost);
  if (
    sellingPrice === undefined ||
    unitCost === undefined ||
    sellingPrice <= 0 ||
    unitCost < 0
  ) {
    return {
      success: false,
      code:
        "C145_6_COMMERCE_TEST_ECONOMICS_REQUIRED",
      status: "blocked",
      product: {
        name: productName,
        category:
          clean(input.category),
        currency:
          clean(input.currency) ||
          "CNY",
      },
      testPlan: {
        targetSellingPrice: 0,
        baselineUnitCost: 0,
        baselineContributionSpace: 0,
        baselineContributionMarginPercent: 0,
        recommendedTestQuantity: 0,
        maximumInitialTestQuantity: 0,
        testBudget: 0,
        requiredMetrics: [],
        stopConditions: [],
        continueConditions: [],
      },
      realityLoop: {
        realOrderDataAvailable: false,
        realConversionDataAvailable: false,
        realRefundDataAvailable: false,
        realAcquisitionCostAvailable: false,
        actualUnitEconomicsAvailable: false,
        profitabilityVerified: false,
      },
      blockers: [
        "缺少有效的售价或单位成本。",
      ],
      nextActions: [
        "先完成 C145.5 单位经济核验。",
      ],
      boundaries: [
        "没有有效单位经济数据时，不生成可执行测试预算。",
        "C145.6 不预测最终利润。",
      ],
    };
  }
  const supplierVerified =
    input.supplierVerified === true;
  const economicsVerified =
    input.economicsVerified === true;
  const plan =
    buildTestPlan({
      ...input,
      sellingPrice,
      unitCost,
    });
  const blockers: string[] = [];
  if (!supplierVerified) {
    blockers.push(
      "供应商证据尚未完成核验。",
    );
  }
  if (!economicsVerified) {
    blockers.push(
      "单位经济尚未完成核验。",
    );
  }
  const ready =
    blockers.length === 0;
  return {
    success: ready,
    code: ready
      ? "C145_6_COMMERCE_TEST_PLAN_READY"
      : "C145_6_COMMERCE_TEST_PLAN_BLOCKED",
    status: ready
      ? "ready"
      : "blocked",
    product: {
      name: productName,
      category:
        clean(input.category),
      currency:
        clean(input.currency) ||
        "CNY",
    },
    testPlan: plan,
    realityLoop: {
      realOrderDataAvailable: false,
      realConversionDataAvailable: false,
      realRefundDataAvailable: false,
      realAcquisitionCostAvailable: false,
      actualUnitEconomicsAvailable: false,
      profitabilityVerified: false,
    },
    blockers,
    nextActions: ready
      ? [
          "人工确认商品页面与供应商信息。",
          "人工准备商品测试内容。",
          "按小规模测试数量开始人工测试。",
          "记录第一笔真实订单。",
          "将真实订单数据回填 AIOS。",
        ]
      : [
          "先解决 C145.5 中的核验阻塞项。",
        ],
    boundaries: [
      "C145.6 不自动采购。",
      "C145.6 不自动下单。",
      "C145.6 不自动付款。",
      "C145.6 不预测销量。",
      "C145.6 不预测转化率。",
      "C145.6 不保证利润。",
      "测试计划中的数量和预算是实验边界，不是销量预测。",
      "profitabilityVerified 永远保持 false。",
    ],
  };
}
export function recordCommerceActualTest(
  planInput: CommerceTestPlanInput,
  actualInput: CommerceActualTestInput,
): CommerceTestResult {
  const planResult =
    executeCommerceTestPlan(
      planInput,
    );
  if (!planResult.success) {
    return planResult;
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
  const invalid =
    orders < 0 ||
    unitsSold < 0 ||
    grossRevenue < 0 ||
    refunds < 0 ||
    refundAmount < 0 ||
    acquisitionSpend < 0 ||
    fulfillmentCost < 0 ||
    productCost < 0 ||
    platformCost < 0 ||
    otherCost < 0;
  if (invalid) {
    return {
      ...planResult,
      success: false,
      code:
        "C145_6_COMMERCE_ACTUAL_DATA_INVALID",
      status: "blocked",
      blockers: [
        "真实测试数据不能为负数。",
      ],
    };
  }
  if (
    unitsSold === 0 &&
    grossRevenue > 0
  ) {
    return {
      ...planResult,
      success: false,
      code:
        "C145_6_COMMERCE_ACTUAL_DATA_INCONSISTENT",
      status: "blocked",
      blockers: [
        "成交金额存在，但成交件数为 0。",
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
  const actualContribution =
    money(
      netRevenue -
      totalActualCost,
    );
  const actualContributionMarginPercent =
    netRevenue > 0
      ? money(
          (actualContribution /
            netRevenue) *
            100,
        )
      : 0;
  const actualAverageOrderValue =
    orders > 0
      ? money(
          grossRevenue /
            orders,
        )
      : 0;
  const actualAcquisitionCostPerOrder =
    orders > 0
      ? money(
          acquisitionSpend /
            orders,
        )
      : 0;
  const actualRefundRatePercent =
    orders > 0
      ? money(
          (refunds / orders) *
            100,
        )
      : 0;
  const actualResults = {
    orders,
    unitsSold,
    grossRevenue:
      money(grossRevenue),
    refunds,
    refundAmount:
      money(refundAmount),
    acquisitionSpend:
      money(acquisitionSpend),
    fulfillmentCost:
      money(fulfillmentCost),
    productCost:
      money(productCost),
    platformCost:
      money(platformCost),
    otherCost:
      money(otherCost),
    netRevenue,
    totalActualCost,
    actualContribution,
    actualContributionMarginPercent,
    actualAverageOrderValue,
    actualAcquisitionCostPerOrder,
    actualRefundRatePercent,
  };
  const hasOrders =
    orders > 0 &&
    unitsSold > 0;
  const hasRevenue =
    grossRevenue > 0;
  const hasRefundData =
    orders > 0;
  const hasAcquisitionData =
    acquisitionSpend >= 0;
  return {
    ...planResult,
    success: true,
    code:
      "C145_6_COMMERCE_ACTUAL_TEST_RECORDED",
    status:
      hasOrders
        ? "completed"
        : "running",
    actualResults,
    realityLoop: {
      realOrderDataAvailable:
        hasOrders,
      realConversionDataAvailable:
        false,
      realRefundDataAvailable:
        hasRefundData,
      realAcquisitionCostAvailable:
        hasAcquisitionData,
      actualUnitEconomicsAvailable:
        hasRevenue,
      profitabilityVerified: false,
    },
    blockers: [],
    nextActions: hasOrders
      ? [
          "继续记录真实订单。",
          "补充真实曝光与转化数据。",
          "持续记录退款与售后。",
          "持续记录真实获客成本。",
          "用累计真实数据重新计算单位经济。",
        ]
      : [
          "继续进行小规模人工测试。",
          "争取获得第一笔真实订单。",
          "获得订单后立即回填真实数据。",
        ],
  };
}
export function createC145_6RegressionFixture(): {
  plan: CommerceTestPlanInput;
  actual: CommerceActualTestInput;
} {
  return {
    plan: {
      productName: "便携小风扇",
      category: "小家电",
      currency: "CNY",
      sellingPrice: 39.9,
      unitCost: 30,
      contributionSpace: 9.9,
      contributionMarginPercent: 24.81,
      supplierVerified: true,
      economicsVerified: true,
    },
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
      currency: "CNY",
    },
  };
}
