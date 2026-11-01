import type {
  AIOSInputItem,
  AIOSInputSpreadsheetSheet,
} from "@/lib/runtime/input/aios-input-types";

import type {
  AIOSDataAnalysisOptions,
  AIOSDataAnalysisRequest,
  AIOSDataAnalysisResult,
  AIOSDataColumn,
  AIOSDataColumnType,
  AIOSDataFilter,
  AIOSDataRow,
  AIOSDataSourceResult,
  AIOSDataValue,
  AIOSNumericSummary,
} from "./aios-data-analysis-types";

const MAX_INPUTS = 8;
const MAX_ROWS = 50000;
const MAX_COLUMNS = 200;
const MAX_CELL_LENGTH = 100000;
const DEFAULT_RESULT_LIMIT = 5000;

function normalizeHeader(
  value: string,
  index: number,
): string {
  const normalized = value
    .trim()
    .replace(/^\uFEFF/, "");

  return normalized || `column_${index + 1}`;
}

function parseDelimitedText(
  text: string,
): string[][] {
  const rows: string[][] = [];

  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    const character = text[index];

    if (character === '"') {
      if (
        inQuotes &&
        text[index + 1] === '"'
      ) {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (
      character === "," &&
      !inQuotes
    ) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (
      (
        character === "\n" ||
        character === "\r"
      ) &&
      !inQuotes
    ) {
      if (
        character === "\r" &&
        text[index + 1] === "\n"
      ) {
        index += 1;
      }

      row.push(cell);

      if (
        row.some(
          (value) => value.length > 0,
        )
      ) {
        rows.push(row);
      }

      row = [];
      cell = "";

      continue;
    }

    cell += character;

    if (
      cell.length > MAX_CELL_LENGTH
    ) {
      throw new Error(
        "A CSV cell exceeds the maximum supported length.",
      );
    }
  }

  if (inQuotes) {
    throw new Error(
      "CSV contains an unterminated quoted field.",
    );
  }

  row.push(cell);

  if (
    row.some(
      (value) => value.length > 0,
    )
  ) {
    rows.push(row);
  }

  if (rows.length > MAX_ROWS + 1) {
    throw new Error(
      `CSV exceeds the ${MAX_ROWS} row analysis limit.`,
    );
  }

  return rows;
}

function coerceValue(
  value: unknown,
): AIOSDataValue {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    if (
      /^(true|false)$/i.test(trimmed)
    ) {
      return trimmed.toLowerCase() === "true";
    }

    /*
     * Preserve identifiers such as 00123.
     * Only convert ordinary numeric strings.
     */
    if (
      /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(
        trimmed,
      )
    ) {
      const numeric = Number(trimmed);

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }

    return trimmed;
  }

  return String(value);
}

function rowsFromCsv(
  text: string,
): AIOSDataRow[] {
  const matrix = parseDelimitedText(text);

  if (matrix.length < 2) {
    throw new Error(
      "CSV must contain a header row and at least one data row.",
    );
  }

  const headers = matrix[0]
    .slice(0, MAX_COLUMNS)
    .map(normalizeHeader);

  const seen = new Map<string, number>();

  const uniqueHeaders = headers.map(
    (header) => {
      const count =
        (seen.get(header) ?? 0) + 1;

      seen.set(header, count);

      return count === 1
        ? header
        : `${header}_${count}`;
    },
  );

  return matrix
    .slice(1, MAX_ROWS + 1)
    .map((values) => {
      const record: AIOSDataRow = {};

      uniqueHeaders.forEach(
        (header, index) => {
          record[header] = coerceValue(
            values[index] ?? null,
          );
        },
      );

      return record;
    });
}

function rowsFromJson(
  text: string,
): AIOSDataRow[] {
  const parsed: unknown = JSON.parse(text);

  let records: unknown = parsed;

  if (
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    "rows" in parsed
  ) {
    records = (
      parsed as {
        rows: unknown;
      }
    ).rows;
  }

  if (!Array.isArray(records)) {
    throw new Error(
      "JSON analysis requires an array of row objects or an object with a rows array.",
    );
  }

  if (records.length > MAX_ROWS) {
    throw new Error(
      `JSON exceeds the ${MAX_ROWS} row analysis limit.`,
    );
  }

  return records.map(
    (entry, rowIndex) => {
      if (
        entry === null ||
        typeof entry !== "object" ||
        Array.isArray(entry)
      ) {
        throw new Error(
          `JSON row ${rowIndex + 1} is not an object.`,
        );
      }

      const record: AIOSDataRow = {};

      Object.entries(
        entry as Record<string, unknown>,
      )
        .slice(0, MAX_COLUMNS)
        .forEach(([key, value]) => {
          record[key] = coerceValue(value);
        });

      return record;
    },
  );
}

