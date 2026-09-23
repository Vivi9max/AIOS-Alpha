"use client";

import {
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

type MarketResult = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  error?: string;

  instrument?: {
    symbol?: string;
    normalizedSymbol?: string;
    market?: string;
    exchange?: string;
    currency?: string;
  };

  snapshot?: {
    price?: number | null;
    previousClose?: number | null;
    changePercent?: number | null;
    marketCap?: number | null;
    pe?: number | null;
    pb?: number | null;
    eps?: number | null;
    revenue?: number | null;
    revenueGrowth?: number | null;
    dataQuality?: string;
    liveQuoteAvailable?: boolean;
    asOf?: string | null;
    source?: string | null;
    dataset?: string | null;
  };

  analysis?: {
    industry?: {
      summary?: string;
      evidence?: string[];
    };

    company?: {
      summary?: string;
      strengths?: string[];
      risks?: string[];
    };

    fundamentals?: {
      assessment?: string;
      signals?: string[];
    };

    valuation?: {
      assessment?: string;
      signals?: string[];
    };

    risk?: {
      level?: string;
      factors?: string[];
    };

    decisionSupport?: {
      currentState?: string;
      supportingFactors?: string[];
      invalidationConditions?: string[];
      watchMetrics?: string[];
    };
  };

  evidence?: Array<{
    title?: string;
    url?: string;
    hostname?: string;
    snippet?: string;
    confidence?: number;
  }>;

  verification?: {
    verified?: boolean;
    sourceCount?: number;
    independentDomains?: number;
    primarySourceFound?: boolean;
    structuredDataAvailable?: boolean;
    structuredDataVerified?: boolean;
  };

  metadata?: {
    runtime?: string;
    stage?: string;
    analysisMode?: string;
    generatedAt?: string;
    disclaimer?: string;
  };

  latencyMs?: number;
};

type Locale =
  | "en"
  | "zh-CN"
  | "ja";

const copy: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    research: string;
    symbolPlaceholder: string;
    usMarket: string;
    hkMarket: string;
    cnMarket: string;
    analyze: string;
    researching: string;
    requestError: string;
    requestFailed: string;
    researchStatus: string;
    runtimePass: string;
    runtimeFailed: string;
    verified: string;
    notVerified: string;
    structuredVerified: string;
    webEvidence: string;
    sources: string;
    independentDomains: string;
    primarySource: string;
    yes: string;
    no: string;
    marketSnapshot: string;
    symbol: string;
    market: string;
    price: string;
    pe: string;
    dataQuality: string;
    liveQuote: string;
    source: string;
    asOf: string;
    industry: string;
    company: string;
    fundamentals: string;
    valuation: string;
    risk: string;
    riskLevel: string;
    decisionSupport: string;
    supportingEvidence: string;
    invalidation: string;
    watchMetrics: string;
    strengths: string;
    risks: string;
    evidence: string;
    noStructured: string;
    disclaimer: string;
  }
