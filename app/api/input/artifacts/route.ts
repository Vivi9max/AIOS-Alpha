
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  generateAIOSArtifact,
  type AIOSArtifactFormat,
} from "@/lib/runtime/artifacts/aios-artifact-engine";

import type {
  AIOSDataAnalysisResult,
  AIOSDataSourceResult,
} from "@/lib/runtime/analysis/aios-data-analysis-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 8 * 1024 * 1024;

const ALLOWED_FORMATS = new Set<AIOSArtifactFormat>([
  "csv",
  "json",
  "md",
  "txt",
]);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
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
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  );

  return response;
}

function jsonError(
  error: string,
  status: number,
  userId: string,
): NextResponse {
  return applyIdentityCookie(
    NextResponse.json(
      {
        success: false,
        service: "AIOS Artifact API",
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
    ),
    userId,
  );
}

function isAnalysisSource(
  value: unknown,
): value is AIOSDataSourceResult {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.inputId !== "string" ||
    typeof value.fileName !== "string" ||
    (
      value.format !== "csv" &&
      value.format !== "json" &&
      value.format !== "xlsx"
    ) ||
    (
      value.sheetName !== null &&
      typeof value.sheetName !== "string"
    ) ||
    typeof value.rowCount !== "number" ||
    !Number.isInteger(value.rowCount) ||
    value.rowCount < 0 ||
    !Array.isArray(value.columns) ||
    !Array.isArray(value.rows) ||
    !isRecord(value.numericSummaries) ||
    (
      value.groupedCounts !== null &&
      !isRecord(value.groupedCounts)
    ) ||
    !Array.isArray(value.limitations)
  ) {
    return false;
  }

  if (
    value.columns.length > 200 ||
    value.rows.length > 5000 ||
    value.limitations.length > 100
  ) {
    return false;
  }

  const validColumns = value.columns.every((column) => {
    if (!isRecord(column)) {
      return false;
    }

    return (
      typeof column.name === "string" &&
      (
        column.type === "number" ||
        column.type === "boolean" ||
        column.type === "string" ||
        column.type === "mixed" ||
        column.type === "empty"
      ) &&
      typeof column.nonEmptyCount === "number" &&
      typeof column.nullCount === "number" &&
      typeof column.uniqueCount === "number"
    );
  });

  if (!validColumns) {
    return false;
  }

  const validRows = value.rows.every((row) => {
    if (!isRecord(row)) {
      return false;
    }

    return Object.values(row).every(
      (cell) =>
        cell === null ||
        typeof cell === "string" ||
        typeof cell === "number" ||
        typeof cell === "boolean",
    );
  });

  if (!validRows) {
    return false;
  }

  const validLimitations = value.limitations.every(
    (item) => typeof item === "string",
  );

  if (!validLimitations) {
    return false;
  }

  if (
    value.groupedCounts !== null &&
    !Object.values(value.groupedCounts).every(
      (count) =>
        typeof count === "number" &&
        Number.isFinite(count),
    )
  ) {
    return false;
  }

  return true;
}

function parseAnalysisResult(
  value: unknown,
): AIOSDataAnalysisResult | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.success !== "boolean" ||
    (
      value.code !== "AIOS_DATA_ANALYSIS_COMPLETED" &&
      value.code !== "AIOS_DATA_ANALYSIS_PARTIAL" &&
      value.code !== "AIOS_DATA_ANALYSIS_REJECTED"
    ) ||
    typeof value.sourceCount !== "number" ||
    typeof value.analyzedCount !== "number" ||
    typeof value.rejectedCount !== "number" ||
    typeof value.totalRows !== "number" ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.errors) ||
    !isRecord(value.safetyBoundary) ||
    value.safetyBoundary.modelExecution !== false ||
    value.safetyBoundary.plannerDispatched !== false ||
    value.safetyBoundary.tradingExecuted !== false ||
    typeof value.generatedAt !== "string"
  ) {
    return null;
  }

  if (
    value.sources.length === 0 ||
    value.sources.length > 8 ||
    !value.sources.every(isAnalysisSource)
  ) {
    return null;
  }

  return value as unknown as AIOSDataAnalysisResult;
}