function rowsFromSpreadsheet(
  sheet: AIOSInputSpreadsheetSheet,
): AIOSDataRow[] {
  const matrix = sheet.rows
    .slice(0, MAX_ROWS + 1)
    .map((row) => {
      const values: string[] = [];

      row.cells.forEach((cell) => {
        if (
          cell.column >= 0 &&
          cell.column < MAX_COLUMNS
        ) {
          values[cell.column] = cell.value;
        }
      });

      return values;
    });

  if (matrix.length < 2) {
    throw new Error(
      `XLSX sheet "${sheet.name}" does not contain a header and data rows.`,
    );
  }

  const headers = matrix[0]
    .slice(0, MAX_COLUMNS)
    .map(normalizeHeader);

  const seen = new Map<string, number>();

  const uniqueHeaders = headers.map(
    (header) => {
      const count =
        (seen.get(header) ?? 0) + 1;

      seen.set(header, count);

      return count === 1
        ? header
        : `${header}_${count}`;
    },
  );

  return matrix
    .slice(1)
    .map((values) => {
      const record: AIOSDataRow = {};

      uniqueHeaders.forEach(
        (header, index) => {
          record[header] = coerceValue(
            values[index] ?? null,
          );
        },
      );

      return record;
    });
}

interface ResolvedDataSource {
  input: AIOSInputItem;
  rows: AIOSDataRow[];
  format: "csv" | "json" | "xlsx";
  sheetName: string | null;
  limitations: string[];
}

function resolveSource(
  input: AIOSInputItem,
  options?: AIOSDataAnalysisOptions,
): ResolvedDataSource {
  const fileName =
    input.metadata.name ?? "unnamed";

  const extension =
    fileName.toLowerCase().split(".").pop() ?? "";

  const mimeType =
    input.metadata.mimeType.toLowerCase();

  if (
    extension === "csv" ||
    mimeType === "text/csv"
  ) {
    if (
      typeof input.extractedText !== "string"
    ) {
      throw new Error(
        "CSV has no extracted text. Run the Input Processing stage first.",
      );
    }

    return {
      input,
      rows: rowsFromCsv(input.extractedText),
      format: "csv",
      sheetName: null,
      limitations: [
        "CSV values are parsed deterministically from extracted text.",
      ],
    };
  }

  if (
    extension === "json" ||
    mimeType === "application/json"
  ) {
    if (
      typeof input.extractedText !== "string"
    ) {
      throw new Error(
        "JSON has no extracted text. Run the Input Processing stage first.",
      );
    }

    return {
      input,
      rows: rowsFromJson(input.extractedText),
      format: "json",
      sheetName: null,
      limitations: [
        "JSON analysis accepts an array of objects or an object containing a rows array.",
      ],
    };
  }

  if (
    extension === "xlsx" ||
    mimeType.includes("spreadsheetml")
  ) {
    const extractedData =
      input.extractedData;

    if (
      !extractedData ||
      extractedData.format !== "xlsx"
    ) {
      throw new Error(
        "XLSX has no structured extractedData. The document parser must produce real sheet data first.",
      );
    }

    const sheets =
      extractedData.sheets;

    if (
      !Array.isArray(sheets) ||
      sheets.length === 0
    ) {
      throw new Error(
        "XLSX contains no extracted worksheets.",
      );
    }

    const selectedSheet =
      options?.sheetName
        ? sheets.find(
            (sheet) =>
              sheet.name === options.sheetName,
          )
        : sheets[0];

    if (!selectedSheet) {
      throw new Error(
        `Requested XLSX sheet was not found: ${options?.sheetName}`,
      );
    }

    return {
      input,
      rows: rowsFromSpreadsheet(
        selectedSheet,
      ),
      format: "xlsx",
      sheetName: selectedSheet.name,
      limitations: [
        "XLSX analysis uses only structured worksheet cells supplied by the upstream parser.",
        "Formula recalculation and hidden-sheet discovery are not performed by this analysis runtime.",
      ],
    };
  }

  throw new Error(
    "Supported analysis formats are CSV, JSON, and XLSX.",
  );
}

