import type {
  MarketBar,
  MarketInstrument,
  MarketRegion,
  MarketSnapshot,
} from "./market-types";

export type StructuredProviderFailureCode =
  | "NOT_CONFIGURED"
  | "AUTH_DENIED"
  | "RATE_LIMITED"
  | "TOKEN_LEVEL_NOT_ENOUGH"
  | "INVALID_REQUEST"
  | "SYMBOL_INVALID"
  | "NO_DATA"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export type AllTickEntitlementStatus =
  | "verified"
  | "denied"
  | "unknown";

export type AllTickProviderHealth =
  | "healthy"
  | "rate_limited"
  | "auth_denied"
  | "entitlement_denied"
  | "unavailable"
  | "unknown";

export interface StructuredProviderDiagnostics {
  configured: boolean;
  endpoint?: string;
  httpStatus?: number;
  httpOk?: boolean;
  ret?: number;
  msg?: string;
  failureCode?: StructuredProviderFailureCode;
  requestedCode?: string;
  tradeTickAttempted: boolean;
  klineAttempted: boolean;
  tickListCount: number;
  klineListCount: number;
  klineRowCount: number;
  realtimePayloadReceived: boolean;
  historicalPayloadReceived: boolean;
  realtimeVerified: boolean;
  historicalVerified: boolean;
  klineEnabled: boolean;
  klineSkippedReason?: string;
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

export interface AllTickMarketCapability {
  market: MarketRegion;
  technicalSupport: boolean;
  accountEntitled: AllTickEntitlementStatus;
  realtimeVerified: boolean;
  probeSymbol: string;
  failureCode:
    | StructuredProviderFailureCode
    | null;
  reason: string | null;
  providerHealth: AllTickProviderHealth;
}

export interface AllTickCapabilityProbeResult {
  provider: "alltick";
  configured: boolean;
  technicalMarkets: MarketRegion[];
  probeMarkets: MarketRegion[];
  entitledMarkets: MarketRegion[];
  realtimeVerifiedMarkets: MarketRegion[];
  providerHealth: AllTickProviderHealth;
  cacheHit: boolean;
  cacheAgeMs: number | null;
  cacheTtlMs: number;
  marketCapabilities: Partial<
    Record<
      MarketRegion,
      AllTickMarketCapability
    >
  >;
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

const ALLTICK_TECHNICAL_MARKETS: MarketRegion[] = [
  "us",
  "hk",
  "cn",
];

const DEFAULT_PROBE_SYMBOLS: Record<
  MarketRegion,
  string
> = {
  us:
    process.env.ALLTICK_PROBE_US_SYMBOL?.trim() ||
    "AAPL.US",
  hk:
    process.env.ALLTICK_PROBE_HK_SYMBOL?.trim() ||
    "0700.HK",
  cn:
    process.env.ALLTICK_PROBE_CN_SYMBOL?.trim() ||
    "600519.SH",
};

const DEFAULT_CAPABILITY_CACHE_TTL_MS =
  60_000;

type CapabilityCache = {
  createdAt: number;
  result: AllTickCapabilityProbeResult;
};

let capabilityCache:
  | CapabilityCache
  | null = null;

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function parseBoolean(
  value: string,
  fallback: boolean,
): boolean {
  if (!value) return fallback;

  return [
    "1",
    "true",
    "yes",
    "on",
  ].includes(
    value.toLowerCase(),
  );
}

function parsePositiveInteger(
  value: string,
  fallback: number,
): number {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return fallback;
  }

