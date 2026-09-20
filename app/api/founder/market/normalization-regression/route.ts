import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  analyzeMarketRequest,
} from "@/lib/runtime/market/market-router";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type Market =
  | "us"
  | "hk"
  | "cn";

type SemanticValue = {
  session?: string;
  period?: string;
  value?: number | null;
  quality?: string;
} | null;

type SemanticSnapshot = {
  regularSessionPrice: SemanticValue;
  afterHoursPrice: SemanticValue;
  preMarketPrice: SemanticValue;
  previousClose: SemanticValue;
  changePercent: SemanticValue;
};

function responseHeaders() {
  return {
    "cache-control":
      "no-store",

    "content-type":
      "application/json; charset=utf-8",
  };
}

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      verified: false,
      code:
        "FOUNDER_AUTH_REQUIRED",
      message:
        "Founder authentication is required.",
    },
    {
      status: 401,
      headers:
        responseHeaders(),
    },
  );
}

const CASES = [
  {
    id: "US_NVDA",
    symbol: "NVDA",
    market: "us" as const,
  },

  {
    id: "HK_TENCENT",
    symbol: "0700.HK",
    market: "hk" as const,
  },

  {
    id: "HK_ALIBABA",
    symbol: "9988.HK",
    market: "hk" as const,
  },

  {
    id: "CN_MOUTAI",
    symbol: "600519.SH",
    market: "cn" as const,
  },

  {
    id: "CN_WULIANGYE",
    symbol: "000858.SZ",
    market: "cn" as const,
  },
];

function tickerNumericValue(
  symbol: string,
  market: Market,
): number | null {
  if (market === "us") {
    return null;
  }

  const digits =
    symbol
      .toUpperCase()
      .replace(/^HK:/, "")
      .replace(/^SH:/, "")
      .replace(/^SZ:/, "")
      .replace(/^SS:/, "")
      .replace(/\.(HK|SH|SZ)$/, "")
      .replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const normalized =
    digits.replace(
      /^0+(?=\d)/,
      "",
    );

  const value =
    Number(
      normalized || "0",
    );

  return Number.isFinite(value)
    ? value
    : null;
}

function isExactTickerValue(
  price: number | null,
  tickerValue: number | null,
): boolean {
  if (
    price === null ||
    tickerValue === null
  ) {
    return false;
  }

  return (
    Math.abs(
      price -
        tickerValue,
    ) < 0.000001
  );
}