function parseFormat(
  value: unknown,
): AIOSArtifactFormat | null {
  if (
    typeof value !== "string" ||
    !ALLOWED_FORMATS.has(value as AIOSArtifactFormat)
  ) {
    return null;
  }

  return value as AIOSArtifactFormat;
}

export async function GET(
  request: NextRequest,
) {
  const identity = resolveAlphaIdentity(request);

  const response = NextResponse.json(
    {
      success: true,
      service: "AIOS Artifact API",
      status: "online",
      version: "C169.4.2",
      capabilities: {
        csv: true,
        json: true,
        markdown: true,
        text: true,
        pdf: false,
        docx: false,
        xlsx: false,
        deterministicGeneration: true,
        modelExecution: false,
        plannerDispatch: false,
        tradingExecution: false,
      },
      limits: {
        maxRequestBytes: MAX_REQUEST_BYTES,
        maxSources: 8,
        maxRowsPerSource: 5000,
        maxColumnsPerSource: 200,
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
  const identity = resolveAlphaIdentity(request);

  try {
    const contentType =
      request.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return jsonError(
        "AIOS Artifact API requires application/json.",
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
      return jsonError(
        "Artifact request exceeds the 8 MB request limit.",
        413,
        identity.userId,
      );
    }

    const rawBody = await request.text();

    const actualBytes = new TextEncoder().encode(
      rawBody,
    ).byteLength;

    if (actualBytes > MAX_REQUEST_BYTES) {
      return jsonError(
        "Artifact request exceeds the 8 MB request limit.",
        413,
        identity.userId,
      );
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonError(
        "Request body contains invalid JSON.",
        400,
        identity.userId,
      );
    }

    if (!isRecord(payload)) {
      return jsonError(
        "Request body must be a JSON object.",
        400,
        identity.userId,
      );
    }

    const format = parseFormat(payload.format);

    if (!format) {
      return jsonError(
        "Unsupported artifact format. Supported formats: csv, json, md, txt.",
        400,
        identity.userId,
      );
    }

    const analysis = parseAnalysisResult(
      payload.result,
    );

    if (!analysis) {
      return jsonError(
        "A valid AIOS Data Analysis result is required.",
        400,
        identity.userId,
      );
    }

    if (
      !analysis.success ||
      analysis.code === "AIOS_DATA_ANALYSIS_REJECTED"
    ) {
      return jsonError(
        "Rejected analysis results cannot be exported.",
        422,
        identity.userId,
      );
    }

    const sourceIndex =
      payload.sourceIndex === undefined
        ? 0
        : payload.sourceIndex;

    if (
      typeof sourceIndex !== "number" ||
      !Number.isInteger(sourceIndex) ||
      sourceIndex < 0 ||
      sourceIndex >= analysis.sources.length
    ) {
      return jsonError(
        "The requested analysis source index is invalid.",
        400,
        identity.userId,
      );
    }

    const source = analysis.sources[sourceIndex];

    const artifact = generateAIOSArtifact({
      source,
      format,
    });

    const response = new NextResponse(
      new Uint8Array(artifact.content),
      {
        status: 200,
        headers: {
          "Content-Type": artifact.mimeType,
          "Content-Length": String(artifact.sizeBytes),
          "Content-Disposition":
            `attachment; filename="${artifact.fileName}"; filename*=UTF-8''${encodeURIComponent(artifact.fileName)}`,
          "Cache-Control": "no-store, private",
          "X-AIOS-Artifact-Format": artifact.format,
          "X-AIOS-Artifact-Generated-At": artifact.generatedAt,
          "X-AIOS-Artifact-Model-Execution": "false",
          "X-AIOS-Artifact-Planner-Dispatched": "false",
          "X-AIOS-Artifact-Trading-Executed": "false",
        },
      },
    );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  } catch (error) {
    console.error(
      "[AIOS Artifact API]",
      error,
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "AIOS_ARTIFACT_GENERATION_FAILED",
      500,
      identity.userId,
    );
  }
}
