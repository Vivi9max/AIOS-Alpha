"use client";

import {
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

type Locale =
  | "en"
  | "zh-CN"
  | "ja";

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

    trend?: {
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
    trend: string;
    risk: string;

    riskLevel: string;
    decisionSupport: string;
    supportingEvidence: string;
    invalidation: string;
    watchMetrics: string;

    strengths: string;
    risks: string;

    evidence: string;
    originalEvidence: string;
    openOriginalEvidence: string;

    noStructured: string;
    noEvidence: string;

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

    trend:
      "Trend",

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

    originalEvidence:
      "Original Evidence",

    openOriginalEvidence:
      "View original source content",

    noStructured:
      "No structured information.",

    noEvidence:
      "No external evidence was returned.",

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

    trend:
      "趋势",

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

    originalEvidence:
      "原始证据",

    openOriginalEvidence:
      "查看原始来源内容",

    noStructured:
      "暂无结构化信息。",

    noEvidence:
      "没有返回外部证据。",

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

    trend:
      "トレンド",

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

    originalEvidence:
      "原文エビデンス",

    openOriginalEvidence:
      "原文ソースを表示",

    noStructured:
      "構造化情報はありません。",

    noEvidence:
      "外部エビデンスは返されませんでした。",

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

function marketLabel(
  locale: Locale,
  market?: string,
): string {
  if (locale === "zh-CN") {
    if (market === "us")
      return "美国";
    if (market === "hk")
      return "香港";
    if (market === "cn")
      return "中国A股";
  }

  if (locale === "ja") {
    if (market === "us")
      return "米国";
    if (market === "hk")
      return "香港";
    if (market === "cn")
      return "中国A株";
  }

  if (market === "us")
    return "US";

  if (market === "hk")
    return "Hong Kong";

  if (market === "cn")
    return "China A-share";

  return market ?? "N/A";
}

function dataQualityLabel(
  locale: Locale,
  value?: string,
): string {
  if (locale === "zh-CN") {
    if (value === "web-evidence")
      return "Web 证据";
    if (value === "live")
      return "实时数据";
    if (value === "delayed")
      return "延迟数据";
    if (value === "historical")
      return "历史数据";
    if (value === "insufficient")
      return "数据不足";
  }

  if (locale === "ja") {
    if (value === "web-evidence")
      return "Web エビデンス";
    if (value === "live")
      return "リアルタイムデータ";
    if (value === "delayed")
      return "遅延データ";
    if (value === "historical")
      return "過去データ";
    if (value === "insufficient")
      return "データ不足";
  }

  return value ?? "N/A";
}

function riskLevelLabel(
  locale: Locale,
  value?: string,
): string {
  if (locale === "zh-CN") {
    if (value === "low")
      return "低";
    if (value === "medium")
      return "中";
    if (value === "high")
      return "高";
    return "未知";
  }

  if (locale === "ja") {
    if (value === "low")
      return "低";
    if (value === "medium")
      return "中";
    if (value === "high")
      return "高";
    return "不明";
  }

  return value ?? "unknown";
}

function generatedText(
  locale: Locale,
  value?: string,
): string {
  if (!value)
    return "";

  if (locale === "en")
    return value;

  if (locale === "zh-CN") {
    const exact: Record<
      string,
      string
    > = {
      "Company-level context was collected from external evidence and should be reviewed against primary filings.":
        "已从外部证据收集公司层面信息，应结合公司主要申报文件进一步核验。",

      "Insufficient company-level evidence.":
        "公司层面证据不足。",

      "Fundamental operating signals were detected.":
        "检测到基本面经营信号。",

      "Multiple external sources were retrieved.":
        "已获取多个外部来源。",

      "Some fundamental indicators were detected and should be validated against company filings.":
        "检测到部分基本面指标，应结合公司披露文件进一步验证。",

      "Insufficient structured fundamental data.":
        "结构化基本面数据不足。",

      "Valuation indicators were detected but no peer-based valuation conclusion is made automatically.":
        "检测到估值指标，但系统不会自动形成基于同行比较的估值结论。",

      "Insufficient valuation data.":
        "估值数据不足。",

      "Market-movement signals were detected from external evidence.":
        "从外部证据中检测到市场波动信号。",

      "No reliable trend signal was extracted.":
        "没有提取到可靠的趋势信号。",

      "The current snapshot is not a verified exchange real-time quote.":
        "当前快照不是经过验证的交易所实时行情。",

      "Evidence breadth is limited; additional independent sources should be checked before making a decision.":
        "证据覆盖范围有限，在作出判断前应继续检查更多独立来源。",

      "Valuation metrics were not reliably extracted from the available evidence.":
        "无法从现有证据中可靠提取估值指标。",

      "Live market data is available.":
        "当前有实时市场数据。",

      "Current state is evidence-based rather than verified real-time market data.":
        "当前状态基于外部证据，而不是经过验证的实时市场数据。",

      "Key financial assumptions deteriorate materially.":
        "关键财务假设发生重大恶化。",

      "New regulatory, competitive, or company-specific evidence invalidates the current thesis.":
        "新的监管、竞争或公司层面证据使当前判断失效。",

      "A verified live market-data source contradicts the currently observed price information.":
        "经过验证的实时市场数据与当前观察到的价格信息出现冲突。",

      "Revenue growth":
        "营收增长",

      "EPS / profitability":
        "EPS / 盈利能力",

      "Free cash flow":
        "自由现金流",

      "P/E and P/B relative to comparable companies":
        "相对于可比公司的 P/E 与 P/B",

      "Debt and liquidity":
        "债务与流动性",

      "Industry growth":
        "行业增长",

      "Material company or regulatory news":
        "重大公司或监管新闻",

      "Verified market price and volume":
        "经过验证的市场价格与成交量",
    };

    if (exact[value])
      return exact[value];

    const revenue =
      value.match(
        /^Reported revenue-growth signal is positive at approximately (.+)%\.$/,
      );

    if (revenue) {
      return `报告的营收增长信号为正，约为 ${revenue[1]}%。`;
    }

    const negativeRevenue =
      value.match(
        /^Reported revenue-growth signal is negative at approximately (.+)%\.$/,
      );

    if (negativeRevenue) {
      return `报告的营收增长信号为负，约为 ${negativeRevenue[1]}%。`;
    }

    const eps =
      value.match(
        /^EPS data was detected from external evidence: (.+)\.$/,
      );

    if (eps) {
      return `从外部证据中检测到 EPS 数据：${eps[1]}。`;
    }

    const pe =
      value.match(
        /^P\/E evidence detected: (.+)\.$/,
      );

    if (pe) {
      return `检测到 P/E 证据：${pe[1]}。`;
    }

    const pb =
      value.match(
        /^P\/B evidence detected: (.+)\.$/,
      );

    if (pb) {
      return `检测到 P/B 证据：${pb[1]}。`;
    }

    const trend =
      value.match(
        /^Observed percentage-change signal: (.+)%\.$/,
      );

    if (trend) {
      return `检测到的百分比变化信号：${trend[1]}%。`;
    }

    const industry =
      value.match(
        /^Detected industry context: (.+)\.$/,
      );

    if (industry) {
      const industryName =
        industry[1];

      const mapped: Record<
        string,
        string
      > = {
        Technology:
          "科技",
        "Financial Services":
          "金融服务",
        Consumer:
          "消费",
        Healthcare:
          "医疗健康",
        Energy:
          "能源",
        Unclassified:
          "未分类",
      };

      return `检测到的行业背景：${
        mapped[industryName] ??
        industryName
      }。`;
    }

    if (
      value.includes(
        "elevated and should be tested against expected growth",
      )
    ) {
      return "当前 P/E 水平较高，应结合预期增长和可比估值进一步检验。";
    }
  }

  if (locale === "ja") {
    const exact: Record<
      string,
      string
    > = {
      "Company-level context was collected from external evidence and should be reviewed against primary filings.":
        "外部エビデンスから企業レベルの情報を収集しました。主要開示資料との照合が必要です。",

      "Insufficient company-level evidence.":
        "企業レベルのエビデンスが不足しています。",

      "Fundamental operating signals were detected.":
        "ファンダメンタルズ上の事業シグナルが検出されました。",

      "Multiple external sources were retrieved.":
        "複数の外部ソースを取得しました。",

      "Some fundamental indicators were detected and should be validated against company filings.":
        "一部のファンダメンタル指標が検出されました。企業開示資料との照合が必要です。",

      "Insufficient structured fundamental data.":
        "構造化されたファンダメンタルデータが不足しています。",

      "Valuation indicators were detected but no peer-based valuation conclusion is made automatically.":
        "バリュエーション指標が検出されましたが、比較企業に基づく結論を自動生成していません。",

      "Insufficient valuation data.":
        "バリュエーションデータが不足しています。",

      "Market-movement signals were detected from external evidence.":
        "外部エビデンスから市場変動シグナルが検出されました。",

      "No reliable trend signal was extracted.":
        "信頼できるトレンドシグナルは抽出されませんでした。",

      "The current snapshot is not a verified exchange real-time quote.":
        "現在のスナップショットは、検証済みの取引所リアルタイム価格ではありません。",

      "Evidence breadth is limited; additional independent sources should be checked before making a decision.":
        "エビデンスの範囲が限定されています。判断前に追加の独立ソースを確認する必要があります。",

      "Valuation metrics were not reliably extracted from the available evidence.":
        "利用可能なエビデンスから信頼できるバリュエーション指標を抽出できませんでした。",

      "Live market data is available.":
        "リアルタイム市場データが利用可能です。",

      "Current state is evidence-based rather than verified real-time market data.":
        "現在の状態は、検証済みリアルタイム市場データではなく、エビデンスに基づいています。",

      "Key financial assumptions deteriorate materially.":
        "主要な財務前提が大幅に悪化します。",

      "New regulatory, competitive, or company-specific evidence invalidates the current thesis.":
        "新たな規制、競争環境、企業固有のエビデンスにより現在の判断が無効になります。",

      "A verified live market-data source contradicts the currently observed price information.":
        "検証済みリアルタイム市場データが現在観測されている価格情報と矛盾します。",

      "Revenue growth":
        "売上高成長率",

      "EPS / profitability":
        "EPS / 収益性",

      "Free cash flow":
        "フリーキャッシュフロー",

      "P/E and P/B relative to comparable companies":
        "比較企業に対する P/E と P/B",

      "Debt and liquidity":
        "負債と流動性",

      "Industry growth":
        "業界成長率",

      "Material company or regulatory news":
        "重要な企業・規制ニュース",

      "Verified market price and volume":
        "検証済み市場価格と出来高",
    };

    if (exact[value])
      return exact[value];

    const revenue =
      value.match(
        /^Reported revenue-growth signal is positive at approximately (.+)%\.$/,
      );

    if (revenue) {
      return `報告された売上高成長シグナルはプラスで、約 ${revenue[1]}% です。`;
    }

    const negativeRevenue =
      value.match(
        /^Reported revenue-growth signal is negative at approximately (.+)%\.$/,
      );

    if (negativeRevenue) {
      return `報告された売上高成長シグナルはマイナスで、約 ${negativeRevenue[1]}% です。`;
    }

    const eps =
      value.match(
        /^EPS data was detected from external evidence: (.+)\.$/,
      );

    if (eps) {
      return `外部エビデンスから EPS データが検出されました：${eps[1]}。`;
    }

    const pe =
      value.match(
        /^P\/E evidence detected: (.+)\.$/,
      );

    if (pe) {
      return `P/E エビデンスが検出されました：${pe[1]}。`;
    }

    const pb =
      value.match(
        /^P\/B evidence detected: (.+)\.$/,
      );

    if (pb) {
      return `P/B エビデンスが検出されました：${pb[1]}。`;
    }

    const trend =
      value.match(
        /^Observed percentage-change signal: (.+)%\.$/,
      );

    if (trend) {
      return `観測された変化率シグナル：${trend[1]}%。`;
    }

    const industry =
      value.match(
        /^Detected industry context: (.+)\.$/,
      );

    if (industry) {
      const mapped: Record<
        string,
        string
      > = {
        Technology:
          "テクノロジー",
        "Financial Services":
          "金融サービス",
        Consumer:
          "消費",
        Healthcare:
          "ヘルスケア",
        Energy:
          "エネルギー",
        Unclassified:
          "未分類",
      };

      return `検出された業界コンテキスト：${
        mapped[industry[1]] ??
        industry[1]
      }。`;
    }

    if (
      value.includes(
        "elevated and should be tested against expected growth",
      )
    ) {
      return "現在の P/E 水準は高く、予想成長率や比較企業のバリュエーションと照合する必要があります。";
    }
  }

  return value;
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
                      {marketLabel(
                        locale,
                        result.instrument
                          ?.market ??
                          market,
                      )}
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
                  {dataQualityLabel(
                    locale,
                    snapshot.dataQuality,
                  )}

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
                  {generatedText(
                    locale,
                    analysis
                      .industry
                      .summary,
                  )}
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
                  {generatedText(
                    locale,
                    analysis
                      .company
                      .summary,
                  )}
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
                      .strengths?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
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
                      .risks?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
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
                  {generatedText(
                    locale,
                    analysis
                      .fundamentals
                      .assessment,
                  )}
                </p>

                <List
                  items={
                    analysis
                      .fundamentals
                      .signals?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
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
                  {generatedText(
                    locale,
                    analysis
                      .valuation
                      .assessment,
                  )}
                </p>

                <List
                  items={
                    analysis
                      .valuation
                      .signals?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
                  }
                  emptyText={
                    ui.noStructured
                  }
                />
              </Section>
            )}

            {analysis?.trend && (
              <Section
                title={
                  ui.trend
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
                  {generatedText(
                    locale,
                    analysis
                      .trend
                      .assessment,
                  )}
                </p>

                <List
                  items={
                    analysis
                      .trend
                      .signals?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
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
                    {riskLevelLabel(
                      locale,
                      analysis
                        .risk
                        .level,
                    )}
                  </strong>
                </p>

                <List
                  items={
                    analysis
                      .risk
                      .factors?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
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
                  {generatedText(
                    locale,
                    analysis
                      .decisionSupport
                      .currentState,
                  )}
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
                      .supportingFactors?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
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
                      .invalidationConditions?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
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
                      .watchMetrics?.map(
                        (item) =>
                          generatedText(
                            locale,
                            item,
                          ),
                      )
                  }
                  emptyText={
                    ui.noStructured
                  }
                />
              </Section>
            )}

            <Section
              title={
                ui.evidence
              }
            >
              {!result.evidence?.length ? (
                <div
                  style={{
                    opacity:
                      0.5,
                    fontSize:
                      13,
                  }}
                >
                  {ui.noEvidence}
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      8,
                  }}
                >
                  {result.evidence.map(
                    (
                      item,
                      index,
                    ) => (
                      <details
                        key={`${item.url}-${index}`}
                        style={{
                          border:
                            "1px solid rgba(255,255,255,0.07)",
                          borderRadius:
                            10,
                          padding:
                            "10px 12px",
                        }}
                      >
                        <summary
                          style={{
                            cursor:
                              "pointer",
                            fontSize:
                              12,
                            lineHeight:
                              1.5,
                          }}
                        >
                          <strong>
                            {item.hostname ??
                              "Source"}
                          </strong>

                          <span
                            style={{
                              display:
                                "block",
                              opacity:
                                0.5,
                              marginTop:
                                3,
                            }}
                          >
                            {ui.openOriginalEvidence}
                          </span>
                        </summary>

                        <div
                          style={{
                            marginTop:
                              10,
                            paddingTop:
                              10,
                            borderTop:
                              "1px solid rgba(255,255,255,0.07)",
                            fontSize:
                              12,
                            lineHeight:
                              1.55,
                            opacity:
                              0.72,
                          }}
                        >
                          <div>
                            {ui.originalEvidence}
                          </div>

                          <div
                            style={{
                              marginTop:
                                7,
                              fontWeight:
                                700,
                            }}
                          >
                            {item.title ??
                              "Source"}
                          </div>

                          <div
                            style={{
                              marginTop:
                                6,
                            }}
                          >
                            {item.snippet ??
                              ""}
                          </div>

                          {item.url && (
                            <a
                              href={
                                item.url
                              }
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display:
                                  "inline-block",
                                marginTop:
                                  8,
                                color:
                                  "#93c5fd",
                                textDecoration:
                                  "none",
                              }}
                            >
                              {item.hostname ??
                                item.url}
                            </a>
                          )}
                        </div>
                      </details>
                    ),
                  )}
                </div>
              )}
            </Section>

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
              {ui.disclaimer}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
