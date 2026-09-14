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
  retrievalMode?: "llm-context" | "web-search";
}

interface BraveGenericResult {
  url?: unknown;
  title?: unknown;
  snippets?: unknown;
}

interface BraveWebResult {
  url?: unknown;
  title?: unknown;
  description?: unknown;
  extra_snippets?: unknown;
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
  sources?: Record<string, BraveSourceMetadata>;
  web?: {
    results?: BraveWebResult[];
  };
}

interface BraveErrorResponse {
  error?: {
    id?: unknown;
    status?: unknown;
    detail?: unknown;
    code?: unknown;
  };
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
      "查询",
      "查一下",
      "帮我查",
      "帮我查询",
      "搜索",
      "搜一下",
      "搜索一下",
      "帮我搜索",
      "帮我搜",
      "查找",
      "找一下",
      "帮我找",
      "联网查询",
      "网上查",
      "在线查询",
      "互联网",
      "网上信息",
      "网络信息",
      "资料",
      "资料查询",
      "信息查询",
      "官网",
      "官方网站",
      "网站",
      "网页",
      "链接",
      "来源",
      "source",
      "sources",
      "search",
      "search for",
      "look up",
      "find",
      "find out",
      "check online",
      "online",
      "web",
      "website",
      "official website",
      "information",
      "research",
    ],
  },
];

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim();
}

function findMatchedSignals(normalized: string): string[] {
  const lower = normalized.toLowerCase();
  const matches: string[] = [];

  for (const group of LIVE_SIGNAL_GROUPS) {
    for (const signal of group.signals) {
      if (lower.includes(signal.toLowerCase())) {
        matches.push(signal);
      }
    }
  }

  return Array.from(new Set(matches));
}

function resolveCategory(
  normalized: string,
): LiveIntelligenceCategory {
  const lower = normalized.toLowerCase();

  const priority: LiveIntelligenceCategory[] = [
    "finance",
    "weather",
    "news",
    "policy",
    "market",
    "product",
    "technology",
  ];

  for (const category of priority) {
    const group = LIVE_SIGNAL_GROUPS.find(
      (item) => item.category === category,
    );

    if (!group) {
      continue;
    }

    if (
      group.signals.some((signal) =>
        lower.includes(signal.toLowerCase()),
      )
    ) {
      return category;
    }
  }

  return "general";
}

function resolveFreshness(prompt: string): WebFreshness {
  const normalized = normalizePrompt(prompt).toLowerCase();

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
    ].some((value) => normalized.includes(value))
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
    ].some((value) => normalized.includes(value))
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
    ].some((value) => normalized.includes(value))
  ) {
    return "30d";
  }

  return "general";
}

function buildFinanceQuery(prompt: string): string {
  const normalized = normalizePrompt(prompt);
  const lower = normalized.toLowerCase();

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

  return normalized.slice(0, 400);
}

function buildSearchQuery(
  prompt: string,
  category: LiveIntelligenceCategory,
): string {
  if (category === "finance") {
    return buildFinanceQuery(prompt);
  }

  const normalized = normalizePrompt(prompt);

  if (category === "weather") {
    return [
      normalized,
      "current weather",
    ]
      .join(" ")
      .slice(0, 400);
  }

  return normalized.slice(0, 400);
}

export function routeLiveIntelligence(
  prompt: string,
): LiveIntelligenceRoute {
  const normalized = normalizePrompt(prompt);
  const lower = normalized.toLowerCase();

  const matchedSignals =
    findMatchedSignals(normalized);

  const category =
    resolveCategory(normalized);

  const explicitSearch = [
    "查询",
    "查一下",
    "帮我查",
    "搜索",
    "搜一下",
    "搜索一下",
    "帮我搜索",
    "帮我搜",
    "查找",
    "找一下",
    "帮我找",
    "联网",
    "网上查",
    "在线查询",
    "search",
    "search for",
    "look up",
    "find",
    "find out",
    "check online",
    "online",
    "web search",
    "research",
  ].some((signal) =>
    lower.includes(signal.toLowerCase()),
  );

  const required =
    matchedSignals.length > 0 ||
    explicitSearch;

  const freshness = required
    ? resolveFreshness(normalized)
    : "general";

  const query = required
    ? buildSearchQuery(
        normalized,
        category,
      )
    : normalized.slice(0, 400);

  const reason = required
    ? explicitSearch
      ? "The user explicitly requested external web information."
      : `Live information detected: ${matchedSignals.join(", ")}.`
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
  return routeLiveIntelligence(prompt).required;
}

/*
 * Brave accepts a 2+ character language code.
 *
 * We deliberately use the language preference only as a
 * hint. If the API rejects the language value, retrieval
 * automatically retries without search_lang rather than
 * treating the whole Internet layer as unavailable.
 */
function resolveSearchLanguage(
  prompt: string,
): string {
  if (/[\u3040-\u30ff]/u.test(prompt)) {
    return "ja";
  }

  if (/[\u4e00-\u9fff]/u.test(prompt)) {
    return "zh-hans";
  }

  return "en";
}