  return Math.floor(parsed);
}

function capabilityCacheTtlMs(): number {
  return parsePositiveInteger(
    env(
      "ALLTICK_CAPABILITY_PROBE_CACHE_MS",
    ),
    DEFAULT_CAPABILITY_CACHE_TTL_MS,
  );
}

function configuredProbeMarkets(): MarketRegion[] {
  const raw =
    env(
      "ALLTICK_CAPABILITY_PROBE_MARKETS",
    );

  if (!raw) {
    return [
      ...ALLTICK_TECHNICAL_MARKETS,
    ];
  }

  const allowed =
    new Set<MarketRegion>(
      ALLTICK_TECHNICAL_MARKETS,
    );

  const values =
    raw
      .split(",")
      .map(
        (item) =>
          item
            .trim()
            .toLowerCase(),
      )
      .filter(
        (item): item is MarketRegion =>
          allowed.has(
            item as MarketRegion,
          ),
      );

  return Array.from(
    new Set(values),
  );
}

function parseNumber(
  value: unknown,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(
    value.replace(/,/g, "").trim(),
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
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

  const raw =
    String(value).trim();

  if (!raw) {
    return null;
  }

  const numeric =
    Number(raw);

  if (Number.isFinite(numeric)) {
    let milliseconds =
      numeric;

    if (raw.length <= 10) {
      milliseconds =
        numeric * 1000;
    }

    const date =
      new Date(milliseconds);

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date.toISOString();
  }

  const date =
    new Date(raw);

  return Number.isNaN(
    date.getTime(),
  )
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
    dataQuality:
      "insufficient",
    liveQuoteAvailable:
      false,
    quoteQuality:
      "insufficient",
    historicalQuality:
      "insufficient",
    asOf: null,
    source: null,
    dataset: null,
    bars: [],
  };
}

function toAllTickCode(
  instrument: MarketInstrument,
): string {
  const symbol =
    instrument.normalizedSymbol
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

  if (
    instrument.market === "hk"
  ) {
    const clean =
      symbol
        .replace(
          /^HK:/i,
          "",
        )
        .replace(
          /\.HK$/i,
          "",
        )
        .replace(
          /^0+(?=\d)/,
          "",
        );

    return `${clean.padStart(
      4,
      "0",
    )}.HK`;
  }

  if (
    instrument.market === "cn"
  ) {
    const clean =
      symbol
        .replace(
          /^SH:/i,
          "",
        )
        .replace(
          /^SZ:/i,
          "",
        )
        .replace(
          /^SS:/i,
          "",
        )
        .replace(
          /\.(SH|SZ)$/i,
          "",
        );

    const suffix =
      clean.startsWith("6")
        ? "SH"
        : "SZ";

    return `${clean}.${suffix}`;
  }

  return `${symbol
    .replace(
      /^NASDAQ:/i,
      "",
    )
    .replace(
      /^NYSE:/i,
      "",
    )
    .replace(
      /^US:/i,
      "",
    )
    .replace(
      /\.US$/i,
      "",
    )}.US`;
}

function configured(): boolean {
  return Boolean(
    env("ALLTICK_API_KEY"),
  );
}

function klineEnabled(): boolean {
  return parseBoolean(
    env("ALLTICK_ENABLE_KLINE"),
    false,
  );
}

function buildTradeTickQuery(
  code: string,
): string {
  return JSON.stringify({
    trace:
      `aios-trade-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    data: {
      symbol_list: [
        { code },
      ],
    },
  });
}

function buildKlineQuery(
  code: string,
): string {
  const configuredType =
    Number(
      env(
        "ALLTICK_KLINE_TYPE",
      ) || "8",
    );

  const configuredCount =
    Number(
      env(
        "ALLTICK_KLINE_COUNT",
      ) || "100",
    );

  const configuredAdjust =
    Number(
      env(
        "ALLTICK_ADJUST_TYPE",
      ) || "0",
    );

  const klineType =
    Number.isFinite(
      configuredType,
    )
      ? configuredType
      : 8;

  const klineCount =
    Number.isFinite(
      configuredCount,
    )
      ? Math.min(
          500,
          Math.max(
            2,
            configuredCount,
          ),
        )
      : 100;

  const adjustType =
    Number.isFinite(
      configuredAdjust,
    )
      ? configuredAdjust
      : 0;

  return JSON.stringify({
    trace:
      `aios-kline-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    data: {
      code,
      kline_type:
        klineType,
      kline_timestamp_end:
        0,
      query_kline_num:
        klineCount,
      adjust_type:
        adjustType,
    },
  });
}

async function requestAllTick(
  endpoint:
    | "trade-tick"
    | "kline",
  query: string,
): Promise<AllTickRequestResult> {
  const url =
    new URL(
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

  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
        },
        cache: "no-store",
      },
    );

  let payload:
    AllTickResponse;

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
    httpStatus:
      response.status,
    httpOk:
      response.ok,
  };
}

