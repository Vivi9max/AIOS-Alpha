import {
  buildSemanticSnapshot,
} from "./market-semantic";

import type {
  MarketEvidence,
  MarketFieldQuality,
  MarketRegion,
  MarketSnapshot,
} from "./market-types";

function normalizedTickerDigits(
  symbol: string,
  market: MarketRegion,
): string | null {
  const normalized =
    symbol
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

  if (market === "hk") {
    const digits =
      normalized
        .replace(/^HK:/, "")
        .replace(/\.HK$/, "")
        .replace(/\D/g, "");

    if (!digits) {
      return null;
    }

    const withoutLeadingZeros =
      digits.replace(/^0+(?=\d)/, "");

    return (
      withoutLeadingZeros ||
      "0"
    );
  }

  if (market === "cn") {
    const digits =
      normalized
        .replace(/^SH:/, "")
        .replace(/^SZ:/, "")
        .replace(/^SS:/, "")
        .replace(/\.(SH|SZ)$/, "")
        .replace(/\D/g, "");

    if (!digits) {
      return null;
    }

    const withoutLeadingZeros =
      digits.replace(/^0+(?=\d)/, "");

    return (
      withoutLeadingZeros ||
      "0"
    );
  }

  return null;
}

function isExactTickerPriceLeak(
  price: number | null | undefined,
  symbol: string,
  market: MarketRegion,
): boolean {
  if (
    typeof price !== "number" ||
    !Number.isFinite(price)
  ) {
    return false;
  }

  const tickerDigits =
    normalizedTickerDigits(
      symbol,
      market,
    );

  if (!tickerDigits) {
    return false;
  }

  const tickerValue =
    Number(tickerDigits);

  if (
    !Number.isFinite(tickerValue)
  ) {
    return false;
  }

  return (
    Math.abs(price - tickerValue) <
    0.000001
  );
}

function cloneEvidence(
  evidence: MarketEvidence[],
): MarketEvidence[] {
  return evidence.map(
    (item) => ({
      ...item,
    }),
  );
}

export function guardMarketPriceIntegrity(
  snapshot: MarketSnapshot,
  symbol: string,
  market: MarketRegion,
  evidence: MarketEvidence[],
): {
  snapshot: MarketSnapshot;
  priceRejected: boolean;
  reason: string | null;
} {
  const price =
    snapshot.price ?? null;

  const leaked =
    isExactTickerPriceLeak(
      price,
      symbol,
      market,
    );

  if (!leaked) {
    return {
      snapshot,
      priceRejected: false,
      reason: null,
    };
  }

  const nextSnapshot: MarketSnapshot = {
    ...snapshot,

    price: null,

    fieldQuality: {
      ...(snapshot.fieldQuality ?? {}),
      price: "missing" as MarketFieldQuality,
    },

    semantic:
      undefined,
  };

  /*
   * Rebuild semantic state after rejecting
   * the contaminated price.
   *
   * This is important because semantic.price
   * and semantic.regularSessionPrice must not
   * retain the rejected ticker value.
   */
  nextSnapshot.semantic =
    buildSemanticSnapshot(
      nextSnapshot,
      cloneEvidence(evidence),
    );

  /*
   * Explicitly guarantee that the rejected
   * value cannot survive in semantic fields.
   */
  nextSnapshot.semantic.price.value =
    null;

  nextSnapshot.semantic.price.quality =
    "missing";

  nextSnapshot.semantic.regularSessionPrice.value =
    null;

  nextSnapshot.semantic.regularSessionPrice.quality =
    "missing";

  return {
    snapshot: nextSnapshot,

    priceRejected: true,

    reason:
      `Rejected price ${price} for ${symbol}: extracted value exactly matches the numeric ticker code and is treated as ticker leakage rather than a verified market price.`,
  };
}
