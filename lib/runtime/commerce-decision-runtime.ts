import type {
  CommerceMarketIntelligence,
} from "./commerce-market-intelligence-runtime";

import type {
  CommerceProductIntelligence,
} from "./commerce-product-intelligence-runtime";

export interface CommerceDecisionResult {
  success: boolean;
  code: string;

  product: {
    name: string;
    category: string;
    type: string;
  };

  decision: {
    testPriority: "high" | "medium" | "low" | "unknown";
    score: number;
    rationale: string[];
  };

  evidence: {
    market: number;
    supply: number;
    price: number;
    competition: number;
    content: number;
  };

  priceAnalysis: {
    marketPriceSignals: string[];
    supplyPriceSignals: string[];
    marketPriceCount: number;
    supplyPriceCount: number;
    priceSpreadSignal: "positive" | "neutral" | "negative" | "unknown";
    profitabilityVerified: false;
  };

  competitionAnalysis: {
    signalCount: number;
    level: "high" | "medium" | "low" | "unknown";
    signals: string[];
  };

  supplyAnalysis: {
    evidenceCount: number;
    supplierSignalCount: number;
    verified: boolean;
    signals: string[];
  };

  contentAnalysis: {
    sellingPointCount: number;
    demonstrationCount: number;
    commercialSignalScore: number;
    signals: string[];
  };

  verification: {
    marketVerified: boolean;
    supplyVerified: boolean;
    priceEvidenceFound: boolean;
    competitorEvidenceFound: boolean;
    supplierEvidenceFound: boolean;
    overallVerified: boolean;
  };

  unknowns: string[];

  nextActions: string[];

  boundaries: string[];

  error?: string;
}

const MAX_ITEMS = 12;

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

function unique(
  values: string[],
  max = MAX_ITEMS,
): string[] {
  return Array.from(
    new Set(
      values
        .map(clean)
        .filter(Boolean),
    ),
  ).slice(0, max);
}

function clamp(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
}

function extractNumbers(
  values: string[],
): number[] {
  const numbers: number[] = [];

  for (const value of values) {
    const matches =
      value.match(
        /(?:¥|￥|RMB|CNY|人民币)?\s*(\d+(?:\.\d+)?)/giu,
      );

    if (!matches) {
      continue;
    }

    for (const match of matches) {
      const numberMatch =
        match.match(
          /(\d+(?:\.\d+)?)/,
        );

      if (!numberMatch) {
        continue;
      }

      const parsed =
        Number(numberMatch[1]);

      if (
        Number.isFinite(parsed) &&
        parsed >= 0
      ) {
        numbers.push(parsed);
      }
    }
  }

  return numbers;
}

function classifyCompetition(
  count: number,
): "high" | "medium" | "low" | "unknown" {
  if (count <= 0) {
    return "unknown";
  }

  if (count >= 8) {
    return "high";
  }

  if (count >= 4) {
    return "medium";
  }

  return "low";
}

function buildPriceAnalysis(
  market: CommerceMarketIntelligence,
): CommerceDecisionResult["priceAnalysis"] {
  const marketPriceSignals =
    unique(
      market.priceSignals,
    );

  const supplyPriceSignals =
    unique(
      market.supplyEvidence
        .flatMap(
          (item) => [
            item.title,
            ...item.snippets,
          ],
        )
        .filter(
          (item) =>
            /(?:¥|￥|RMB|CNY|人民币|\d+(?:\.\d+)?\s*元)/iu.test(
              item,
            ),
        ),
    );

  const marketNumbers =
    extractNumbers(
      marketPriceSignals,
    );

  const supplyNumbers =
    extractNumbers(
      supplyPriceSignals,
    );

  let priceSpreadSignal:
    | "positive"
    | "neutral"
    | "negative"
    | "unknown" =
    "unknown";

  if (
    marketNumbers.length > 0 &&
    supplyNumbers.length > 0
  ) {
    const marketMin =
      Math.min(
        ...marketNumbers,
      );

    const supplyMin =
      Math.min(
        ...supplyNumbers,
      );

    if (
      marketMin > 0 &&
      supplyMin >= 0
    ) {
      const ratio =
        supplyMin / marketMin;

      if (ratio < 0.45) {
        priceSpreadSignal =
          "positive";
      } else if (ratio < 0.7) {
        priceSpreadSignal =
          "neutral";
      } else {
        priceSpreadSignal =
          "negative";
      }
    }
  }

  return {
    marketPriceSignals,
    supplyPriceSignals,
    marketPriceCount:
      marketNumbers.length,
    supplyPriceCount:
      supplyNumbers.length,
    priceSpreadSignal,
    profitabilityVerified:
      false,
  };
}

