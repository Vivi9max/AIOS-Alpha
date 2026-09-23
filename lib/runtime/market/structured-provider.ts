import type {
  MarketBar,
  MarketInstrument,
  MarketSnapshot,
} from "./market-types";

export interface StructuredProviderDiagnostics {
  configured: boolean;
  endpoint?: string;
  httpStatus?: number;
  httpOk?: boolean;
  ret?: number;
  msg?: string;
  tickListCount: number;
  klineListCount: number;
  klineRowCount: number;
  realtimePayloadReceived: boolean;
  historicalPayloadReceived: boolean;
  realtimeVerified: boolean;
  historicalVerified: boolean;
}

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
  diagnostics: StructuredProviderDiagnostics;
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

type AllTickRequestResult = {
  payload: AllTickResponse;
  httpStatus: number;
  httpOk: boolean;
};

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

  const parsed = Number(
    value.replace(/,/g, "").trim(),
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTimestamp(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
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
  return Boolean(
    env("ALLTICK_API_KEY"),
  );
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
): Promise<AllTickRequestResult> {
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

  const response = await fetch(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  let payload: AllTickResponse;

  try {
    payload =
      (await response.json()) as AllTickResponse;
  } catch {
    throw new Error(
      `AllTick ${endpoint} returned a non-JSON response. HTTP ${response.status}.`,
    );
  }

  return {
    payload,
    httpStatus: response.status,
    httpOk: response.ok,
  };
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

    if (
      !timestamp ||
      close === null
    ) {
      continue;
    }

    bars.push({
      timestamp,
      open: parseNumber(
        row.open_price,
      ),
      high: parseNumber(
        row.high_price,
      ),
      low: parseNumber(
        row.low_price,
      ),
      close,
      volume: parseNumber(
        row.volume,
      ),
    });
  }

  return bars.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  );
}

function diagnosticsFrom(
  configuredValue: boolean,
): StructuredProviderDiagnostics {
  return {
    configured: configuredValue,
    tickListCount: 0,
    klineListCount: 0,
    klineRowCount: 0,
    realtimePayloadReceived: false,
    historicalPayloadReceived: false,
    realtimeVerified: false,
    historicalVerified: false,
  };
}

export function isAllTickConfigured(): boolean {
  return configured();
}

export async function retrieveStructuredMarketData(
  instrument: MarketInstrument,
): Promise<StructuredMarketResult> {
  const empty = emptySnapshot();

  const configuredValue = configured();

  const diagnostics =
    diagnosticsFrom(
      configuredValue,
    );

  if (!configuredValue) {
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
      diagnostics,
    };
  }

  const code =
    toAllTickCode(instrument);

  const dataset =
    "alltick:trade-tick+kline";

  diagnostics.endpoint =
    "https://quote.alltick.co/quote-stock-b-api";

  let tradeResult:
    | AllTickRequestResult
    | null = null;

  let tradeError:
    | string
    | undefined;

  try {
    tradeResult =
      await requestAllTick(
        "trade-tick",
        buildTradeTickQuery(code),
      );

    const payload =
      tradeResult.payload;

    diagnostics.httpStatus =
      tradeResult.httpStatus;

    diagnostics.httpOk =
      tradeResult.httpOk;

    diagnostics.ret =
      payload.ret;

    diagnostics.msg =
      payload.msg;

    diagnostics.tickListCount =
      payload.data?.tick_list
        ?.length ?? 0;

    diagnostics.realtimePayloadReceived =
      diagnostics.tickListCount > 0;

    if (
      !tradeResult.httpOk
    ) {
      tradeError =
        payload.msg ||
        `AllTick trade-tick returned HTTP ${tradeResult.httpStatus}.`;
    } else if (
      payload.ret !== 200
    ) {
      tradeError =
        payload.msg ||
        `AllTick trade-tick returned ret=${String(
          payload.ret,
        )}.`;
    }
  } catch (error) {
    tradeError =
      error instanceof Error
        ? error.message
        : "AllTick trade-tick request failed.";
  }

  let klineResult:
    | AllTickRequestResult
    | null = null;

  let klineError:
    | string
    | undefined;

  try {
    klineResult =
      await requestAllTick(
        "kline",
        buildKlineQuery(code),
      );

    const payload =
      klineResult.payload;

    if (
      diagnostics.httpStatus ===
      undefined
    ) {
      diagnostics.httpStatus =
        klineResult.httpStatus;
    }

    if (
      diagnostics.httpOk ===
      undefined
    ) {
      diagnostics.httpOk =
        klineResult.httpOk;
    }

    diagnostics.klineListCount =
      payload.data?.kline_list
        ?.length ?? 0;

    diagnostics.klineRowCount =
      payload.data?.kline_list
        ?.reduce(
          (sum, item) =>
            sum +
            (item.kline_data
              ?.length ?? 0),
          0,
        ) ?? 0;

    diagnostics.historicalPayloadReceived =
      diagnostics.klineListCount > 0 &&
      diagnostics.klineRowCount > 0;

    if (
      !klineResult.httpOk
    ) {
      klineError =
        payload.msg ||
        `AllTick kline returned HTTP ${klineResult.httpStatus}.`;
    } else if (
      payload.ret !== 200
    ) {
      klineError =
        payload.msg ||
        `AllTick kline returned ret=${String(
          payload.ret,
        )}.`;
    }
  } catch (error) {
    klineError =
      error instanceof Error
        ? error.message
        : "AllTick kline request failed.";
  }

  const bars = klineResult
    ? buildBars(
        klineResult.payload,
      )
    : [];

  const tick =
    tradeResult?.payload.data
      ?.tick_list?.[0];

  const livePrice =
    parseNumber(tick?.price);

  const liveAsOf =
    normalizeTimestamp(
      tick?.tick_time,
    );

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

  diagnostics.realtimeVerified =
    realtimeVerified;

  diagnostics.historicalVerified =
    historicalVerified;

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
      diagnostics,
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

    diagnostics,
  };
}
