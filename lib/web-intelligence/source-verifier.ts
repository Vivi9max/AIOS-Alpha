import type {
  WebEvidence,
} from "@/lib/web-intelligence";

export type SourceCredibilityTier =
  | "primary"
  | "authoritative"
  | "established"
  | "secondary"
  | "unknown";

export interface VerifiedWebEvidence
  extends WebEvidence {
  credibilityTier: SourceCredibilityTier;
  credibilityScore: number;
  corroborationCount: number;
  corroborationScore: number;
  verificationScore: number;
  verificationLabel:
    | "high"
    | "medium"
    | "limited";
}

const PRIMARY_HOSTS = [
  "gov.cn",
  "gov.hk",
  "gov.jp",
  "gov.uk",
  "gov",
  "go.jp",
  "pbc.gov.cn",
  "safe.gov.cn",
  "csrc.gov.cn",
  "federalreserve.gov",
  "ecb.europa.eu",
  "bankofengland.co.uk",
  "boj.or.jp",
  "bis.org",
  "imf.org",
  "worldbank.org",
];

const AUTHORITATIVE_HOSTS = [
  "reuters.com",
  "apnews.com",
  "bloomberg.com",
  "ft.com",
  "wsj.com",
  "nikkei.com",
  "nhk.or.jp",
  "bbc.com",
  "bbc.co.uk",
  "npr.org",
  "yomiuri.co.jp",
  "asahi.com",
  "mainichi.jp",
  "jiji.com",
];

const ESTABLISHED_HOSTS = [
  "investing.com",
  "tradingview.com",
  "marketwatch.com",
  "yahoo.com",
  "yahoo.co.jp",
  "cnbc.com",
  "forbes.com",
  "economist.com",
  "moneydj.com",
  "statista.com",
  "similarweb.com",
  "grandviewresearch.com",
  "mckinsey.com",
  "deloitte.com",
  "pwc.com",
  "kpmg.com",
  "shopify.com",
  "amazon.com",
  "amazon.co.jp",
  "rakuten.co.jp",
  "mercari.com",
  "indeed.com",
  "linkedin.com",
  "glassdoor.com",
];

const COMMERCIAL_HOST_HINTS = [
  "amazon.",
  "rakuten.",
  "mercari.",
  "shopify.",
  "ebay.",
  "alibaba.",
  "aliexpress.",
  "indeed.",
  "linkedin.",
  "glassdoor.",
  "jobstreet.",
  "career.",
  "jobs.",
  "company.",
  "business.",
  "market.",
  "commerce.",
  "trade.",
  "export.",
  "supplier.",
  "distributor.",
];

const COMMERCIAL_SIGNAL_TERMS = [
  "sales",
  "sale",
  "revenue",
  "growth",
  "market",
  "market share",
  "demand",
  "customer",
  "customers",
  "buyer",
  "buyers",
  "supplier",
  "suppliers",
  "distributor",
  "distributors",
  "partnership",
  "partner",
  "expansion",
  "export",
  "exports",
  "import",
  "imports",
  "ecommerce",
  "e-commerce",
  "cross-border",
  "cross border",
  "overseas",
  "japan",
  "japanese",
  "business",
  "company",
  "companies",
  "brand",
  "brands",
  "product",
  "products",
  "launch",
  "launched",
  "hiring",
  "recruitment",
  "job",
  "jobs",
  "distribution",
  "market entry",
  "market-entry",
  "sales growth",
  "customer demand",
  "market demand",
  "海外",
  "輸出",
  "輸入",
  "販売",
  "売上",
  "市場",
  "需要",
  "顧客",
  "企業",
  "会社",
  "ブランド",
  "商品",
  "越境",
  "越境EC",
  "海外展開",
  "日本市場",
  "日本進出",
  "採用",
  "求人",
  "代理店",
  "販売代理",
  "提携",
  "事業拡大",
  "市场",
  "需求",
  "客户",
  "企业",
  "品牌",
  "销售",
  "销量",
  "营收",
  "出口",
  "进口",
  "跨境",
  "跨境电商",
  "海外市场",
  "日本市场",
  "日本市场进入",
  "招聘",
  "代理商",
  "经销商",
  "合作",
  "扩张",
];

