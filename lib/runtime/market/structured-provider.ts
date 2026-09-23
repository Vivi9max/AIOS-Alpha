import type {
  MarketBar,
  MarketInstrument,
  MarketSnapshot,
} from "./market-types";

export interface StructuredMarketResult {
  success: boolean;
  verified: boolean;
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

interface AllTickKline {
  code?: string;
  kline_type?: number;
  kline_data?: Array<{
    timestamp?: string | number;
    open_price?: string | number;
    close_price?: string | number;
    high_price?: string | number;
    low_price?: string | number;
    volume?: string | number;
  }>;
}

interface AllTickResponse {
  ret?: number;
  msg?: string;
  data?: {
    tick_list?: AllTickTrade[];
    kline_list?: AllTickKline[];
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

  const raw = String(value);
  const numeric = Number(raw);

  if (Number.isFinite(numeric) && raw.length >= 10) {
    const ms = raw.length <= 10 ? numeric * 1000 : numeric;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function toAllTickCode(instrument: MarketInstrument): string {
  const symbol = instrument.normalizedSymbol
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (instrument.market === "hk") {
    return `${symbol.replace(/^0+(?=\d)/, "").padStart(4, "0")}.HK`;
  }

  if (instrument.market === "cn") {
    const clean = symbol.replace(/\.(SH|SZ)$/i, "");
    const suffix = clean.startsWith("6") ? "SH" : "SZ";
    return `${clean}.${suffix}`;
  }

  return `${symbol.replace(/\.US$/i, "")}.US`;
}

function configured(): boolean {
  return Boolean(env("ALLTICK_API_KEY"));
}

function buildQuery(
  code: string,
  data: Record<string, unknown>,
): string {
  return JSON.stringify({
    trace: `aios-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    data: {
      symbol_list: [{ code }],
      ...data,
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

  url.searchParams.set("token", env("ALLTICK_API_KEY"));
  url.searchParams.set("query", query);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as AllTickResponse;

  if (!response.ok || payload.ret !== 200) {
    throw new Error(
      payload.msg ||
        `AllTick ${endpoint} returned HTTP ${response.status}.`,
    );
  }

  return payload;
}

function buildBars(payload: AllTickResponse): MarketBar[] {
  const data =
    payload.data?.kline_list?.[0]?.kline_data ?? [];

  const bars: MarketBar[] = [];

  for (const row of data) {
    const timestamp = normalizeTimestamp(row.timestamp);
    const close = parseNumber(row.close_price);

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
      provider: "alltick",
      dataset: null,
      snapshot: empty,
      sourceCount: 0,
      error: "ALLTICK_API_KEY is not configured.",
    };
  }

  const code = toAllTickCode(instrument);
  const dataset = "alltick:trade-tick+kline";

  try {
    const [tradePayload, klinePayload] =
      await Promise.all([
        requestAllTick(
          "trade-tick",
          buildQuery(code, {}),
        ),
        requestAllTick(
          "kline",
          buildQuery(code, {
            kline_type: Number(
              env("ALLTICK_KLINE_TYPE") || "8",
            ),
            kline_timestamp_end: 0,
            query_kline_num: Math.min(
              500,
              Math.max(
                2,
                Number(
                  env("ALLTICK_KLINE_COUNT") || "100",
                ),
              ),
            ),
            adjust_type: Number(
              env("ALLTICK_ADJUST_TYPE") || "0",
            ),
          }),
        ),
      ]);

    const bars = buildBars(klinePayload);
    const tick = tradePayload.data?.tick_list?.[0];

    const livePrice = parseNumber(tick?.price);
    const liveAsOf = normalizeTimestamp(tick?.tick_time);

    const latestBar = bars[bars.length - 1];
    const previousBar =
      bars.length > 1
        ? bars[bars.length - 2]
        : undefined;

    const previousClose =
      previousBar?.close ?? null;

    const changePercent =
      livePrice !== null &&
      previousClose !== null &&
      previousClose !== 0
        ? ((livePrice - previousClose) /
            previousClose) *
          100
        : null;

    const hasLiveQuote =
      livePrice !== null &&
      liveAsOf !== null;

    if (!hasLiveQuote && !latestBar) {
      return {
        success: false,
        verified: false,
        provider: "alltick",
        dataset,
        snapshot: empty,
        sourceCount: 0,
        error:
          "AllTick returned no usable realtime tick or historical K-line.",
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

      dataQuality:
        hasLiveQuote
          ? "live"
          : "historical",

      liveQuoteAvailable:
        hasLiveQuote,

      quoteQuality:
        hasLiveQuote
          ? "live"
          : "historical",

      historicalQuality:
        bars.length > 0
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

    return {
      success: true,
      verified:
        hasLiveQuote ||
        bars.length > 0,
      provider: "alltick",
      dataset,
      snapshot,
      sourceCount: 1,
    };
  } catch (error) {
    return {
      success: false,
      verified: false,
      provider: "alltick",
      dataset,
      snapshot: empty,
      sourceCount: 0,
      error:
        error instanceof Error
          ? error.message
          : "AllTick structured provider request failed.",
    };
  }
}