function normalizeHostname(
  hostname: string,
): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function normalizeSourceDomain(
  hostname: string,
): string {
  const normalized =
    normalizeHostname(hostname);

  const parts =
    normalized
      .split(".")
      .filter(Boolean);

  if (parts.length <= 2) {
    return normalized;
  }

  const compound = new Set([
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
    parts.slice(-2).join(".");

  if (
    compound.has(suffix) &&
    parts.length >= 3
  ) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
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
    hostname.endsWith(".gov") ||
    hostname.endsWith(".go.jp") ||
    hostname.endsWith(".gov.hk") ||
    hostname.endsWith(".gov.cn")
  ) {
    score += 0.12;
  }

  if (hostname.includes("official")) {
    score += 0.05;
  }

  return Math.min(0.98, score);
}

function sanitizeSnippet(
  value: string,
): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2400);
}

function extractContextEvidence(
  raw: BraveResponse,
  freshness: WebFreshness,
): WebEvidence[] {
  const generic =
    Array.isArray(raw.grounding?.generic)
      ? raw.grounding.generic
      : [];

  const retrievedAt = Date.now();

  return generic
    .map((item, index) => {
      const url =
        typeof item.url === "string"
          ? item.url
          : "";

      if (!url) {
        return null;
      }

      let hostname = "";

      try {
        hostname =
          new URL(url).hostname;
      } catch {
        return null;
      }

      const snippets =
        Array.isArray(item.snippets)
          ? item.snippets
              .filter(
                (
                  value,
                ): value is string =>
                  typeof value === "string",
              )
              .map(sanitizeSnippet)
              .filter(Boolean)
          : [];

      if (snippets.length === 0) {
        return null;
      }

      return {
        id:
          `web-${retrievedAt}-${index}`,
        url,
        title:
          typeof item.title === "string"
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
    })
    .filter(
      (
        item,
      ): item is WebEvidence =>
        item !== null,
    )
    .slice(0, 12);
}

function extractWebSearchEvidence(
  raw: BraveResponse,
  freshness: WebFreshness,
): WebEvidence[] {
  const results =
    Array.isArray(raw.web?.results)
      ? raw.web.results
      : [];

  const retrievedAt = Date.now();

  return results
    .map((item, index) => {
      const url =
        typeof item.url === "string"
          ? item.url
          : "";

      if (!url) {
        return null;
      }

      let hostname = "";

      try {
        hostname =
          new URL(url).hostname;
      } catch {
        return null;
      }

      const snippets: string[] = [];

      if (
        typeof item.description ===
        "string"
      ) {
        snippets.push(
          sanitizeSnippet(
            item.description,
          ),
        );
      }

      if (
        Array.isArray(
          item.extra_snippets,
        )
      ) {
        for (
          const value of
            item.extra_snippets
        ) {
          if (
            typeof value === "string"
          ) {
            const clean =
              sanitizeSnippet(value);

            if (clean) {
              snippets.push(clean);
            }
          }
        }
      }

      const uniqueSnippets =
        Array.from(
          new Set(
            snippets.filter(Boolean),
          ),
        );

      if (
        uniqueSnippets.length === 0
      ) {
        return null;
      }

      return {
        id:
          `web-search-${retrievedAt}-${index}`,
        url,
        title:
          typeof item.title === "string"
            ? item.title
            : hostname,
        hostname,
        snippets:
          uniqueSnippets,
        freshness,
        retrievedAt,
        confidence:
          calculateConfidence(
            hostname,
            results.length,
          ),
      };
    })
    .filter(
      (
        item,
      ): item is WebEvidence =>
        item !== null,
    )
    .slice(0, 12);
}

async function callBrave(
  endpointPath: string,
  query: string,
  searchLang?: string,
  freshness?: string,
): Promise<{
  response: Response;
  raw: BraveResponse;
  errorDetail?: string;
}> {
  const endpoint =
    `https://api.search.brave.com/res/v1/${endpointPath}`;

  const apiKey =
    process.env.BRAVE_SEARCH_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "BRAVE_SEARCH_API_KEY is not configured.",
    );
  }

  const body: Record<string, unknown> = {
    q: query,
    count: 10,
  };

  if (searchLang) {
    body.search_lang = searchLang;
  }

  if (freshness) {
    body.freshness = freshness;
  }

  if (endpointPath === "llm/context") {
    body.maximum_number_of_tokens = 8192;
    body.maximum_number_of_urls = 12;
    body.maximum_number_of_snippets = 40;
    body.enable_source_metadata = true;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      30000,
    );

  try {
    const response =
      await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            Accept:
              "application/json",
            "Content-Type":
              "application/json",
            "Accept-Encoding":
              "gzip",
            "X-Subscription-Token":
              apiKey,
          },
          body:
            JSON.stringify(body),
          cache: "no-store",
          signal:
            controller.signal,
        },
      );

    const json =
      await response.json();

    if (!response.ok) {
      const errorBody =
        json as BraveErrorResponse;

      const detail =
        typeof errorBody.error?.detail ===
        "string"
          ? errorBody.error.detail
          : typeof errorBody.error?.code ===
              "string"
            ? errorBody.error.code
            : undefined;

      return {
        response,
        raw: {},
        errorDetail: detail,
      };
    }

    return {
      response,
      raw:
        json as BraveResponse,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function freshnessToBraveValue(
  freshness: WebFreshness,
): string | undefined {
  if (freshness === "24h") {
    return "pd";
  }

  if (freshness === "7d") {
    return "pw";
  }

  if (freshness === "30d") {
    return "pm";
  }

  return undefined;
}

function formatBraveError(
  label: string,
  response: Response,
  detail?: string,
): string {
  return [
    `${label} failed with HTTP ${response.status}.`,
    detail,
  ]
    .filter(Boolean)
    .join(" ");
}

async function retrieveWithContext(
  route: LiveIntelligenceRoute,
  searchLang: string,
): Promise<{
  evidence: WebEvidence[];
  error?: string;
}> {
  const freshness =
    route.category === "finance"
      ? undefined
      : freshnessToBraveValue(
          route.freshness,
        );

  let first =
    await callBrave(
      "llm/context",
      route.query,
      searchLang,
      freshness,
    );

  let evidence =
    first.response.ok
      ? extractContextEvidence(
          first.raw,
          route.freshness,
        )
      : [];

  /*
   * If Brave rejects the language parameter,
   * retry once without search_lang.
   */
  if (
    !first.response.ok &&
    first.response.status === 422 &&
    searchLang
  ) {
    first =
      await callBrave(
        "llm/context",
        route.query,
        undefined,
        freshness,
      );

    evidence =
      first.response.ok
        ? extractContextEvidence(
            first.raw,
            route.freshness,
          )
        : [];
  }

  if (evidence.length === 0) {
    const retry =
      await callBrave(
        "llm/context",
        route.query,
        undefined,
      );

    evidence =
      retry.response.ok
        ? extractContextEvidence(
            retry.raw,
            route.freshness,
          )
        : [];

    if (evidence.length === 0) {
      return {
        evidence: [],
        error:
          retry.response.ok
            ? "LLM Context returned no usable evidence."
            : formatBraveError(
                "LLM Context",
                retry.response,
                retry.errorDetail,
              ),
      };
    }
  }

  return { evidence };
}

async function retrieveWithWebSearch(
  route: LiveIntelligenceRoute,
  searchLang: string,
): Promise<{
  evidence: WebEvidence[];
  error?: string;
}> {
  const freshness =
    freshnessToBraveValue(
      route.freshness,
    );

  let first =
    await callBrave(
      "web/search",
      route.query,
      searchLang,
      freshness,
    );

  let evidence =
    first.response.ok
      ? extractWebSearchEvidence(
          first.raw,
          route.freshness,
        )
      : [];

  if (
    !first.response.ok &&
    first.response.status === 422 &&
    searchLang
  ) {
    first =
      await callBrave(
        "web/search",
        route.query,
        undefined,
        freshness,
      );

    evidence =
      first.response.ok
        ? extractWebSearchEvidence(
            first.raw,
            route.freshness,
          )
        : [];
  }

  if (evidence.length === 0) {
    const retry =
      await callBrave(
        "web/search",
        route.query,
        undefined,
      );

    evidence =
      retry.response.ok
        ? extractWebSearchEvidence(
            retry.raw,
            route.freshness,
          )
        : [];

    if (evidence.length === 0) {
      return {
        evidence: [],
        error:
          retry.response.ok
            ? "Standard Web Search returned no usable evidence."
            : formatBraveError(
                "Standard Web Search",
                retry.response,
                retry.errorDetail,
              ),
      };
    }
  }

  return { evidence };
}

export async function retrieveWebEvidence(
  prompt: string,
): Promise<WebIntelligenceResult> {
  const route =
    routeLiveIntelligence(prompt);

  const searchLang =
    resolveSearchLanguage(prompt);

  if (!route.required) {
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
        "Web intelligence was not required for this request.",
    };
  }

  try {
    const contextResult =
      await retrieveWithContext(
        route,
        searchLang,
      );

    let evidence =
      contextResult.evidence;

    let retrievalMode:
      | "llm-context"
      | "web-search" =
      evidence.length > 0
        ? "llm-context"
        : "web-search";

    let webSearchError:
      | string
      | undefined;

    if (evidence.length === 0) {
      const webSearchResult =
        await retrieveWithWebSearch(
          route,
          searchLang,
        );

      evidence =
        webSearchResult.evidence;

      webSearchError =
        webSearchResult.error;

      if (evidence.length > 0) {
        retrievalMode =
          "web-search";
      }
    }

    if (evidence.length === 0) {
      return {
        success: false,
        query: route.query,
        verified: false,
        provider: "brave",
        evidence: [],
        sourceCount: 0,
        sourceHosts: [],
        route,
        error: [
          contextResult.error,
          webSearchError,
        ]
          .filter(Boolean)
          .join(" | "),
      };
    }

    const sourceHosts =
      Array.from(
        new Set(
          evidence
            .map((item) =>
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
            .map((item) =>
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
      retrievalMode,
      error:
        verified
          ? undefined
          : "Web evidence was returned, but independent source verification is limited.",
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