> = {
  en: {
    eyebrow:
      "AIOS MARKET INTELLIGENCE",
    title:
      "Market Intelligence",
    subtitle:
      "Research · Evidence · Risk",
    research:
      "Research",
    symbolPlaceholder:
      "AAPL / 0700.HK / 600519.SH",
    usMarket:
      "US Market",
    hkMarket:
      "Hong Kong Market",
    cnMarket:
      "China A-share",
    analyze:
      "Analyze Market Intelligence",
    researching:
      "Researching…",
    requestError:
      "Request Error",
    requestFailed:
      "Market Intelligence request failed.",
    researchStatus:
      "Research Status",
    runtimePass:
      "Runtime PASS",
    runtimeFailed:
      "Runtime FAILED",
    verified:
      "Verified",
    notVerified:
      "Not verified",
    structuredVerified:
      "Structured data verified",
    webEvidence:
      "Web evidence / non-structured",
    sources:
      "Sources",
    independentDomains:
      "Independent domains",
    primarySource:
      "Primary source",
    yes:
      "YES",
    no:
      "NO",
    marketSnapshot:
      "Market Snapshot",
    symbol:
      "Symbol",
    market:
      "Market",
    price:
      "Price",
    pe:
      "P/E",
    dataQuality:
      "Data quality",
    liveQuote:
      "Live quote",
    source:
      "Source",
    asOf:
      "As of",
    industry:
      "Industry",
    company:
      "Company",
    fundamentals:
      "Fundamentals",
    valuation:
      "Valuation",
    risk:
      "Risk",
    riskLevel:
      "Risk level",
    decisionSupport:
      "Decision Support",
    supportingEvidence:
      "Supporting evidence",
    invalidation:
      "What could invalidate it",
    watchMetrics:
      "Watch metrics",
    strengths:
      "Strengths",
    risks:
      "Risks",
    evidence:
      "Evidence",
    noStructured:
      "No structured information.",
    disclaimer:
      "AIOS provides market research, evidence and risk-review support. It does not provide personalized investment advice, rank securities, or execute trades automatically.",
  },

  "zh-CN": {
    eyebrow:
      "AIOS 市场情报",
    title:
      "市场情报",
    subtitle:
      "研究 · 证据 · 风险",
    research:
      "研究",
    symbolPlaceholder:
      "AAPL / 0700.HK / 600519.SH",
    usMarket:
      "美国市场",
    hkMarket:
      "香港市场",
    cnMarket:
      "中国 A 股",
    analyze:
      "分析市场情报",
    researching:
      "研究中…",
    requestError:
      "请求错误",
    requestFailed:
      "市场情报请求失败。",
    researchStatus:
      "研究状态",
    runtimePass:
      "Runtime 正常",
    runtimeFailed:
      "Runtime 失败",
    verified:
      "已验证",
    notVerified:
      "未验证",
    structuredVerified:
      "结构化数据已验证",
    webEvidence:
      "Web 证据 / 非结构化",
    sources:
      "来源数量",
    independentDomains:
      "独立域名",
    primarySource:
      "主要来源",
    yes:
      "是",
    no:
      "否",
    marketSnapshot:
      "市场快照",
    symbol:
      "代码",
    market:
      "市场",
    price:
      "价格",
    pe:
      "市盈率",
    dataQuality:
      "数据质量",
    liveQuote:
      "实时行情",
    source:
      "来源",
    asOf:
      "数据时间",
    industry:
      "行业",
    company:
      "公司",
    fundamentals:
      "基本面",
    valuation:
      "估值",
    risk:
      "风险",
    riskLevel:
      "风险等级",
    decisionSupport:
      "决策支持",
    supportingEvidence:
      "支持性证据",
    invalidation:
      "可能使当前判断失效的因素",
    watchMetrics:
      "持续观察指标",
    strengths:
      "优势",
    risks:
      "风险因素",
    evidence:
      "证据",
    noStructured:
      "暂无结构化信息。",
    disclaimer:
      "AIOS 提供市场研究、证据与风险审查支持，不提供个性化投资建议、不对证券进行排名，也不会自动执行交易。",
  },

  ja: {
    eyebrow:
      "AIOS 市場インテリジェンス",
    title:
      "市場インテリジェンス",
    subtitle:
      "リサーチ · エビデンス · リスク",
    research:
      "リサーチ",
    symbolPlaceholder:
      "AAPL / 0700.HK / 600519.SH",
    usMarket:
      "米国市場",
    hkMarket:
      "香港市場",
    cnMarket:
      "中国A株",
    analyze:
      "市場インテリジェンスを分析",
    researching:
      "分析中…",
    requestError:
      "リクエストエラー",
    requestFailed:
      "市場インテリジェンスのリクエストに失敗しました。",
    researchStatus:
      "リサーチステータス",
    runtimePass:
      "Runtime 正常",
    runtimeFailed:
      "Runtime 失敗",
    verified:
      "検証済み",
    notVerified:
      "未検証",
    structuredVerified:
      "構造化データ検証済み",
    webEvidence:
      "Web エビデンス / 非構造化",
    sources:
      "ソース数",
    independentDomains:
      "独立ドメイン",
    primarySource:
      "主要ソース",
    yes:
      "はい",
    no:
      "いいえ",
    marketSnapshot:
      "マーケットスナップショット",
    symbol:
      "銘柄コード",
    market:
      "市場",
    price:
      "価格",
    pe:
      "P/E",
    dataQuality:
      "データ品質",
    liveQuote:
      "リアルタイム価格",
    source:
      "ソース",
    asOf:
      "取得時点",
    industry:
      "業界",
    company:
      "企業",
    fundamentals:
      "ファンダメンタルズ",
    valuation:
      "バリュエーション",
    risk:
      "リスク",
    riskLevel:
      "リスクレベル",
    decisionSupport:
      "意思決定サポート",
    supportingEvidence:
      "支持するエビデンス",
    invalidation:
      "判断を無効化する可能性のある要因",
    watchMetrics:
      "継続監視指標",
    strengths:
      "強み",
    risks:
      "リスク要因",
    evidence:
      "エビデンス",
    noStructured:
      "構造化情報はありません。",
    disclaimer:
      "AIOS は市場リサーチ、エビデンス、リスクレビューを支援します。個別の投資助言、銘柄ランキング、自動売買は提供しません。",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 14,
        padding: 18,
        border:
          "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <h2
        style={{
          margin:
            "0 0 12px",
          fontSize: 16,
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}

function List({
  items,
  emptyText,
}: {
  items?: string[];
  emptyText: string;
}) {
  if (!items?.length) {
    return (
      <div
        style={{
          opacity: 0.5,
          fontSize: 13,
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: 19,
        lineHeight: 1.65,
        fontSize: 13,
      }}
    >
      {items.map(
        (
          item,
          index,
        ) => (
          <li
            key={`${item}-${index}`}
          >
            {item}
          </li>
        ),
      )}
    </ul>
  );
}

function Badge({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display:
          "inline-block",
        padding:
          "4px 8px",
        borderRadius:
          999,
        fontSize: 11,
        background:
          ok
            ? "rgba(74,222,128,0.12)"
            : "rgba(251,191,36,0.12)",
        color:
          ok
            ? "#86efac"
            : "#fcd34d",
      }}
    >
      {children}
    </span>
  );
}

async function analyzeMarket(
  symbol: string,
  market: string,
): Promise<MarketResult> {
  const response =
    await fetch(
      "/api/market/intelligence",
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            symbol,
            market,
          }),
        cache:
          "no-store",
      },
    );

  const data =
    (await response.json()) as
      MarketResult;

  if (!response.ok) {
    throw new Error(
      data.message ??
        data.error ??
        "Market Intelligence request failed.",
    );
  }

  return data;
}

