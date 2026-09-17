export type VerificationStatus =
  | "verified"
  | "estimated"
  | "unknown";
export interface VerificationField<T> {
  value?: T;
  status: VerificationStatus;
  evidence?: string;
}
export interface SupplierVerificationInput {
  productName: string;
  category?: string;
  supplierUrl?: VerificationField<string>;
  supplierName?: VerificationField<string>;
  sku?: VerificationField<string>;
  specifications?: VerificationField<string>;
  purchasePrice?: VerificationField<number>;
  moq?: VerificationField<number>;
  shippingPerUnit?: VerificationField<number>;
  inventory?: VerificationField<number>;
  marketSellingPrice?: VerificationField<number>;
  platformFeePerUnit?: VerificationField<number>;
  logisticsPerUnit?: VerificationField<number>;
  returnReservePerUnit?: VerificationField<number>;
  acquisitionCostPerUnit?: VerificationField<number>;
  currency?: string;
}
export interface EconomicsComponent {
  key: string;
  label: string;
  value?: number;
  status: VerificationStatus;
  evidence?: string;
}
export interface SupplierVerificationResult {
  supplier: {
    url: VerificationField<string>;
    name: VerificationField<string>;
    sku: VerificationField<string>;
    specifications: VerificationField<string>;
    purchasePrice: VerificationField<number>;
    moq: VerificationField<number>;
    shippingPerUnit: VerificationField<number>;
    inventory: VerificationField<number>;
  };
  verification: {
    verifiedFieldCount: number;
    estimatedFieldCount: number;
    unknownFieldCount: number;
    completeness: number;
    supplierIdentityVerified: boolean;
    productSpecificationVerified: boolean;
    purchasePriceVerified: boolean;
    moqVerified: boolean;
    shippingVerified: boolean;
    overallSupplierVerified: boolean;
  };
}
export interface CommerceUnitEconomicsResult {
  success: boolean;
  code: string;
  product: {
    name: string;
    category: string;
    currency: string;
  };
  supplierVerification: SupplierVerificationResult;
  economics: {
    components: EconomicsComponent[];
    purchaseCostPerUnit?: number;
    logisticsCostPerUnit?: number;
    platformCostPerUnit?: number;
    returnReservePerUnit?: number;
    acquisitionCostPerUnit?: number;
    totalUnitCost?: number;
    sellingPrice?: number;
    contributionSpacePerUnit?: number;
    contributionMarginPercent?: number;
    status:
      | "verified"
      | "calculated"
      | "partial"
      | "unknown";
    profitabilityVerified: false;
  };
  testConditions: {
    canCalculateUnitEconomics: boolean;
    canRunSmallTest: boolean;
    blockers: string[];
    requiredBeforeOrder: string[];
    requiredBeforeScale: string[];
  };
  evidenceSummary: {
    verified: string[];
    estimated: string[];
    unknown: string[];
  };
  boundaries: string[];
  nextActions: string[];
  error?: string;
}
function clean(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}
function unique(values: string[], max = 30): string[] {
  return Array.from(
    new Set(
      values
        .map(clean)
        .filter(Boolean),
    ),
  ).slice(0, max);
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
function normalizeField<T>(
  field: VerificationField<T> | undefined,
): VerificationField<T> {
  if (!field) {
    return {
      status: "unknown",
    };
  }
  return {
    value: field.value,
    status:
      field.status === "verified" ||
      field.status === "estimated"
        ? field.status
        : "unknown",
    evidence: clean(field.evidence),
  };
}
function normalizeNumberField(
  field: VerificationField<number> | undefined,
): VerificationField<number> {
  const normalized =
    normalizeField(field);
  const value =
    toNumber(normalized.value);
  if (value === undefined) {
    return {
      status: "unknown",
      evidence:
        normalized.evidence,
    };
  }
  return {
    value,
    status: normalized.status,
    evidence:
      normalized.evidence,
  };
}
function normalizeInput(
  input: SupplierVerificationInput,
): SupplierVerificationInput {
  return {
    productName:
      clean(input.productName),
    category:
      clean(input.category),
    supplierUrl:
      normalizeField(input.supplierUrl),
    supplierName:
      normalizeField(input.supplierName),
    sku:
      normalizeField(input.sku),
    specifications:
      normalizeField(input.specifications),
    purchasePrice:
      normalizeNumberField(
        input.purchasePrice,
      ),
    moq:
      normalizeNumberField(
        input.moq,
      ),
    shippingPerUnit:
      normalizeNumberField(
        input.shippingPerUnit,
      ),
    inventory:
      normalizeNumberField(
        input.inventory,
      ),
    marketSellingPrice:
      normalizeNumberField(
        input.marketSellingPrice,
      ),
    platformFeePerUnit:
      normalizeNumberField(
        input.platformFeePerUnit,
      ),
    logisticsPerUnit:
      normalizeNumberField(
        input.logisticsPerUnit,
      ),
    returnReservePerUnit:
      normalizeNumberField(
        input.returnReservePerUnit,
      ),
    acquisitionCostPerUnit:
      normalizeNumberField(
        input.acquisitionCostPerUnit,
      ),
    currency:
      clean(input.currency) || "CNY",
  };
}
function getStringField(
  field: VerificationField<string> | undefined,
): VerificationField<string> {
  return normalizeField(field);
}
function getNumberField(
  field: VerificationField<number> | undefined,
): VerificationField<number> {
  return normalizeNumberField(field);
}
function createSupplierVerification(
  input: SupplierVerificationInput,
): SupplierVerificationResult {
  const supplier = {
    url: getStringField(
      input.supplierUrl,
    ),
    name: getStringField(
      input.supplierName,
    ),
    sku: getStringField(
      input.sku,
    ),
    specifications:
      getStringField(
        input.specifications,
      ),
    purchasePrice:
      getNumberField(
        input.purchasePrice,
      ),
    moq:
      getNumberField(input.moq),
    shippingPerUnit:
      getNumberField(
        input.shippingPerUnit,
      ),
    inventory:
      getNumberField(
        input.inventory,
      ),
  };
  const fields = [
    supplier.url,
    supplier.name,
    supplier.sku,
    supplier.specifications,
    supplier.purchasePrice,
    supplier.moq,
    supplier.shippingPerUnit,
    supplier.inventory,
  ];
  const verifiedFieldCount =
    fields.filter(
      (field) =>
        field.status === "verified",
    ).length;
  const estimatedFieldCount =
    fields.filter(
      (field) =>
        field.status === "estimated",
    ).length;
  const unknownFieldCount =
    fields.filter(
      (field) =>
        field.status === "unknown",
    ).length;
  const completeness =
    Math.round(
      (
        verifiedFieldCount /
        fields.length
      ) * 100,
    );
  const supplierIdentityVerified =
    supplier.url.status ===
      "verified" &&
    supplier.name.status ===
      "verified";
  const productSpecificationVerified =
    supplier.sku.status ===
      "verified" &&
    supplier.specifications.status ===
      "verified";
  const purchasePriceVerified =
    supplier.purchasePrice.status ===
    "verified";
  const moqVerified =
    supplier.moq.status ===
    "verified";
  const shippingVerified =
    supplier.shippingPerUnit.status ===
    "verified";
  const overallSupplierVerified =
    supplierIdentityVerified &&
    productSpecificationVerified &&
    purchasePriceVerified &&
    moqVerified &&
    shippingVerified;
  return {
    supplier,
    verification: {
      verifiedFieldCount,
      estimatedFieldCount,
      unknownFieldCount,
      completeness,
      supplierIdentityVerified,
      productSpecificationVerified,
      purchasePriceVerified,
      moqVerified,
      shippingVerified,
      overallSupplierVerified,
    },
  };
}
function component(
  key: string,
  label: string,
  field: VerificationField<number>,
): EconomicsComponent {
  return {
    key,
    label,
    value: field.value,
    status: field.status,
    evidence: field.evidence,
  };
}
function buildEconomics(
  input: SupplierVerificationInput,
): CommerceUnitEconomicsResult["economics"] {
  const purchase =
    getNumberField(
      input.purchasePrice,
    );
  const shipping =
    getNumberField(
      input.shippingPerUnit,
    );
  const platform =
    getNumberField(
      input.platformFeePerUnit,
    );
  const logistics =
    getNumberField(
      input.logisticsPerUnit,
    );
  const returns =
    getNumberField(
      input.returnReservePerUnit,
    );
  const acquisition =
    getNumberField(
      input.acquisitionCostPerUnit,
    );
  const selling =
    getNumberField(
      input.marketSellingPrice,
    );
  const components = [
    component(
      "purchase",
      "采购成本",
      purchase,
    ),
    component(
      "shipping",
      "供应商发货/单件物流",
      shipping,
    ),
    component(
      "platform",
      "平台成本",
      platform,
    ),
    component(
      "logistics",
      "履约物流",
      logistics,
    ),
    component(
      "returns",
      "售后/退货预留",
      returns,
    ),
    component(
      "acquisition",
      "内容/获客成本",
      acquisition,
    ),
  ];
  const requiredCostFields = [
    purchase,
    shipping,
    platform,
    logistics,
    returns,
    acquisition,
  ];
  const allCostsAvailable =
    requiredCostFields.every(
      (field) =>
        typeof field.value ===
        "number",
    );
  const hasSellingPrice =
    typeof selling.value ===
    "number";
  let totalUnitCost:
    | number
    | undefined;
  let contributionSpacePerUnit:
    | number
    | undefined;
  let contributionMarginPercent:
    | number
    | undefined;
  if (allCostsAvailable) {
    totalUnitCost =
      requiredCostFields.reduce(
        (sum, field) =>
          sum + (field.value ?? 0),
        0,
      );
  }
  if (
    hasSellingPrice &&
    typeof totalUnitCost ===
      "number"
  ) {
    contributionSpacePerUnit =
      selling.value! -
      totalUnitCost;
    if (
      selling.value! > 0
    ) {
      contributionMarginPercent =
        Math.round(
          (
            contributionSpacePerUnit /
            selling.value!
          ) *
          10000,
        ) / 100;
    }
  }
  const allVerified =
    requiredCostFields.every(
      (field) =>
        field.status ===
        "verified",
    ) &&
    selling.status ===
      "verified";
  const anyMissing =
    requiredCostFields.some(
      (field) =>
        typeof field.value !==
        "number",
    ) ||
    !hasSellingPrice;
  const anyEstimated =
    requiredCostFields.some(
      (field) =>
        field.status ===
        "estimated",
    ) ||
    selling.status ===
      "estimated";
  let status:
    | "verified"
    | "calculated"
    | "partial"
    | "unknown";
  if (allVerified) {
    status = "verified";
  } else if (
    allCostsAvailable &&
    hasSellingPrice
  ) {
    status = anyEstimated
      ? "calculated"
      : "calculated";
  } else if (!anyMissing) {
    status = "partial";
  } else if (
    requiredCostFields.some(
      (field) =>
        typeof field.value ===
        "number",
    ) ||
    hasSellingPrice
  ) {
    status = "partial";
  } else {
    status = "unknown";
  }
  return {
    components,
    purchaseCostPerUnit:
      purchase.value,
    logisticsCostPerUnit:
      (
        shipping.value ?? 0
      ) +
      (
        logistics.value ?? 0
      ),
    platformCostPerUnit:
      platform.value,
    returnReservePerUnit:
      returns.value,
    acquisitionCostPerUnit:
      acquisition.value,
    totalUnitCost,
    sellingPrice:
      selling.value,
    contributionSpacePerUnit,
    contributionMarginPercent,
    status,
    profitabilityVerified: false,
  };
}
function buildEvidenceSummary(
  input: SupplierVerificationInput,
): CommerceUnitEconomicsResult["evidenceSummary"] {
  const fields: Array<{
    label: string;
    field:
      | VerificationField<string>
      | VerificationField<number>;
  }> = [
    {
      label: "供应商页面",
      field: getStringField(
        input.supplierUrl,
      ),
    },
    {
      label: "供应商名称",
      field: getStringField(
        input.supplierName,
      ),
    },
    {
      label: "SKU",
      field: getStringField(
        input.sku,
      ),
    },
    {
      label: "规格",
      field: getStringField(
        input.specifications,
      ),
    },
    {
      label: "采购价",
      field: getNumberField(
        input.purchasePrice,
      ),
    },
    {
      label: "MOQ",
      field: getNumberField(
        input.moq,
      ),
    },
    {
      label: "供应商发货/单件物流",
      field: getNumberField(
        input.shippingPerUnit,
      ),
    },
    {
      label: "库存",
      field: getNumberField(
        input.inventory,
      ),
    },
    {
      label: "市场售价",
      field: getNumberField(
        input.marketSellingPrice,
      ),
    },
    {
      label: "平台成本",
      field: getNumberField(
        input.platformFeePerUnit,
      ),
    },
    {
      label: "履约物流",
      field: getNumberField(
        input.logisticsPerUnit,
      ),
    },
    {
      label: "售后/退货预留",
      field: getNumberField(
        input.returnReservePerUnit,
      ),
    },
    {
      label: "内容/获客成本",
      field: getNumberField(
        input.acquisitionCostPerUnit,
      ),
    },
  ];
  return {
    verified: fields
      .filter(
        (item) =>
          item.field.status ===
          "verified",
      )
      .map(
        (item) =>
          item.label,
      ),
    estimated: fields
      .filter(
        (item) =>
          item.field.status ===
          "estimated",
      )
      .map(
        (item) =>
          item.label,
      ),
    unknown: fields
      .filter(
        (item) =>
          item.field.status ===
          "unknown",
      )
      .map(
        (item) =>
          item.label,
      ),
  };
}
function buildTestConditions(
  input: SupplierVerificationInput,
  supplier: SupplierVerificationResult,
  economics: CommerceUnitEconomicsResult["economics"],
): CommerceUnitEconomicsResult["testConditions"] {
  const blockers: string[] = [];
  const requiredBeforeOrder: string[] = [];
  const requiredBeforeScale: string[] = [];
  if (
    !supplier.verification
      .supplierIdentityVerified
  ) {
    blockers.push(
      "供应商身份尚未完整核验。",
    );
  }
  if (
    !supplier.verification
      .productSpecificationVerified
  ) {
    blockers.push(
      "SKU/规格尚未完成一致性核验。",
    );
  }
  if (
    !supplier.verification
      .purchasePriceVerified
  ) {
    blockers.push(
      "采购价尚未被供应商证据确认。",
    );
  }
  if (
    !supplier.verification
      .moqVerified
  ) {
    blockers.push(
      "MOQ 尚未确认。",
    );
  }
  if (
    !supplier.verification
      .shippingVerified
  ) {
    blockers.push(
      "供应商发货/物流成本尚未确认。",
    );
  }
  if (
    economics.sellingPrice ===
    undefined
  ) {
    blockers.push(
      "目标售价尚未确认。",
    );
  }
  if (
    economics.totalUnitCost ===
    undefined
  ) {
    blockers.push(
      "单位总成本尚未完整计算。",
    );
  }
  if (
    !getNumberField(
      input.platformFeePerUnit,
    ).value &&
    getNumberField(
      input.platformFeePerUnit,
    ).value !== 0
  ) {
    requiredBeforeOrder.push(
      "确认平台成本或明确采用的费率规则。",
    );
  }
  if (
    !getNumberField(
      input.logisticsPerUnit,
    ).value &&
    getNumberField(
      input.logisticsPerUnit,
    ).value !== 0
  ) {
    requiredBeforeOrder.push(
      "确认实际履约物流成本。",
    );
  }
  if (
    !getNumberField(
      input.returnReservePerUnit,
    ).value &&
    getNumberField(
      input.returnReservePerUnit,
    ).value !== 0
  ) {
    requiredBeforeOrder.push(
      "建立售后/退货预留。",
    );
  }
  if (
    !getNumberField(
      input.acquisitionCostPerUnit,
    ).value &&
    getNumberField(
      input.acquisitionCostPerUnit,
    ).value !== 0
  ) {
    requiredBeforeOrder.push(
      "确认内容/获客成本假设。",
    );
  }
  requiredBeforeScale.push(
    "取得真实订单数据。",
    "取得真实转化率。",
    "取得真实退货率。",
    "取得真实获客成本。",
    "重新计算真实单位经济。",
  );
  const canCalculateUnitEconomics =
    economics.totalUnitCost !==
      undefined &&
    economics.sellingPrice !==
      undefined;
  const canRunSmallTest =
    canCalculateUnitEconomics &&
    supplier.verification
      .supplierIdentityVerified &&
    supplier.verification
      .productSpecificationVerified &&
    supplier.verification
      .purchasePriceVerified &&
    supplier.verification
      .moqVerified;
  return {
    canCalculateUnitEconomics,
    canRunSmallTest,
    blockers: unique(
      blockers,
      20,
    ),
    requiredBeforeOrder:
      unique(
        requiredBeforeOrder,
        20,
      ),
    requiredBeforeScale:
      unique(
        requiredBeforeScale,
        20,
      ),
  };
}
export function executeCommerceUnitEconomics(
  rawInput: SupplierVerificationInput,
): CommerceUnitEconomicsResult {
  const input =
    normalizeInput(rawInput);
  if (!input.productName) {
    return {
      success: false,
      code:
        "C145_5_PRODUCT_INPUT_FAILED",
      product: {
        name: "",
        category:
          input.category ?? "",
        currency:
          input.currency ?? "CNY",
      },
      supplierVerification:
        createSupplierVerification(
          input,
        ),
      economics: {
        components: [],
        status: "unknown",
        profitabilityVerified:
          false,
      },
      testConditions: {
        canCalculateUnitEconomics:
          false,
        canRunSmallTest:
          false,
        blockers: [
          "必须提供商品名称。",
        ],
        requiredBeforeOrder: [],
        requiredBeforeScale: [],
      },
      evidenceSummary: {
        verified: [],
        estimated: [],
        unknown: [],
      },
      boundaries: [
        "没有商品名称时不进行任何经济计算。",
      ],
      nextActions: [
        "提供真实商品名称。",
      ],
      error:
        "Product name is required.",
    };
  }
  const supplier =
    createSupplierVerification(
      input,
    );
  const economics =
    buildEconomics(input);
  const testConditions =
    buildTestConditions(
      input,
      supplier,
      economics,
    );
  const evidenceSummary =
    buildEvidenceSummary(input);
  const nextActions = unique([
    supplier.verification
      .overallSupplierVerified
      ? "供应商基础信息已完成核验。"
      : "继续核验 1688 供应商页面、SKU、规格、采购价、MOQ 和物流。",
    economics.sellingPrice !==
    undefined
      ? "售价输入已建立。"
      : "补充目标市场实际售价证据。",
    economics.totalUnitCost !==
    undefined
      ? "单位总成本已计算。"
      : "补齐平台、物流、售后和获客成本。",
    economics.contributionSpacePerUnit !==
    undefined
      ? "单位贡献空间已计算，但仍不能视为已验证利润。"
      : "补齐售价与全部成本字段后计算单位贡献空间。",
    testConditions.canRunSmallTest
      ? "可以进入小规模人工测试准备阶段。"
      : "先解决测试阻塞项，再进入小规模测试。",
    "测试产生真实订单后，用真实数据回填模型。",
  ]);
  const boundaries = [
    "C145.5 不自动访问需要登录或授权的 1688 供应商后台。",
    "供应商信息必须由用户人工核验或提供可验证证据。",
    "Verified 表示用户提供或确认的证据状态，不代表 AIOS 独立完成商业事实认证。",
    "Estimated 不得被当作真实成交成本。",
    "Unknown 不允许由模型猜测补齐。",
    "单位贡献空间不是利润保证。",
    "profitabilityVerified 永远保持 false，直到后续真实交易数据闭环建立。",
    "C145.5 不自动采购、不自动下单、不自动付款。",
    "C145.5 不预测销量、转化率或最终利润。",
  ];
  const success =
    Boolean(input.productName);
  const code =
    testConditions.canRunSmallTest
      ? "C145_5_SUPPLIER_UNIT_ECONOMICS_PASS"
      : "C145_5_SUPPLIER_UNIT_ECONOMICS_PARTIAL";
  return {
    success,
    code,
    product: {
      name: input.productName,
      category:
        input.category ?? "",
      currency:
        input.currency ?? "CNY",
    },
    supplierVerification:
      supplier,
    economics,
    testConditions,
    evidenceSummary,
    boundaries,
    nextActions,
  };
}
export function createC145_5RegressionFixture(): SupplierVerificationInput {
  return {
    productName: "便携小风扇",
    category: "小家电",
    supplierUrl: {
      value:
        "https://detail.1688.com/example/c1455-test",
      status: "verified",
      evidence:
        "Regression fixture only - not a real supplier verification.",
    },
    supplierName: {
      value: "C145.5 Regression Supplier",
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    sku: {
      value: "FAN-001",
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    specifications: {
      value:
        "USB rechargeable, compact fan",
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    purchasePrice: {
      value: 12,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    moq: {
      value: 1,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    shippingPerUnit: {
      value: 4,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    inventory: {
      value: 100,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    marketSellingPrice: {
      value: 39.9,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    platformFeePerUnit: {
      value: 3,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    logisticsPerUnit: {
      value: 5,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    returnReservePerUnit: {
      value: 2,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    acquisitionCostPerUnit: {
      value: 4,
      status: "verified",
      evidence:
        "Regression fixture only.",
    },
    currency: "CNY",
  };
}
