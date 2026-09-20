import type {
  MarketAnalysis,
  MarketEvidence,
  MarketSnapshot,
} from "./market-types";

function unique(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values.filter(Boolean),
    ),
  );
}

function evidenceText(
  evidence: MarketEvidence[],
): string {
  return evidence
    .map(
      (item) =>
        `${item.title} ${item.snippet}`,
    )
    .join(" ")
    .toLowerCase();
}

function detectIndustry(
  text: string,
): string {
  const groups: Array<{
    name: string;
    signals: string[];
  }> = [
    {
      name: "Technology",
      signals: [
        "software",
        "cloud",
        "artificial intelligence",
        "ai",
        "semiconductor",
        "芯片",
        "人工智能",
        "软件",
      ],
    },
    {
      name: "Financial Services",
      signals: [
        "bank",
        "financial",
        "insurance",
        "银行",
        "金融",
        "保险",
      ],
    },
    {
      name: "Consumer",
      signals: [
        "consumer",
        "retail",
        "e-commerce",
        "零售",
        "消费",
        "电商",
      ],
    },
    {
      name: "Healthcare",
      signals: [
        "healthcare",
        "pharma",
        "biotech",
        "医疗",
        "医药",
        "生物科技",
      ],
    },
    {
      name: "Energy",
      signals: [
        "energy",
        "oil",
        "gas",
        "新能源",
        "能源",
        "石油",
        "天然气",
      ],
    },
  ];

  for (const group of groups) {
    if (
      group.signals.some(
        (signal) =>
          text.includes(signal),
      )
    ) {
      return group.name;
    }
  }

  return "Unclassified";
}

export function analyzeMarket(
  snapshot: MarketSnapshot,
  evidence: MarketEvidence[],
): MarketAnalysis {
  const text =
    evidenceText(evidence);

  const industry =
    detectIndustry(text);

  const fundamentals: string[] = [];
  const valuationSignals: string[] = [];
  const trendSignals: string[] = [];
  const riskFactors: string[] = [];

  if (
    snapshot.revenueGrowth !== null &&
    snapshot.revenueGrowth !== undefined
  ) {
    if (snapshot.revenueGrowth > 10) {
      fundamentals.push(
        `Reported revenue-growth signal is positive at approximately ${snapshot.revenueGrowth}%.`,
      );
    } else if (
      snapshot.revenueGrowth < 0
    ) {
      fundamentals.push(
        `Reported revenue-growth signal is negative at approximately ${snapshot.revenueGrowth}%.`,
      );
    }
  }

  if (
    snapshot.eps !== null &&
    snapshot.eps !== undefined
  ) {
    fundamentals.push(
      `EPS data was detected from external evidence: ${snapshot.eps}.`,
    );
  }

  if (
    snapshot.pe !== null &&
    snapshot.pe !== undefined
  ) {
    valuationSignals.push(
      `P/E evidence detected: ${snapshot.pe}.`,
    );

    if (snapshot.pe > 40) {
      riskFactors.push(
        "The observed P/E level is elevated and should be tested against expected growth and peer valuation.",
      );
    }
  }

  if (
    snapshot.pb !== null &&
    snapshot.pb !== undefined
  ) {
    valuationSignals.push(
      `P/B evidence detected: ${snapshot.pb}.`,
    );
  }

  if (
    snapshot.changePercent !== null &&
    snapshot.changePercent !== undefined
  ) {
    trendSignals.push(
      `Observed percentage-change signal: ${snapshot.changePercent}%.`,
    );
  }

  if (
    snapshot.dataQuality !== "live"
  ) {
    riskFactors.push(
      "The current snapshot is not a verified exchange real-time quote.",
    );
  }

  if (evidence.length < 3) {
    riskFactors.push(
      "Evidence breadth is limited; additional independent sources should be checked before making a decision.",
    );
  }

  if (
    snapshot.pe === null &&
    snapshot.pb === null
  ) {
    riskFactors.push(
      "Valuation metrics were not reliably extracted from the available evidence.",
    );
  }

  const riskLevel =
    riskFactors.length >= 3
      ? "high"
      : riskFactors.length === 2
        ? "medium"
        : riskFactors.length === 1
          ? "medium"
          : "unknown";

  const supportingFactors =
    unique([
      ...fundamentals,
      ...valuationSignals,
      ...trendSignals,
    ]);

  const invalidationConditions =
    unique([
      "Key financial assumptions deteriorate materially.",
      "New regulatory, competitive, or company-specific evidence invalidates the current thesis.",
      snapshot.dataQuality !==
        "live"
        ? "A verified live market-data source contradicts the currently observed price information."
        : "",
    ]);

  const watchMetrics =
    unique([
      "Revenue growth",
      "EPS / profitability",
      "Free cash flow",
      "P/E and P/B relative to comparable companies",
      "Debt and liquidity",
      "Industry growth",
      "Material company or regulatory news",
      "Verified market price and volume",
    ]);

  return {
    industry: {
      summary:
        `Detected industry context: ${industry}.`,
      evidence:
        evidence
          .slice(0, 5)
          .map(
            (item) =>
              item.title,
          ),
    },

    company: {
      summary:
        evidence.length > 0
          ? "Company-level context was collected from external evidence and should be reviewed against primary filings."
          : "Insufficient company-level evidence.",
      strengths:
        unique([
          fundamentals.length > 0
            ? "Fundamental operating signals were detected."
            : "",
          evidence.length >= 3
            ? "Multiple external sources were retrieved."
            : "",
        ]),
      risks:
        riskFactors,
    },

    fundamentals: {
      assessment:
        fundamentals.length > 0
          ? "Some fundamental indicators were detected and should be validated against company filings."
          : "Insufficient structured fundamental data.",
      signals:
        fundamentals,
    },

    valuation: {
      assessment:
        valuationSignals.length > 0
          ? "Valuation indicators were detected but no peer-based valuation conclusion is made automatically."
          : "Insufficient valuation data.",
      signals:
        valuationSignals,
    },

    trend: {
      assessment:
        trendSignals.length > 0
          ? "Market-movement signals were detected from external evidence."
          : "No reliable trend signal was extracted.",
      signals:
        trendSignals,
    },

    risk: {
      level: riskLevel,
      factors:
        riskFactors,
    },

    decisionSupport: {
      currentState:
        snapshot.dataQuality ===
        "live"
          ? "Live market data is available."
          : "Current state is evidence-based rather than verified real-time market data.",

      supportingFactors,

      invalidationConditions,

      watchMetrics,

      scenarios: [
        {
          name: "Fundamentals improve",
          condition:
            "Revenue, profitability, cash flow and industry indicators improve.",
          implication:
            "The underlying operating thesis becomes stronger and should be re-evaluated with updated valuation.",
        },
        {
          name: "Valuation expands",
          condition:
            "Market valuation rises faster than fundamental improvement.",
          implication:
            "Expected return and downside sensitivity should be recalculated.",
        },
        {
          name: "Fundamentals deteriorate",
          condition:
            "Growth, profitability or cash flow materially weaken.",
          implication:
            "The current thesis requires reassessment.",
        },
      ],
    },
  };
}
