"use client";

import {
  useState,
  type ReactNode,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

import type {
  MarketAnalysisResult,
  MarketRegion,
} from "@/lib/runtime/market/market-types";

type Locale =
  | "en"
  | "zh-CN"
  | "ja";

type PublicMarketResult =
  MarketAnalysisResult & {
    publicBoundary?: string;
    dataIsolated?: boolean;
    latencyMs?: number;
    timestamp?: number;
  };

type Tone =
  | "positive"
  | "warning"
  | "neutral"
  | "negative";

type Copy = {
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
  verified: string;
  notVerified: string;
  structuredVerified: string;
  webEvidence: string;
  sources: string;
  domains: string;
  primarySource: string;
  yes: string;
  no: string;
  marketSnapshot: string;
  price: string;
  change: string;
  marketCap: string;
  pe: string;
  pb: string;
  eps: string;
  revenue: string;
  dataQuality: string;
  liveQuote: string;
  source: string;
  asOf: string;
  researchConclusion: string;
  currentState: string;
  industry: string;
  company: string;
  fundamentals: string;
  valuation: string;
  trend: string;
  risk: string;
  scenarios: string;
  supportingEvidence: string;
  invalidation: string;
  watchMetrics: string;
  evidence: string;
  openOriginalEvidence: string;
  noStructured: string;
  noEvidence: string;
  dataNotice: string;
  disclaimer: string;
  terminal: string;
  searchHint: string;
  dataStatus: string;
  provider: string;
  coverage: string;
  researchBlocks: string;
  conclusion: string;
};

const copy: Record<Locale, Copy> = {
  en: {
    eyebrow: "AIOS MARKET RESEARCH",
    title: "Research Terminal",
    subtitle: "Research · Evidence · Risk",
    research: "Research",
    symbolPlaceholder: "AAPL / 0700.HK / 600519.SH",
    usMarket: "US",
    hkMarket: "Hong Kong",
    cnMarket: "China A-share",
    analyze: "Run research",
    researching: "Researching...",
    requestError: "Request error",
    requestFailed: "Market Research request failed.",
    verified: "Verified",
    notVerified: "Not verified",
    structuredVerified: "Structured verified",
    webEvidence: "Web evidence",
    sources: "Sources",
    domains: "Domains",
    primarySource: "Primary source",
    yes: "YES",
    no: "NO",
    marketSnapshot: "Market Snapshot",
    price: "Price",
    change: "Change",
    marketCap: "Market Cap",
    pe: "P/E",
    pb: "P/B",
    eps: "EPS",
    revenue: "Revenue",
    dataQuality: "Data quality",
    liveQuote: "Live quote",
    source: "Source",
    asOf: "As of",
    researchConclusion: "Research Conclusion",
    currentState: "Current state",
    industry: "Industry",
    company: "Company",
    fundamentals: "Fundamentals",
    valuation: "Valuation",
    trend: "Trend",
    risk: "Risk",
    scenarios: "Scenarios",
    supportingEvidence: "Supporting evidence",
    invalidation: "Invalidation conditions",
    watchMetrics: "Watch metrics",
    evidence: "Evidence",
    openOriginalEvidence: "View source",
    noStructured: "No structured information.",
    noEvidence: "No external evidence was returned.",
    dataNotice:
      "Current market values may be based on Web evidence rather than a verified exchange real-time feed.",
    disclaimer:
      "AIOS provides market research, evidence and risk-review support. It does not provide personalized investment advice, rank securities, or execute trades automatically.",
    terminal: "Research Terminal",
    searchHint: "Enter a symbol and select a market",
    dataStatus: "Data status",
    provider: "Provider",
    coverage: "Coverage",
    researchBlocks: "Research Blocks",
    conclusion: "Conclusion",
  },

  "zh-CN": {
    eyebrow: "AIOS 市场研究",
    title: "Research Terminal",
    subtitle: "研究 · 证据 · 风险",
    research: "研究入口",
    symbolPlaceholder: "AAPL / 0700.HK / 600519.SH",
    usMarket: "美股",
    hkMarket: "港股",
    cnMarket: "A 股",
    analyze: "开始研究",
    researching: "研究中...",
    requestError: "请求错误",
    requestFailed: "市场研究请求失败。",
    verified: "已验证",
    notVerified: "未验证",
    structuredVerified: "结构化数据已验证",
    webEvidence: "Web 证据",
    sources: "来源",
    domains: "独立域名",
    primarySource: "主要来源",
    yes: "是",
    no: "否",
    marketSnapshot: "市场快照",
    price: "价格",
    change: "涨跌",
    marketCap: "市值",
    pe: "P/E",
    pb: "P/B",
    eps: "EPS",
    revenue: "营收",
    dataQuality: "数据质量",
    liveQuote: "实时行情",
    source: "来源",
    asOf: "数据时间",
    researchConclusion: "研究结论",
    currentState: "当前状态",
    industry: "行业",
    company: "公司",
    fundamentals: "基本面",
    valuation: "估值",
    trend: "趋势",
    risk: "风险",
    scenarios: "情景",
    supportingEvidence: "支持性证据",
    invalidation: "判断失效条件",
    watchMetrics: "持续观察指标",
    evidence: "证据",
    openOriginalEvidence: "查看来源",
    noStructured: "暂无结构化信息。",
    noEvidence: "没有返回外部证据。",
    dataNotice:
      "当前市场数据可能来自 Web 证据，并不等同于经过验证的交易所实时行情。",
    disclaimer:
      "AIOS 提供市场研究、证据与风险审查支持，不提供个性化投资建议、不对证券进行排名，也不会自动执行交易。",
    terminal: "研究终端",
    searchHint: "输入股票代码并选择市场",
    dataStatus: "数据状态",
    provider: "数据提供方",
    coverage: "覆盖",
    researchBlocks: "研究模块",
    conclusion: "结论",
  },

  ja: {
    eyebrow: "AIOS 市場リサーチ",
    title: "Research Terminal",
    subtitle: "リサーチ · エビデンス · リスク",
    research: "リサーチ",
    symbolPlaceholder: "AAPL / 0700.HK / 600519.SH",
    usMarket: "米国",
    hkMarket: "香港",
    cnMarket: "中国 A 株",
    analyze: "リサーチ開始",
    researching: "分析中...",
    requestError: "リクエストエラー",
    requestFailed: "市場リサーチに失敗しました。",
    verified: "検証済み",
    notVerified: "未検証",
    structuredVerified: "構造化データ検証済み",
    webEvidence: "Web エビデンス",
    sources: "ソース",
    domains: "独立ドメイン",
    primarySource: "主要ソース",
    yes: "はい",
    no: "いいえ",
    marketSnapshot: "マーケットスナップショット",
    price: "価格",
    change: "変化率",
    marketCap: "時価総額",
    pe: "P/E",
    pb: "P/B",
    eps: "EPS",
    revenue: "売上高",
    dataQuality: "データ品質",
    liveQuote: "リアルタイム価格",
    source: "ソース",
    asOf: "取得時点",
    researchConclusion: "リサーチ結論",
    currentState: "現在の状態",
    industry: "業界",
    company: "企業",
    fundamentals: "ファンダメンタルズ",
    valuation: "バリュエーション",
    trend: "トレンド",
    risk: "リスク",
    scenarios: "シナリオ",
    supportingEvidence: "支持するエビデンス",
    invalidation: "判断を無効化する条件",
    watchMetrics: "継続監視指標",
    evidence: "エビデンス",
    openOriginalEvidence: "ソースを表示",
    noStructured: "構造化情報はありません。",
    noEvidence: "外部エビデンスはありません。",
    dataNotice:
      "現在の市場データは Web エビデンスに基づく場合があり、検証済みの取引所リアルタイム価格とは異なります。",
    disclaimer:
      "AIOS は市場リサーチ、エビデンス、リスクレビューを支援します。個別の投資助言、銘柄ランキング、自動売買は提供しません。",
    terminal: "リサーチターミナル",
    searchHint: "銘柄コードと市場を選択してください",
    dataStatus: "データ状態",
    provider: "データプロバイダー",
    coverage: "カバレッジ",
    researchBlocks: "リサーチモジュール",
    conclusion: "結論",
  },
};

function marketLabel(
  locale: Locale,
  market?: string,
): string {
  if (locale === "zh-CN") {
    if (market === "us") return "美国";
    if (market === "hk") return "香港";
    if (market === "cn") return "中国 A 股";
  }

  if (locale === "ja") {
    if (market === "us") return "米国";
    if (market === "hk") return "香港";
    if (market === "cn") return "中国 A 株";
  }

  if (market === "us") return "US";
  if (market === "hk") return "Hong Kong";
  if (market === "cn") return "China A-share";

  return market ?? "N/A";
}

function dataQualityLabel(
  locale: Locale,
  value?: string,
): string {
  if (locale === "zh-CN") {
    if (value === "web-evidence") return "Web 证据";
    if (value === "live") return "实时数据";
    if (value === "delayed") return "延迟数据";
    if (value === "historical") return "历史数据";
    if (value === "insufficient") return "数据不足";
  }

  if (locale === "ja") {
    if (value === "web-evidence") return "Web エビデンス";
    if (value === "live") return "リアルタイム";
    if (value === "delayed") return "遅延データ";
    if (value === "historical") return "過去データ";
    if (value === "insufficient") return "データ不足";
  }

  return value ?? "N/A";
}

function riskLevelLabel(
  locale: Locale,
  value?: string,
): string {
  if (locale === "zh-CN") {
    if (value === "low") return "低";
    if (value === "medium") return "中";
    if (value === "high") return "高";
    return "未知";
  }

  if (locale === "ja") {
    if (value === "low") return "低";
    if (value === "medium") return "中";
    if (value === "high") return "高";
    return "不明";
  }

  return value ?? "unknown";
}

function translateText(
  locale: Locale,
  value?: string,
): string {
  if (!value || locale === "en") {
    return value ?? "";
  }

  const translations: Record<
    string,
    Record<"zh-CN" | "ja", string>
  > = {
    "Live market data is available.": {
      "zh-CN": "当前有实时市场数据。",
      ja: "リアルタイム市場データが利用可能です。",
    },
    "Current state is evidence-based rather than verified real-time market data.": {
      "zh-CN":
        "当前状态基于外部证据，而不是经过验证的实时市场数据。",
      ja:
        "現在の状態は、検証済みリアルタイム市場データではなく、エビデンスに基づいています。",
    },
    "Insufficient company-level evidence.": {
      "zh-CN": "公司层面证据不足。",
      ja: "企業レベルのエビデンスが不足しています。",
    },
    "Fundamental operating signals were detected.": {
      "zh-CN": "检测到基本面经营信号。",
      ja: "ファンダメンタルズ上の事業シグナルが検出されました。",
    },
    "Insufficient structured fundamental data.": {
      "zh-CN": "结构化基本面数据不足。",
      ja: "構造化されたファンダメンタルデータが不足しています。",
    },
    "Insufficient valuation data.": {
      "zh-CN": "估值数据不足。",
      ja: "バリュエーションデータが不足しています。",
    },
    "No reliable trend signal was extracted.": {
      "zh-CN": "没有提取到可靠的趋势信号。",
      ja: "信頼できるトレンドシグナルは抽出されませんでした。",
    },
    "The current snapshot is not a verified exchange real-time quote.": {
      "zh-CN": "当前快照不是经过验证的交易所实时行情。",
      ja: "現在のスナップショットは、検証済みの取引所リアルタイム価格ではありません。",
    },
    "Revenue growth": {
      "zh-CN": "营收增长",
      ja: "売上高成長率",
    },
    "EPS / profitability": {
      "zh-CN": "EPS / 盈利能力",
      ja: "EPS / 収益性",
    },
    "Free cash flow": {
      "zh-CN": "自由现金流",
      ja: "フリーキャッシュフロー",
    },
    "Debt and liquidity": {
      "zh-CN": "债务与流动性",
      ja: "負債と流動性",
    },
    "Industry growth": {
      "zh-CN": "行业增长",
      ja: "業界成長率",
    },
    "Material company or regulatory news": {
      "zh-CN": "重大公司或监管新闻",
      ja: "重要な企業・規制ニュース",
    },
    "Verified market price and volume": {
      "zh-CN": "经过验证的市场价格与成交量",
      ja: "検証済み市場価格と出来高",
    },
  };

  const exact = translations[value];

  if (exact) {
    return exact[locale];
  }

  if (locale === "zh-CN") {
    const revenue = value.match(
      /^Reported revenue-growth signal is (positive|negative) at approximately (.+)%\.$/,
    );

    if (revenue) {
      return `报告的营收增长信号为${revenue[1] === "positive" ? "正" : "负"}，约为 ${revenue[2]}%。`;
    }

    const eps = value.match(
      /^EPS data was detected from external evidence: (.+)\.$/,
    );

    if (eps) {
      return `从外部证据中检测到 EPS 数据：${eps[1]}。`;
    }

    const pe = value.match(
      /^P\/E evidence detected: (.+)\.$/,
    );

    if (pe) {
      return `检测到 P/E 证据：${pe[1]}。`;
    }

    const pb = value.match(
      /^P\/B evidence detected: (.+)\.$/,
    );

    if (pb) {
      return `检测到 P/B 证据：${pb[1]}。`;
    }

    const trend = value.match(
      /^Observed percentage-change signal: (.+)%\.$/,
    );

    if (trend) {
      return `检测到的百分比变化信号：${trend[1]}%。`;
    }
  }

  if (locale === "ja") {
    const revenue = value.match(
      /^Reported revenue-growth signal is (positive|negative) at approximately (.+)%\.$/,
    );

    if (revenue) {
      return `報告された売上高成長シグナルは${revenue[1] === "positive" ? "プラス" : "マイナス"}で、約 ${revenue[2]}% です。`;
    }

    const eps = value.match(
      /^EPS data was detected from external evidence: (.+)\.$/,
    );

    if (eps) {
      return `外部エビデンスから EPS データが検出されました：${eps[1]}。`;
    }

    const pe = value.match(
      /^P\/E evidence detected: (.+)\.$/,
    );

    if (pe) {
      return `P/E エビデンスが検出されました：${pe[1]}。`;
    }

    const pb = value.match(
      /^P\/B evidence detected: (.+)\.$/,
    );

    if (pb) {
      return `P/B エビデンスが検出されました：${pb[1]}。`;
    }

    const trend = value.match(
      /^Observed percentage-change signal: (.+)%\.$/,
    );

    if (trend) {
      return `観測された変化率シグナル：${trend[1]}%。`;
    }
  }

  return value;
}

function formatNumber(
  value: number | null | undefined,
  digits = 2,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value, 2)}%`;
}

function formatMoney(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000_000) {
    return `${formatNumber(
      value / 1_000_000_000_000,
      2,
    )}T`;
  }

  if (absolute >= 1_000_000_000) {
    return `${formatNumber(
      value / 1_000_000_000,
      2,
    )}B`;
  }

  if (absolute >= 1_000_000) {
    return `${formatNumber(
      value / 1_000_000,
      2,
    )}M`;
  }

  return formatNumber(value, 0);
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function analyzeMarket(
  symbol: string,
  market: MarketRegion,
): Promise<PublicMarketResult> {
  const response = await fetch(
    "/api/market/intelligence",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol,
        market,
      }),
      cache: "no-store",
    },
  );

  const data =
    (await response.json()) as PublicMarketResult;

  if (!response.ok) {
    throw new Error(
      data.error ??
        "Market Research request failed.",
    );
  }

  return data;
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const styles: Record<
    Tone,
    {
      background: string;
      color: string;
      border: string;
    }
  > = {
    positive: {
      background: "rgba(34,197,94,0.10)",
      color: "#86efac",
      border: "rgba(34,197,94,0.22)",
    },
    warning: {
      background: "rgba(245,158,11,0.10)",
      color: "#fcd34d",
      border: "rgba(245,158,11,0.20)",
    },
    negative: {
      background: "rgba(239,68,68,0.10)",
      color: "#fca5a5",
      border: "rgba(239,68,68,0.20)",
    },
    neutral: {
      background: "rgba(255,255,255,0.045)",
      color: "#d4d4d8",
      border: "rgba(255,255,255,0.10)",
    },
  };

  const style = styles[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 23,
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`research-terminal-section ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow?: string;
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div className="research-terminal-section-header">
      <div>
        {eyebrow && (
          <div className="research-terminal-section-eyebrow">
            {eyebrow}
          </div>
        )}

        <h2>{title}</h2>
      </div>

      {meta && (
        <div className="research-terminal-section-meta">
          {meta}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="research-terminal-metric">
      <div className="research-terminal-metric-label">
        {label}
      </div>

      <div
        className={
          emphasis
            ? "research-terminal-metric-value emphasis"
            : "research-terminal-metric-value"
        }
      >
        {value}
      </div>

      {sub && (
        <div className="research-terminal-metric-sub">
          {sub}
        </div>
      )}
    </div>
  );
}

