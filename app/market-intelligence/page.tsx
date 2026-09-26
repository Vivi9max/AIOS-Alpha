"use client";

import {
  useState,
  type ReactNode,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

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

  runtime: string;
  runtimePass: string;
  runtimeFailed: string;

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

  strengths: string;
  risks: string;

  supportingEvidence: string;
  invalidation: string;
  watchMetrics: string;

  evidence: string;
  originalEvidence: string;
  openOriginalEvidence: string;

  noStructured: string;
  noEvidence: string;

  dataNotice: string;

  disclaimer: string;
};

const copy: Record<
  Locale,
  Copy
> = {
  en: {
    eyebrow:
      "AIOS MARKET RESEARCH",

    title:
      "Market Research",

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
      "Analyze",

    researching:
      "Researching…",

    requestError:
      "Request Error",

    requestFailed:
      "Market Research request failed.",

    runtime:
      "Runtime",

    runtimePass:
      "PASS",

    runtimeFailed:
      "FAILED",

    verified:
      "Verified",

    notVerified:
      "Not verified",

    structuredVerified:
      "Structured verified",

    webEvidence:
      "Web evidence",

    sources:
      "Sources",

    domains:
      "Domains",

    primarySource:
      "Primary source",

    yes:
      "YES",

    no:
      "NO",

    marketSnapshot:
      "Market Snapshot",

    price:
      "Price",

    change:
      "Change",

    marketCap:
      "Market Cap",

    pe:
      "P/E",

    pb:
      "P/B",

    eps:
      "EPS",

    revenue:
      "Revenue",

    dataQuality:
      "Data quality",

    liveQuote:
      "Live quote",

    source:
      "Source",

    asOf:
      "As of",

    researchConclusion:
      "Research Conclusion",

    currentState:
      "Current state",

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

    scenarios:
      "Scenarios",

    strengths:
      "Strengths",

    risks:
      "Risks",

    supportingEvidence:
      "Supporting evidence",

    invalidation:
      "Invalidation conditions",

    watchMetrics:
      "Watch metrics",

    evidence:
      "Evidence",

    originalEvidence:
      "Original evidence",

    openOriginalEvidence:
      "View source",

    noStructured:
      "No structured information.",

    noEvidence:
      "No external evidence was returned.",

    dataNotice:
      "Current market values may be based on web evidence rather than a verified exchange real-time feed.",

    disclaimer:
      "AIOS provides market research, evidence and risk-review support. It does not provide personalized investment advice, rank securities, or execute trades automatically.",
  },

  "zh-CN": {
    eyebrow:
      "AIOS 市场研究",

    title:
      "市场研究",

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
      "开始分析",

    researching:
      "研究中…",

    requestError:
      "请求错误",

    requestFailed:
      "市场研究请求失败。",

    runtime:
      "运行状态",

    runtimePass:
      "正常",

    runtimeFailed:
      "失败",

    verified:
      "已验证",

    notVerified:
      "未验证",

    structuredVerified:
      "结构化数据已验证",

    webEvidence:
      "Web 证据",

    sources:
      "来源",

    domains:
      "独立域名",

    primarySource:
      "主要来源",

    yes:
      "是",

    no:
      "否",

    marketSnapshot:
      "市场快照",

    price:
      "价格",

    change:
      "涨跌",

    marketCap:
      "市值",

    pe:
      "P/E",

    pb:
      "P/B",

    eps:
      "EPS",

    revenue:
      "营收",

    dataQuality:
      "数据质量",

    liveQuote:
      "实时行情",

    source:
      "来源",

    asOf:
      "数据时间",

    researchConclusion:
      "研究结论",

    currentState:
      "当前状态",

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

    scenarios:
      "情景",

    strengths:
      "优势",

    risks:
      "风险因素",

    supportingEvidence:
      "支持性证据",

    invalidation:
      "可能使当前判断失效的因素",

    watchMetrics:
      "持续观察指标",

    evidence:
      "证据",

    originalEvidence:
      "原始证据",

    openOriginalEvidence:
      "查看来源",

    noStructured:
      "暂无结构化信息。",

    noEvidence:
      "没有返回外部证据。",

    dataNotice:
      "当前市场数据可能来自 Web 证据，并不等同于经过验证的交易所实时行情。",

    disclaimer:
      "AIOS 提供市场研究、证据与风险审查支持，不提供个性化投资建议、不对证券进行排名，也不会自动执行交易。",
  },

  ja: {
    eyebrow:
      "AIOS 市場リサーチ",

    title:
      "市場リサーチ",

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
      "分析開始",

    researching:
      "分析中…",

    requestError:
      "リクエストエラー",

    requestFailed:
      "市場リサーチに失敗しました。",

    runtime:
      "Runtime",

    runtimePass:
      "正常",

    runtimeFailed:
      "失敗",

    verified:
      "検証済み",

    notVerified:
      "未検証",

    structuredVerified:
      "構造化データ検証済み",

    webEvidence:
      "Web エビデンス",

    sources:
      "ソース",

    domains:
      "独立ドメイン",

    primarySource:
      "主要ソース",

    yes:
      "はい",

    no:
      "いいえ",

    marketSnapshot:
      "マーケットスナップショット",

    price:
      "価格",

    change:
      "変化率",

    marketCap:
      "時価総額",

    pe:
      "P/E",

    pb:
      "P/B",

    eps:
      "EPS",

    revenue:
      "売上高",

    dataQuality:
      "データ品質",

    liveQuote:
      "リアルタイム価格",

    source:
      "ソース",

    asOf:
      "取得時点",

    researchConclusion:
      "リサーチ結論",

    currentState:
      "現在の状態",

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

    scenarios:
      "シナリオ",

    strengths:
      "強み",

    risks:
      "リスク要因",

    supportingEvidence:
      "支持するエビデンス",

    invalidation:
      "判断を無効化する条件",

    watchMetrics:
      "継続監視指標",

    evidence:
      "エビデンス",

    originalEvidence:
      "原文エビデンス",

    openOriginalEvidence:
      "ソースを表示",

    noStructured:
      "構造化情報はありません。",

    noEvidence:
      "外部エビデンスはありません。",

    dataNotice:
      "現在の市場データは Web エビデンスに基づく場合があり、検証済みの取引所リアルタイム価格とは異なります。",

    disclaimer:
      "AIOS は市場リサーチ、エビデンス、リスクレビューを支援します。個別の投資助言、銘柄ランキング、自動売買は提供しません。",
  },
};