function inferColumnType(
  values: AIOSDataValue[],
): AIOSDataColumnType {
  const nonEmpty = values.filter(
    (value) => value !== null,
  );

  if (nonEmpty.length === 0) {
    return "empty";
  }

  const kinds = new Set<string>(
    nonEmpty.map((value) => {
      if (typeof value === "number") {
        return "number";
      }

      if (typeof value === "boolean") {
        return "boolean";
      }

      return "string";
    }),
  );

  if (kinds.size !== 1) {
    return "mixed";
  }

  return [...kinds][0] as AIOSDataColumnType;
}

function describeColumns(
  rows: AIOSDataRow[],
): AIOSDataColumn[] {
  const names = Array.from(
    new Set(
      rows.flatMap(
        (row) => Object.keys(row),
      ),
    ),
  );

  return names
    .slice(0, MAX_COLUMNS)
    .map((name) => {
      const values = rows.map(
        (row) => row[name] ?? null,
      );

      const nonEmpty = values.filter(
        (value) => value !== null,
      );

      return {
        name,
        type: inferColumnType(values),
        nonEmptyCount: nonEmpty.length,
        nullCount:
          values.length - nonEmpty.length,
        uniqueCount: new Set(
          nonEmpty.map(
            (value) =>
              `${typeof value}:${String(value)}`,
          ),
        ).size,
      };
    });
}

function calculateMedian(
  values: number[],
): number {
  const sorted = [...values].sort(
    (left, right) => left - right,
  );

  const middle = Math.floor(
    sorted.length / 2,
  );

  if (sorted.length % 2 === 0) {
    return (
      sorted[middle - 1] +
      sorted[middle]
    ) / 2;
  }

  return sorted[middle];
}

function buildNumericSummaries(
  rows: AIOSDataRow[],
  columns: AIOSDataColumn[],
): Record<string, AIOSNumericSummary> {
  const summaries: Record<
    string,
    AIOSNumericSummary
  > = {};

  columns
    .filter(
      (column) => column.type === "number",
    )
    .forEach((column) => {
      const values = rows
        .map(
          (row) => row[column.name],
        )
        .filter(
          (
            value,
          ): value is number =>
            typeof value === "number" &&
            Number.isFinite(value),
        );

      if (values.length === 0) {
        return;
      }

      const sum = values.reduce(
        (total, value) => total + value,
        0,
      );

      summaries[column.name] = {
        count: values.length,
        sum,
        mean: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: calculateMedian(values),
      };
    });

  return summaries;
}

function compareValues(
  left: AIOSDataValue,
  right: AIOSDataValue,
): number {
  if (
    left === null &&
    right === null
  ) {
    return 0;
  }

  if (left === null) {
    return -1;
  }

  if (right === null) {
    return 1;
  }

  if (
    typeof left === "number" &&
    typeof right === "number"
  ) {
    return left - right;
  }

  return String(left).localeCompare(
    String(right),
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function matchesFilter(
  row: AIOSDataRow,
  filter: AIOSDataFilter,
): boolean {
  const actual =
    row[filter.column] ?? null;

  const expected = filter.value;

  switch (filter.operator) {
    case "eq":
      return actual === expected;

    case "neq":
      return actual !== expected;

    case "contains":
      return String(actual ?? "")
        .toLowerCase()
        .includes(
          String(expected ?? "").toLowerCase(),
        );

    case "gt":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual > expected
      );

    case "gte":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual >= expected
      );

    case "lt":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual < expected
      );

    case "lte":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual <= expected
      );

    default:
      return false;
  }
}

function applyOptions(
  sourceRows: AIOSDataRow[],
  options?: AIOSDataAnalysisOptions,
): AIOSDataRow[] {
  let rows = [...sourceRows];

  if (options?.filters?.length) {
    rows = rows.filter(
      (row) =>
        options.filters!.every(
          (filter) =>
            matchesFilter(row, filter),
        ),
    );
  }

  if (options?.sortBy) {
    const sortBy = options.sortBy;

    const direction =
      options.sortDirection === "desc"
        ? -1
        : 1;

    rows.sort(
      (left, right) =>
        compareValues(
          left[sortBy] ?? null,
          right[sortBy] ?? null,
        ) * direction,
    );
  }

  return rows;
}