export default function MarketIntelligencePage() {
  const {
    locale,
  } = useLanguage();

  const ui =
    copy[locale];

  const [
    symbol,
    setSymbol,
  ] = useState("AAPL");

  const [
    market,
    setMarket,
  ] = useState("us");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<
    MarketResult | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data =
        await analyzeMarket(
          symbol.trim(),
          market,
        );

      setResult(data);
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : ui.requestFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  const snapshot =
    result?.snapshot;

  const analysis =
    result?.analysis;

  const verification =
    result?.verification;

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#09090b",
        color:
          "#f4f4f5",
        padding:
          "28px 16px 60px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            marginBottom:
              20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing:
                "0.12em",
              opacity: 0.5,
              marginBottom:
                7,
            }}
          >
            {ui.eyebrow}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
            }}
          >
            {ui.title}
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              opacity: 0.62,
              lineHeight: 1.55,
              fontSize: 14,
            }}
          >
            {ui.subtitle}
          </p>
        </div>

        <Section
          title={ui.research}
        >
          <div
            style={{
              display:
                "grid",
              gap: 10,
            }}
          >
            <input
              value={
                symbol
              }
              onChange={(
                event,
              ) =>
                setSymbol(
                  event.target.value.toUpperCase(),
                )
              }
              placeholder={
                ui.symbolPlaceholder
              }
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                padding:
                  "13px 14px",
                borderRadius:
                  10,
                border:
                  "1px solid rgba(255,255,255,0.14)",
                background:
                  "#18181b",
                color:
                  "#fff",
                outline:
                  "none",
                fontSize:
                  15,
              }}
            />

            <select
              value={
                market
              }
              onChange={(
                event,
              ) =>
                setMarket(
                  event.target.value,
                )
              }
              style={{
                width:
                  "100%",
                padding:
                  "13px 14px",
                borderRadius:
                  10,
                border:
                  "1px solid rgba(255,255,255,0.14)",
                background:
                  "#18181b",
                color:
                  "#fff",
                fontSize:
                  15,
              }}
            >
              <option value="us">
                {ui.usMarket}
              </option>

              <option value="hk">
                {ui.hkMarket}
              </option>

              <option value="cn">
                {ui.cnMarket}
              </option>
            </select>

            <button
              type="button"
              onClick={
                runAnalysis
              }
              disabled={
                loading ||
                !symbol.trim()
              }
              style={{
                padding:
                  "14px 16px",
                border:
                  "none",
                borderRadius:
                  10,
                background:
                  loading
                    ? "#3f3f46"
                    : "#fff",
                color:
                  loading
                    ? "#aaa"
                    : "#09090b",
                fontWeight:
                  800,
                fontSize:
                  14,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              {loading
                ? ui.researching
                : ui.analyze}
            </button>
          </div>
        </Section>

        {error && (
          <Section
            title={
              ui.requestError
            }
          >
            <div
              style={{
                color:
                  "#fca5a5",
                fontSize:
                  13,
                lineHeight:
                  1.6,
              }}
            >
              {error}
            </div>
          </Section>
        )}

        {result && (
          <>
            <Section
              title={
                ui.researchStatus
              }
            >
              <div
                style={{
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  gap: 8,
                }}
              >
                <Badge
                  ok={Boolean(
                    result.success,
                  )}
                >
                  {result.success
                    ? ui.runtimePass
                    : ui.runtimeFailed}
                </Badge>

                <Badge
                  ok={Boolean(
                    result.verified,
                  )}
                >
                  {result.verified
                    ? ui.verified
                    : ui.notVerified}
                </Badge>

                <Badge
                  ok={Boolean(
                    verification?.structuredDataVerified,
                  )}
                >
                  {verification?.structuredDataVerified
                    ? ui.structuredVerified
                    : ui.webEvidence}
                </Badge>
              </div>

              <div
                style={{
                  marginTop:
                    12,
                  fontSize:
                    13,
                  lineHeight:
                    1.7,
                  opacity:
                    0.72,
                }}
              >
                {ui.sources}:{" "}
                {verification?.sourceCount ??
                  0}

                <br />

                {ui.independentDomains}:{" "}
                {verification?.independentDomains ??
                  0}

                <br />

                {ui.primarySource}:{" "}
                {verification?.primarySourceFound
                  ? ui.yes
                  : ui.no}
              </div>
            </Section>

            {snapshot && (
              <Section
                title={
                  ui.marketSnapshot
                }
              >
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        opacity:
                          0.5,
                        fontSize:
                          11,
                      }}
                    >
                      {ui.symbol}
                    </div>

                    <strong>
                      {result.instrument
                        ?.normalizedSymbol ??
                        result.instrument
                          ?.symbol ??
                        symbol}
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        opacity:
                          0.5,
                        fontSize:
                          11,
                      }}
                    >
                      {ui.market}
                    </div>

                    <strong>
                      {result.instrument
                        ?.market ??
                        market}
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        opacity:
                          0.5,
                        fontSize:
                          11,
                      }}
                    >
                      {ui.price}
                    </div>

                    <strong>
                      {snapshot.price ??
                        "N/A"}
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        opacity:
                          0.5,
                        fontSize:
                          11,
                      }}
                    >
                      {ui.pe}
                    </div>

                    <strong>
                      {snapshot.pe ??
                        "N/A"}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop:
                      14,
                    fontSize:
                      12,
                    opacity:
                      0.58,
                    lineHeight:
                      1.6,
                  }}
                >
                  {ui.dataQuality}:{" "}
                  {snapshot.dataQuality ??
                    "N/A"}

                  <br />

                  {ui.liveQuote}:{" "}
                  {snapshot.liveQuoteAvailable
                    ? ui.yes
                    : ui.no}

                  <br />

                  {ui.source}:{" "}
                  {snapshot.source ??
                    "N/A"}

                  <br />

                  {ui.asOf}:{" "}
                  {snapshot.asOf ??
                    "N/A"}
                </div>
              </Section>
            )}

            {analysis?.industry && (
              <Section
                title={
                  ui.industry
                }
              >
                <p
                  style={{
                    lineHeight:
                      1.6,
                    fontSize:
                      13,
                  }}
                >
                  {
                    analysis
                      .industry
                      .summary
                  }
                </p>

                <List
                  items={
                    analysis
                      .industry
                      .evidence
                  }
                  emptyText={
                    ui.noStructured
                  }
                />
              </Section>
            )}

            {analysis?.company && (
              <Section
                title={
                  ui.company
                }
              >
                <p
                  style={{
                    lineHeight:
                      1.6,
                    fontSize:
                      13,
                  }}
                >
                  {
                    analysis
                      .company
                      .summary
                  }
                </p>

                <h3
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  {ui.strengths}
                </h3>

                <List
                  items={
                    analysis
                      .company
                      .strengths
                  }
                  emptyText={
                    ui.noStructured
                  }
                />

                <h3
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  {ui.risks}
                </h3>

                <List
                  items={
                    analysis
                      .company
                      .risks
                  }
                  emptyText={
                    ui.noStructured
                  }
                />
              </Section>
            )}

            {analysis?.fundamentals && (
              <Section
                title={
                  ui.fundamentals
                }
              >
                <p
                  style={{
                    fontSize:
                      13,
                    lineHeight:
                      1.6,
                  }}
                >
                  {
                    analysis
                      .fundamentals
                      .assessment
                  }
                </p>

                <List
                  items={
                    analysis
                      .fundamentals
                      .signals
                  }
                  emptyText={
                    ui.noStructured
                  }
                />
              </Section>
            )}

            {analysis?.valuation && (
              <Section
                title={
                  ui.valuation
                }
              >
                <p
                  style={{
                    fontSize:
                      13,
                    lineHeight:
                      1.6,
                  }}
                >
                  {
                    analysis
                      .valuation
                      .assessment
                  }
                </p>

                <List
                  items={
                    analysis
                      .valuation
                      .signals
                  }
                  emptyText={
                    ui.noStructured
                  }
                />
              </Section>
            )}

            {analysis?.risk && (
              <Section
                title={
                  ui.risk
                }
              >
                <p
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  {ui.riskLevel}:{" "}
                  <strong>
                    {analysis
                      .risk
                      .level ??
                      "N/A"}
                  </strong>
                </p>

                <List
                  items={
                    analysis
                      .risk
                      .factors
                  }
                  emptyText={
                    ui.noStructured
                  }
                />
              </Section>
            )}

            {analysis?.decisionSupport && (
              <Section
                title={
                  ui.decisionSupport
                }
              >
                <p
                  style={{
                    fontSize:
                      13,
                    lineHeight:
                      1.6,
                  }}
                >
                  {
                    analysis
                      .decisionSupport
                      .currentState
                  }
                </p>

                <h3
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  {ui.supportingEvidence}
                </h3>

                <List
                  items={
                    analysis
                      .decisionSupport
                      .supportingFactors
                  }
                  emptyText={
                    ui.noStructured
                  }
                />

                <h3
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  {ui.invalidation}
                </h3>

                <List
                  items={
                    analysis
                      .decisionSupport
                      .invalidationConditions
                  }
                  emptyText={
                    ui.noStructured
                  }
                />

                <h3
                  style={{
                    fontSize:
                      13,
                  }}
                >
                  {ui.watchMetrics}
                </h3>

                <List
                  items={
                    analysis
                      .decisionSupport
                      .watchMetrics
                  }
                  emptyText={
                    ui.noStructured
                  }
                />
              </Section>
            )}

            {result.evidence?.length ? (
              <Section
                title={
                  ui.evidence
                }
              >
                {result.evidence.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={`${item.url}-${index}`}
                      style={{
                        padding:
                          "11px 0",
                        borderTop:
                          "1px solid rgba(255,255,255,0.07)",
                        fontSize:
                          12,
                        lineHeight:
                          1.55,
                      }}
                    >
                      <strong>
                        {item.title ??
                          "Source"}
                      </strong>

                      <div
                        style={{
                          opacity:
                            0.48,
                          marginTop:
                            3,
                        }}
                      >
                        {item.hostname ??
                          ""}
                      </div>

                      <div
                        style={{
                          opacity:
                            0.68,
                          marginTop:
                            4,
                        }}
                      >
                        {item.snippet ??
                          ""}
                      </div>
                    </div>
                  ),
                )}
              </Section>
            ) : null}

            <div
              style={{
                marginTop:
                  16,
                padding:
                  14,
                fontSize:
                  11,
                lineHeight:
                  1.6,
                opacity:
                  0.48,
              }}
            >
              {result.metadata
                ?.disclaimer ??
                ui.disclaimer}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
