import {
  retrieveWebEvidence,
  type WebIntelligenceResult,
} from "@/lib/web-intelligence";

import type {
  CommerceProductIntelligence,
} from "./commerce-product-intelligence-runtime";

export interface CommerceMarketEvidence {
  claim: string;
  sourceUrl: string;
  title: string;
  hostname: string;
  snippets: string[];
  credibilityTier?: string;
  verificationScore?: number;
  confidence: number;
  kind:
    | "market"
    | "price"
    | "competitor"
    | "supply"
    | "1688";
}

export interface CommerceMarketIntelligence {
  success: boolean;
  code: string;

  product: {
    name: string;
    category: string;
    type: string;
    searchQueries: string[];
  };

  marketEvidence: CommerceMarketEvidence[];
  supplyEvidence: CommerceMarketEvidence[];

  priceSignals: string[];
  competitorSignals: string[];
  supplierSignals: string[];

  verification: {
    marketVerified: boolean;
    supplyVerified: boolean;
    priceEvidenceFound: boolean;
    competitorEvidenceFound: boolean;
    supplierEvidenceFound: boolean;
    independentMarketSources: number;
    independentSupplySources: number;
    overallVerified: boolean;
    score: number;
  };

  confidence: {
    market: number;
    supply: number;
    price: number;
    competition: number;
  };

  unknowns: string[];

  nextActions: string[];

  retrieval: {
    market: {
      success: boolean;
      query: string;
      sourceCount: number;
      sourceHosts: string[];
      verified: boolean;
      retrievalMode?: string;
      error?: string;
    };
    price: {
      success: boolean;
      query: string;
      sourceCount: number;
      sourceHosts: string[];
      verified: boolean;
      retrievalMode?: string;
      error?: string;
    };
    supply1688: {
      success: boolean;
      query: string;
      sourceCount: number;
      sourceHosts: string[];
      verified: boolean;
      retrievalMode?: string;
      error?: string;
    };
  };

  error?: string;
}

const MAX_EVIDENCE = 12;
const MAX_SIGNALS = 12;
const MAX_UNKNOWN = 20;

function clean(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function uniqueStrings(
  values: string[],
  max = MAX_SIGNALS,
): string[] {
  return Array.from(
    new Set(
      values
        .map(clean)
        .filter(Boolean),
    ),
  ).slice(0, max);
}

function clampScore(value: number): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
}

function is1688Host(
  hostname: string,
): boolean {
  const host =
    hostname
      .toLowerCase()
      .replace(/^www\./, "");

  return (
    host === "1688.com" ||
    host.endsWith(".1688.com")
  );
}

function evidenceFromWeb(
  result: WebIntelligenceResult,
  kind:
    | "market"
    | "price"
    | "competitor"
    | "supply"
    | "1688",
): CommerceMarketEvidence[] {
  return result.evidence
    .slice(0, MAX_EVIDENCE)
    .map((item) => ({
      claim:
        item.snippets
          .slice(0, 2)
          .join(" "),
      sourceUrl:
        item.url,
      title:
        item.title,
      hostname:
        item.hostname,
      snippets:
        item.snippets.slice(0, 4),
      credibilityTier:
        item.credibilityTier,
      verificationScore:
        item.verificationScore,
      confidence:
        clampScore(
          item.verificationScore ??
            item.confidence * 100,
        ) / 100,
      kind,
    }));
}

function extractPriceSignals(
  results: CommerceMarketEvidence[],
): string[] {
  const output: string[] = [];

  const pricePattern =
    /(?:¥|￥|人民币|元|RMB|CNY|\$|USD)\s?\d+(?:\.\d+)?(?:\s?(?:-|~|至)\s?(?:¥|￥|人民币|元|RMB|CNY|\$|USD)?\s?\d+(?:\.\d+)?)?/giu;

  for (const item of results) {
    const source =
      [
        item.title,
        ...item.snippets,
      ].join(" ");

    const matches =
      source.match(
        pricePattern,
      ) ?? [];

    output.push(
      ...matches.map(
        (value) =>
          `${value} · ${item.hostname}`,
      ),
    );
  }

  return uniqueStrings(
    output,
    MAX_SIGNALS,
  );
}

