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

interface NasdaqDatatableResponse {
  datatable?: {
    data?: unknown[][];
    columns?: Array<{
      name?: string;
      type?: string;
    }>;
  };
  message?: string;
  errors?: string[];
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
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

    dataQuality: "insufficient",
    liveQuoteAvailable: false,

    asOf: null,
    source: null,
    dataset: null,

    bars: [],
  };
}

function configured(): boolean {
  return Boolean(
    env("NASDAQ_DATA_LINK_API_KEY") &&
      env("NASDAQ_DATA_LINK_PRICE_TABLE"),
  );
}

function getColumn(
  row: unknown[],
  columns: string[],
  name: string,
): unknown {
  const index = columns.indexOf(name);

  if (index < 0) {
    return null;
  }

  return row[index];
}

function buildColumns(): string[] {
  const ticker =
    env("NASDAQ_DATA_LINK_TICKER_COLUMN") || "ticker";

  const date =
    env("NASDAQ_DATA_LINK_DATE_COLUMN") || "date";

  const open =
    env("NASDAQ_DATA_LINK_OPEN_COLUMN") || "open";

  const high =
    env("NASDAQ_DATA_LINK_HIGH_COLUMN") || "high";

  const low =
    env("NASDAQ_DATA_LINK_LOW_COLUMN") || "low";

  const close =
    env("NASDAQ_DATA_LINK_CLOSE_COLUMN") || "close";

  const volume =
    env("NASDAQ_DATA_LINK_VOLUME_COLUMN") || "volume";

  return [
    ticker,
    date,
    open,
    high,
    low,
    close,
    volume,
  ];
}

/**
 * Convert Nasdaq Data Link rows into strictly typed MarketBar[].
 *
 * This intentionally uses an explicit accumulator rather than
 * map(...).filter(...) so TypeScript can never infer
 * `(MarketBar | null)[]` here.
 */
function buildBars(
  payload: NasdaqDatatableResponse,
): MarketBar[] {
  const columns = buildColumns();
  const rows = payload.datatable?.data ?? [];

  const dateColumn = columns[1];
  const openColumn = columns[2];
  const highColumn = columns[3];
  const lowColumn = columns[4];
  const closeColumn = columns[5];
  const volumeColumn = columns[6];

  const bars: MarketBar[] = [];

  for (const row of rows) {
    if (!Array.isArray(row)) {
      continue;
    }

    const timestamp = normalizeDate(
      getColumn(
        row,
        columns,
        dateColumn,
      ),
    );

    if (!timestamp) {
      continue;
    }

    const bar: MarketBar = {
      timestamp,

      open: parseNumber(
        getColumn(
          row,
          columns,
          openColumn,
        ),
      ),

      high: parseNumber(
        getColumn(
          row,
          columns,
          highColumn,
        ),
      ),

      low: parseNumber(
        getColumn(
          row,
          columns,
          lowColumn,
        ),
      ),

      close: parseNumber(
        getColumn(
          row,
          columns,
          closeColumn,
        ),
      ),

      volume: parseNumber(
        getColumn(
          row,
          columns,
          volumeColumn,
        ),
      ),
    };

    bars.push(bar);
  }

  bars.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  );

  return bars;
}

function buildUrl(
  instrument: MarketInstrument,
): string {
  const apiKey =
    env("NASDAQ_DATA_LINK_API_KEY");

  const table =
    env("NASDAQ_DATA_LINK_PRICE_TABLE");

  const tickerColumn =
    env("NASDAQ_DATA_LINK_TICKER_COLUMN") ||
    "ticker";

  const dateColumn =
    env("NASDAQ_DATA_LINK_DATE_COLUMN") ||
    "date";

  const columns = buildColumns();

  const url = new URL(
    `https://data.nasdaq.com/api/v3/datatables/${table}.json`,
  );

  url.searchParams.set(
    tickerColumn,
    instrument.normalizedSymbol,
  );

  url.searchParams.set(
    "qopts.columns",
    columns.join(","),
  );

  url.searchParams.set(
    "qopts.per_page",
    "100",
  );

  /*
   * Historical window only.
   *
   * This provider must not claim real-time
   * market data unless the underlying dataset
   * actually provides it.
   */
  const since = new Date(
    Date.now() -
      1000 *
        60 *
        60 *
        24 *
        90,
  )
    .toISOString()
    .slice(0, 10);

  url.searchParams.set(
    `${dateColumn}.gte`,
    since,
  );

  url.searchParams.set(
    "api_key",
    apiKey,
  );

  return url.toString();
}