function normalizeHost(
  hostname: string,
): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function hostMatches(
  hostname: string,
  candidates: string[],
): boolean {
  const normalized =
    normalizeHost(hostname);

  return candidates.some(
    (candidate) =>
      normalized === candidate ||
      normalized.endsWith(
        `.${candidate}`,
      ),
  );
}

function resolveTier(
  hostname: string,
): SourceCredibilityTier {
  const normalized =
    normalizeHost(hostname);

  if (
    hostMatches(
      normalized,
      PRIMARY_HOSTS,
    )
  ) {
    return "primary";
  }

  if (
    hostMatches(
      normalized,
      AUTHORITATIVE_HOSTS,
    )
  ) {
    return "authoritative";
  }

  if (
    hostMatches(
      normalized,
      ESTABLISHED_HOSTS,
    )
  ) {
    return "established";
  }

  if (
    normalized.endsWith(".edu") ||
    normalized.endsWith(".ac.uk") ||
    normalized.endsWith(".ac.jp") ||
    normalized.endsWith(".edu.cn")
  ) {
    return "authoritative";
  }

  return "unknown";
}

function tierScore(
  tier: SourceCredibilityTier,
): number {
  switch (tier) {
    case "primary":
      return 0.98;
    case "authoritative":
      return 0.92;
    case "established":
      return 0.82;
    case "secondary":
      return 0.68;
    default:
      return 0.5;
  }
}

function normalizeText(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(
      /https?:\/\/\S+/g,
      " ",
    )
    .replace(
      /[^\p{L}\p{N}%.$-]+/gu,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function compactText(
  value: string,
): string {
  return normalizeText(value)
    .replace(
      /\s+/g,
      "",
    )
    .trim();
}

function tokenize(
  value: string,
): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter(
        (token) =>
          token.length >= 2,
      ),
  );
}