function extractSignals(
  results: CommerceMarketEvidence[],
  terms: string[],
): string[] {
  const output: string[] = [];

  for (const item of results) {
    const source =
      [
        item.title,
        ...item.snippets,
      ].join(" ");

    const lower =
      source.toLowerCase();

    const matched =
      terms.filter(
        (term) =>
          lower.includes(
            term.toLowerCase(),
          ),
      );

    if (matched.length > 0) {
      output.push(
        `${matched.join("、")} · ${item.title}`,
      );
    }
  }

  return uniqueStrings(
    output,
    MAX_SIGNALS,
  );
}

function retrievalSummary(
  result: WebIntelligenceResult,
) {
  return {
    success: result.success,
    query: result.query,
    sourceCount: result.sourceCount,
    sourceHosts: result.sourceHosts,
    verified: result.verified,
    retrievalMode:
      result.retrievalMode,
    error: result.error,
  };
}

function buildQueries(
  commerce: CommerceProductIntelligence,
): {
  market: string;
  price: string;
  supply1688: string;
} {
  const name =
    commerce.product.name ||
    "未知商品";

  const category =
    commerce.product.category;

  const type =
    commerce.product.type;

  const base =
    [
      name,
      category,
      type,
    ]
      .filter(Boolean)
      .join(" ");

  return {
    market:
      `${base} 中国电商 市场 竞品 销量 需求 趋势 查询`,
    price:
      `${base} 中国市场 售价 当前价格 价格区间 查询`,
    supply1688:
      `${base} 1688 供应商 批发 采购价格 一件代发 货源 市场价格 查询`,
  };
}

function buildUnknowns(
  market: CommerceMarketEvidence[],
  supply: CommerceMarketEvidence[],
  prices: string[],
  competitors: string[],
  suppliers: string[],
): string[] {
  const unknowns: string[] = [];

  if (market.length === 0) {
    unknowns.push(
      "未获得可用的外部市场证据。",
    );
  }

  if (supply.length === 0) {
    unknowns.push(
      "未获得可用的供应链证据。",
    );
  }

  if (prices.length === 0) {
    unknowns.push(
      "当前外部证据未确认可靠商品价格。",
    );
  }

  if (competitors.length === 0) {
    unknowns.push(
      "当前外部证据未确认明确竞品信息。",
    );
  }

  if (suppliers.length === 0) {
    unknowns.push(
      "当前外部证据未确认明确供应商信息。",
    );
  }

  unknowns.push(
    "采购成本与实际成交价仍需人工核验。",
    "当前证据不足以直接证明销量或市场需求强度。",
    "当前阶段不计算未经验证的利润率。",
  );

  return uniqueStrings(
    unknowns,
    MAX_UNKNOWN,
  );
}