function buildScore(
  market: CommerceMarketIntelligence,
  commerce: CommerceProductIntelligence,
  price: CommerceDecisionResult["priceAnalysis"],
  competition: CommerceDecisionResult["competitionAnalysis"],
): {
  score: number;
  priority:
    | "high"
    | "medium"
    | "low"
    | "unknown";
} {
  if (
    !market.verification.overallVerified
  ) {
    return {
      score: clamp(
        (
          market.verification.score *
          0.7
        ) +
        (
          commerce.confidence.commercialSignal *
          0.3
        ),
      ),
      priority: "unknown",
    };
  }

  const marketScore =
    market.verification.marketVerified
      ? 100
      : 40;

  const supplyScore =
    market.verification.supplyVerified
      ? 100
      : 40;

  const priceScore =
    market.verification.priceEvidenceFound
      ? (
          price.marketPriceCount > 0 &&
          price.supplyPriceCount > 0
            ? 100
            : 70
        )
      : 0;

  const competitionScore =
    competition.level === "low"
      ? 100
      : competition.level === "medium"
        ? 70
        : competition.level === "high"
          ? 35
          : 0;

  const contentScore =
    clamp(
      (
        commerce.confidence
          .commercialSignal *
        0.6
      ) +
      (
        commerce.sellingPoints.length > 0
          ? 40
          : 0
      ),
    );

  let score =
    (
      marketScore * 0.2
    ) +
    (
      supplyScore * 0.2
    ) +
    (
      priceScore * 0.2
    ) +
    (
      competitionScore * 0.2
    ) +
    (
      contentScore * 0.2
    );

  if (
    price.priceSpreadSignal ===
    "positive"
  ) {
    score += 8;
  }

  if (
    price.priceSpreadSignal ===
    "negative"
  ) {
    score -= 8;
  }

  score =
    clamp(score);

  let priority:
    | "high"
    | "medium"
    | "low"
    | "unknown";

  if (
    score >= 80 &&
    market.verification.overallVerified
  ) {
    priority = "high";
  } else if (
    score >= 60 &&
    market.verification.overallVerified
  ) {
    priority = "medium";
  } else if (
    market.verification.overallVerified
  ) {
    priority = "low";
  } else {
    priority = "unknown";
  }

  return {
    score,
    priority,
  };
}

function buildRationale(
  market: CommerceMarketIntelligence,
  commerce: CommerceProductIntelligence,
  price: CommerceDecisionResult["priceAnalysis"],
  competition: CommerceDecisionResult["competitionAnalysis"],
  priority:
    | "high"
    | "medium"
    | "low"
    | "unknown",
): string[] {
  const rationale: string[] = [];

  if (
    market.verification.marketVerified
  ) {
    rationale.push(
      "市场证据已达到当前运行时的验证条件。",
    );
  }

  if (
    market.verification.supplyVerified
  ) {
    rationale.push(
      "1688 供应链证据已达到当前运行时的验证条件。",
    );
  }

  if (
    market.verification.priceEvidenceFound
  ) {
    rationale.push(
      `已获得 ${price.marketPriceCount} 组市场价格数值信号。`,
    );
  }

  if (
    price.supplyPriceCount > 0
  ) {
    rationale.push(
      `供应链证据中发现 ${price.supplyPriceCount} 组价格数值信号。`,
    );
  }

  if (
    competition.level !==
    "unknown"
  ) {
    rationale.push(
      `当前检索得到 ${competition.signalCount} 个竞品信号，系统将竞争程度标记为 ${competition.level}。`,
    );
  }

  if (
    commerce.sellingPoints.length > 0
  ) {
    rationale.push(
      `Video Vision 已确认 ${commerce.sellingPoints.length} 个商品卖点信号。`,
    );
  }

  if (
    priority === "high"
  ) {
    rationale.push(
      "当前证据完整度达到高优先级测试阈值。",
    );
  } else if (
    priority === "medium"
  ) {
    rationale.push(
      "当前证据足以进入进一步人工核验，但仍存在关键未知项。",
    );
  } else if (
    priority === "low"
  ) {
    rationale.push(
      "当前证据存在，但暂不足以支持优先测试。",
    );
  } else {
    rationale.push(
      "当前证据尚未形成完整验证闭环。",
    );
  }

  return unique(
    rationale,
  );
}

