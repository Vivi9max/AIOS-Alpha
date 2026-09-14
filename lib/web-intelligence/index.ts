import "server-only";

export type WebFreshness =
  | "realtime"
  | "24h"
  | "7d"
  | "30d"
  | "general";

export type LiveIntelligenceCategory =
  | "finance"
  | "weather"
  | "news"
  | "policy"
  | "market"
  | "product"
  | "technology"
  | "general";

export interface LiveIntelligenceRoute {
  required: boolean;
  category: LiveIntelligenceCategory;
  freshness: WebFreshness;
  query: string;
  reason: string;
  matchedSignals: string[];
}

export interface WebEvidence {
  id: string;
  url: string;
  title: string;
  hostname: string;
  snippets: string[];
  freshness: WebFreshness;
  retrievedAt: number;
  confidence: number;
}

export interface WebIntelligenceResult {
  success: boolean;
  query: string;
  verified: boolean;
  provider: "brave";
  evidence: WebEvidence[];
  sourceCount: number;
  sourceHosts: string[];
  error?: string;
  route?: LiveIntelligenceRoute;
}

interface BraveGenericResult {
  url?: unknown;
  title?: unknown;
  snippets?: unknown;
}

interface BraveSourceMetadata {
  title?: unknown;
  hostname?: unknown;
  age?: unknown;
}

interface BraveResponse {
  grounding?: {
    generic?: BraveGenericResult[];
  };
  sources?: Record<
    string,
    BraveSourceMetadata
  >;
}

const LIVE_SIGNAL_GROUPS: Array<{
  category: LiveIntelligenceCategory;
  signals: string[];
}> = [
  {
    category: "finance",
    signals: [
      "金价",
      "黄金价格",
      "黄金价",
      "黄金报价",
      "黄金行情",
      "国际金价",
      "国内金价",
      "现货黄金",
      "伦敦金",
      "comex黄金",
      "黄金期货",
      "au99.99",
      "au(t+d)",
      "银行金价",
      "银行黄金",
      "金条价格",
      "首饰金价",
      "汇率",
      "兑换汇率",
      "实时汇率",
      "美元汇率",
      "美元兑人民币",
      "美元对人民币",
      "人民币汇率",
      "人民币兑美元",
      "日元汇率",
      "日元兑人民币",
      "人民币兑日元",
      "港币汇率",
      "港币兑人民币",
      "欧元汇率",
      "英镑汇率",
      "股票",
      "股价",
      "股票价格",
      "股票行情",
      "实时股价",
      "当前股价",
      "美股",
      "港股",
      "a股",
      "期货",
      "基金净值",
      "比特币",
      "btc",
      "bitcoin",
      "以太坊",
      "eth",
      "crypto",
      "加密货币",
      "gold price",
      "gold prices",
      "spot gold",
      "gold market",
      "exchange rate",
      "currency rate",
      "usd cny",
      "usd/rmb",
      "jpy cny",
      "cny jpy",
      "stock price",
      "share price",
      "bitcoin price",
      "btc price",
      "crypto price",
    ],
  },
  {
    category: "weather",
    signals: [
      "天气",
      "气温",
      "温度",
      "降雨",
      "下雨",
      "台风",
      "暴雨",
      "空气质量",
      "空气污染",
      "紫外线",
      "天气预报",
      "weather",
      "temperature",
      "rain",
      "rainfall",
      "typhoon",
      "storm",
      "air quality",
      "forecast",
    ],
  },
  {
    category: "news",
    signals: [
      "新闻",
      "最新新闻",
      "今日新闻",
      "今天新闻",
      "最新消息",
      "最新动态",
      "刚刚发生",
      "发生了什么",
      "最近发生",
      "近期发生",
      "实时新闻",
      "news",
      "latest news",
      "breaking news",
      "current events",
      "recent events",
      "what happened",
    ],
  },
  {
    category: "policy",
    signals: [
      "政策",
      "最新政策",
      "政策变化",
      "政策更新",
      "法规",
      "法律法规",
      "监管",
      "监管政策",
      "补贴政策",
      "税收政策",
      "签证政策",
      "移民政策",
      "入境政策",
      "出口政策",
      "进口政策",
      "贸易政策",
      "policy",
      "latest policy",
      "regulation",
      "regulations",
      "law update",
      "tax policy",
      "visa policy",
      "immigration policy",
      "trade policy",
    ],
  },
  {
    category: "market",
    signals: [
      "市场行情",
      "市场价格",
      "市场趋势",
      "市场变化",
      "市场排名",
      "销量",
      "销售排名",
      "行业排名",
      "竞争对手",
      "竞品",
      "市场份额",
      "增长率",
      "最新市场",
      "market price",
      "market trend",
      "market ranking",
      "sales",
      "sales ranking",
      "market share",
      "growth rate",
      "competitor",
      "competitors",
    ],
  },
  {
    category: "product",
    signals: [
      "现在多少钱",
      "目前多少钱",
      "当前价格",
      "现在价格",
      "最新价格",
      "今日价格",
      "今天价格",
      "实时价格",
      "报价",
      "报价多少",
      "哪里可以买",
      "哪里有卖",
      "现货",
      "库存",
      "有没有货",
      "current price",
      "current pricing",
      "latest price",
      "today's price",
      "today price",
      "live price",
      "quote",
      "quotation",
      "in stock",
      "available now",
    ],
  },
  {
    category: "technology",
    signals: [
      "最新版本",
      "当前版本",
      "现在版本",
      "最新发布",
      "最新更新",
      "最近更新",
      "版本更新",
      "release",
      "latest release",
      "latest version",
      "current version",
      "recent update",
      "new release",
    ],
  },
  {
    category: "general",
    signals: [
      "现在",
      "目前",
      "当前",
      "最新",
      "实时",
      "今天",
      "今日",
      "本周",
      "近期",
      "最近",
      "刚刚",
      "刚才",
      "截至目前",
      "截至今天",
      "截至现在",
      "查询",
      "查一下",
      "帮我查",
      "帮我查询",
      "搜索",
      "搜一下",
      "联网查询",
      "网上查",
      "在线查询",
      "current",
      "currently",
      "latest",
      "live",
      "real-time",
      "realtime",
      "today",
      "now",
      "recent",
      "recently",
      "this week",
      "search",
      "look up",
      "check online",
      "online",
    ],
  },
];