function verifyTickerLeakGuard(
  item: {
    symbol: string;
    market: Market;
    price: number | null;
    fieldQuality: Record<
      string,
      string
    >;
  },
): {
  passed: boolean;
  tickerValue: number | null;
  exactTickerLeak: boolean;
  priceRejected: boolean;
  reason: string;
} {
  const tickerValue =
    tickerNumericValue(
      item.symbol,
      item.market,
    );

  /*
   * US symbols do not have a numeric
   * ticker-code leakage rule.
   */
  if (
    tickerValue === null
  ) {
    return {
      passed:
        item.price === null ||
        (
          typeof item.price ===
            "number" &&
          Number.isFinite(
            item.price,
          )
        ),

      tickerValue:
        null,

      exactTickerLeak:
        false,

      priceRejected:
        item.price === null,

      reason:
        item.price === null
          ? "No reliable normalized price is available; null is accepted as a safe state."
          : "US equity price is numeric and is not evaluated against an HK/A-share ticker code.",
    };
  }

  const exactTickerLeak =
    isExactTickerValue(
      item.price,
      tickerValue,
    );

  /*
   * Exact ticker leakage remaining
   * in the normalized result is a failure.
   */
  if (exactTickerLeak) {
    return {
      passed: false,

      tickerValue,

      exactTickerLeak:
        true,

      priceRejected:
        false,

      reason:
        `Ticker leakage remains: normalized price ${item.price} still equals numeric ticker ${tickerValue}.`,
    };
  }

  /*
   * Null is explicitly accepted.
   * Missing is safer than contaminated data.
   */
  if (
    item.price === null
  ) {
    return {
      passed: true,

      tickerValue,

      exactTickerLeak:
        false,

      priceRejected:
        true,

      reason:
        `Ticker-derived price ${tickerValue} was rejected and normalized price is safely null.`,
    };
  }

  /*
   * Any finite numeric value that is
   * different from the ticker is NOT
   * ticker leakage.
   *
   * Freshness / exchange-real-time
   * verification remains a separate layer.
   */
  return {
    passed: true,

    tickerValue,

    exactTickerLeak:
      false,

    priceRejected:
      false,

    reason:
      `Normalized price ${item.price} differs from ticker code ${tickerValue}; no ticker-to-price leakage detected.`,
  };
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  const startedAt =
    Date.now();

  const results: Array<{
    id: string;
    symbol: string;
    market: Market;
    success: boolean;
    verified: boolean;
    code: string;
    dataQuality: string;

    price: number | null;
    previousClose: number | null;
    changePercent: number | null;

    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;

    afterHoursPrice: number | null;
    preMarketPrice: number | null;

    pe: number | null;
    pb: number | null;
    eps: number | null;
    revenue: number | null;
    revenueGrowth: number | null;

    fieldQuality: Record<
      string,
      string
    >;

    semantic:
      SemanticSnapshot | null;

    structuredDataVerified:
      boolean;

    webEvidence:
      boolean;

    sourceCount:
      number;

    independentDomains:
      number;

    freshness:
      unknown;

    provider:
      string;

    error:
      string | null;

    latencyMs:
      number;
  }> = [];

  for (
    const item of CASES
  ) {
    const caseStartedAt =
      Date.now();

    try {
      const result =
        await analyzeMarketRequest(
          {
            symbol:
              item.symbol,

            market:
              item.market,

            mode:
              "full",
          },
        );

      const rawSemantic =
        result.snapshot
          .semantic;

      /*
       * Explicit structural projection.
       *
       * This prevents TypeScript from
       * collapsing the semantic fields
       * into `{}` / unknown while still
       * allowing the regression to inspect
       * session and period semantics.
       */
      const semantic =
        rawSemantic
          ? {
              regularSessionPrice:
                rawSemantic
                  .regularSessionPrice
                  ? {
                      value:
                        rawSemantic
                          .regularSessionPrice
                          .value,

                      quality:
                        rawSemantic
                          .regularSessionPrice
                          .quality,

                      session:
                        rawSemantic
                          .regularSessionPrice
                          .session,
                    }
                  : null,

              afterHoursPrice:
                rawSemantic
                  .afterHoursPrice
                  ? {
                      value:
                        rawSemantic
                          .afterHoursPrice
                          .value,

                      quality:
                        rawSemantic
                          .afterHoursPrice
                          .quality,

                      session:
                        rawSemantic
                          .afterHoursPrice
                          .session,
                    }
                  : null,

              preMarketPrice:
                rawSemantic
                  .preMarketPrice
                  ? {
                      value:
                        rawSemantic
                          .preMarketPrice
                          .value,

                      quality:
                        rawSemantic
                          .preMarketPrice
                          .quality,

                      session:
                        rawSemantic
                          .preMarketPrice
                          .session,
                    }
                  : null,

              previousClose:
                rawSemantic
                  .previousClose
                  ? {
                      value:
                        rawSemantic
                          .previousClose
                          .value,

                      quality:
                        rawSemantic
                          .previousClose
                          .quality,

                      session:
                        rawSemantic
                          .previousClose
                          .session,
                    }
                  : null,

              changePercent:
                rawSemantic
                  .changePercent
                  ? {
                      value:
                        rawSemantic
                          .changePercent
                          .value,

                      quality:
                        rawSemantic
                          .changePercent
                          .quality,

                      period:
                        rawSemantic
                          .changePercent
                          .period,
                    }
                  : null,
            }
          : null;

      const fieldQuality =
        result.snapshot
          .fieldQuality ?? {};

      results.push({
        id:
          item.id,

        symbol:
          item.symbol,

        market:
          item.market,

        success:
          result.success,

        verified:
          result.verification
            .verified,

        code:
          result.code,

        dataQuality:
          result.snapshot
            .dataQuality,

        price:
          result.snapshot
            .price ?? null,

        previousClose:
          result.snapshot
            .previousClose ?? null,

        changePercent:
          result.snapshot
            .changePercent ?? null,

        open:
          result.snapshot
            .open ?? null,

        high:
          result.snapshot
            .high ?? null,

        low:
          result.snapshot
            .low ?? null,

        volume:
          result.snapshot
            .volume ?? null,

        afterHoursPrice:
          result.snapshot
            .afterHoursPrice ?? null,

        preMarketPrice:
          result.snapshot
            .preMarketPrice ?? null,

        pe:
          result.snapshot
            .pe ?? null,

        pb:
          result.snapshot
            .pb ?? null,

        eps:
          result.snapshot
            .eps ?? null,

        revenue:
          result.snapshot
            .revenue ?? null,

        revenueGrowth:
          result.snapshot
            .revenueGrowth ?? null,

        fieldQuality,

        semantic,

        structuredDataVerified:
          result.verification
            .structuredDataVerified,

        webEvidence:
          result.evidence.length >
          0,

        sourceCount:
          result.verification
            .sourceCount,

        independentDomains:
          result.verification
            .independentDomains,

        freshness:
          result.verification
            .freshness,

        provider:
          result.provider
            .provider,

        error:
          result.error ??
          null,

        latencyMs:
          Date.now() -
          caseStartedAt,
      });
    } catch (error) {
      results.push({
        id:
          item.id,

        symbol:
          item.symbol,

        market:
          item.market,

        success:
          false,

        verified:
          false,

        code:
          "C147_2_7_CASE_ERROR",

        dataQuality:
          "insufficient",

        price:
          null,

        previousClose:
          null,

        changePercent:
          null,

        open:
          null,

        high:
          null,

        low:
          null,

        volume:
          null,

        afterHoursPrice:
          null,

        preMarketPrice:
          null,

        pe:
          null,

        pb:
          null,

        eps:
          null,

        revenue:
          null,

        revenueGrowth:
          null,

        fieldQuality:
          {},

        semantic:
          null,

        structuredDataVerified:
          false,

        webEvidence:
          false,

        sourceCount:
          0,

        independentDomains:
          0,

        freshness: {
          freshness:
            "unknown",

          ageMinutes:
            null,

          ageHours:
            null,

          referenceTime:
            null,

          reason:
            "Semantic normalization regression case failed.",
        },

        provider:
          "unknown",

        error:
          error instanceof Error
            ? error.message
            : "Regression case failed.",

        latencyMs:
          Date.now() -
          caseStartedAt,
      });
    }
  }

  /*
   * ------------------------------------------------------------
   * Base runtime verification
   * ------------------------------------------------------------
   */

  const basePassed =
    results.filter(
      (item) =>
        item.success &&
        item.verified &&
        (
          item.structuredDataVerified ||
          item.webEvidence
        ),
    ).length;

  const baseAllPassed =
    basePassed ===
    CASES.length;

  /*
   * ------------------------------------------------------------
   * Semantic normalization checks
   * ------------------------------------------------------------
   */

  const semanticChecks = {
    regularAndAfterHoursSeparated:
      results.every((item) => {
        const regularSessionPrice =
          item.semantic
            ?.regularSessionPrice ??
          null;

        return (
          regularSessionPrice?.session !==
          "after_hours"
        );
      }),

    afterHoursStoredSeparately:
      results.every((item) => {
        if (
          item.afterHoursPrice ===
          null
        ) {
          return true;
        }

        return (
          item.semantic !==
          null
        );
      }),

    annualChangeNotUsedAsDaily:
      results.every((item) => {
        const semanticChangePercent =
          item.semantic
            ?.changePercent ??
          null;

        return (
          item.changePercent ===
            null ||
          semanticChangePercent?.period !==
            "one_year"
        );
      }),

    peSubstringProtection:
      results.every(
        (item) =>
          item.pe ===
            null ||
          item.fieldQuality.pe !==
            "conflict",
      ),

    fieldQualityPresent:
      results.every(
        (item) =>
          Object.keys(
            item.fieldQuality,
          ).length > 0,
      ),
  };

  /*
   * ------------------------------------------------------------
   * Price integrity checks
   * ------------------------------------------------------------
   */

  const priceIntegrityResults = {
    HK_0700_TICKER_GUARD:
      (() => {
        const item =
          results.find(
            (entry) =>
              entry.id ===
              "HK_TENCENT",
          );

        if (!item) {
          return {
            passed: false,
            tickerValue: 700,
            exactTickerLeak: false,
            priceRejected: false,
            reason:
              "HK 0700 regression case is missing.",
          };
        }

        const check =
          verifyTickerLeakGuard(
            item,
          );

        return {
          ...check,

          passed:
            check.passed &&
            (
              item.price ===
                null ||
              item.price !==
                700
            ),
        };
      })(),

    HK_9988_TICKER_GUARD:
      (() => {
        const item =
          results.find(
            (entry) =>
              entry.id ===
              "HK_ALIBABA",
          );

        if (!item) {
          return {
            passed: false,
            tickerValue: 9988,
            exactTickerLeak: false,
            priceRejected: false,
            reason:
              "HK 9988 regression case is missing.",
          };
        }

        const check =
          verifyTickerLeakGuard(
            item,
          );

        return {
          ...check,

          passed:
            check.passed &&
            (
              item.price ===
                null ||
              !isExactTickerValue(
                item.price,
                9988,
              )
            ),
        };
      })(),

    CN_600519_TICKER_GUARD:
      (() => {
        const item =
          results.find(
            (entry) =>
              entry.id ===
              "CN_MOUTAI",
          );

        if (!item) {
          return {
            passed: false,
            tickerValue: 600519,
            exactTickerLeak: false,
            priceRejected: false,
            reason:
              "CN 600519 regression case is missing.",
          };
        }

        const check =
          verifyTickerLeakGuard(
            item,
          );

        return {
          ...check,

          passed:
            check.passed &&
            (
              item.price ===
                null ||
              item.price !==
                600519
            ),
        };
      })(),

    CN_000858_TICKER_GUARD:
      (() => {
        const item =
          results.find(
            (entry) =>
              entry.id ===
              "CN_WULIANGYE",
          );

        if (!item) {
          return {
            passed: false,
            tickerValue: 858,
            exactTickerLeak: false,
            priceRejected: false,
            reason:
              "CN 000858 regression case is missing.",
          };
        }

        const check =
          verifyTickerLeakGuard(
            item,
          );

        return {
          ...check,

          passed:
            check.passed &&
            (
              item.price ===
                null ||
              item.price !==
                858
            ),
        };
      })(),

    US_PRICE_NOT_TREATED_AS_TICKER:
      (() => {
        const item =
          results.find(
            (entry) =>
              entry.id ===
              "US_NVDA",
          );

        if (!item) {
          return {
            passed: false,
            tickerValue: null,
            exactTickerLeak: false,
            priceRejected: false,
            reason:
              "US NVDA regression case is missing.",
          };
        }

        const check =
          verifyTickerLeakGuard(
            item,
          );

        return {
          ...check,

          passed:
            item.price ===
              null ||
            (
              typeof item.price ===
                "number" &&
              Number.isFinite(
                item.price,
              )
            ),
        };
      })(),
  };

  const priceIntegrityChecks =
    Object.fromEntries(
      Object.entries(
        priceIntegrityResults,
      ).map(
        ([key, value]) => [
          key,
          value.passed,
        ],
      ),
    );

  const semanticPass =
    Object.values(
      semanticChecks,
    ).every(Boolean);

  const priceIntegrityPass =
    Object.values(
      priceIntegrityChecks,
    ).every(Boolean);

  const finalPass =
    baseAllPassed &&
    semanticPass &&
    priceIntegrityPass;

  const passedCount =
    Object.values(
      priceIntegrityChecks,
    ).filter(Boolean).length;

  const totalPriceChecks =
    Object.keys(
      priceIntegrityChecks,
    ).length;

  return NextResponse.json(
    {
      success:
        finalPass,

      verified:
        finalPass,

      code:
        finalPass
          ? "C147_2_7_1_MARKET_PRICE_INTEGRITY_PASS"
          : "C147_2_7_1_MARKET_PRICE_INTEGRITY_PARTIAL",

      stage:
        "C147.2.7.1",

      description:
        "Three-market semantic normalization plus ticker-to-price leakage protection and market price integrity regression.",

      verificationMode:
        "behavioral",

      total:
        CASES.length,

      passed:
        results.filter(
          (item) =>
            item.success &&
            item.verified,
        ).length,

      failed:
        results.filter(
          (item) =>
            !item.success ||
            !item.verified,
        ).length,

      priceIntegritySummary: {
        passed:
          passedCount,

        failed:
          totalPriceChecks -
          passedCount,

        total:
          totalPriceChecks,

        verified:
          priceIntegrityPass,
      },

      semanticChecks,

      priceIntegrityChecks,

      priceIntegrityDetails:
        priceIntegrityResults,

      results,

      metadata: {
        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,

        principles: [
          "Never treat a ticker code as a market price.",
          "Prefer null over contaminated market data.",
          "Do not reject legitimate numeric prices merely because they differ from or resemble a ticker.",
          "Annual change must not be interpreted as daily change.",
          "Regular-session and after-hours prices remain semantically separated.",
        ],

        disclaimer:
          "AIOS provides market research and decision-support information, not personalized investment advice or automatic buy/sell instructions.",
      },
    },
    {
      status:
        finalPass
          ? 200
          : 207,

      headers:
        responseHeaders(),
    },
  );
}