function buildGroupedCounts(
  rows: AIOSDataRow[],
  groupBy?: string,
): Record<string, number> | null {
  if (!groupBy) {
    return null;
  }

  const counts: Record<string, number> = {};

  rows.forEach((row) => {
    const key = String(
      row[groupBy] ?? "(empty)",
    );

    counts[key] =
      (counts[key] ?? 0) + 1;
  });

  return counts;
}

function analyzeSource(
  source: ResolvedDataSource,
  options?: AIOSDataAnalysisOptions,
): AIOSDataSourceResult {
  const filteredRows = applyOptions(
    source.rows,
    options,
  );

  const columns =
    describeColumns(filteredRows);

  const numericSummaries =
    buildNumericSummaries(
      filteredRows,
      columns,
    );

  const requestedLimit =
    options?.limit ?? DEFAULT_RESULT_LIMIT;

  const limit = Math.max(
    1,
    Math.min(
      requestedLimit,
      DEFAULT_RESULT_LIMIT,
    ),
  );

  const limitations = [
    ...source.limitations,
  ];

  if (filteredRows.length > limit) {
    limitations.push(
      `Only the first ${limit} result rows are returned; statistics use all ${filteredRows.length} filtered rows.`,
    );
  }

  return {
    inputId: source.input.id,
    fileName:
      source.input.metadata.name ?? "unnamed",
    format: source.format,
    sheetName: source.sheetName,
    rowCount: filteredRows.length,
    columns,
    numericSummaries,
    rows: filteredRows.slice(0, limit),
    groupedCounts: buildGroupedCounts(
      filteredRows,
      options?.groupBy,
    ),
    limitations,
  };
}

export function analyzeAIOSData(
  request: AIOSDataAnalysisRequest,
): AIOSDataAnalysisResult {
  const generatedAt =
    new Date().toISOString();

  const inputs = Array.isArray(
    request?.inputs,
  )
    ? request.inputs
    : [];

  const options = request?.options;

  const sources: AIOSDataSourceResult[] = [];

  const errors: AIOSDataAnalysisResult["errors"] = [];

  if (
    inputs.length === 0 ||
    inputs.length > MAX_INPUTS
  ) {
    return {
      success: false,
      code: "AIOS_DATA_ANALYSIS_REJECTED",
      sourceCount: inputs.length,
      analyzedCount: 0,
      rejectedCount: inputs.length,
      totalRows: 0,
      sources: [],
      errors: [
        {
          inputId: "",
          fileName: "",
          error:
            inputs.length === 0
              ? "No input files were provided."
              : `A maximum of ${MAX_INPUTS} input files can be analyzed in one request.`,
        },
      ],
      safetyBoundary: {
        modelExecution: false,
        plannerDispatched: false,
        tradingExecuted: false,
      },
      generatedAt,
    };
  }

  inputs.forEach((input) => {
    const fileName =
      input.metadata.name ?? "unnamed";

    if (
      input.processingStatus !== "ready"
    ) {
      errors.push({
        inputId: input.id,
        fileName,
        error:
          `Input is not ready for analysis: ${input.processingStatus}.`,
      });

      return;
    }

    try {
      const source = resolveSource(
        input,
        options,
      );

      sources.push(
        analyzeSource(source, options),
      );
    } catch (error) {
      errors.push({
        inputId: input.id,
        fileName,
        error:
          error instanceof Error
            ? error.message
            : "Data analysis failed.",
      });
    }
  });

  const analyzedCount = sources.length;
  const rejectedCount = errors.length;

  const totalRows = sources.reduce(
    (total, source) =>
      total + source.rowCount,
    0,
  );

  return {
    success:
      analyzedCount > 0 &&
      rejectedCount === 0,

    code:
      analyzedCount === 0
        ? "AIOS_DATA_ANALYSIS_REJECTED"
        : rejectedCount > 0
          ? "AIOS_DATA_ANALYSIS_PARTIAL"
          : "AIOS_DATA_ANALYSIS_COMPLETED",

    sourceCount: inputs.length,
    analyzedCount,
    rejectedCount,
    totalRows,
    sources,
    errors,

    safetyBoundary: {
      modelExecution: false,
      plannerDispatched: false,
      tradingExecuted: false,
    },

    generatedAt,
  };
}