function classifyFailure(
  httpStatus?: number,
  ret?: number,
  msg?: string,
): StructuredProviderFailureCode {
  const normalized =
    (msg ?? "").toLowerCase();

  if (
    httpStatus === 401 ||
    ret === 401 ||
    normalized.includes(
      "token invalid",
    ) ||
    normalized.includes(
      "unauthorized",
    )
  ) {
    return "AUTH_DENIED";
  }

  if (
    httpStatus === 429 ||
    ret === 429 ||
    normalized.includes(
      "rate limit",
    ) ||
    normalized.includes(
      "too many requests",
    )
  ) {
    return "RATE_LIMITED";
  }

  if (
    ret === 603 ||
    normalized.includes(
      "token level not enough",
    ) ||
    normalized.includes(
      "level not enough",
    )
  ) {
    return "TOKEN_LEVEL_NOT_ENOUGH";
  }

  if (
    ret === 604 ||
    normalized.includes(
      "code unauthorized",
    )
  ) {
    return "AUTH_DENIED";
  }

  if (
    ret === 600 ||
    normalized.includes(
      "code invalid",
    )
  ) {
    return "SYMBOL_INVALID";
  }

  if (
    httpStatus === 400 ||
    ret === 402 ||
    normalized.includes(
      "request data param invalid",
    ) ||
    normalized.includes(
      "request header param invalid",
    ) ||
    normalized.includes(
      "query invalid",
    )
  ) {
    return "INVALID_REQUEST";
  }

  if (
    normalized.includes(
      "network",
    ) ||
    normalized.includes(
      "fetch failed",
    ) ||
    normalized.includes(
      "timeout",
    )
  ) {
    return "NETWORK_ERROR";
  }

  return "UNKNOWN";
}

function healthFromFailure(
  failureCode:
    | StructuredProviderFailureCode
    | null,
): AllTickProviderHealth {
  switch (failureCode) {
    case "RATE_LIMITED":
      return "rate_limited";

    case "AUTH_DENIED":
      return "auth_denied";

    case "TOKEN_LEVEL_NOT_ENOUGH":
      return "entitlement_denied";

    case "NOT_CONFIGURED":
    case "INVALID_REQUEST":
    case "SYMBOL_INVALID":
    case "NO_DATA":
    case "NETWORK_ERROR":
      return "unavailable";

    default:
      return "unknown";
  }
}

function mergeProviderHealth(
  values: AllTickProviderHealth[],
): AllTickProviderHealth {
  if (
    values.includes("healthy")
  ) {
    return "healthy";
  }

  if (
    values.includes(
      "auth_denied",
    )
  ) {
    return "auth_denied";
  }

  if (
    values.includes(
      "entitlement_denied",
    )
  ) {
    return "entitlement_denied";
  }

  if (
    values.includes(
      "rate_limited",
    )
  ) {
    return "rate_limited";
  }

  if (
    values.includes(
      "unavailable",
    )
  ) {
    return "unavailable";
  }

  return "unknown";
}

function diagnosticsFrom(
  configuredValue: boolean,
): StructuredProviderDiagnostics {
  return {
    configured:
      configuredValue,
    tickListCount: 0,
    klineListCount: 0,
    klineRowCount: 0,
    realtimePayloadReceived:
      false,
    historicalPayloadReceived:
      false,
    realtimeVerified:
      false,
    historicalVerified:
      false,
    tradeTickAttempted:
      false,
    klineAttempted:
      false,
    klineEnabled:
      klineEnabled(),
  };
}

function buildBars(
  payload: AllTickResponse,
): MarketBar[] {
  const rows =
    payload.data
      ?.kline_list?.[0]
      ?.kline_data ?? [];

  const bars:
    MarketBar[] = [];

  for (
    const row of rows
  ) {
    const timestamp =
      normalizeTimestamp(
        row.timestamp,
      );

    const close =
      parseNumber(
        row.close_price,
      );

    if (
      !timestamp ||
      close === null
    ) {
      continue;
    }

    bars.push({
      timestamp,
      open:
        parseNumber(
          row.open_price,
        ),
      high:
        parseNumber(
          row.high_price,
        ),
      low:
        parseNumber(
          row.low_price,
        ),
      close,
      volume:
        parseNumber(
          row.volume,
        ),
    });
  }

  return bars.sort(
    (a, b) =>
      new Date(
        a.timestamp,
      ).getTime() -
      new Date(
        b.timestamp,
      ).getTime(),
  );
}

export function isAllTickConfigured(): boolean {
  return configured();
}

function probeSymbol(
  market: MarketRegion,
): string {
  return (
    DEFAULT_PROBE_SYMBOLS[
      market
    ] ?? ""
  )
    .trim()
    .toUpperCase();
}