function calculateTextAgreement(
  left: string,
  right: string,
): number {
  const a = tokenize(left);
  const b = tokenize(right);

  if (
    a.size === 0 ||
    b.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union =
    new Set([
      ...a,
      ...b,
    ]).size;

  if (union === 0) {
    return 0;
  }

  return intersection / union;
}

function calculateCharacterAgreement(
  left: string,
  right: string,
): number {
  const a = compactText(left);
  const b = compactText(right);

  if (
    a.length < 4 ||
    b.length < 4
  ) {
    return 0;
  }

  const maxWindow = Math.min(
    24,
    Math.min(
      a.length,
      b.length,
    ),
  );

  let best = 0;

  for (
    let size = maxWindow;
    size >= 4;
    size -= 2
  ) {
    const seen =
      new Set<string>();

    for (
      let index = 0;
      index + size <= a.length;
      index += 1
    ) {
      seen.add(
        a.slice(
          index,
          index + size,
        ),
      );
    }

    if (seen.size === 0) {
      continue;
    }

    let common = 0;

    for (
      let index = 0;
      index + size <= b.length;
      index += 1
    ) {
      if (
        seen.has(
          b.slice(
            index,
            index + size,
          ),
        )
      ) {
        common += 1;
      }
    }

    if (common > 0) {
      const score =
        Math.min(
          1,
          common / 3,
        );

      best = Math.max(
        best,
        score,
      );
    }

    if (best >= 1) {
      break;
    }
  }

  return best;
}

function extractNumbers(
  text: string,
): string[] {
  return Array.from(
    new Set(
      text.match(
        /-?\d+(?:\.\d+)?%?/g,
      ) ?? [],
    ),
  );
}

function calculateNumericAgreement(
  left: string,
  right: string,
): number {
  const a =
    extractNumbers(left);
  const b =
    extractNumbers(right);

  if (
    a.length === 0 ||
    b.length === 0
  ) {
    return 0;
  }

  const common =
    a.filter(
      (value) =>
        b.includes(value),
    ).length;

  return (
    common /
    Math.max(
      a.length,
      b.length,
    )
  );
}

function calculateCommercialSignalScore(
  evidence: WebEvidence,
): number {
  const text =
    normalizeText(
      [
        evidence.title,
        evidence.hostname,
        ...evidence.snippets,
      ].join(" "),
    );

  if (!text) {
    return 0;
  }

  let matches = 0;

  for (
    const term of COMMERCIAL_SIGNAL_TERMS
  ) {
    if (
      text.includes(
        term.toLowerCase(),
      )
    ) {
      matches += 1;
    }
  }

  const signalScore =
    Math.min(
      1,
      matches / 6,
    );

  const commercialHost =
    COMMERCIAL_HOST_HINTS.some(
      (hint) =>
        normalizeHost(
          evidence.hostname,
        ).includes(
          hint.toLowerCase(),
        ),
    );

  return Math.min(
    1,
    signalScore +
      (commercialHost
        ? 0.15
        : 0),
  );
}

function calculatePairAgreement(
  left: WebEvidence,
  right: WebEvidence,
): number {
  const leftText =
    [
      left.title,
      left.hostname,
      ...left.snippets,
    ].join(" ");

  const rightText =
    [
      right.title,
      right.hostname,
      ...right.snippets,
    ].join(" ");

  const textAgreement =
    calculateTextAgreement(
      leftText,
      rightText,
    );

  const characterAgreement =
    calculateCharacterAgreement(
      leftText,
      rightText,
    );

  const numericAgreement =
    calculateNumericAgreement(
      leftText,
      rightText,
    );

  const leftCommercial =
    calculateCommercialSignalScore(
      left,
    );

  const rightCommercial =
    calculateCommercialSignalScore(
      right,
    );

  const commercialAgreement =
    Math.min(
      leftCommercial,
      rightCommercial,
    );

  return Math.min(
    1,
    textAgreement * 0.35 +
      characterAgreement * 0.15 +
      numericAgreement * 0.25 +
      commercialAgreement * 0.25,
  );
}

function calculateCorroboration(
  evidence: WebEvidence[],
  targetIndex: number,
): {
  count: number;
  score: number;
} {
  const target =
    evidence[targetIndex];

  if (!target) {
    return {
      count: 0,
      score: 0,
    };
  }

  const targetHost =
    normalizeHost(
      target.hostname,
    );

  const independent =
    evidence.filter(
      (item, index) =>
        index !== targetIndex &&
        normalizeHost(
          item.hostname,
        ) !== targetHost,
    );

  const agreements =
    independent
      .map(
        (item) =>
          calculatePairAgreement(
            target,
            item,
          ),
      )
      .filter(
        (score) =>
          score >= 0.12,
      );

  const count =
    agreements.length;

  if (count === 0) {
    return {
      count: 0,
      score: 0,
    };
  }

  const strongest =
    Math.max(
      ...agreements,
    );

  const independentBoost =
    Math.min(
      0.3,
      count * 0.1,
    );

  return {
    count,
    score: Math.min(
      1,
      strongest +
        independentBoost,
    ),
  };
}

function resolveVerificationLabel(
  score: number,
):
  | "high"
  | "medium"
  | "limited" {
  if (score >= 0.78) {
    return "high";
  }

  if (score >= 0.55) {
    return "medium";
  }

  return "limited";
}

function hasIndependentHosts(
  evidence: WebEvidence[],
): boolean {
  return (
    new Set(
      evidence.map(
        (item) =>
          normalizeHost(
            item.hostname,
          ),
      ),
    ).size >= 2
  );
}

function hasStrongCommercialEvidence(
  evidence: WebEvidence[],
): boolean {
  if (
    evidence.length < 2 ||
    !hasIndependentHosts(
      evidence,
    )
  ) {
    return false;
  }

  const commercialScores =
    evidence.map(
      calculateCommercialSignalScore,
    );

  const meaningfulSources =
    commercialScores.filter(
      (score) =>
        score >= 0.25,
    ).length;

  return meaningfulSources >= 2;
}

export function verifyWebEvidence(
  evidence: WebEvidence[],
): VerifiedWebEvidence[] {
  return evidence.map(
    (item, index) => {
      const tier =
        resolveTier(
          item.hostname,
        );

      const baseCredibility =
        tierScore(tier);

      const corroboration =
        calculateCorroboration(
          evidence,
          index,
        );

      const freshnessScore =
        item.freshness === "24h" ||
        item.freshness === "realtime"
          ? 1
          : item.freshness === "7d"
            ? 0.9
            : item.freshness === "30d"
              ? 0.78
              : 0.65;

      const commercialSignal =
        calculateCommercialSignalScore(
          item,
        );

      const verificationScore =
        Math.min(
          0.99,
          baseCredibility * 0.35 +
            corroboration.score * 0.3 +
            freshnessScore * 0.15 +
            commercialSignal * 0.2,
        );

      return {
        ...item,
        credibilityTier: tier,
        credibilityScore:
          baseCredibility,
        corroborationCount:
          corroboration.count,
        corroborationScore:
          corroboration.score,
        verificationScore,
        verificationLabel:
          resolveVerificationLabel(
            verificationScore,
          ),
      };
    },
  );
}

export function calculateOverallVerification(
  evidence: VerifiedWebEvidence[],
): {
  verified: boolean;
  score: number;
  label:
    | "high"
    | "medium"
    | "limited";
} {
  if (
    evidence.length === 0
  ) {
    return {
      verified: false,
      score: 0,
      label: "limited",
    };
  }

  const scores =
    evidence.map(
      (item) =>
        item.verificationScore,
    );

  const average =
    scores.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / scores.length;

  const independentHosts =
    new Set(
      evidence.map(
        (item) =>
          normalizeHost(
            item.hostname,
          ),
      ),
    ).size;

  const primaryExists =
    evidence.some(
      (item) =>
        item.credibilityTier ===
        "primary",
    );

  const authoritativeExists =
    evidence.some(
      (item) =>
        item.credibilityTier ===
        "authoritative",
    );

  const establishedExists =
    evidence.some(
      (item) =>
        item.credibilityTier ===
        "established",
    );

  const corroborated =
    evidence.some(
      (item) =>
        item.corroborationCount >= 1,
    );

  const strongCommercialEvidence =
    hasStrongCommercialEvidence(
      evidence,
    );

  let score = average;

  if (
    independentHosts >= 2
  ) {
    score += 0.08;
  }

  if (
    independentHosts >= 3
  ) {
    score += 0.04;
  }

  if (primaryExists) {
    score += 0.05;
  } else if (
    authoritativeExists
  ) {
    score += 0.03;
  } else if (
    establishedExists
  ) {
    score += 0.015;
  }

  if (corroborated) {
    score += 0.05;
  }

  if (
    strongCommercialEvidence
  ) {
    score += 0.08;
  }

  score = Math.min(
    0.99,
    score,
  );

  const label =
    score >= 0.78
      ? "high"
      : score >= 0.55
        ? "medium"
        : "limited";

  const minimumEvidence =
    evidence.length >= 2;

  const independentEvidence =
    independentHosts >= 2;

  const highEnoughScore =
    score >= 0.55;

  const commercialOverride =
    strongCommercialEvidence &&
    score >= 0.5;

  return {
    verified:
      minimumEvidence &&
      independentEvidence &&
      (
        highEnoughScore ||
        commercialOverride
      ),
    score,
    label,
  };
}