export async function executeCommerceMarketIntelligence(
  commerce: CommerceProductIntelligence,
): Promise<CommerceMarketIntelligence> {
  const productName =
    clean(commerce.product.name);

  const category =
    clean(commerce.product.category);

  const type =
    clean(commerce.product.type);

  if (!commerce.success) {
    return {
      success: false,
      code:
        "C145_2_COMMERCE_PRODUCT_INPUT_FAILED",

      product: {
        name: productName,
        category,
        type,
        searchQueries: [],
      },

      marketEvidence: [],
      supplyEvidence: [],
      priceSignals: [],
      competitorSignals: [],
      supplierSignals: [],

      verification: {
        marketVerified: false,
        supplyVerified: false,
        priceEvidenceFound: false,
        competitorEvidenceFound: false,
        supplierEvidenceFound: false,
        independentMarketSources: 0,
        independentSupplySources: 0,
        overallVerified: false,
        score: 0,
      },

      confidence: {
        market: 0,
        supply: 0,
        price: 0,
        competition: 0,
      },

      unknowns: [
        "C145.1 商品情报没有成功返回。",
      ],

      nextActions: [
        "先完成 C145.1 Commerce Product Intelligence。",
      ],

      retrieval: {
        market: {
          success: false,
          query: "",
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
        price: {
          success: false,
          query: "",
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
        supply1688: {
          success: false,
          query: "",
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
      },

      error:
        "Commerce Product Intelligence input is not successful.",
    };
  }

  if (!productName) {
    return {
      success: false,
      code:
        "C145_2_COMMERCE_PRODUCT_NAME_UNKNOWN",

      product: {
        name: "",
        category,
        type,
        searchQueries: [],
      },

      marketEvidence: [],
      supplyEvidence: [],
      priceSignals: [],
      competitorSignals: [],
      supplierSignals: [],

      verification: {
        marketVerified: false,
        supplyVerified: false,
        priceEvidenceFound: false,
        competitorEvidenceFound: false,
        supplierEvidenceFound: false,
        independentMarketSources: 0,
        independentSupplySources: 0,
        overallVerified: false,
        score: 0,
      },

      confidence: {
        market: 0,
        supply: 0,
        price: 0,
        competition: 0,
      },

      unknowns: [
        "C145.1 没有确认具体商品名称。",
        "无法可靠构造商品专项市场与供应链查询。",
      ],

      nextActions: [
        "补充商品名称或重新执行 Video Vision。",
      ],

      retrieval: {
        market: {
          success: false,
          query: "",
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
        price: {
          success: false,
          query: "",
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
        supply1688: {
          success: false,
          query: "",
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
      },

      error:
        "A confirmed product name is required.",
    };
  }

  const queries =
    buildQueries(
      commerce,
    );

  try {
    const [
      marketResult,
      priceResult,
      supplyResult,
    ] = await Promise.all([
      retrieveWebEvidence(
        queries.market,
      ),
      retrieveWebEvidence(
        queries.price,
      ),
      retrieveWebEvidence(
        queries.supply1688,
      ),
    ]);

    const marketEvidence =
      evidenceFromWeb(
        marketResult,
        "market",
      );

    const priceEvidence =
      evidenceFromWeb(
        priceResult,
        "price",
      );

    const competitorEvidence =
      evidenceFromWeb(
        marketResult,
        "competitor",
      );

    const allSupplyEvidence =
      evidenceFromWeb(
        supplyResult,
        "supply",
      );

    const 1688Evidence =
      allSupplyEvidence.filter(
        (item) =>
          is1688Host(
            item.hostname,
          ),
      );

    const supplyEvidence =
      (
        1688Evidence.length > 0
          ? 1688Evidence
          : allSupplyEvidence
      ).slice(
        0,
        MAX_EVIDENCE,
      );

    const priceSignals =
      extractPriceSignals(
        priceEvidence,
      );

    const competitorSignals =
      extractSignals(
        competitorEvidence,
        [
          "竞品",
          "竞争",
          "品牌",
          "销量",
          "销售",
          "排名",
          "competitor",
          "competition",
          "sales",
          "brand",
          "ranking",
        ],
      );

    const supplierSignals =
      extractSignals(
        supplyEvidence,
        [
          "供应商",
          "供应",
          "批发",
          "采购",
          "一件代发",
          "货源",
          "工厂",
          "supplier",
          "wholesale",
          "factory",
          "dropshipping",
        ],
      );

    const marketHosts =
      new Set(
        marketEvidence
          .map(
            (item) =>
              item.hostname
                .toLowerCase()
                .replace(
                  /^www\./,
                  "",
                ),
          ),
      );

    const supplyHosts =
      new Set(
        supplyEvidence
          .map(
            (item) =>
              item.hostname
                .toLowerCase()
                .replace(
                  /^www\./,
                  "",
                ),
          ),
      );

    const marketVerified =
      marketResult.success &&
      marketResult.verified;

    const supplyVerified =
      supplyResult.success &&
      supplyResult.verified;

    const priceEvidenceFound =
      priceSignals.length > 0;

    const competitorEvidenceFound =
      competitorSignals.length > 0;

    const supplierEvidenceFound =
      supplierSignals.length > 0;

    const marketScore =
      clampScore(
        (
          marketResult.verified
            ? 45
            : 20
        ) +
          Math.min(
            35,
            marketHosts.size * 10,
          ) +
          (
            competitorEvidenceFound
              ? 20
              : 0
          ),
      );

    const supplyScore =
      clampScore(
        (
          supplyResult.verified
            ? 45
            : 20
        ) +
          Math.min(
            35,
            supplyHosts.size * 10,
          ) +
          (
            supplierEvidenceFound
              ? 20
              : 0
          ),
      );

    const priceScore =
      clampScore(
        priceEvidenceFound
          ? (
              priceResult.verified
                ? 80
                : 50
            )
          : 0,
      );

    const competitionScore =
      clampScore(
        competitorEvidenceFound
          ? (
              marketResult.verified
                ? 75
                : 45
            )
          : 0,
      );

    const overallScore =
      clampScore(
        marketScore * 0.30 +
        supplyScore * 0.30 +
        priceScore * 0.20 +
        competitionScore * 0.20,
      );

    const unknowns =
      buildUnknowns(
        marketEvidence,
        supplyEvidence,
        priceSignals,
        competitorSignals,
        supplierSignals,
      );

    const nextActions = [
      "人工打开供应商页面核验起批量、采购价、库存和发货条件。",
      "人工核验市场售价是否对应同规格商品。",
      "对主要竞品进一步记录售价、卖点、内容形式和评论反馈。",
      "建立采购成本、平台费用、物流与实际成交价后再计算利润。",
    ];

    const overallVerified =
      marketVerified &&
      supplyVerified &&
      priceEvidenceFound;

    return {
      success: true,
      code:
        "C145_2_COMMERCE_MARKET_SUPPLY_INTELLIGENCE_PASS",

      product: {
        name: productName,
        category,
        type,
        searchQueries: [
          queries.market,
          queries.price,
          queries.supply1688,
        ],
      },

      marketEvidence,
      supplyEvidence,

      priceSignals,
      competitorSignals,
      supplierSignals,

      verification: {
        marketVerified,
        supplyVerified,
        priceEvidenceFound,
        competitorEvidenceFound,
        supplierEvidenceFound,
        independentMarketSources:
          marketHosts.size,
        independentSupplySources:
          supplyHosts.size,
        overallVerified,
        score:
          overallScore,
      },

      confidence: {
        market:
          marketScore,
        supply:
          supplyScore,
        price:
          priceScore,
        competition:
          competitionScore,
      },

      unknowns,

      nextActions,

      retrieval: {
        market:
          retrievalSummary(
            marketResult,
          ),
        price:
          retrievalSummary(
            priceResult,
          ),
        supply1688:
          retrievalSummary(
            supplyResult,
          ),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Commerce market intelligence failed.";

    return {
      success: false,
      code:
        "C145_2_COMMERCE_MARKET_SUPPLY_INTELLIGENCE_ERROR",

      product: {
        name: productName,
        category,
        type,
        searchQueries: [
          queries.market,
          queries.price,
          queries.supply1688,
        ],
      },

      marketEvidence: [],
      supplyEvidence: [],
      priceSignals: [],
      competitorSignals: [],
      supplierSignals: [],

      verification: {
        marketVerified: false,
        supplyVerified: false,
        priceEvidenceFound: false,
        competitorEvidenceFound: false,
        supplierEvidenceFound: false,
        independentMarketSources: 0,
        independentSupplySources: 0,
        overallVerified: false,
        score: 0,
      },

      confidence: {
        market: 0,
        supply: 0,
        price: 0,
        competition: 0,
      },

      unknowns: [
        "外部市场/供应链检索执行失败。",
      ],

      nextActions: [
        "检查 Brave Search API 配置后重试。",
      ],

      retrieval: {
        market: {
          success: false,
          query: queries.market,
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
        price: {
          success: false,
          query: queries.price,
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
        supply1688: {
          success: false,
          query: queries.supply1688,
          sourceCount: 0,
          sourceHosts: [],
          verified: false,
        },
      },

      error: message,
    };
  }
}