function normalizePrompt(
  prompt: string,
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchedSignals(
  normalized: string,
): string[] {
  const matches: string[] = [];

  for (
    const group of LIVE_SIGNAL_GROUPS
  ) {
    for (
      const signal of group.signals
    ) {
      if (
        normalized.includes(
          signal.toLowerCase(),
        )
      ) {
        matches.push(signal);
      }
    }
  }

  return Array.from(
    new Set(matches),
  );
}

function resolveCategory(
  normalized: string,
): LiveIntelligenceCategory {
  const priority:
    LiveIntelligenceCategory[] = [
      "finance",
      "weather",
      "news",
      "policy",
      "market",
      "product",
      "technology",
    ];

  for (
    const category of priority
  ) {
    const group =
      LIVE_SIGNAL_GROUPS.find(
        (item) =>
          item.category ===
          category,
      );

    if (!group) {
      continue;
    }

    if (
      group.signals.some(
        (signal) =>
          normalized.includes(
            signal.toLowerCase(),
          ),
      )
    ) {
      return category;
    }
  }

  return "general";
}

function resolveFreshness(
  prompt: string,
): WebFreshness {
  const normalized =
    normalizePrompt(
      prompt,
    ).toLowerCase();

  if (
    [
      "实时",
      "现在",
      "当前",
      "今天",
      "今日",
      "刚刚",
      "刚才",
      "截至现在",
      "截至今天",
      "real-time",
      "realtime",
      "live",
      "now",
      "today",
    ].some(
      (value) =>
        normalized.includes(
          value,
        ),
    )
  ) {
    return "24h";
  }

  if (
    [
      "最新",
      "今日新闻",
      "今天新闻",
      "最新新闻",
      "最新消息",
      "最新动态",
      "本周",
      "latest",
      "latest news",
      "breaking news",
      "this week",
    ].some(
      (value) =>
        normalized.includes(
          value,
        ),
    )
  ) {
    return "7d";
  }

  if (
    [
      "近期",
      "最近",
      "最近发生",
      "近期发生",
      "recent",
      "recently",
    ].some(
      (value) =>
        normalized.includes(
          value,
        ),
    )
  ) {
    return "30d";
  }

  return "general";
}

function buildFinanceQuery(
  prompt: string,
): string {
  const normalized =
    normalizePrompt(prompt);

  const lower =
    normalized.toLowerCase();

  if (
    lower.includes("金价") ||
    lower.includes("黄金") ||
    lower.includes("gold") ||
    lower.includes("au99.99")
  ) {
    return [
      normalized,
      "gold price",
      "today",
      "current",
      "CNY",
      "RMB",
      "per gram",
      "Au99.99",
      "Shanghai Gold Exchange",
    ]
      .join(" ")
      .slice(0, 400);
  }

  if (
    lower.includes("汇率") ||
    lower.includes("exchange rate") ||
    lower.includes("兑")
  ) {
    return [
      normalized,
      "current exchange rate",
      "spot rate",
      "today",
    ]
      .join(" ")
      .slice(0, 400);
  }

  if (
    lower.includes("股票") ||
    lower.includes("股价") ||
    lower.includes("stock") ||
    lower.includes("share price")
  ) {
    return [
      normalized,
      "current stock price",
      "today",
    ]
      .join(" ")
      .slice(0, 400);
  }

  return normalized.slice(
    0,
    400,
  );
}

function buildSearchQuery(
  prompt: string,
  category: LiveIntelligenceCategory,
): string {
  if (
    category === "finance"
  ) {
    return buildFinanceQuery(
      prompt,
    );
  }

  const normalized =
    normalizePrompt(prompt);

  if (
    category === "weather"
  ) {
    return [
      normalized,
      "current weather",
    ]
      .join(" ")
      .slice(0, 400);
  }

  return normalized.slice(
    0,
    400,
  );
}

export function routeLiveIntelligence(
  prompt: string,
): LiveIntelligenceRoute {
  const normalized =
    normalizePrompt(
      prompt,
    ).toLowerCase();

  const matchedSignals =
    findMatchedSignals(
      normalized,
    );

  const category =
    resolveCategory(
      normalized,
    );

  const required =
    matchedSignals.length > 0;

  const freshness =
    required
      ? resolveFreshness(
          normalized,
        )
      : "general";

  const query =
    required
      ? buildSearchQuery(
          prompt,
          category,
        )
      : normalized.slice(
          0,
          400,
        );

  const reason =
    required
      ? `Live information detected: ${matchedSignals.join(", ")}. External web evidence is required before answering time-sensitive facts.`
      : "The request can be answered without live external information.";

  return {
    required,
    category,
    freshness,
    query,
    reason,
    matchedSignals,
  };
}

export function requiresWebIntelligence(
  prompt: string,
): boolean {
  return routeLiveIntelligence(
    prompt,
  ).required;
}

function resolveSearchLanguage(
  prompt: string,
): string {
  if (
    /[\u3040-\u30ff]/u.test(
      prompt,
    )
  ) {
    return "ja";
  }

  if (
    /[\u4e00-\u9fff]/u.test(
      prompt,
    )
  ) {
    return "zh";
  }

  return "en";
}

function normalizeHostname(
  hostname: string,
): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(
      /^www\./,
      "",
    );
}