function List({
  items,
  locale,
  emptyText,
}: {
  items?: string[];
  locale: Locale;
  emptyText: string;
}) {
  if (!items?.length) {
    return (
      <div className="research-terminal-empty">
        {emptyText}
      </div>
    );
  }

  return (
    <ul className="research-terminal-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>
          {translateText(locale, item)}
        </li>
      ))}
    </ul>
  );
}

function ResearchBlock({
  title,
  summary,
  items,
  locale,
  emptyText,
}: {
  title: string;
  summary?: string;
  items?: string[];
  locale: Locale;
  emptyText: string;
}) {
  return (
    <details className="research-terminal-block">
      <summary>
        <span>{title}</span>
        <span className="research-terminal-block-arrow">
          +
        </span>
      </summary>

      <div className="research-terminal-block-body">
        {summary && (
          <p>
            {translateText(
              locale,
              summary,
            )}
          </p>
        )}

        <List
          locale={locale}
          items={items}
          emptyText={emptyText}
        />
      </div>
    </details>
  );
}

export default function MarketResearchPage() {
  const {
    locale: rawLocale,
  } = useLanguage();

  const locale: Locale =
    rawLocale === "zh-CN" ||
    rawLocale === "ja"
      ? rawLocale
      : "en";

  const ui = copy[locale];

  const [
    symbol,
    setSymbol,
  ] = useState("AAPL");

  const [
    market,
    setMarket,
  ] = useState<MarketRegion>("us");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<PublicMarketResult | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");

  async function runAnalysis() {
    const normalizedSymbol =
      symbol
        .trim()
        .toUpperCase();

    if (!normalizedSymbol) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data =
        await analyzeMarket(
          normalizedSymbol,
          market,
        );

      setResult(data);
    } catch (requestError) {
      setResult(null);

      setError(
        requestError instanceof Error
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

  const provider =
    result?.provider;

  const risk =
    analysis?.risk;

  const isWebEvidence =
    snapshot?.dataQuality ===
    "web-evidence";

  const statusTone: Tone =
    verification?.verified
      ? "positive"
      : isWebEvidence
        ? "warning"
        : "neutral";

  const statusLabel =
    verification?.verified
      ? ui.verified
      : isWebEvidence
        ? ui.webEvidence
        : ui.notVerified;

  return (
    <WorkspaceShell>
      <main className="research-terminal">
        <div className="research-terminal-inner">
          <header className="research-terminal-header">
            <div>
              <div className="research-terminal-eyebrow">
                {ui.eyebrow}
              </div>

              <h1>{ui.title}</h1>

              <p>{ui.subtitle}</p>
            </div>

            <div className="research-terminal-header-status">
              <span className="research-terminal-status-dot" />
              {ui.terminal}
            </div>
          </header>

          <Section className="research-terminal-command">
            <div className="research-terminal-command-top">
              <div>
                <div className="research-terminal-command-label">
                  {ui.research}
                </div>

                <div className="research-terminal-command-hint">
                  {ui.searchHint}
                </div>
              </div>
            </div>

            <div className="research-terminal-form">
              <div className="research-terminal-symbol-field">
                <span className="research-terminal-field-prefix">
                  SYMBOL
                </span>

                <input
                  value={symbol}
                  onChange={(event) =>
                    setSymbol(
                      event.target.value.toUpperCase(),
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      void runAnalysis();
                    }
                  }}
                  placeholder={
                    ui.symbolPlaceholder
                  }
                  aria-label={
                    ui.symbolPlaceholder
                  }
                />
              </div>

              <select
                value={market}
                onChange={(event) =>
                  setMarket(
                    event.target
                      .value as MarketRegion,
                  )
                }
                aria-label={ui.coverage}
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
                onClick={() =>
                  void runAnalysis()
                }
                disabled={
                  loading ||
                  !symbol.trim()
                }
              >
                {loading
                  ? ui.researching
                  : ui.analyze}
              </button>
            </div>
          </Section>

          {error && (
            <Section className="research-terminal-error">
              <div className="research-terminal-error-label">
                {ui.requestError}
              </div>

              <div>
                {error}
              </div>
            </Section>
          )}

          {result && (
            <>
              <Section className="research-terminal-instrument">
                <div className="research-terminal-instrument-main">
                  <div className="research-terminal-instrument-symbol">
                    {
                      result.instrument
                        ?.normalizedSymbol
                    }
                  </div>

                  <div className="research-terminal-instrument-name">
                    {
                      result.instrument
                        ?.name ??
                      marketLabel(
                        locale,
                        result.instrument
                          ?.market,
                      )
                    }
                  </div>

                  <div className="research-terminal-instrument-meta">
                    {
                      result.instrument
                        ?.exchange
                    }
                    {" · "}
                    {
                      result.instrument
                        ?.currency
                    }
                  </div>
                </div>

                <div className="research-terminal-statuses">
                  <Badge
                    tone={
                      result.success
                        ? "positive"
                        : "negative"
                    }
                  >
                    {result.success
                      ? ui.verified
                      : ui.notVerified}
                  </Badge>

                  <Badge
                    tone={statusTone}
                  >
                    {statusLabel}
                  </Badge>

                  <Badge
                    tone={
                      verification?.structuredDataVerified
                        ? "positive"
                        : "warning"
                    }
                  >
                    {verification?.structuredDataVerified
                      ? ui.structuredVerified
                      : ui.webEvidence}
                  </Badge>
                </div>
              </Section>

              <Section className="research-terminal-snapshot">
                <SectionHeader
                  title={ui.marketSnapshot}
                  meta={
                    <span>
                      {marketLabel(
                        locale,
                        result.instrument
                          ?.market,
                      )}
                    </span>
                  }
                />

                <div className="research-terminal-metrics">
                  <Metric
                    label={ui.price}
                    value={formatNumber(
                      snapshot?.price,
                      2,
                    )}
                    sub={
                      snapshot?.changePercent !==
                        null &&
                      snapshot?.changePercent !==
                        undefined
                        ? formatPercent(
                            snapshot.changePercent,
                          )
                        : undefined
                    }
                    emphasis
                  />

                  <Metric
                    label={ui.pe}
                    value={formatNumber(
                      snapshot?.pe,
                      2,
                    )}
                  />

                  <Metric
                    label={ui.pb}
                    value={formatNumber(
                      snapshot?.pb,
                      2,
                    )}
                  />

                  <Metric
                    label={ui.eps}
                    value={formatNumber(
                      snapshot?.eps,
                      2,
                    )}
                  />

                  <Metric
                    label={ui.marketCap}
                    value={formatMoney(
                      snapshot?.marketCap,
                    )}
                  />

                  <Metric
                    label={ui.revenue}
                    value={formatMoney(
                      snapshot?.revenue,
                    )}
                  />
                </div>

                <div className="research-terminal-data-line">
                  <span>
                    <strong>
                      {ui.dataQuality}
                    </strong>
                    {" "}
                    {dataQualityLabel(
                      locale,
                      snapshot?.dataQuality,
                    )}
                  </span>

                  <span>
                    <strong>
                      {ui.liveQuote}
                    </strong>
                    {" "}
                    {snapshot?.liveQuoteAvailable
                      ? ui.yes
                      : ui.no}
                  </span>

                  <span>
                    <strong>
                      {ui.source}
                    </strong>
                    {" "}
                    {snapshot?.source ??
                      "—"}
                  </span>

                  <span>
                    <strong>
                      {ui.asOf}
                    </strong>
                    {" "}
                    {formatDate(
                      snapshot?.asOf,
                    )}
                  </span>
                </div>

                {isWebEvidence && (
                  <div className="research-terminal-notice">
                    {ui.dataNotice}
                  </div>
                )}
              </Section>

              {analysis?.decisionSupport && (
                <Section className="research-terminal-conclusion">
                  <SectionHeader
                    eyebrow={
                      ui.conclusion
                    }
                    title={
                      ui.researchConclusion
                    }
                    meta={
                      risk ? (
                        <Badge
                          tone={
                            risk.level ===
                            "high"
                              ? "negative"
                              : risk.level ===
                                  "medium"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {ui.risk}
                          {" "}
                          {riskLevelLabel(
                            locale,
                            risk.level,
                          )}
                        </Badge>
                      ) : undefined
                    }
                  />

                  <div className="research-terminal-conclusion-primary">
                    <div className="research-terminal-conclusion-label">
                      {ui.currentState}
                    </div>

                    <div className="research-terminal-conclusion-text">
                      {translateText(
                        locale,
                        analysis
                          .decisionSupport
                          .currentState,
                      )}
                    </div>
                  </div>

                  <div className="research-terminal-conclusion-grid">
                    <div>
                      <div className="research-terminal-subheading">
                        {
                          ui.supportingEvidence
                        }
                      </div>

                      <List
                        locale={locale}
                        items={
                          analysis
                            .decisionSupport
                            .supportingFactors
                        }
                        emptyText={
                          ui.noStructured
                        }
                      />
                    </div>

                    <div>
                      <div className="research-terminal-subheading">
                        {ui.watchMetrics}
                      </div>

                      <List
                        locale={locale}
                        items={
                          analysis
                            .decisionSupport
                            .watchMetrics
                        }
                        emptyText={
                          ui.noStructured
                        }
                      />
                    </div>

                    <div>
                      <div className="research-terminal-subheading">
                        {ui.invalidation}
                      </div>

                      <List
                        locale={locale}
                        items={
                          analysis
                            .decisionSupport
                            .invalidationConditions
                        }
                        emptyText={
                          ui.noStructured
                        }
                      />
                    </div>
                  </div>
                </Section>
              )}

              <Section>
                <SectionHeader
                  title={
                    ui.researchBlocks
                  }
                  meta={
                    <span>
                      {ui.research}
                    </span>
                  }
                />

                <div className="research-terminal-blocks">
                  {analysis?.industry && (
                    <ResearchBlock
                      title={ui.industry}
                      summary={
                        analysis
                          .industry
                          .summary
                      }
                      items={
                        analysis
                          .industry
                          .evidence
                      }
                      locale={locale}
                      emptyText={
                        ui.noStructured
                      }
                    />
                  )}

                  {analysis?.company && (
                    <ResearchBlock
                      title={ui.company}
                      summary={
                        analysis
                          .company
                          .summary
                      }
                      items={[
                        ...(analysis
                          .company
                          .strengths ??
                          []),
                        ...(analysis
                          .company
                          .risks ??
                          []),
                      ]}
                      locale={locale}
                      emptyText={
                        ui.noStructured
                      }
                    />
                  )}

                  {analysis?.fundamentals && (
                    <ResearchBlock
                      title={
                        ui.fundamentals
                      }
                      summary={
                        analysis
                          .fundamentals
                          .assessment
                      }
                      items={
                        analysis
                          .fundamentals
                          .signals
                      }
                      locale={locale}
                      emptyText={
                        ui.noStructured
                      }
                    />
                  )}

                  {analysis?.valuation && (
                    <ResearchBlock
                      title={
                        ui.valuation
                      }
                      summary={
                        analysis
                          .valuation
                          .assessment
                      }
                      items={
                        analysis
                          .valuation
                          .signals
                      }
                      locale={locale}
                      emptyText={
                        ui.noStructured
                      }
                    />
                  )}

                  {analysis?.trend && (
                    <ResearchBlock
                      title={ui.trend}
                      summary={
                        analysis
                          .trend
                          .assessment
                      }
                      items={
                        analysis
                          .trend
                          .signals
                      }
                      locale={locale}
                      emptyText={
                        ui.noStructured
                      }
                    />
                  )}

                  {analysis?.risk && (
                    <ResearchBlock
                      title={ui.risk}
                      summary={`${ui.risk}: ${riskLevelLabel(
                        locale,
                        analysis.risk.level,
                      )}`}
                      items={
                        analysis
                          .risk
                          .factors
                      }
                      locale={locale}
                      emptyText={
                        ui.noStructured
                      }
                    />
                  )}

                  {analysis?.decisionSupport
                    ?.scenarios
                    ?.length ? (
                    <ResearchBlock
                      title={
                        ui.scenarios
                      }
                      summary={analysis.decisionSupport.scenarios
                        .map(
                          (item) =>
                            `${item.name}: ${item.condition}`,
                        )
                        .join(" · ")}
                      items={analysis.decisionSupport.scenarios
                        .map(
                          (item) =>
                            `${item.name}: ${item.implication}`,
                        )}
                      locale={locale}
                      emptyText={
                        ui.noStructured
                      }
                    />
                  ) : null}
                </div>
              </Section>

              <Section className="research-terminal-evidence">
                <details>
                  <summary>
                    <span>
                      {ui.evidence}
                    </span>

                    <span>
                      {verification?.sourceCount ??
                        0}{" "}
                      {ui.sources}
                    </span>
                  </summary>

                  <div className="research-terminal-evidence-list">
                    {!result.evidence?.length ? (
                      <div className="research-terminal-empty">
                        {ui.noEvidence}
                      </div>
                    ) : (
                      result.evidence.map(
                        (
                          item,
                          index,
                        ) => (
                          <details
                            key={`${item.url}-${index}`}
                            className="research-terminal-evidence-item"
                          >
                            <summary>
                              <span>
                                {
                                  item.hostname
                                }

                                <small>
                                  {
                                    item.title
                                  }
                                </small>
                              </span>

                              <span>
                                +
                              </span>
                            </summary>

                            <div className="research-terminal-evidence-body">
                              {
                                item.snippet
                              }

                              {item.url && (
                                <a
                                  href={
                                    item.url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {
                                    ui.openOriginalEvidence
                                  }
                                </a>
                              )}
                            </div>
                          </details>
                        ),
                      )
                    )}
                  </div>
                </details>
              </Section>

              <section className="research-terminal-footer">
                <div className="research-terminal-footer-grid">
                  <span>
                    <strong>
                      {ui.domains}
                    </strong>
                    {" "}
                    {verification?.independentDomains ??
                      0}
                  </span>

                  <span>
                    <strong>
                      {ui.primarySource}
                    </strong>
                    {" "}
                    {verification?.primarySourceFound
                      ? ui.yes
                      : ui.no}
                  </span>

                  <span>
                    <strong>
                      {ui.liveQuote}
                    </strong>
                    {" "}
                    {snapshot?.liveQuoteAvailable
                      ? ui.yes
                      : ui.no}
                  </span>

                  <span>
                    <strong>
                      {ui.provider}
                    </strong>
                    {" "}
                    {provider?.provider ??
                      "—"}
                  </span>

                  {result.latencyMs !==
                    undefined && (
                    <span>
                      {result.latencyMs}ms
                    </span>
                  )}
                </div>

                <div className="research-terminal-disclaimer">
                  {ui.disclaimer}
                </div>
              </section>
            </>
          )}

          {!result &&
            !loading &&
            !error && (
              <section className="research-terminal-empty-state">
                <div className="research-terminal-empty-state-mark">
                  R
                </div>

                <div>
                  <strong>
                    {ui.title}
                  </strong>

                  <p>
                    {ui.searchHint}
                  </p>
                </div>
              </section>
            )}
        </div>
      </main>

      <style jsx>{`
        .research-terminal {
          min-height: 100%;
          width: 100%;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(148, 163, 184, 0.08),
              transparent 34%
            ),
            #08090b;
          color: #f4f4f5;
          padding: 22px 14px 48px;
        }

        .research-terminal-inner {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .research-terminal-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 4px 2px 18px;
        }

        .research-terminal-eyebrow {
          margin-bottom: 7px;
          color: #71717a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .research-terminal-header h1 {
          margin: 0;
          font-size: clamp(27px, 5vw, 40px);
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 900;
        }

        .research-terminal-header p {
          margin: 8px 0 0;
          color: #71717a;
          font-size: 12px;
        }

        .research-terminal-header-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 28px;
          padding: 0 9px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          color: #a1a1aa;
          background: rgba(255,255,255,0.025);
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .research-terminal-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #86efac;
          box-shadow: 0 0 8px rgba(134,239,172,0.6);
        }

        .research-terminal-section {
          margin-top: 12px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0.042),
              rgba(255,255,255,0.018)
            );
          box-shadow:
            0 10px 32px rgba(0,0,0,0.16);
        }

        .research-terminal-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        .research-terminal-section-header h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 850;
          letter-spacing: -0.01em;
        }

        .research-terminal-section-eyebrow {
          margin-bottom: 4px;
          color: #71717a;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .research-terminal-section-meta {
          color: #71717a;
          font-size: 10px;
          font-weight: 700;
        }

        .research-terminal-command {
          padding: 14px;
        }

        .research-terminal-command-top {
          margin-bottom: 10px;
        }

        .research-terminal-command-label {
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.04em;
        }

        .research-terminal-command-hint {
          margin-top: 3px;
          color: #71717a;
          font-size: 10px;
        }

        .research-terminal-form {
          display: grid;
          grid-template-columns:
            minmax(200px, 1.7fr)
            minmax(150px, 0.75fr)
            auto;
          gap: 8px;
        }

        .research-terminal-symbol-field {
          display: flex;
          align-items: center;
          min-width: 0;
          height: 44px;
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 10px;
          background: #111216;
          overflow: hidden;
        }

        .research-terminal-field-prefix {
          padding: 0 9px 0 11px;
          color: #52525b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .research-terminal-symbol-field input {
          width: 100%;
          min-width: 0;
          height: 100%;
          padding: 0 11px 0 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fafafa;
          font-size: 14px;
          font-weight: 800;
        }

        .research-terminal-form select {
          min-width: 0;
          height: 44px;
          padding: 0 11px;
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 10px;
          outline: 0;
          background: #111216;
          color: #fafafa;
          font-size: 12px;
          font-weight: 750;
        }

        .research-terminal-form button {
          min-width: 116px;
          height: 44px;
          padding: 0 17px;
          border: 0;
          border-radius: 10px;
          background: #f4f4f5;
          color: #09090b;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .research-terminal-form button:disabled {
          background: #27272a;
          color: #71717a;
          cursor: wait;
        }

        .research-terminal-error {
          border-color: rgba(239,68,68,0.18);
          background: rgba(127,29,29,0.10);
          color: #fca5a5;
          font-size: 12px;
          line-height: 1.55;
        }

        .research-terminal-error-label {
          margin-bottom: 5px;
          color: #f87171;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .research-terminal-instrument {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .research-terminal-instrument-main {
          min-width: 0;
        }

        .research-terminal-instrument-symbol {
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .research-terminal-instrument-name {
          margin-top: 3px;
          color: #a1a1aa;
          font-size: 11px;
        }

        .research-terminal-instrument-meta {
          margin-top: 4px;
          color: #52525b;
          font-size: 9px;
          font-weight: 700;
        }

        .research-terminal-statuses {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .research-terminal-metrics {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 7px;
        }

        .research-terminal-metric {
          min-width: 0;
          padding: 11px;
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 10px;
          background: rgba(255,255,255,0.022);
        }

        .research-terminal-metric-label {
          margin-bottom: 6px;
          color: #71717a;
          font-size: 9px;
          font-weight: 750;
        }

        .research-terminal-metric-value {
          overflow: hidden;
          color: #e4e4e7;
          font-size: 15px;
          font-weight: 850;
          line-height: 1.15;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .research-terminal-metric-value.emphasis {
          color: #fafafa;
          font-size: 21px;
          letter-spacing: -0.03em;
        }

        .research-terminal-metric-sub {
          margin-top: 5px;
          color: #86efac;
          font-size: 9px;
          font-weight: 750;
        }

        .research-terminal-data-line {
          display: flex;
          flex-wrap: wrap;
          gap: 5px 15px;
          margin-top: 11px;
          color: #71717a;
          font-size: 9px;
          line-height: 1.5;
        }

        .research-terminal-data-line strong {
          color: #a1a1aa;
          font-weight: 750;
        }

        .research-terminal-notice {
          margin-top: 10px;
          padding: 9px 10px;
          border: 1px solid rgba(245,158,11,0.16);
          border-radius: 9px;
          background: rgba(245,158,11,0.065);
          color: #fcd34d;
          font-size: 10px;
          line-height: 1.5;
        }

        .research-terminal-conclusion-primary {
          padding: 14px;
          border-left: 2px solid #a1a1aa;
          border-radius: 0 10px 10px 0;
          background: rgba(255,255,255,0.035);
        }

        .research-terminal-conclusion-label {
          margin-bottom: 6px;
          color: #71717a;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .research-terminal-conclusion-text {
          max-width: 940px;
          color: #f4f4f5;
          font-size: 15px;
          font-weight: 650;
          line-height: 1.65;
        }

        .research-terminal-conclusion-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 10px;
        }

        .research-terminal-conclusion-grid > div {
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          background: rgba(255,255,255,0.018);
        }

        .research-terminal-subheading {
          margin-bottom: 8px;
          color: #a1a1aa;
          font-size: 10px;
          font-weight: 850;
        }

        .research-terminal-list {
          display: grid;
          gap: 6px;
          margin: 0;
          padding-left: 17px;
          color: #d4d4d8;
          font-size: 11px;
          line-height: 1.55;
        }

        .research-terminal-empty {
          color: #52525b;
          font-size: 11px;
          line-height: 1.5;
        }

        .research-terminal-blocks {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .research-terminal-block {
          min-width: 0;
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 10px;
          background: rgba(255,255,255,0.018);
          overflow: hidden;
        }

        .research-terminal-block summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px;
          cursor: pointer;
          list-style: none;
          color: #e4e4e7;
          font-size: 12px;
          font-weight: 800;
        }

        .research-terminal-block summary::-webkit-details-marker {
          display: none;
        }

        .research-terminal-block-arrow {
          color: #71717a;
          font-size: 14px;
          font-weight: 500;
        }

        .research-terminal-block[open]
          .research-terminal-block-arrow {
          transform: rotate(45deg);
        }

        .research-terminal-block-body {
          padding: 0 12px 12px;
          border-top: 1px solid rgba(255,255,255,0.055);
        }

        .research-terminal-block-body p {
          margin: 10px 0;
          color: #a1a1aa;
          font-size: 11px;
          line-height: 1.6;
        }

        .research-terminal-evidence summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          list-style: none;
          color: #e4e4e7;
          font-size: 14px;
          font-weight: 850;
        }

        .research-terminal-evidence summary::-webkit-details-marker {
          display: none;
        }

        .research-terminal-evidence
          > details
          > summary
          span:last-child {
          color: #71717a;
          font-size: 9px;
          font-weight: 700;
        }

        .research-terminal-evidence-list {
          display: grid;
          gap: 7px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .research-terminal-evidence-item {
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 9px;
          background: rgba(255,255,255,0.018);
          overflow: hidden;
        }

        .research-terminal-evidence-item summary {
          padding: 10px 11px;
          font-size: 10px;
          font-weight: 800;
        }

        .research-terminal-evidence-item summary small {
          display: block;
          margin-top: 3px;
          color: #52525b;
          font-size: 9px;
          font-weight: 500;
        }

        .research-terminal-evidence-body {
          padding: 0 11px 11px;
          border-top: 1px solid rgba(255,255,255,0.05);
          color: #a1a1aa;
          font-size: 10px;
          line-height: 1.6;
        }

        .research-terminal-evidence-body::first-line {
          color: #d4d4d8;
        }

        .research-terminal-evidence-body a {
          display: block;
          margin-top: 8px;
          color: #93c5fd;
          text-decoration: none;
          font-weight: 700;
        }

        .research-terminal-footer {
          padding: 13px 3px 0;
        }

        .research-terminal-footer-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 5px 15px;
          color: #52525b;
          font-size: 9px;
          line-height: 1.5;
        }

        .research-terminal-footer-grid strong {
          color: #71717a;
          font-weight: 750;
        }

        .research-terminal-disclaimer {
          margin-top: 13px;
          color: #3f3f46;
          font-size: 9px;
          line-height: 1.6;
        }

        .research-terminal-empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 180px;
          margin-top: 12px;
          padding: 20px;
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #71717a;
        }

        .research-terminal-empty-state-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 9px;
          color: #a1a1aa;
          font-size: 12px;
          font-weight: 900;
        }

        .research-terminal-empty-state strong {
          color: #a1a1aa;
          font-size: 12px;
        }

        .research-terminal-empty-state p {
          margin: 4px 0 0;
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .research-terminal-metrics {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .research-terminal-conclusion-grid {
            grid-template-columns:
              1fr;
          }
        }

        @media (max-width: 720px) {
          .research-terminal {
            padding: 14px 9px 34px;
          }

          .research-terminal-header {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .research-terminal-header h1 {
            font-size: 28px;
          }

          .research-terminal-form {
            grid-template-columns: 1fr;
          }

          .research-terminal-form button {
            width: 100%;
          }

          .research-terminal-metrics {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .research-terminal-blocks {
            grid-template-columns: 1fr;
          }

          .research-terminal-instrument {
            align-items: flex-start;
            flex-direction: column;
          }

          .research-terminal-statuses {
            justify-content: flex-start;
          }

          .research-terminal-section {
            padding: 13px;
          }
        }

        @media (max-width: 430px) {
          .research-terminal-metrics {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }

          .research-terminal-metric {
            padding: 9px;
          }

          .research-terminal-metric-value.emphasis {
            font-size: 18px;
          }

          .research-terminal-data-line {
            display: grid;
            gap: 4px;
          }
        }
      `}</style>
    </WorkspaceShell>
  );
}