function capabilityFromFailure(
  market: MarketRegion,
  symbol: string,
  failureCode:
    | StructuredProviderFailureCode
    | null,
  reason: string | null,
): AllTickMarketCapability {
  const technicalSupport =
    ALLTICK_TECHNICAL_MARKETS.includes(
      market,
    );

  const accountEntitled:
    AllTickEntitlementStatus =
    failureCode ===
      "AUTH_DENIED" ||
    failureCode ===
      "TOKEN_LEVEL_NOT_ENOUGH"
      ? "denied"
      : "unknown";

  return {
    market,
    technicalSupport,
    accountEntitled,
    realtimeVerified:
      false,
    probeSymbol:
      symbol,
    failureCode,
    reason,
    providerHealth:
      healthFromFailure(
        failureCode,
      ),
  };
}

function capabilityResult(
  marketCapabilities: Partial<
    Record<
      MarketRegion,
      AllTickMarketCapability
    >
  >,
  probeMarkets: MarketRegion[],
  cacheHit: boolean,
  cacheAgeMs: number | null,
  cacheTtlMs: number,
): AllTickCapabilityProbeResult {
  const entitledMarkets =
    probeMarkets.filter(
      (market) =>
        marketCapabilities[
          market
        ]?.accountEntitled ===
        "verified",
    );

  const realtimeVerifiedMarkets =
    probeMarkets.filter(
      (market) =>
        marketCapabilities[
          market
        ]?.realtimeVerified ===
        true,
    );

  const healthValues =
    probeMarkets
      .map(
        (market) =>
          marketCapabilities[
            market
          ]?.providerHealth ??
          "unknown",
      );

  return {
    provider:
      "alltick",
    configured:
      configured(),
    technicalMarkets:
      [
        ...ALLTICK_TECHNICAL_MARKETS,
      ],
    probeMarkets,
    entitledMarkets,
    realtimeVerifiedMarkets,
    providerHealth:
      mergeProviderHealth(
        healthValues,
      ),
    cacheHit,
    cacheAgeMs,
    cacheTtlMs,
    marketCapabilities,
  };
}

export async function probeAllTickCapabilities(): Promise<
  AllTickCapabilityProbeResult
> {
  const cacheTtlMs =
    capabilityCacheTtlMs();

  if (
    capabilityCache &&
    cacheTtlMs > 0
  ) {
    const ageMs =
      Date.now() -
      capabilityCache.createdAt;

    if (
      ageMs >= 0 &&
      ageMs < cacheTtlMs
    ) {
      return {
        ...capabilityCache.result,
        cacheHit: true,
        cacheAgeMs: ageMs,
        cacheTtlMs,
      };
    }
  }

  const probeMarkets =
    configuredProbeMarkets();

  const marketCapabilities:
    Partial<
      Record<
        MarketRegion,
        AllTickMarketCapability
      >
    > = {};

  if (!configured()) {
    for (
      const market of
      ALLTICK_TECHNICAL_MARKETS
    ) {
      marketCapabilities[
        market
      ] =
        capabilityFromFailure(
          market,
          probeSymbol(market),
          "NOT_CONFIGURED",
          "ALLTICK_API_KEY is not configured.",
        );
    }

    const result =
      capabilityResult(
        marketCapabilities,
        probeMarkets,
        false,
        null,
        cacheTtlMs,
      );

    if (cacheTtlMs > 0) {
      capabilityCache = {
        createdAt:
          Date.now(),
        result,
      };
    }

    return result;
  }

  if (
    probeMarkets.length === 0
  ) {
    const result =
      capabilityResult(
        marketCapabilities,
        probeMarkets,
        false,
        null,
        cacheTtlMs,
      );

    return result;
  }

  for (
    const market of
    probeMarkets
  ) {
    const symbol =
      probeSymbol(market);

    try {
      const result =
        await requestAllTick(
          "trade-tick",
          buildTradeTickQuery(
            symbol,
          ),
        );

      const payload =
        result.payload;

      const tick =
        payload.data
          ?.tick_list?.[0];

      const price =
        parseNumber(
          tick?.price,
        );

      const asOf =
        normalizeTimestamp(
          tick?.tick_time,
        );

      const realtimeVerified =
        result.httpOk &&
        payload.ret === 200 &&
        price !== null &&
        asOf !== null;

      if (
        realtimeVerified
      ) {
        marketCapabilities[
          market
        ] = {
          market,
          technicalSupport:
            true,
          accountEntitled:
            "verified",
          realtimeVerified:
            true,
          probeSymbol:
            symbol,
          failureCode:
            null,
          reason:
            "AllTick Trade Tick returned a verified realtime quote.",
          providerHealth:
            "healthy",
        };

        continue;
      }

      const failureCode =
        classifyFailure(
          result.httpStatus,
          payload.ret,
          payload.msg,
        );

      marketCapabilities[
        market
      ] =
        capabilityFromFailure(
          market,
          symbol,
          failureCode,
          payload.msg ??
            `AllTick Trade Tick returned no verified realtime quote. HTTP ${result.httpStatus}; ret=${String(
              payload.ret,
            )}.`,
        );
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "AllTick capability probe failed.";

      marketCapabilities[
        market
      ] =
        capabilityFromFailure(
          market,
          symbol,
          "NETWORK_ERROR",
          reason,
        );
    }
  }

  const result =
    capabilityResult(
      marketCapabilities,
      probeMarkets,
      false,
      null,
      cacheTtlMs,
    );

  if (cacheTtlMs > 0) {
    capabilityCache = {
      createdAt:
        Date.now(),
      result,
    };
  }

  return result;
}