function normalizeSourceDomain(
  hostname: string,
): string {
  const normalized =
    normalizeHostname(
      hostname,
    );

  const parts =
    normalized
      .split(".")
      .filter(Boolean);

  if (
    parts.length <= 2
  ) {
    return normalized;
  }

  const compound =
    new Set([
      "co.uk",
      "org.uk",
      "ac.uk",
      "gov.uk",
      "com.cn",
      "net.cn",
      "org.cn",
      "gov.cn",
      "com.hk",
      "net.hk",
      "org.hk",
      "gov.hk",
      "com.jp",
      "net.jp",
      "org.jp",
      "co.jp",
      "go.jp",
    ]);

  const suffix =
    parts
      .slice(-2)
      .join(".");

  if (
    compound.has(suffix) &&
    parts.length >= 3
  ) {
    return parts
      .slice(-3)
      .join(".");
  }

  return parts
    .slice(-2)
    .join(".");
}

function calculateConfidence(
  hostname: string,
  sourceCount: number,
): number {
  let score =
    sourceCount >= 2
      ? 0.82
      : 0.65;

  if (
    hostname.endsWith(
      ".gov",
    ) ||
    hostname.endsWith(
      ".go.jp",
    ) ||
    hostname.endsWith(
      ".gov.hk",
    ) ||
    hostname.endsWith(
      ".gov.cn",
    )
  ) {
    score += 0.12;
  }

  if (
    hostname.includes(
      "official",
    )
  ) {
    score += 0.05;
  }

  return Math.min(
    0.98,
    score,
  );
}

function sanitizeSnippet(
  value: string,
): string {
  return value
    .replace(
      /\u0000/g,
      "",
    )
    .slice(
      0,
      2400,
    );
}

function extractEvidence(
  raw: BraveResponse,
  freshness: WebFreshness,
): WebEvidence[] {
  const generic =
    Array.isArray(
      raw.grounding?.generic,
    )
      ? raw.grounding.generic
      : [];

  const retrievedAt =
    Date.now();

  return generic
    .map(
      (
        item,
        index,
      ) => {
        const url =
          typeof item.url ===
          "string"
            ? item.url
            : "";

        if (!url) {
          return null;
        }

        let hostname = "";

        try {
          hostname =
            new URL(
              url,
            ).hostname;
        } catch {
          return null;
        }

        const snippets =
          Array.isArray(
            item.snippets,
          )
            ? item.snippets
                .filter(
                  (
                    value,
                  ): value is string =>
                    typeof value ===
                    "string",
                )
                .map(
                  sanitizeSnippet,
                )
                .filter(Boolean)
            : [];

        if (
          snippets.length ===
          0
        ) {
          return null;
        }

        return {
          id:
            `web-${retrievedAt}-${index}`,
          url,
          title:
            typeof item.title ===
            "string"
              ? item.title
              : hostname,
          hostname,
          snippets,
          freshness,
          retrievedAt,
          confidence:
            calculateConfidence(
              hostname,
              generic.length,
            ),
        };
      },
    )
    .filter(
      (
        item,
      ): item is WebEvidence =>
        item !== null,
    )
    .slice(0, 8);
}