function buildUnknowns(
  market: CommerceMarketIntelligence,
  commerce: CommerceProductIntelligence,
  price: CommerceDecisionResult["priceAnalysis"],
): string[] {
  const unknowns = [
    ...market.unknowns,
    ...commerce.unknowns,
  ];

  if (
    price.marketPriceCount === 0
  ) {
    unknowns.push(
      "没有可用于比较的市场价格数值。",
    );
  }

  if (
    price.supplyPriceCount === 0
  ) {
    unknowns.push(
      "没有从供应链证据中确认采购价格数值。",
    );
  }

  unknowns.push(
    "搜索价格不等于实际成交价格。",
    "搜索采购价格不等于最终采购成本。",
    "尚未计算平台佣金、物流、退货、投流和其他经营成本。",
    "尚未通过真实订单验证转化率。",
    "尚未验证真实销量与复购。",
  );

  return unique(
    unknowns,
    20,
  );
}

function buildNextActions(
  market: CommerceMarketIntelligence,
  price: CommerceDecisionResult["priceAnalysis"],
  priority:
    | "high"
    | "medium"
    | "low"
    | "unknown",
): string[] {
  const actions: string[] = [];

  if (
    market.supplyEvidence.length > 0
  ) {
    actions.push(
      "人工打开主要 1688 供应商页面，确认采购价、起批量、库存和发货条件。",
    );
  }

  if (
    price.marketPriceCount > 0
  ) {
    actions.push(
      "人工抽查主要市场价格来源，确认规格、配置和价格口径一致。",
    );
  }

  actions.push(
    "记录 3 个主要竞品的售价、核心卖点和视频展示方式。",
    "确认商品实际采购成本后计算单件毛利空间。",
    "确认物流、平台费用和退货成本后重新计算实际利润空间。",
  );

  if (
    priority === "high"
  ) {
    actions.push(
      "进入小规模抖音内容测试，不直接进行大规模备货。",
    );
  } else if (
    priority === "medium"
  ) {
    actions.push(
      "先完成规格、采购价和竞品人工核验，再进入小规模测试。",
    );
  } else {
    actions.push(
      "先补充缺失证据，不进入实际采购。",
    );
  }

  return unique(
    actions,
    12,
  );
}

