import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  analyzeAIOSData,
} from "@/lib/runtime/analysis/aios-data-analysis-runtime";

import type {
  AIOSDataAnalysisOptions,
  AIOSDataFilter,
  AIOSDataValue,
} from "@/lib/runtime/analysis/aios-data-analysis-types";

import type {
  AIOSInputItem,
  AIOSInputKind,
  AIOSInputSource,
  AIOSInputSpreadsheetSheet,
} from "@/lib/runtime/input/aios-input-types";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 8 * 1024 * 1024;

const MAX_INPUTS = 8;

const MAX_FILTERS = 50;

const MAX_FILTER_VALUE_LENGTH = 10000;

const ALLOWED_INPUT_KINDS: AIOSInputKind[] = [
  "text",
  "image",
  "video",
  "file",
];

const ALLOWED_INPUT_SOURCES: AIOSInputSource[] = [
  "camera",
  "photo-library",
  "file-picker",
  "runtime",
  "unknown",
];

const ALLOWED_FILTER_OPERATORS = [
  "eq",
  "neq",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
] as const;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNullableString(
  value: unknown,
): value is string | null {
  return (
    value === null ||
    typeof value === "string"
  );
}

function isNullableNumber(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isFinite(value)
    )
  );
}

function isDataValue(
  value: unknown,
): value is AIOSDataValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isSpreadsheetSheet(
  value: unknown,
): value is AIOSInputSpreadsheetSheet {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.name !== "string" ||
    typeof value.index !== "number" ||
    !Number.isInteger(value.index) ||
    !Array.isArray(value.rows)
  ) {
    return false;
  }

  return value.rows.every((row) => {
    if (
      !isRecord(row) ||
      typeof row.row !== "number" ||
      !Number.isInteger(row.row) ||
      !Array.isArray(row.cells)
    ) {
      return false;
    }

    return row.cells.every((cell) => {
      return (
        isRecord(cell) &&
        typeof cell.row === "number" &&
        Number.isInteger(cell.row) &&
        typeof cell.column === "number" &&
        Number.isInteger(cell.column) &&
        typeof cell.value === "string"
      );
    });
  });
}

function isValidExtractedData(
  value: unknown,
): boolean {
  if (value === null) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  if (
    value.format !== "xlsx" ||
    !Array.isArray(value.sheets)
  ) {
    return false;
  }

  return value.sheets.every(
    isSpreadsheetSheet,
  );
}

function isAIOSInputItem(
  value: unknown,
): value is AIOSInputItem {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    !ALLOWED_INPUT_KINDS.includes(
      value.kind as AIOSInputKind,
    )
  ) {
    return false;
  }

  if (!isRecord(value.metadata)) {
    return false;
  }

  const metadata = value.metadata;

  if (
    !isNullableString(metadata.name) ||
    typeof metadata.mimeType !== "string" ||
    !isNullableNumber(metadata.sizeBytes) ||
    !isNullableString(metadata.lastModifiedAt) ||
    !ALLOWED_INPUT_SOURCES.includes(
      metadata.source as AIOSInputSource,
    )
  ) {
    return false;
  }

  if (
    !isNullableString(value.localReference) ||
    !isNullableString(value.extractedText) ||
    !isValidExtractedData(value.extractedData) ||
    !isNullableString(value.processingError)
  ) {
    return false;
  }

  if (
    value.processingStatus !== "pending" &&
    value.processingStatus !== "ready" &&
    value.processingStatus !== "failed"
  ) {
    return false;
  }

  return true;
}

function normalizeFilters(
  value: unknown,
): AIOSDataFilter[] | null {
  if (value === undefined) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.length > MAX_FILTERS
  ) {
    return null;
  }

  const filters: AIOSDataFilter[] = [];

  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.column !== "string" ||
      !item.column.trim() ||
      typeof item.operator !== "string" ||
      !ALLOWED_FILTER_OPERATORS.includes(
        item.operator as typeof ALLOWED_FILTER_OPERATORS[number],
      ) ||
      !isDataValue(item.value)
    ) {
      return null;
    }

    if (
      typeof item.value === "string" &&
      item.value.length > MAX_FILTER_VALUE_LENGTH
    ) {
      return null;
    }

    filters.push({
      column: item.column,
      operator:
        item.operator as AIOSDataFilter["operator"],
      value: item.value,
    });
  }

  return filters;
}

function normalizeOptions(
  value: unknown,
): AIOSDataAnalysisOptions | null {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    return null;
  }

  const filters = normalizeFilters(
    value.filters,
  );

  if (filters === null) {
    return null;
  }

  if (
    value.sheetName !== undefined &&
    typeof value.sheetName !== "string"
  ) {
    return null;
  }

  if (
    value.sortBy !== undefined &&
    typeof value.sortBy !== "string"
  ) {
    return null;
  }

  if (
    value.groupBy !== undefined &&
    typeof value.groupBy !== "string"
  ) {
    return null;
  }

  if (
    value.sortDirection !== undefined &&
    value.sortDirection !== "asc" &&
    value.sortDirection !== "desc"
  ) {
    return null;
  }

  if (
    value.limit !== undefined &&
    (
      typeof value.limit !== "number" ||
      !Number.isInteger(value.limit) ||
      value.limit < 1 ||
      value.limit > 5000
    )
  ) {
    return null;
  }

  return {
    sheetName:
      value.sheetName as string | undefined,

    filters,

    sortBy:
      value.sortBy as string | undefined,

    sortDirection:
      value.sortDirection as
        | "asc"
        | "desc"
        | undefined,

    groupBy:
      value.groupBy as string | undefined,

    limit:
      value.limit as number | undefined,
  };
}