async function callBraveContext(
  query: string,
  searchLang: string,
  freshness?: string,
): Promise<{
  response: Response;
  raw: BraveResponse;
}> {
  const endpoint =
    new URL(
      "https://api.search.brave.com/res/v1/llm/context",
    );

  endpoint.searchParams.set(
    "q",
    query,
  );

  endpoint.searchParams.set(
    "count",
    "8",
  );

  endpoint.searchParams.set(
    "maximum_number_of_tokens",
    "6000",
  );

  endpoint.searchParams.set(
    "search_lang",
    searchLang,
  );

  endpoint.searchParams.set(
    "enable_source_metadata",
    "true",
  );

  if (freshness) {
    endpoint.searchParams.set(
      "freshness",
      freshness,
    );
  }

  const apiKey =
    process.env
      .BRAVE_SEARCH_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "BRAVE_SEARCH_API_KEY is not configured.",
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      30000,
    );

  try {
    const response =
      await fetch(
        endpoint.toString(),
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
            "Accept-Encoding":
              "gzip",
            "X-Subscription-Token":
              apiKey,
          },
          cache:
            "no-store",
          signal:
            controller.signal,
        },
      );

    const raw =
      (await response.json()) as BraveResponse;

    return {
      response,
      raw,
    };
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

export async function retrieveWebEvidence(
  prompt: string,
): Promise<WebIntelligenceResult> {
  const route =
    routeLiveIntelligence(
      prompt,
    );

  const searchLang =
    resolveSearchLanguage(
      prompt,
    );

  try {
    /*
     * PASS 1
     *
     * Normal live retrieval.
     *
     * Important:
     * Finance current-value queries deliberately do NOT
     * use the page-age freshness filter.
     *
     * A financial page can contain today's value while
     * its webpage itself was published weeks or months ago.
     */
    let result =
      await callBraveContext(
        route.query,
        searchLang,
        route.category ===
          "finance"
          ? undefined
          : route.freshness ===
              "24h"
            ? "pd"
            : route.freshness ===
                "7d"
              ? "pw"
              : route.freshness ===
                  "30d"
                ? "pm"
                : undefined,
      );

    let evidence =
      result.response.ok
        ? extractEvidence(
            result.raw,
            route.freshness,
          )
        : [];

    /*
     * PASS 2
     *
     * If no evidence was returned, retry without any
     * freshness restriction.
     *
     * This protects against the important distinction:
     *
     * "current information"
     * is not the same thing as
     * "a webpage published recently".
     */
    if (
      evidence.length === 0
    ) {
      result =
        await callBraveContext(
          route.query,
          searchLang,
        );

      evidence =
        result.response.ok
          ? extractEvidence(
              result.raw,
              route.freshness,
            )
          : [];
    }

    if (
      evidence.length === 0
    ) {
      return {
        success: false,
        query: route.query,
        verified: false,
        provider: "brave",
        evidence: [],
        sourceCount: 0,
        sourceHosts: [],
        error:
          result.response.ok
            ? "No usable web evidence was returned after retry."
            : `Brave Web Intelligence failed with HTTP ${result.response.status}.`,
        route,
      };
    }

    const sourceHosts =
      Array.from(
        new Set(
          evidence
            .map(
              (item) =>
                normalizeHostname(
                  item.hostname,
                ),
            )
            .filter(Boolean),
        ),
      );

    const sourceDomains =
      Array.from(
        new Set(
          evidence
            .map(
              (item) =>
                normalizeSourceDomain(
                  item.hostname,
                ),
            )
            .filter(Boolean),
        ),
      );

    const verified =
      evidence.length >= 2 &&
      sourceDomains.length >= 2;

    return {
      success: true,
      query: route.query,
      verified,
      provider: "brave",
      evidence,
      sourceCount:
        evidence.length,
      sourceHosts,
      route,
      error:
        verified
          ? undefined
          : "Web evidence was returned, but it did not contain enough independent source domains for verification.",
    };
  } catch (error) {
    return {
      success: false,
      query: route.query,
      verified: false,
      provider: "brave",
      evidence: [],
      sourceCount: 0,
      sourceHosts: [],
      route,
      error:
        error instanceof Error
          ? error.message
          : "Web Intelligence request failed.",
    };
  }
}
