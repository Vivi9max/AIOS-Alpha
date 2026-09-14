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
    normalized.endsWith(".ac.jp")
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
    .replace(/\s+/g, " ")
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
    a.filter((value) =>
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

function calculatePairAgreement(
  left: WebEvidence,
  right: WebEvidence,
): number {
  const leftText =
    left.snippets.join(" ");

  const rightText =
    right.snippets.join(" ");

  const textAgreement =
    calculateTextAgreement(
      leftText,
      rightText,
    );

  const numericAgreement =
    calculateNumericAgreement(
      leftText,
      rightText,
    );

  return (
    textAgreement * 0.55 +
    numericAgreement * 0.45
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

  const independent =
    evidence.filter(
      (_, index) =>
        index !== targetIndex,
    );

  const agreements =
    independent
      .map((item) =>
        calculatePairAgreement(
          target,
          item,
        ),
      )
      .filter(
        (score) =>
          score >= 0.18,
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
      0.25,
      count * 0.08,
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

export function verifyWebEvidence(
  evidence: WebEvidence[],
): VerifiedWebEvidence[] {
  return evidence.map(
    (item, index) => {
      const tier =
        resolveTier(
          item.hostname,
        );

      const credibilityScore =
        tierScore(tier);

      const corroboration =
        calculateCorroboration(
          evidence,
          index,
        );

      const freshnessScore =
        item.freshness ===
        "24h" ||
        item.freshness ===
        "realtime"
          ? 1
          : item.freshness ===
              "7d"
            ? 0.9
            : item.freshness ===
                "30d"
              ? 0.78
              : 0.65;

      const verificationScore =
        Math.min(
          0.99,
          credibilityScore *
            0.45 +
            corroboration.score *
              0.35 +
            freshnessScore *
              0.2,
        );

      return {
        ...item,
        credibilityTier:
          tier,
        credibilityScore,
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

  const corroborated =
    evidence.some(
      (item) =>
        item.corroborationCount >=
        1,
    );

  let score = average;

  if (
    independentHosts >= 2
  ) {
    score += 0.06;
  }

  if (primaryExists) {
    score += 0.05;
  }

  if (corroborated) {
    score += 0.05;
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

  return {
    verified:
      label !== "limited" &&
      independentHosts >= 2,
    score,
    label,
  };
}
