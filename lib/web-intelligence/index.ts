import "server-only";

export type WebFreshness =
  | "realtime"
  | "24h"
  | "7d"
  | "30d"
  | "general";

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
}

interface BraveGenericResult {
  url?: unknown;
  title?: unknown;
  snippets?: unknown;
}

interface BraveResponse {
  grounding?: {
    generic?: BraveGenericResult[];
  };
  sources?: Record<
    string,
    {
      title?: unknown;
      hostname?: unknown;
      age?: unknown;
    }
  >;
}

const LIVE_KEYWORDS = [
  "现在",
  "目前",
  "最新",
  "实时",
  "今天",
  "今日",
  "本周",
  "近期",
  "最近",
  "当前",
  "行情",
  "价格",
  "报价",
  "趋势",
  "新闻",
  "政策",
  "法规",
  "补贴",
  "市场",
  "竞争对手",
  "销量",
  "排名",
  "增长",
  "股票",
  "汇率",
  "weather",
  "today",
  "latest",
  "current",
  "currently",
  "recent",
  "recently",
  "real-time",
  "realtime",
  "news",
  "price",
  "pricing",
  "market",
  "trend",
  "competitor",
  "policy",
  "regulation",
  "exchange rate",
  "stock",
];

function normalizePrompt(
  prompt: string,
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim();
}

export function requiresWebIntelligence(
  prompt: string,
): boolean {
  const normalized =
    normalizePrompt(prompt).toLowerCase();

  return LIVE_KEYWORDS.some(
    (keyword) =>
      normalized.includes(
        keyword.toLowerCase(),
      ),
  );
}

function resolveFreshness(
  prompt: string,
): WebFreshness {
  const normalized =
    prompt.toLowerCase();

  if (
    [
      "实时",
      "现在",
      "今天",
      "今日",
      "current",
      "today",
      "real-time",
      "realtime",
    ].some((value) =>
      normalized.includes(value),
    )
  ) {
    return "24h";
  }

  if (
    [
      "最新",
      "新闻",
      "本周",
      "latest",
      "news",
      "this week",
    ].some((value) =>
      normalized.includes(value),
    )
  ) {
    return "7d";
  }

  if (
    [
      "近期",
      "最近",
      "recent",
      "recently",
    ].some((value) =>
      normalized.includes(value),
    )
  ) {
    return "30d";
  }

  return "general";
}

function resolveSearchLanguage(
  prompt: string,
): string {
  if (/[\u3040-\u30ff]/u.test(prompt)) {
    return "ja";
  }

  if (/[\u4e00-\u9fff]/u.test(prompt)) {
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
    .replace(/^www\./, "");
}

/*
 * C143.5
 *
 * Hostname diversity is useful for diagnostics,
 * but verification should use independent domains.
 *
 * This intentionally keeps the implementation
 * dependency-free and conservative.
 */
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

  if (parts.length <= 2) {
    return normalized;
  }

  const compoundPublicSuffixes = new Set([
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
    compoundPublicSuffixes.has(
      suffix,
    ) &&
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
    hostname.endsWith(".gov") ||
    hostname.endsWith(".go.jp") ||
    hostname.endsWith(".gov.hk") ||
    hostname.endsWith(".gov.cn")
  ) {
    score += 0.12;
  }

  if (
    hostname.includes("github.com") ||
    hostname.includes("docs.") ||
    hostname.includes("official")
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
    .replace(/\u0000/g, "")
    .slice(0, 2400);
}

export async function retrieveWebEvidence(
  prompt: string,
): Promise<WebIntelligenceResult> {
  const query =
    normalizePrompt(prompt);

  const apiKey =
    process.env.BRAVE_SEARCH_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      query,
      verified: false,
      provider: "brave",
      evidence: [],
      sourceCount: 0,
      sourceHosts: [],
      error:
        "BRAVE_SEARCH_API_KEY is not configured.",
    };
  }

  const freshness =
    resolveFreshness(query);

  const searchLang =
    resolveSearchLanguage(query);

  const endpoint =
    new URL(
      "https://api.search.brave.com/res/v1/llm/context",
    );

  endpoint.searchParams.set(
    "q",
    query.slice(0, 400),
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

  if (
    freshness !== "general"
  ) {
    endpoint.searchParams.set(
      "freshness",
      freshness === "24h"
        ? "pd"
        : freshness === "7d"
          ? "pw"
          : "pm",
    );
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
          cache: "no-store",
          signal:
            controller.signal,
        },
      );

    const raw =
      (await response.json()) as BraveResponse;

    if (!response.ok) {
      return {
        success: false,
        query,
        verified: false,
        provider: "brave",
        evidence: [],
        sourceCount: 0,
        sourceHosts: [],
        error:
          `Brave Web Intelligence failed with HTTP ${response.status}.`,
      };
    }

    const generic =
      Array.isArray(
        raw.grounding?.generic,
      )
        ? raw.grounding.generic
        : [];

    const evidence =
      generic
        .map((item, index) => {
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
              new URL(url)
                .hostname;
          } catch {
            hostname = "";
          }

          if (!hostname) {
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
              `web-${Date.now()}-${index}`,
            url,
            title:
              typeof item.title ===
              "string"
                ? item.title
                : hostname ||
                  "Web source",
            hostname,
            snippets,
            freshness,
            retrievedAt:
              Date.now(),
            confidence:
              calculateConfidence(
                hostname,
                generic.length,
              ),
          };
        })
        .filter(
          (
            value,
          ): value is WebEvidence =>
            value !== null,
        )
        .slice(0, 8);

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

    /*
     * C143.5 Verification Gate
     *
     * Minimum requirement:
     *
     * 1. At least two usable evidence items.
     * 2. At least two independent source domains.
     *
     * Different subdomains of the same organization
     * do not count as independent corroboration.
     */
    const verified =
      evidence.length >= 2 &&
      sourceDomains.length >= 2;

    return {
      success:
        evidence.length > 0,

      query,

      verified,

      provider:
        "brave",

      evidence,

      sourceCount:
        evidence.length,

      sourceHosts,

      error:
        evidence.length === 0
          ? "No usable web evidence was returned."
          : verified
            ? undefined
            : "Web evidence was returned, but it did not contain enough independent source domains for verification.",
    };
  } catch (error) {
    return {
      success: false,
      query,
      verified: false,
      provider: "brave",
      evidence: [],
      sourceCount: 0,
      sourceHosts: [],
      error:
        error instanceof Error
          ? error.message
          : "Web Intelligence request failed.",
    };
  } finally {
    clearTimeout(
      timeout,
    );
  }
}
