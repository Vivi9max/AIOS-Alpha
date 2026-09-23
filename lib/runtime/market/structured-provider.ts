import type {
  MarketBar,
  MarketInstrument,
  MarketSnapshot,
} from "./market-types";

export interface StructuredMarketResult {
  success: boolean;
  verified: boolean;
  realtimeVerified: boolean;
  historicalVerified: boolean;
  provider: string;
  dataset: string | null;
  snapshot: MarketSnapshot;
  sourceCount: number;
  error?: string;
}

interface AllTickTrade {
  code?: string;
  tick_time?: string | number;
  price?: string | number;
  volume?: string | number;
}

interface AllTickKlineRow {
  timestamp?: string | number;
  open_price?: string | number;
  close_price?: string | number;
  high_price?: string | number;
  low_price?: string | number;
  volume?: string | number;
}

interface AllTickResponse {
  ret?: number;
  msg?: string;
  data?: {
    tick_list?: AllTickTrade[];
    kline_list?: Array<{
      code?: string;
      kline_type?: number;
      kline_data?: AllTickKlineRow[];
    }>;
  };
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.replace(/,/g, "").trim());

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const raw = String(value).trim();

  if (!raw) {
    return null;
  }

  const numeric = Number(raw);

  if (Number.isFinite(numeric)) {
    let milliseconds = numeric;

    if (raw.length <= 10) {
      milliseconds = numeric * 1000;
    }

    const date = new Date(milliseconds);

    return Number.isNaN(date.getTime())
      ? null
      : date.toISOString();
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

function emptySnapshot(): MarketSnapshot {
  return {
    price: null,
    previousClose: null,
    changePercent: null,
    open: null,
    high: null,
    low: null,
    volume: null,
    marketCap: null,
    pe: null,
    pb: null,
    eps: null,
    revenue: null,
    revenueGrowth: null,
    afterHoursPrice: null,
    preMarketPrice: null,
    dataQuality: "insufficient",
    liveQuoteAvailable: false,
    quoteQuality: "insufficient",
    historicalQuality: "insufficient",
    asOf: null,
    source: null,
    dataset: null,
    bars: [],
  };
}

function toAllTickCode(
  instrument: MarketInstrument,
): string {
  const symbol = instrument.normalizedSymbol
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (instrument.market === "hk") {
    const clean = symbol
      .replace(/^HK:/i, "")
      .replace(/\.HK$/i, "")
      .replace(/^0+(?=\d)/, "");

    return `${clean.padStart(4, "0")}.HK`;
  }

  if (instrument.market === "cn") {
    const clean = symbol
      .replace(/^SH:/i, "")
      .replace(/^SZ:/i, "")
      .replace(/^SS:/i, "")
      .replace(/\.(SH|SZ)$/i, "");

    const suffix = clean.startsWith("6")
      ? "SH"
      : "SZ";

    return `${clean}.${suffix}`;
  }

  return `${symbol
    .replace(/^NASDAQ:/i, "")
    .replace(/^NYSE:/i, "")
    .replace(/^US:/i, "")
    .replace(/\.US$/i, "")}.US`;
}

function configured(): boolean {
  return Boolean(env("ALLTICK_API_KEY"));
}

function buildTradeTickQuery(
  code: string,
): string {
  return JSON.stringify({
    trace: `aios-trade-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    data: {
      symbol_list: [
        {
          code,
        },
      ],
    },
  });
}

function buildKlineQuery(
  code: string,
): string {
  const configuredType = Number(
    env("ALLTICK_KLINE_TYPE") || "8",
  );

  const configuredCount = Number(
    env("ALLTICK_KLINE_COUNT") || "100",
  );

  const configuredAdjust = Number(
    env("ALLTICK_ADJUST_TYPE") || "0",
  );

  const klineType =
    Number.isFinite(configuredType)
      ? configuredType
      : 8;

  const klineCount =
    Number.isFinite(configuredCount)
      ? Math.min(
          500,
          Math.max(2, configuredCount),
        )
      : 100;

  const adjustType =
    Number.isFinite(configuredAdjust)
      ? configuredAdjust
      : 0;

  return JSON.stringify({
    trace: `aios-kline-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    data: {
      code,
      kline_type: klineType,
      kline_timestamp_end: 0,
      query_kline_num: klineCount,
      adjust_type: adjustType,
    },
  });
}

async function requestAllTick(
  endpoint: "trade-tick" | "kline",
  query: string,
): Promise<AllTickResponse> {
  const url = new URL(
    `https://quote.alltick.co/quote-stock-b-api/${endpoint}`,
  );

  url.searchParams.set(
    "token",
    env("ALLTICK_API_KEY"),
  );

  url.searchParams.set(
    "query",
    query,
  );

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  let payload: AllTickResponse;

  try {
    payload =
      (await response.json()) as AllTickResponse;
  } catch {
    throw new Error(
      `AllTick ${endpoint} returned a non-JSON response.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      payload.msg ||
        `AllTick ${endpoint} returned HTTP ${response.status}.`,
    );
  }

  if (payload.ret !== 200) {
    throw new Error(
      payload.msg ||
        `AllTick ${endpoint} returned ret=${String(
          payload.ret,
        )}.`,
    );
  }

  return payload;
}

function buildBars(
  payload: AllTickResponse,
): MarketBar[] {
  const rows =
    payload.data?.kline_list?.[0]
      ?.kline_data ?? [];

  const bars: MarketBar[] = [];

  for (const row of rows) {
    const timestamp =
      normalizeTimestamp(row.timestamp);

    const close =
      parseNumber(row.close_price);

    if (!timestamp || close === null) {
      continue;
    }

    bars.push({
      timestamp,
      open: parseNumber(row.open_price),
      high: parseNumber(row.high_price),
      low: parseNumber(row.low_price),
      close,
      volume: parseNumber(row.volume),
    });
  }

  return bars.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  );
}

export function isAllTickConfigured(): boolean {
  return configured();
}

export async function retrieveStructuredMarketData(
  instrument: MarketInstrument,
): Promise<StructuredMarketResult> {
  const empty = emptySnapshot();

  if (!configured()) {
    return {
      success: false,
      verified: false,
      realtimeVerified: false,
      historicalVerified: false,
      provider: "alltick",
      dataset: null,
      snapshot: empty,
      sourceCount: 0,
      error:
        "ALLTICK_API_KEY is not configured.",
    };
  }

  const code = toAllTickCode(instrument);

  const dataset =
    "alltick:trade-tick+kline";

  /*
   * IMPORTANT:
   *
   * Trade Tick and K-line are intentionally
   * requested independently.
   *
   * A K-line failure must never destroy a
   * valid realtime quote.
   */

  let tradePayload:
    | AllTickResponse
    | null = null;

  let tradeError:
    | string
    | undefined;

  try {
    tradePayload =
      await requestAllTick(
        "trade-tick",
        buildTradeTickQuery(code),
      );
  } catch (error) {
    tradeError =
      error instanceof Error
        ? error.message
        : "AllTick trade-tick request failed.";
  }

  let klinePayload:
    | AllTickResponse
    | null = null;

  let klineError:
    | string
    | undefined;

  try {
    klinePayload =
      await requestAllTick(
        "kline",
        buildKlineQuery(code),
      );
  } catch (error) {
    klineError =
      error instanceof Error
        ? error.message
        : "AllTick kline request failed.";
  }

  const bars = klinePayload
    ? buildBars(klinePayload)
    : [];

  const tick =
    tradePayload?.data?.tick_list?.[0];

  const livePrice =
    parseNumber(tick?.price);

  const liveAsOf =
    normalizeTimestamp(tick?.tick_time);

  const hasLiveQuote =
    livePrice !== null &&
    liveAsOf !== null;

  const latestBar =
    bars.length > 0
      ? bars[bars.length - 1]
      : undefined;

  const previousBar =
    bars.length > 1
      ? bars[bars.length - 2]
      : undefined;

  const previousClose =
    previousBar?.close ??
    null;

  const fallbackPreviousClose =
    latestBar?.close ??
    null;

  const effectivePreviousClose =
    previousClose ??
    fallbackPreviousClose;

  const changePercent =
    hasLiveQuote &&
    effectivePreviousClose !== null &&
    effectivePreviousClose !== 0
      ? ((livePrice! -
          effectivePreviousClose) /
          effectivePreviousClose) *
        100
      : null;

  const historicalVerified =
    bars.length > 0;

  const realtimeVerified =
    hasLiveQuote;

  /*
   * No usable structured data at all.
   */
  if (
    !realtimeVerified &&
    !historicalVerified
  ) {
    const errors = [
      tradeError,
      klineError,
    ].filter(Boolean);

    return {
      success: false,
      verified: false,
      realtimeVerified: false,
      historicalVerified: false,
      provider: "alltick",
      dataset,
      snapshot: empty,
      sourceCount: 0,
      error:
        errors.length > 0
          ? errors.join(" | ")
          : "AllTick returned no usable realtime tick or historical K-line.",
    };
  }

  const snapshot: MarketSnapshot = {
    price:
      livePrice ??
      latestBar?.close ??
      null,

    previousClose,

    changePercent,

    open:
      latestBar?.open ??
      null,

    high:
      latestBar?.high ??
      null,

    low:
      latestBar?.low ??
      null,

    volume:
      latestBar?.volume ??
      null,

    marketCap: null,
    pe: null,
    pb: null,
    eps: null,
    revenue: null,
    revenueGrowth: null,

    afterHoursPrice: null,
    preMarketPrice: null,

    /*
     * Realtime quote always takes precedence.
     * Historical data alone can never become "live".
     */
    dataQuality:
      realtimeVerified
        ? "live"
        : "historical",

    liveQuoteAvailable:
      realtimeVerified,

    quoteQuality:
      realtimeVerified
        ? "live"
        : historicalVerified
          ? "historical"
          : "insufficient",

    historicalQuality:
      historicalVerified
        ? "historical"
        : "insufficient",

    asOf:
      liveAsOf ??
      latestBar?.timestamp ??
      null,

    source: "AllTick",

    dataset,

    bars,
  };

  const errorMessages = [
    tradeError,
    klineError,
  ].filter(Boolean);

  return {
    success: true,

    /*
     * "verified" means structured data exists.
     * "realtimeVerified" specifically means the
     * live trade-tick was verified.
     */
    verified:
      realtimeVerified ||
      historicalVerified,

    realtimeVerified,

    historicalVerified,

    provider: "alltick",

    dataset,

    snapshot,

    sourceCount: 1,

    error:
      errorMessages.length > 0
        ? errorMessages.join(" | ")
        : undefined,
  };
}