export async function retrieveStructuredMarketData(
  instrument: MarketInstrument,
): Promise<StructuredMarketResult> {
  const empty = emptySnapshot();

  const dataset =
    env("NASDAQ_DATA_LINK_PRICE_TABLE") ||
    null;

  if (!configured()) {
    return {
      success: false,
      verified: false,

      provider:
        "nasdaq-data-link",

      dataset,

      snapshot: empty,

      sourceCount: 0,

      error:
        "NASDAQ_DATA_LINK_API_KEY or NASDAQ_DATA_LINK_PRICE_TABLE is not configured.",
    };
  }

  /*
   * C147.2 structured provider currently
   * targets US equities.
   *
   * HK/CN intentionally remain on the
   * Web Intelligence path until a
   * configured structured provider exists.
   */
  if (instrument.market !== "us") {
    return {
      success: false,
      verified: false,

      provider:
        "nasdaq-data-link",

      dataset,

      snapshot: empty,

      sourceCount: 0,

      error:
        "Nasdaq Data Link structured provider is currently enabled for US equities only.",
    };
  }

  const url = buildUrl(instrument);

  try {
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

    const payload =
      (await response.json()) as
        NasdaqDatatableResponse;

    if (!response.ok) {
      const message =
        payload.message ||
        payload.errors?.join("; ") ||
        `Nasdaq Data Link returned HTTP ${response.status}.`;

      return {
        success: false,
        verified: false,

        provider:
          "nasdaq-data-link",

        dataset,

        snapshot: empty,

        sourceCount: 0,

        error: message,
      };
    }

    const bars = buildBars(payload);

    if (bars.length === 0) {
      return {
        success: false,
        verified: false,

        provider:
          "nasdaq-data-link",

        dataset,

        snapshot: empty,

        sourceCount: 0,

        error:
          "Structured provider returned no usable OHLCV rows for the requested symbol.",
      };
    }

    const latest =
      bars[bars.length - 1];

    const previous =
      bars.length > 1
        ? bars[bars.length - 2]
        : null;

    const latestClose =
      latest.close ?? null;

    const previousClose =
      previous?.close ?? null;

    const changePercent =
      latestClose !== null &&
      previousClose !== null &&
      previousClose !== 0
        ? ((latestClose -
            previousClose) /
            previousClose) *
          100
        : null;

    const snapshot: MarketSnapshot = {
      price: latestClose,

      previousClose,

      changePercent,

      open: latest.open ?? null,

      high: latest.high ?? null,

      low: latest.low ?? null,

      volume: latest.volume ?? null,

      marketCap: null,
      pe: null,
      pb: null,
      eps: null,
      revenue: null,
      revenueGrowth: null,

      /*
       * Deliberately historical.
       */
      dataQuality:
        "historical",

      liveQuoteAvailable:
        false,

      asOf:
        latest.timestamp,

      source:
        "Nasdaq Data Link",

      dataset,

      bars,
    };

    const verified =
      bars.length > 0 &&
      latestClose !== null;

    return {
      success: true,

      verified,

      provider:
        "nasdaq-data-link",

      dataset,

      snapshot,

      sourceCount: 1,
    };
  } catch (error) {
    return {
      success: false,
      verified: false,

      provider:
        "nasdaq-data-link",

      dataset,

      snapshot: empty,

      sourceCount: 0,

      error:
        error instanceof Error
          ? error.message
          : "Structured market provider request failed.",
    };
  }
}