function applyIdentityCookie(
  response: NextResponse,
  userId: string,
): NextResponse {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  );

  return response;
}

function buildErrorResponse(
  error: string,
  status: number,
  userId: string,
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,

      service: "AIOS Data Analysis API",

      error,

      userId,

      safetyBoundary: {
        modelExecution: false,
        plannerDispatched: false,
        tradingExecuted: false,
      },

      timestamp: Date.now(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  return applyIdentityCookie(
    response,
    userId,
  );
}

export async function GET(
  request: NextRequest,
) {
  const identity = resolveAlphaIdentity(
    request,
  );

  const response = NextResponse.json(
    {
      success: true,

      service: "AIOS Data Analysis API",

      status: "online",

      version: "C169.3.1",

      capabilities: {
        csv: true,
        json: true,
        xlsxStructuredData: true,

        automaticSchemaDetection: true,
        numericStatistics: true,
        filtering: true,
        sorting: true,
        grouping: true,

        modelExecution: false,
        plannerDispatch: false,
        tradingExecution: false,
      },

      limits: {
        maxRequestBytes: MAX_REQUEST_BYTES,
        maxInputs: MAX_INPUTS,
        maxFilters: MAX_FILTERS,
        maxResultRows: 5000,
      },

      identity: {
        userId: identity.userId,
        mode: "anonymous-alpha",
        isolated: true,
      },

      safetyBoundary: {
        modelExecution: false,
        plannerDispatched: false,
        tradingExecuted: false,
      },

      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  return applyIdentityCookie(
    response,
    identity.userId,
  );
}

export async function POST(
  request: NextRequest,
) {
  const startedAt = Date.now();

  const identity = resolveAlphaIdentity(
    request,
  );

  try {
    const contentType =
      request.headers.get("content-type") ?? "";

    if (
      !contentType.includes("application/json")
    ) {
      return buildErrorResponse(
        "AIOS Data Analysis requires application/json.",
        415,
        identity.userId,
      );
    }

    const contentLength = Number(
      request.headers.get("content-length") ?? 0,
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_REQUEST_BYTES
    ) {
      return buildErrorResponse(
        "Analysis request exceeds the 8 MB request limit.",
        413,
        identity.userId,
      );
    }

    const rawBody = await request.text();

    const actualBytes = new TextEncoder().encode(
      rawBody,
    ).byteLength;

    if (actualBytes > MAX_REQUEST_BYTES) {
      return buildErrorResponse(
        "Analysis request exceeds the 8 MB request limit.",
        413,
        identity.userId,
      );
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return buildErrorResponse(
        "Request body contains invalid JSON.",
        400,
        identity.userId,
      );
    }

    if (!isRecord(payload)) {
      return buildErrorResponse(
        "Request body must be a JSON object.",
        400,
        identity.userId,
      );
    }

    if (
      !Array.isArray(payload.inputs) ||
      payload.inputs.length === 0
    ) {
      return buildErrorResponse(
        "At least one AIOS input is required.",
        400,
        identity.userId,
      );
    }

    if (payload.inputs.length > MAX_INPUTS) {
      return buildErrorResponse(
        `A maximum of ${MAX_INPUTS} inputs is supported.`,
        400,
        identity.userId,
      );
    }

    const invalidInputIndex =
      payload.inputs.findIndex(
        (input) => !isAIOSInputItem(input),
      );

    if (invalidInputIndex >= 0) {
      return buildErrorResponse(
        `Input at index ${invalidInputIndex} does not match the AIOSInputItem contract.`,
        400,
        identity.userId,
      );
    }

    const inputIds = payload.inputs.map(
      (input) => input.id,
    );

    if (
      new Set(inputIds).size !== inputIds.length
    ) {
      return buildErrorResponse(
        "Duplicate input IDs are not allowed.",
        400,
        identity.userId,
      );
    }

    const options = normalizeOptions(
      payload.options,
    );

    if (options === null) {
      return buildErrorResponse(
        "Analysis options are invalid or exceed the supported limits.",
        400,
        identity.userId,
      );
    }

    const result = analyzeAIOSData({
      inputs: payload.inputs,
      options,
    });

    const status =
      result.analyzedCount > 0
        ? 200
        : 422;

    const response = NextResponse.json(
      {
        success: result.success,

        service: "AIOS Data Analysis API",

        code: result.code,

        result,

        identity: {
          userId: identity.userId,
          mode: "anonymous-alpha",
          isolated: true,
        },

        runtime: {
          capability: "deterministic-data-analysis",
          transient: true,
          modelRequired: false,
        },

        safetyBoundary: {
          modelExecution: false,
          plannerDispatched: false,
          tradingExecuted: false,
        },

        latencyMs: Date.now() - startedAt,
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  } catch (error) {
    console.error(
      "[AIOS Data Analysis API]",
      error,
    );

    return buildErrorResponse(
      error instanceof Error
        ? error.message
        : "AIOS_DATA_ANALYSIS_FAILED",
      500,
      identity.userId,
    );
  }
}