function marketLabel(
  locale: Locale,
  market?: string,
): string {
  if (
    locale === "zh-CN"
  ) {
    if (market === "us")
      return "美国";

    if (market === "hk")
      return "香港";

    if (market === "cn")
      return "中国 A 股";
  }

  if (
    locale === "ja"
  ) {
    if (market === "us")
      return "米国";

    if (market === "hk")
      return "香港";

    if (market === "cn")
      return "中国 A 株";
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
  if (
    locale === "zh-CN"
  ) {
    if (
      value ===
      "web-evidence"
    )
      return "Web 证据";

    if (value === "live")
      return "实时数据";

    if (value === "delayed")
      return "延迟数据";

    if (
      value === "historical"
    )
      return "历史数据";

    if (
      value === "insufficient"
    )
      return "数据不足";
  }

  if (
    locale === "ja"
  ) {
    if (
      value ===
      "web-evidence"
    )
      return "Web エビデンス";

    if (value === "live")
      return "リアルタイム";

    if (value === "delayed")
      return "遅延データ";

    if (
      value === "historical"
    )
      return "過去データ";

    if (
      value === "insufficient"
    )
      return "データ不足";
  }

  return value ?? "N/A";
}

function riskLevelLabel(
  locale: Locale,
  value?: string,
): string {
  if (
    locale === "zh-CN"
  ) {
    if (value === "low")
      return "低";

    if (value === "medium")
      return "中";

    if (value === "high")
      return "高";

    return "未知";
  }

  if (
    locale === "ja"
  ) {
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

function translateRuntimeText(
  locale: Locale,
  value?: string,
): string {
  if (!value)
    return "";

  if (
    locale === "en"
  )
    return value;

  const exact: Record<
    string,
    Record<
      "zh-CN" | "ja",
      string
    >
  > = {
    "Company-level context was collected from external evidence and should be reviewed against primary filings.": {
      "zh-CN":
        "已从外部证据收集公司层面信息，应结合公司主要申报文件进一步核验。",
      ja:
        "外部エビデンスから企業レベルの情報を収集しました。主要開示資料との照合が必要です。",
    },

    "Insufficient company-level evidence.": {
      "zh-CN":
        "公司层面证据不足。",
      ja:
        "企業レベルのエビデンスが不足しています。",
    },

    "Fundamental operating signals were detected.": {
      "zh-CN":
        "检测到基本面经营信号。",
      ja:
        "ファンダメンタルズ上の事業シグナルが検出されました。",
    },

    "Multiple external sources were retrieved.": {
      "zh-CN":
        "已获取多个外部来源。",
      ja:
        "複数の外部ソースを取得しました。",
    },

    "Some fundamental indicators were detected and should be validated against company filings.": {
      "zh-CN":
        "检测到部分基本面指标，应结合公司披露文件进一步验证。",
      ja:
        "一部のファンダメンタル指標が検出されました。企業開示資料との照合が必要です。",
    },

    "Insufficient structured fundamental data.": {
      "zh-CN":
        "结构化基本面数据不足。",
      ja:
        "構造化されたファンダメンタルデータが不足しています。",
    },

    "Valuation indicators were detected but no peer-based valuation conclusion is made automatically.": {
      "zh-CN":
        "检测到估值指标，但系统不会自动形成基于同行比较的估值结论。",
      ja:
        "バリュエーション指標が検出されましたが、比較企業に基づく結論を自動生成していません。",
    },

    "Insufficient valuation data.": {
      "zh-CN":
        "估值数据不足。",
      ja:
        "バリュエーションデータが不足しています。",
    },

    "Market-movement signals were detected from external evidence.": {
      "zh-CN":
        "从外部证据中检测到市场波动信号。",
      ja:
        "外部エビデンスから市場変動シグナルが検出されました。",
    },

    "No reliable trend signal was extracted.": {
      "zh-CN":
        "没有提取到可靠的趋势信号。",
      ja:
        "信頼できるトレンドシグナルは抽出されませんでした。",
    },

    "The current snapshot is not a verified exchange real-time quote.": {
      "zh-CN":
        "当前快照不是经过验证的交易所实时行情。",
      ja:
        "現在のスナップショットは、検証済みの取引所リアルタイム価格ではありません。",
    },

    "Evidence breadth is limited; additional independent sources should be checked before making a decision.": {
      "zh-CN":
        "证据覆盖范围有限，在作出判断前应继续检查更多独立来源。",
      ja:
        "エビデンスの範囲が限定されています。判断前に追加の独立ソースを確認する必要があります。",
    },

    "Valuation metrics were not reliably extracted from the available evidence.": {
      "zh-CN":
        "无法从现有证据中可靠提取估值指标。",
      ja:
        "利用可能なエビデンスから信頼できるバリュエーション指標を抽出できませんでした。",
    },

    "Live market data is available.": {
      "zh-CN":
        "当前有实时市场数据。",
      ja:
        "リアルタイム市場データが利用可能です。",
    },

    "Current state is evidence-based rather than verified real-time market data.": {
      "zh-CN":
        "当前状态基于外部证据，而不是经过验证的实时市场数据。",
      ja:
        "現在の状態は、検証済みリアルタイム市場データではなく、エビデンスに基づいています。",
    },

    "Key financial assumptions deteriorate materially.": {
      "zh-CN":
        "关键财务假设发生重大恶化。",
      ja:
        "主要な財務前提が大幅に悪化します。",
    },

    "New regulatory, competitive, or company-specific evidence invalidates the current thesis.": {
      "zh-CN":
        "新的监管、竞争或公司层面证据使当前判断失效。",
      ja:
        "新たな規制、競争環境、企業固有のエビデンスにより現在の判断が無効になります。",
    },

    "A verified live market-data source contradicts the currently observed price information.": {
      "zh-CN":
        "经过验证的实时市场数据与当前观察到的价格信息出现冲突。",
      ja:
        "検証済みリアルタイム市場データが現在観測されている価格情報と矛盾します。",
    },

    "Revenue growth": {
      "zh-CN":
        "营收增长",
      ja:
        "売上高成長率",
    },

    "EPS / profitability": {
      "zh-CN":
        "EPS / 盈利能力",
      ja:
        "EPS / 収益性",
    },

    "Free cash flow": {
      "zh-CN":
        "自由现金流",
      ja:
        "フリーキャッシュフロー",
    },

    "P/E and P/B relative to comparable companies": {
      "zh-CN":
        "相对于可比公司的 P/E 与 P/B",
      ja:
        "比較企業に対する P/E と P/B",
    },

    "Debt and liquidity": {
      "zh-CN":
        "债务与流动性",
      ja:
        "負債と流動性",
    },

    "Industry growth": {
      "zh-CN":
        "行业增长",
      ja:
        "業界成長率",
    },

    "Material company or regulatory news": {
      "zh-CN":
        "重大公司或监管新闻",
      ja:
        "重要な企業・規制ニュース",
    },

    "Verified market price and volume": {
      "zh-CN":
        "经过验证的市场价格与成交量",
      ja:
        "検証済み市場価格と出来高",
    },
  };

  if (
    exact[value]
  ) {
    return exact[value][
      locale
    ];
  }

  if (
    locale === "zh-CN"
  ) {
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
        mapped[
          industry[1]
        ] ??
        industry[1]
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

  if (
    locale === "ja"
  ) {
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
        mapped[
          industry[1]
        ] ??
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

  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        0,
      maximumFractionDigits:
        digits,
    },
  ).format(value);
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

  const prefix =
    value > 0
      ? "+"
      : "";

  return `${prefix}${formatNumber(
    value,
    2,
  )}%`;
}

function formatCompactMoney(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  const absolute =
    Math.abs(value);

  if (
    absolute >=
    1_000_000_000_000
  ) {
    return `${formatNumber(
      value /
        1_000_000_000_000,
      2,
    )}T`;
  }

  if (
    absolute >=
    1_000_000_000
  ) {
    return `${formatNumber(
      value /
        1_000_000_000,
      2,
    )}B`;
  }

  if (
    absolute >=
    1_000_000
  ) {
    return `${formatNumber(
      value /
        1_000_000,
      2,
    )}M`;
  }

  return formatNumber(
    value,
    0,
  );
}

function formatDate(
  value?: string | null,
): string {
  if (!value)
    return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

async function analyzeMarket(
  symbol: string,
  market: MarketRegion,
): Promise<PublicMarketResult> {
  const response =
    await fetch(
      "/api/market/intelligence",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          symbol,
          market,
        }),

        cache:
          "no-store",
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

function Panel({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      style={{
        marginTop:
          compact ? 10 : 14,
        padding:
          compact ? 13 : 16,
        border:
          "1px solid rgba(255,255,255,0.09)",
        borderRadius: 15,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))",
        boxShadow:
          "0 8px 30px rgba(0,0,0,0.12)",
      }}
    >
      {children}
    </section>
  );
}

function PanelTitle({
  title,
  meta,
}: {
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 800,
          letterSpacing:
            "-0.01em",
        }}
      >
        {title}
      </h2>

      {meta && (
        <div
          style={{
            fontSize: 11,
            opacity: 0.5,
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
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
      background:
        "rgba(74,222,128,0.11)",
      color:
        "#86efac",
      border:
        "rgba(74,222,128,0.20)",
    },

    warning: {
      background:
        "rgba(251,191,36,0.10)",
      color:
        "#fcd34d",
      border:
        "rgba(251,191,36,0.18)",
    },

    negative: {
      background:
        "rgba(248,113,113,0.10)",
      color:
        "#fca5a5",
      border:
        "rgba(248,113,113,0.18)",
    },

    neutral: {
      background:
        "rgba(255,255,255,0.055)",
      color:
        "#d4d4d8",
      border:
        "rgba(255,255,255,0.10)",
    },
  };

  const style =
    styles[tone];

  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        minHeight: 24,
        padding:
          "3px 8px",
        borderRadius:
          999,
        border:
          `1px solid ${style.border}`,
        background:
          style.background,
        color:
          style.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace:
          "nowrap",
      }}
    >
      {children}
    </span>
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
    <div
      style={{
        minWidth: 0,
        padding:
          "11px 12px",
        border:
          "1px solid rgba(255,255,255,0.07)",
        borderRadius: 11,
        background:
          "rgba(255,255,255,0.025)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          opacity: 0.48,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            emphasis ? 22 : 15,
          fontWeight:
            emphasis ? 850 : 750,
          lineHeight: 1.15,
          overflow:
            "hidden",
          textOverflow:
            "ellipsis",
          whiteSpace:
            "nowrap",
        }}
      >
        {value}
      </div>

      {sub && (
        <div
          style={{
            marginTop: 5,
            fontSize: 10,
            opacity: 0.48,
          }}
        >
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
  if (
    !items?.length
  ) {
    return (
      <div
        style={{
          fontSize: 12,
          opacity: 0.48,
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
        paddingLeft: 18,
        display: "grid",
        gap: 6,
        fontSize: 12,
        lineHeight: 1.55,
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
            {translateRuntimeText(
              locale,
              item,
            )}
          </li>
        ),
      )}
    </ul>
  );
}

function TextBlock({
  locale,
  value,
}: {
  locale: Locale;
  value?: string;
}) {
  if (!value)
    return null;

  return (
    <p
      style={{
        margin:
          "0 0 10px",
        fontSize: 13,
        lineHeight: 1.65,
        color:
          "rgba(244,244,245,0.88)",
      }}
    >
      {translateRuntimeText(
        locale,
        value,
      )}
    </p>
  );
}

function Subheading({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        margin:
          "14px 0 7px",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing:
          "0.03em",
        opacity: 0.58,
        textTransform:
          "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function ResearchBlock({
  title,
  summary,
  items,
  locale,
}: {
  title: string;
  summary?: string;
  items?: string[];
  locale: Locale;
}) {
  return (
    <details
      style={{
        border:
          "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        background:
          "rgba(255,255,255,0.025)",
        overflow:
          "hidden",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          padding:
            "12px 13px",
          fontSize: 13,
          fontWeight: 750,
        }}
      >
        <span
          style={{
            display:
              "inline-flex",
            alignItems:
              "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius:
                999,
              background:
                "rgba(255,255,255,0.45)",
            }}
          />

          {title}
        </span>
      </summary>

      <div
        style={{
          padding:
            "0 13px 13px",
          borderTop:
            "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            paddingTop: 11,
          }}
        >
          <TextBlock
            locale={locale}
            value={summary}
          />

          <List
            locale={locale}
            items={items}
            emptyText={
              "No structured information."
            }
          />
        </div>
      </div>
    </details>
  );
}

export default function MarketResearchPage() {
  const {
    locale,
  } = useLanguage();

  const ui =
    copy[locale];

  const [
    symbol,
    setSymbol,
  ] = useState(
    "AAPL",
  );

  const [
    market,
    setMarket,
  ] = useState<MarketRegion>(
    "us",
  );

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

    if (!normalizedSymbol)
      return;

    setLoading(true);
    setError("");

    try {
      const data =
        await analyzeMarket(
          normalizedSymbol,
          market,
        );

      setResult(data);
    } catch (
      requestError
    ) {
      setResult(null);

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

  const risk =
    analysis?.risk;

  const isWebEvidence =
    snapshot?.dataQuality ===
    "web-evidence";

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
          "24px 12px 56px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            820,
          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            padding:
              "4px 2px 18px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing:
                "0.14em",
              opacity: 0.42,
              marginBottom: 6,
            }}
          >
            {ui.eyebrow}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize:
                "clamp(25px, 7vw, 34px)",
              lineHeight: 1.05,
              letterSpacing:
                "-0.035em",
              fontWeight: 900,
            }}
          >
            {ui.title}
          </h1>

          <p
            style={{
              margin:
                "7px 0 0",
              fontSize: 12,
              opacity: 0.52,
            }}
          >
            {ui.subtitle}
          </p>
        </header>

        <Panel>
          <PanelTitle
            title={
              ui.research
            }
          />

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 9,
            }}
          >
            <input
              value={symbol}
              onChange={(
                event,
              ) =>
                setSymbol(
                  event.target.value.toUpperCase(),
                )
              }
              onKeyDown={(
                event,
              ) => {
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
              style={{
                width:
                  "100%",
                minWidth: 0,
                boxSizing:
                  "border-box",
                padding:
                  "12px 13px",
                borderRadius:
                  10,
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "#151518",
                color:
                  "#fff",
                outline:
                  "none",
                fontSize: 14,
                fontWeight: 700,
              }}
            />

            <select
              value={market}
              onChange={(
                event,
              ) =>
                setMarket(
                  event.target.value as MarketRegion,
                )
              }
              aria-label={
                ui.marketSnapshot
              }
              style={{
                width:
                  "100%",
                minWidth: 0,
                padding:
                  "12px 13px",
                borderRadius:
                  10,
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "#151518",
                color:
                  "#fff",
                fontSize: 14,
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
              onClick={() =>
                void runAnalysis()
              }
              disabled={
                loading ||
                !symbol.trim()
              }
              style={{
                minHeight: 44,
                padding:
                  "11px 16px",
                border: "none",
                borderRadius:
                  10,
                background:
                  loading
                    ? "#3f3f46"
                    : "#f4f4f5",
                color:
                  loading
                    ? "#a1a1aa"
                    : "#09090b",
                fontWeight: 850,
                fontSize: 13,
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
        </Panel>

        {error && (
          <Panel compact>
            <PanelTitle
              title={
                ui.requestError
              }
            />

            <div
              style={{
                color:
                  "#fca5a5",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {error}
            </div>
          </Panel>
        )}

        {result && (
          <>
            <Panel>
              <div
                style={{
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "baseline",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        letterSpacing:
                          "-0.025em",
                      }}
                    >
                      {
                        result.instrument
                          ?.normalizedSymbol
                      }
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.5,
                      }}
                    >
                      {marketLabel(
                        locale,
                        result.instrument
                          ?.market,
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      opacity: 0.45,
                    }}
                  >
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

                <div
                  style={{
                    display:
                      "flex",
                    flexWrap:
                      "wrap",
                    gap: 6,
                  }}
                >
                  <Badge
                    tone={
                      result.success
                        ? "positive"
                        : "negative"
                    }
                  >
                    {ui.runtime}:{" "}
                    {result.success
                      ? ui.runtimePass
                      : ui.runtimeFailed}
                  </Badge>

                  <Badge
                    tone={
                      result.verified
                        ? "positive"
                        : "warning"
                    }
                  >
                    {result.verified
                      ? ui.verified
                      : ui.notVerified}
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
              </div>

              <div
                style={{
                  marginTop: 14,
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(115px, 1fr))",
                  gap: 8,
                }}
              >
                <Metric
                  label={
                    ui.price
                  }
                  value={
                    formatNumber(
                      snapshot?.price,
                      2,
                    )
                  }
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
                  label={
                    ui.pe
                  }
                  value={
                    formatNumber(
                      snapshot?.pe,
                      2,
                    )
                  }
                />

                <Metric
                  label={
                    ui.pb
                  }
                  value={
                    formatNumber(
                      snapshot?.pb,
                      2,
                    )
                  }
                />

                <Metric
                  label={
                    ui.eps
                  }
                  value={
                    formatNumber(
                      snapshot?.eps,
                      2,
                    )
                  }
                />

                <Metric
                  label={
                    ui.marketCap
                  }
                  value={
                    formatCompactMoney(
                      snapshot?.marketCap,
                    )
                  }
                />

                <Metric
                  label={
                    ui.revenue
                  }
                  value={
                    formatCompactMoney(
                      snapshot?.revenue,
                    )
                  }
              />
              </div>

              <div
                style={{
                  marginTop: 11,
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  gap:
                    "6px 14px",
                  fontSize: 10,
                  opacity: 0.48,
                  lineHeight: 1.5,
                }}
              >
                <span>
                  {ui.dataQuality}:{" "}
                  {dataQualityLabel(
                    locale,
                    snapshot?.dataQuality,
                  )}
                </span>

                <span>
                  {ui.liveQuote}:{" "}
                  {snapshot?.liveQuoteAvailable
                    ? ui.yes
                    : ui.no}
                </span>

                <span>
                  {ui.source}:{" "}
                  {snapshot?.source ??
                    "—"}
                </span>

                <span>
                  {ui.asOf}:{" "}
                  {formatDate(
                    snapshot?.asOf,
                  )}
                </span>
              </div>

              {isWebEvidence && (
                <div
                  style={{
                    marginTop: 11,
                    padding:
                      "9px 10px",
                    borderRadius:
                      9,
                    background:
                      "rgba(251,191,36,0.07)",
                    border:
                      "1px solid rgba(251,191,36,0.12)",
                    color:
                      "#fcd34d",
                    fontSize: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {ui.dataNotice}
                </div>
              )}
            </Panel>

            {analysis?.decisionSupport && (
              <Panel>
                <PanelTitle
                  title={
                    ui.researchConclusion
                  }
                  meta={
                    risk
                      ? `${ui.risk}: ${riskLevelLabel(
                          locale,
                          risk.level,
                        )}`
                      : undefined
                  }
                />

                <div
                  style={{
                    padding:
                      "12px 13px",
                    borderRadius:
                      11,
                    background:
                      "rgba(255,255,255,0.035)",
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.45,
                      marginBottom: 5,
                    }}
                  >
                    {ui.currentState}
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      fontWeight: 650,
                    }}
                  >
                    {translateRuntimeText(
                      locale,
                      analysis
                        .decisionSupport
                        .currentState,
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 11,
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      padding:
                        "11px 12px",
                      borderRadius:
                        11,
                      background:
                        "rgba(255,255,255,0.025)",
                      border:
                        "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Subheading>
                      {
                        ui.supportingEvidence
                      }
                    </Subheading>

                    <List
                      locale={
                        locale
                      }
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

                  <div
                    style={{
                      padding:
                        "11px 12px",
                      borderRadius:
                        11,
                      background:
                        "rgba(255,255,255,0.025)",
                      border:
                        "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Subheading>
                      {
                        ui.watchMetrics
                      }
                    </Subheading>

                    <List
                      locale={
                        locale
                      }
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
                </div>

                <div
                  style={{
                    marginTop: 11,
                  }}
                >
                  <Subheading>
                    {
                      ui.invalidation
                    }
                  </Subheading>

                  <List
                    locale={
                      locale
                    }
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
              </Panel>
            )}

            <Panel>
              <PanelTitle
                title={
                  ui.industry
                }
              />

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 8,
                }}
              >
                {analysis?.industry && (
                  <ResearchBlock
                    title={
                      ui.industry
                    }
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
                    locale={
                      locale
                    }
                  />
                )}

                {analysis?.company && (
                  <ResearchBlock
                    title={
                      ui.company
                    }
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
                    locale={
                      locale
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
                    locale={
                      locale
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
                    locale={
                      locale
                    }
                  />
                )}

                {analysis?.trend && (
                  <ResearchBlock
                    title={
                      ui.trend
                    }
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
                    locale={
                      locale
                    }
                  />
                )}

                {analysis?.risk && (
                  <ResearchBlock
                    title={
                      ui.risk
                    }
                    summary={`Risk level: ${riskLevelLabel(
                      locale,
                      analysis.risk.level,
                    )}`}
                    items={
                      analysis
                        .risk
                        .factors
                    }
                    locale={
                      locale
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
                    summary={
                      analysis
                        .decisionSupport
                        .scenarios
                        .map(
                          (
                            item,
                          ) =>
                            `${item.name}: ${item.condition}`,
                        )
                        .join(
                          " · ",
                        )
                    }
                    items={
                      analysis
                        .decisionSupport
                        .scenarios
                        .map(
                          (
                            item,
                          ) =>
                            `${item.name}: ${item.implication}`,
                        )
                    }
                    locale={
                      locale
                    }
                  />
                ) : null}
              </div>
            </Panel>

            <Panel>
              <details>
                <summary
                  style={{
                    cursor:
                      "pointer",
                    listStyle:
                      "none",
                    fontSize:
                      15,
                    fontWeight:
                      800,
                  }}
                >
                  {ui.evidence}
                  <span
                    style={{
                      marginLeft:
                        8,
                      fontSize:
                        10,
                      opacity:
                        0.42,
                      fontWeight:
                        500,
                    }}
                  >
                    {verification?.sourceCount ??
                      0}{" "}
                    {ui.sources}
                  </span>
                </summary>

                <div
                  style={{
                    marginTop:
                      12,
                    paddingTop:
                      12,
                    borderTop:
                      "1px solid rgba(255,255,255,0.07)",
                    display:
                      "grid",
                    gap: 7,
                  }}
                >
                  {!result.evidence?.length ? (
                    <div
                      style={{
                        opacity:
                          0.48,
                        fontSize:
                          12,
                      }}
                    >
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
                          style={{
                            border:
                              "1px solid rgba(255,255,255,0.07)",
                            borderRadius:
                              10,
                            background:
                              "rgba(255,255,255,0.02)",
                          }}
                        >
                          <summary
                            style={{
                              cursor:
                                "pointer",
                              padding:
                                "10px 11px",
                              fontSize:
                                11,
                              fontWeight:
                                700,
                            }}
                          >
                            {item.hostname ??
                              "Source"}

                            <span
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  3,
                                fontSize:
                                  10,
                                opacity:
                                  0.42,
                                fontWeight:
                                  500,
                              }}
                            >
                              {item.title ??
                                ui.openOriginalEvidence}
                            </span>
                          </summary>

                          <div
                            style={{
                              padding:
                                "0 11px 11px",
                              fontSize:
                                11,
                              lineHeight:
                                1.55,
                              opacity:
                                0.72,
                            }}
                          >
                            <div
                              style={{
                                paddingTop:
                                  9,
                                borderTop:
                                  "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              {
                                item.snippet
                              }
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
                                    7,
                                  color:
                                    "#93c5fd",
                                  textDecoration:
                                    "none",
                                }}
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
            </Panel>

            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap:
                  "5px 12px",
                marginTop:
                  11,
                padding:
                  "0 3px",
                fontSize:
                  10,
                lineHeight:
                  1.5,
                opacity:
                  0.38,
              }}
            >
              <span>
                {ui.domains}:{" "}
                {verification?.independentDomains ??
                  0}
              </span>

              <span>
                {ui.primarySource}:{" "}
                {verification?.primarySourceFound
                  ? ui.yes
                  : ui.no}
              </span>

              <span>
                {ui.liveQuote}:{" "}
                {snapshot?.liveQuoteAvailable
                  ? ui.yes
                  : ui.no}
              </span>

              {result.latencyMs !==
                undefined && (
                <span>
                  {result.latencyMs}ms
                </span>
              )}
            </div>

            <div
              style={{
                marginTop:
                  16,
                padding:
                  "0 4px",
                fontSize:
                  10,
                lineHeight:
                  1.6,
                opacity:
                  0.34,
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