export async function retrieveStructuredMarketData(
  instrument: MarketInstrument,
): Promise<StructuredMarketResult> {
  const empty =
    emptySnapshot();

  const configuredValue =
    configured();

  const diagnostics =
    diagnosticsFrom(
      configuredValue,
    );

  if (!configuredValue) {
    diagnostics.failureCode =
      "NOT_CONFIGURED";

    return {
      success: false,
      verified: false,
      realtimeVerified:
        false,
      historicalVerified:
        false,
      provider:
        "alltick",
      dataset:
        null,
      snapshot:
        empty,
      sourceCount:
        0,
      error:
        "ALLTICK_API_KEY is not configured.",
      diagnostics,
    };
  }

  const code =
    toAllTickCode(
      instrument,
    );

  diagnostics.requestedCode =
    code;

  diagnostics.endpoint =
    "https://quote.alltick.co/quote-stock-b-api";

  diagnostics.tradeTickAttempted =
    true;

  let tradeResult:
    | AllTickRequestResult
    | null =
    null;

  let tradeError:
    | string
    | undefined;

  try {
    tradeResult =
      await requestAllTick(
        "trade-tick",
        buildTradeTickQuery(
          code,
        ),
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
      payload.data
        ?.tick_list
        ?.length ??
      0;

    diagnostics.realtimePayloadReceived =
      diagnostics.tickListCount >
      0;

    if (
      !tradeResult.httpOk
    ) {
      diagnostics.failureCode =
        classifyFailure(
          tradeResult.httpStatus,
          payload.ret,
          payload.msg,
        );

      tradeError =
        payload.msg ||
        `AllTick trade-tick returned HTTP ${tradeResult.httpStatus}.`;
    } else if (
      payload.ret !== 200
    ) {
      diagnostics.failureCode =
        classifyFailure(
          tradeResult.httpStatus,
          payload.ret,
          payload.msg,
        );

      tradeError =
        payload.msg ||
        `AllTick trade-tick returned ret=${String(
          payload.ret,
        )}.`;
    }
  } catch (error) {
    diagnostics.failureCode =
      "NETWORK_ERROR";

    tradeError =
      error instanceof Error
        ? error.message
        : "AllTick trade-tick request failed.";
  }

  const tick =
    tradeResult?.payload.data
      ?.tick_list?.[0];

  const livePrice =
    parseNumber(
      tick?.price,
    );

  const liveAsOf =
    normalizeTimestamp(
      tick?.tick_time,
    );

  const realtimeVerified =
    tradeResult !== null &&
    tradeResult.httpOk &&
    tradeResult.payload.ret ===
      200 &&
    livePrice !== null &&
    liveAsOf !== null;

  diagnostics.realtimeVerified =
    realtimeVerified;

  if (
    !realtimeVerified
  ) {
    diagnostics.klineAttempted =
      false;

    diagnostics.klineSkippedReason =
      tradeError
        ? `Trade Tick unavailable: ${tradeError}`
        : "Trade Tick returned no verified realtime price.";

    const failureCode =
      diagnostics.failureCode ??
      "NO_DATA";

    diagnostics.failureCode =
      failureCode;

    return {
      success: false,
      verified: false,
      realtimeVerified:
        false,
      historicalVerified:
        false,
      provider:
        "alltick",
      dataset:
        "alltick:trade-tick",
      snapshot:
        empty,
      sourceCount:
        0,
      error: [
        `code=${failureCode}`,
        tradeError ??
          "AllTick returned no verified realtime tick.",
        `symbol=${code}`,
        "K-line skipped because realtime Trade Tick was not verified.",
      ].join(" | "),
      diagnostics,
    };
  }

  let bars:
    MarketBar[] = [];

  let klineError:
    | string
    | undefined;

  if (
    klineEnabled()
  ) {
    diagnostics.klineAttempted =
      true;

    try {
      const klineResult =
        await requestAllTick(
          "kline",
          buildKlineQuery(
            code,
          ),
        );

      const payload =
        klineResult.payload;

      diagnostics.klineListCount =
        payload.data
          ?.kline_list
          ?.length ??
        0;

      diagnostics.klineRowCount =
        payload.data
          ?.kline_list
          ?.reduce(
            (
              sum,
              item,
            ) =>
              sum +
              (
                item.kline_data
                  ?.length ??
                0
              ),
            0,
          ) ??
        0;

      diagnostics.historicalPayloadReceived =
        diagnostics.klineListCount >
          0 &&
        diagnostics.klineRowCount >
          0;

      if (
        !klineResult.httpOk
      ) {
        klineError =
          payload.msg ||
          `AllTick kline returned HTTP ${klineResult.httpStatus}.`;

        if (
          !diagnostics.failureCode
        ) {
          diagnostics.failureCode =
            classifyFailure(
              klineResult.httpStatus,
              payload.ret,
              payload.msg,
            );
        }
      } else if (
        payload.ret !== 200
      ) {
        klineError =
          payload.msg ||
          `AllTick kline returned ret=${String(
            payload.ret,
          )}.`;

        if (
          !diagnostics.failureCode
        ) {
          diagnostics.failureCode =
            classifyFailure(
              klineResult.httpStatus,
              payload.ret,
              payload.msg,
            );
        }
      } else {
        bars =
          buildBars(
            payload,
          );
      }
    } catch (error) {
      klineError =
        error instanceof Error
          ? error.message
          : "AllTick kline request failed.";

      if (
        !diagnostics.failureCode
      ) {
        diagnostics.failureCode =
          "NETWORK_ERROR";
      }
    }
  } else {
    diagnostics.klineAttempted =
      false;

    diagnostics.klineSkippedReason =
      "K-line disabled for realtime-first runtime.";
  }

  const latestBar =
    bars.length > 0
      ? bars[
          bars.length - 1
        ]
      : undefined;

  const previousBar =
    bars.length > 1
      ? bars[
          bars.length - 2
        ]
      : undefined;

  const previousClose =
    previousBar?.close ??
    null;

  const effectivePreviousClose =
    previousClose ??
    latestBar?.close ??
    null;

  const changePercent =
    effectivePreviousClose !==
      null &&
    effectivePreviousClose !==
      0
      ? (
          (
            livePrice -
            effectivePreviousClose
          ) /
          effectivePreviousClose
        ) *
        100
      : null;

  const historicalVerified =
    bars.length > 0;

  diagnostics.historicalVerified =
    historicalVerified;

  const snapshot:
    MarketSnapshot = {
    price:
      livePrice,
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
      parseNumber(
        tick?.volume,
      ),
    marketCap:
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
    afterHoursPrice:
      null,
    preMarketPrice:
      null,
    dataQuality:
      "live",
    liveQuoteAvailable:
      true,
    quoteQuality:
      "live",
    historicalQuality:
      historicalVerified
        ? "historical"
        : "insufficient",
    asOf:
      liveAsOf,
    source:
      "AllTick",
    dataset:
      klineEnabled()
        ? "alltick:trade-tick+kline"
        : "alltick:trade-tick",
    bars,
  };

  const errorMessages =
    [
      klineError,
    ].filter(Boolean);

  return {
    success:
      true,
    verified:
      true,
    realtimeVerified:
      true,
    historicalVerified,
    provider:
      "alltick",
    dataset:
      klineEnabled()
        ? "alltick:trade-tick+kline"
        : "alltick:trade-tick",
    snapshot,
    sourceCount:
      1,
    error:
      errorMessages.length > 0
        ? errorMessages.join(
            " | ",
          )
        : undefined,
    diagnostics,
  };
}