export function executeCommerceDecision(
  commerce: CommerceProductIntelligence,
  market: CommerceMarketIntelligence,
): CommerceDecisionResult {
  if (
    !commerce.success
  ) {
    return {
      success: false,
      code:
        "C145_3_COMMERCE_PRODUCT_INPUT_FAILED",
      product: {
        name:
          commerce.product.name,
        category:
          commerce.product.category,
        type:
          commerce.product.type,
      },
      decision: {
        testPriority: "unknown",
        score: 0,
        rationale: [
          "C145.1 商品情报没有成功完成。",
        ],
      },
      evidence: {
        market: 0,
        supply: 0,
        price: 0,
        competition: 0,
        content: 0,
      },
      priceAnalysis: {
        marketPriceSignals: [],
        supplyPriceSignals: [],
        marketPriceCount: 0,
        supplyPriceCount: 0,
        priceSpreadSignal: "unknown",
        profitabilityVerified: false,
      },
      competitionAnalysis: {
        signalCount: 0,
        level: "unknown",
        signals: [],
      },
      supplyAnalysis: {
        evidenceCount: 0,
        supplierSignalCount: 0,
        verified: false,
        signals: [],
      },
      contentAnalysis: {
        sellingPointCount: 0,
        demonstrationCount: 0,
        commercialSignalScore: 0,
        signals: [],
      },
      verification: {
        marketVerified: false,
        supplyVerified: false,
        priceEvidenceFound: false,
        competitorEvidenceFound: false,
        supplierEvidenceFound: false,
        overallVerified: false,
      },
      unknowns: [
        "C145.1 商品情报不可用。",
      ],
      nextActions: [
        "先重新执行 C145.1。",
      ],
      boundaries: [
        "没有有效商品情报时不执行商业决策。",
      ],
    };
  }

  if (
    !market.success
  ) {
    return {
      success: false,
      code:
        "C145_3_COMMERCE_MARKET_INPUT_FAILED",
      product: {
        name:
          commerce.product.name,
        category:
          commerce.product.category,
        type:
          commerce.product.type,
      },
      decision: {
        testPriority: "unknown",
        score: 0,
        rationale: [
          "C145.2 市场与供应链情报没有成功完成。",
        ],
      },
      evidence: {
        market: 0,
        supply: 0,
        price: 0,
        competition: 0,
        content:
          commerce.confidence
            .commercialSignal,
      },
      priceAnalysis:
        buildPriceAnalysis(
          market,
        ),
      competitionAnalysis: {
        signalCount: 0,
        level: "unknown",
        signals: [],
      },
      supplyAnalysis: {
        evidenceCount: 0,
        supplierSignalCount: 0,
        verified: false,
        signals: [],
      },
      contentAnalysis: {
        sellingPointCount:
          commerce.sellingPoints.length,
        demonstrationCount:
          commerce.visualSignals
            .demonstration.length,
        commercialSignalScore:
          commerce.confidence
            .commercialSignal,
        signals:
          unique(
            commerce.sellingPoints,
          ),
      },
      verification: {
        marketVerified: false,
        supplyVerified: false,
        priceEvidenceFound: false,
        competitorEvidenceFound: false,
        supplierEvidenceFound: false,
        overallVerified: false,
      },
      unknowns: [
        "C145.2 市场情报不可用。",
      ],
      nextActions: [
        "先重新执行 C145.2。",
      ],
      boundaries: [
        "没有市场与供应链证据时不执行商业优先级判断。",
      ],
    };
  }

  const price =
    buildPriceAnalysis(
      market,
    );

  const competitionSignals =
    unique(
      market.competitorSignals,
    );

  const competition: CommerceDecisionResult["competitionAnalysis"] = {
    signalCount:
      competitionSignals.length,
    level:
      classifyCompetition(
        competitionSignals.length,
      ),
    signals:
      competitionSignals,
  };

  const supplySignals =
    unique(
      market.supplierSignals,
    );

  const contentSignals =
    unique([
      ...commerce.sellingPoints,
      ...commerce.visualSignals
        .demonstration,
      ...commerce.visualSignals
        .textOverlays,
    ]);

  const score =
    buildScore(
      market,
      commerce,
      price,
      competition,
    );

  const unknowns =
    buildUnknowns(
      market,
      commerce,
      price,
    );

  const nextActions =
    buildNextActions(
      market,
      price,
      score.priority,
    );

  const result: CommerceDecisionResult = {
    success: true,

    code:
      "C145_3_COMMERCE_DECISION_PASS",

    product: {
      name:
        commerce.product.name,
      category:
        commerce.product.category,
      type:
        commerce.product.type,
    },

    decision: {
      testPriority:
        score.priority,
      score:
        score.score,
      rationale:
        buildRationale(
          market,
          commerce,
          price,
          competition,
          score.priority,
        ),
    },

    evidence: {
      market:
        market.verification
          .marketVerified
          ? 100
          : 0,

      supply:
        market.verification
          .supplyVerified
          ? 100
          : 0,

      price:
        market.verification
          .priceEvidenceFound
          ? 100
          : 0,

      competition:
        competition.level === "low"
          ? 100
          : competition.level === "medium"
            ? 70
            : competition.level === "high"
              ? 35
              : 0,

      content:
        clamp(
          commerce.confidence
            .commercialSignal,
        ),
    },

    priceAnalysis:
      price,

    competitionAnalysis:
      competition,

    supplyAnalysis: {
      evidenceCount:
        market.supplyEvidence
          .length,

      supplierSignalCount:
        supplySignals.length,

      verified:
        market.verification
          .supplyVerified,

      signals:
        supplySignals,
    },

    contentAnalysis: {
      sellingPointCount:
        commerce.sellingPoints
          .length,

      demonstrationCount:
        commerce.visualSignals
          .demonstration.length,

      commercialSignalScore:
        clamp(
          commerce.confidence
            .commercialSignal,
        ),

      signals:
        contentSignals,
    },

    verification: {
      marketVerified:
        market.verification
          .marketVerified,

      supplyVerified:
        market.verification
          .supplyVerified,

      priceEvidenceFound:
        market.verification
          .priceEvidenceFound,

      competitorEvidenceFound:
        market.verification
          .competitorEvidenceFound,

      supplierEvidenceFound:
        market.verification
          .supplierEvidenceFound,

      overallVerified:
        market.verification
          .overallVerified,
    },

    unknowns,

    nextActions,

    boundaries: [
      "C145.3 不把搜索价格当作最终成交价。",
      "C145.3 不把1688搜索价格直接当作最终采购成本。",
      "C145.3 不承诺利润。",
      "C145.3 不承诺销量。",
      "C145.3 不自动采购或下单。",
      "测试优先级是证据驱动的内部决策信号，不是真实订单结果。",
    ],
  };

  return result;
}
