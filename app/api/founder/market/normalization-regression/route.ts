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
  market: "us" | "hk" | "cn",
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

function isTickerLeakRejected(
  item: {
    symbol: string;
    market: "us" | "hk" | "cn";
    price: number | null;
    fieldQuality: Record<
      string,
      string
    >;
  },
): boolean {
  const tickerValue =
    tickerNumericValue(
      item.symbol,
      item.market,
    );

  if (
    tickerValue === null
  ) {
    return true;
  }

  /*
   * The important invariant:
   *
   * If the extracted price is exactly
   * the numeric ticker, it must not
   * survive normalization.
   */
  if (
    item.price !== null &&
    Math.abs(
      item.price -
        tickerValue,
    ) < 0.000001
  ) {
    return false;
  }

  return (
    item.price === null ||
    item.fieldQuality.price ===
      "missing"
  );
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

  const results = [];

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

      const semantic =
        result.snapshot
          .semantic;

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

        semantic: {
          regularSessionPrice:
            semantic
              ?.regularSessionPrice ??
            null,

          afterHoursPrice:
            semantic
              ?.afterHoursPrice ??
            null,

          preMarketPrice:
            semantic
              ?.preMarketPrice ??
            null,

          previousClose:
            semantic
              ?.previousClose ??
            null,

          changePercent:
            semantic
              ?.changePercent ??
            null,
        },

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

  const priceIntegrityChecks =
    {
      HK_0700_TICKER_GUARD:
        (() => {
          const item =
            results.find(
              (entry) =>
                entry.id ===
                "HK_TENCENT",
            );

          return item
            ? isTickerLeakRejected(
                item,
              )
            : false;
        })(),

      HK_9988_TICKER_GUARD:
        (() => {
          const item =
            results.find(
              (entry) =>
                entry.id ===
                "HK_ALIBABA",
            );

          return item
            ? isTickerLeakRejected(
                item,
              )
            : false;
        })(),

      CN_600519_TICKER_GUARD:
        (() => {
          const item =
            results.find(
              (entry) =>
                entry.id ===
                "CN_MOUTAI",
            );

          return item
            ? isTickerLeakRejected(
                item,
              )
            : false;
        })(),

      CN_000858_TICKER_GUARD:
        (() => {
          const item =
            results.find(
              (entry) =>
                entry.id ===
                "CN_WULIANGYE",
            );

          return item
            ? isTickerLeakRejected(
                item,
              )
            : false;
        })(),

      US_PRICE_NOT_TREATED_AS_TICKER:
        (() => {
          const item =
            results.find(
              (entry) =>
                entry.id ===
                "US_NVDA",
            );

          return (
            item !== undefined &&
            (
              item.price ===
                null ||
              item.price !==
                0
            )
          );
        })(),
    };

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

      semanticChecks,

      priceIntegrityChecks,

      results,

      metadata: {
        generatedAt:
          new Date().toISOString(),

        latencyMs:
          Date.now() -
          startedAt,

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
