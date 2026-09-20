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

function parseNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizeDate(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const parsed = new Date(
    String(value),
  );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
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
  const index =
    columns.indexOf(name);

  if (index < 0) {
    return null;
  }

  return row[index];
}

function buildColumns(): string[] {
  const ticker =
    env(
      "NASDAQ_DATA_LINK_TICKER_COLUMN",
    ) || "ticker";

  const date =
    env(
      "NASDAQ_DATA_LINK_DATE_COLUMN",
    ) || "date";

  const open =
    env(
      "NASDAQ_DATA_LINK_OPEN_COLUMN",
    ) || "open";

  const high =
    env(
      "NASDAQ_DATA_LINK_HIGH_COLUMN",
    ) || "high";

  const low =
    env(
      "NASDAQ_DATA_LINK_LOW_COLUMN",
    ) || "low";

  const close =
    env(
      "NASDAQ_DATA_LINK_CLOSE_COLUMN",
    ) || "close";

  const volume =
    env(
      "NASDAQ_DATA_LINK_VOLUME_COLUMN",
    ) || "volume";

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

function buildBars(
  payload: NasdaqDatatableResponse,
): MarketBar[] {
  const columns =
    buildColumns();

  const rows =
    payload.datatable?.data ?? [];

  const dateColumn =
    columns[1];

  const openColumn =
    columns[2];

  const highColumn =
    columns[3];

  const lowColumn =
    columns[4];

  const closeColumn =
    columns[5];

  const volumeColumn =
    columns[6];

  return rows
    .map((row) => {
      if (!Array.isArray(row)) {
        return null;
      }

      const timestamp =
        normalizeDate(
          getColumn(
            row,
            columns,
            dateColumn,
          ),
        );

      if (!timestamp) {
        return null;
      }

      return {
        timestamp,

        open:
          parseNumber(
            getColumn(
              row,
              columns,
              openColumn,
            ),
          ),

        high:
          parseNumber(
            getColumn(
              row,
              columns,
              highColumn,
            ),
          ),

        low:
          parseNumber(
            getColumn(
              row,
              columns,
              lowColumn,
            ),
          ),

        close:
          parseNumber(
            getColumn(
              row,
              columns,
              closeColumn,
            ),
          ),

        volume:
          parseNumber(
            getColumn(
              row,
              columns,
              volumeColumn,
            ),
          ),
      };
    })
    .filter(
      (
        value,
      ): value is MarketBar =>
        value !== null,
    )
    .sort(
      (a, b) =>
        new Date(
          a.timestamp,
        ).getTime() -
        new Date(
          b.timestamp,
        ).getTime(),
    );
}

function buildUrl(
  instrument: MarketInstrument,
): string {
  const apiKey =
    env(
      "NASDAQ_DATA_LINK_API_KEY",
    );

  const table =
    env(
      "NASDAQ_DATA_LINK_PRICE_TABLE",
    );

  const tickerColumn =
    env(
      "NASDAQ_DATA_LINK_TICKER_COLUMN",
    ) || "ticker";

  const dateColumn =
    env(
      "NASDAQ_DATA_LINK_DATE_COLUMN",
    ) || "date";

  const columns =
    buildColumns();

  const url =
    new URL(
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
   * Limit the request to a recent
   * historical window.
   *
   * This is deliberately not called
   * "real-time". The actual freshness
   * is determined by the returned data.
   */
  const since =
    new Date(
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
  const empty =
    emptySnapshot();

  if (!configured()) {
    return {
      success: false,
      verified: false,

      provider:
        "nasdaq-data-link",

      dataset:
        env(
          "NASDAQ_DATA_LINK_PRICE_TABLE",
        ) || null,

      snapshot: empty,

      sourceCount: 0,

      error:
        "NASDAQ_DATA_LINK_API_KEY or NASDAQ_DATA_LINK_PRICE_TABLE is not configured.",
    };
  }

  /*
   * Current structured implementation
   * deliberately targets US equities.
   *
   * HK/CN remain on Web Intelligence
   * until a corresponding licensed/
   * configured structured provider is
   * added.
   */
  if (instrument.market !== "us") {
    return {
      success: false,
      verified: false,

      provider:
        "nasdaq-data-link",

      dataset:
        env(
          "NASDAQ_DATA_LINK_PRICE_TABLE",
        ) || null,

      snapshot: empty,

      sourceCount: 0,

      error:
        "Nasdaq Data Link structured provider is currently enabled for US equities only.",
    };
  }

  const url =
    buildUrl(
      instrument,
    );

  try {
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

    const payload =
      (await response.json()) as
        NasdaqDatatableResponse;

    if (!response.ok) {
      const message =
        payload.message ||
        payload.errors?.join(
          "; ",
        ) ||
        `Nasdaq Data Link returned HTTP ${response.status}.`;

      return {
        success: false,
        verified: false,

        provider:
          "nasdaq-data-link",

        dataset:
          env(
            "NASDAQ_DATA_LINK_PRICE_TABLE",
          ) || null,

        snapshot: empty,

        sourceCount: 0,

        error: message,
      };
    }

    const bars =
      buildBars(
        payload,
      );

    if (bars.length === 0) {
      return {
        success: false,
        verified: false,

        provider:
          "nasdaq-data-link",

        dataset:
          env(
            "NASDAQ_DATA_LINK_PRICE_TABLE",
          ) || null,

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
      price:
        latestClose,

      previousClose,

      changePercent,

      open:
        latest.open ?? null,

      high:
        latest.high ?? null,

      low:
        latest.low ?? null,

      volume:
        latest.volume ?? null,

      marketCap: null,
      pe: null,
      pb: null,
      eps: null,
      revenue: null,
      revenueGrowth: null,

      /*
       * Historical is intentional.
       * We do not claim live quotes merely
       * because the API returned data.
       */
      dataQuality:
        "historical",

      liveQuoteAvailable:
        false,

      asOf:
        latest.timestamp,

      source:
        "Nasdaq Data Link",

      dataset:
        env(
          "NASDAQ_DATA_LINK_PRICE_TABLE",
        ),

      bars,
    };

    return {
      success: true,

      /*
       * Verification requires:
       * 1. rows returned
       * 2. valid timestamp
       * 3. usable close price
       */
      verified:
        bars.length > 0 &&
        latestClose !== null,

      provider:
        "nasdaq-data-link",

      dataset:
        env(
          "NASDAQ_DATA_LINK_PRICE_TABLE",
        ),

      snapshot,

      sourceCount: 1,
    };
  } catch (error) {
    return {
      success: false,
      verified: false,

      provider:
        "nasdaq-data-link",

      dataset:
        env(
          "NASDAQ_DATA_LINK_PRICE_TABLE",
        ) || null,

      snapshot: empty,

      sourceCount: 0,

      error:
        error instanceof Error
          ? error.message
          : "Structured market provider request failed.",
    };
  }
}
