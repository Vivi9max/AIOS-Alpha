
import { Buffer } from "node:buffer";

import type {
  AIOSDataSourceResult,
} from "@/lib/runtime/analysis/aios-data-analysis-types";

export type AIOSArtifactFormat =
  | "csv"
  | "json"
  | "md"
  | "txt";

export interface AIOSArtifactRequest {
  source: AIOSDataSourceResult;
  format: AIOSArtifactFormat;
}

export interface AIOSArtifactResult {
  success: true;
  fileName: string;
  mimeType: string;
  format: AIOSArtifactFormat;
  sizeBytes: number;
  content: Buffer;
  generatedAt: string;
  safetyBoundary: {
    modelExecution: false;
    plannerDispatched: false;
    tradingExecuted: false;
  };
}

interface ArtifactFormatDefinition {
  extension: string;
  mimeType: string;
}

const MAX_ARTIFACT_BYTES = 15 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 100;

const FORMAT_DEFINITIONS: Record<
  AIOSArtifactFormat,
  ArtifactFormatDefinition
> = {
  csv: {
    extension: "csv",
    mimeType: "text/csv; charset=utf-8",
  },
  json: {
    extension: "json",
    mimeType: "application/json; charset=utf-8",
  },
  md: {
    extension: "md",
    mimeType: "text/markdown; charset=utf-8",
  },
  txt: {
    extension: "txt",
    mimeType: "text/plain; charset=utf-8",
  },
};

function normalizeFileName(
  value: string,
): string {
  const withoutExtension = value
    .replace(/\.[^.]+$/, "")
    .trim();

  const normalized = withoutExtension
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH);

  return normalized || "aios-analysis";
}

function normalizeCellValue(
  value: unknown,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function protectCsvFormula(
  value: string,
): string {
  if (/^[\s]*[=+\-@]/.test(value)) {
    return `'${value}`;
  }

  return value;
}

function escapeCsvCell(
  value: unknown,
): string {
  const normalized = protectCsvFormula(
    normalizeCellValue(value),
  );

  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsv(
  source: AIOSDataSourceResult,
): string {
  const headers = source.columns.map(
    (column) => column.name,
  );

  const lines = [
    headers.map(escapeCsvCell).join(","),
  ];

  for (const row of source.rows) {
    lines.push(
      headers
        .map((header) => escapeCsvCell(row[header]))
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function buildJson(
  source: AIOSDataSourceResult,
): string {
  return JSON.stringify(
    {
      metadata: {
        inputId: source.inputId,
        fileName: source.fileName,
        sourceFormat: source.format,
        sheetName: source.sheetName,
        rowCount: source.rowCount,
        exportedRowCount: source.rows.length,
        generatedAt: new Date().toISOString(),
      },
      schema: source.columns,
      numericSummaries: source.numericSummaries,
      groupedCounts: source.groupedCounts,
      rows: source.rows,
      limitations: source.limitations,
    },
    null,
    2,
  );
}

function escapeMarkdownCell(
  value: unknown,
): string {
  return normalizeCellValue(value)
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildMarkdown(
  source: AIOSDataSourceResult,
): string {
  const lines: string[] = [
    "# Data Analysis Report",
    "",
    `- Source file: ${source.fileName}`,
    `- Source format: ${source.format.toUpperCase()}`,
    `- Worksheet: ${source.sheetName ?? "N/A"}`,
    `- Total filtered rows: ${source.rowCount}`,
    `- Exported rows: ${source.rows.length}`,
    "",
    "## Schema",
    "",
    "| Column | Type | Non-empty | Empty | Unique |",
    "| --- | --- | ---: | ---: | ---: |",
  ];

  for (const column of source.columns) {
    lines.push(
      [
        escapeMarkdownCell(column.name),
        column.type,
        String(column.nonEmptyCount),
        String(column.nullCount),
        String(column.uniqueCount),
      ].join(" | ").replace(/^/, "| ").concat(" |"),
    );
  }

  const summaryEntries = Object.entries(
    source.numericSummaries,
  );

  if (summaryEntries.length > 0) {
    lines.push(
      "",
      "## Numeric Statistics",
      "",
      "| Column | Count | Sum | Mean | Min | Max | Median |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    );

    for (const [name, summary] of summaryEntries) {
      lines.push(
        [
          escapeMarkdownCell(name),
          String(summary.count),
          String(summary.sum),
          String(summary.mean),
          String(summary.min),
          String(summary.max),
          String(summary.median),
        ].join(" | ").replace(/^/, "| ").concat(" |"),
      );
    }
  }

  if (source.groupedCounts) {
    lines.push(
      "",
      "## Grouped Counts",
      "",
      "| Group | Count |",
      "| --- | ---: |",
    );

    for (const [group, count] of Object.entries(
      source.groupedCounts,
    )) {
      lines.push(
        `| ${escapeMarkdownCell(group)} | ${count} |`,
      );
    }
  }

  lines.push(
    "",
    "## Data Rows",
    "",
  );

  const headers = source.columns.map(
    (column) => column.name,
  );

  if (headers.length > 0) {
    lines.push(
      `| ${headers.map(escapeMarkdownCell).join(" | ")} |`,
      `| ${headers.map(() => "---").join(" | ")} |`,
    );

    for (const row of source.rows) {
      lines.push(
        `| ${headers
          .map((header) => escapeMarkdownCell(row[header]))
          .join(" | ")} |`,
      );
    }
  } else {
    lines.push("No columns were available for export.");
  }

  if (source.limitations.length > 0) {
    lines.push(
      "",
      "## Limitations",
      "",
      ...source.limitations.map(
        (limitation) => `- ${limitation}`,
      ),
    );
  }

  lines.push("");

  return lines.join("\n");
}

function buildText(
  source: AIOSDataSourceResult,
): string {
  const lines: string[] = [
    "AIOS DATA ANALYSIS",
    "==================",
    "",
    `Source: ${source.fileName}`,
    `Format: ${source.format.toUpperCase()}`,
    `Worksheet: ${source.sheetName ?? "N/A"}`,
    `Total rows: ${source.rowCount}`,
    `Exported rows: ${source.rows.length}`,
    "",
    "SCHEMA",
    "------",
  ];

  for (const column of source.columns) {
    lines.push(
      [
        column.name,
        `type=${column.type}`,
        `nonEmpty=${column.nonEmptyCount}`,
        `empty=${column.nullCount}`,
        `unique=${column.uniqueCount}`,
      ].join(" | "),
    );
  }

  lines.push(
    "",
    "NUMERIC STATISTICS",
    "------------------",
  );

  for (const [name, summary] of Object.entries(
    source.numericSummaries,
  )) {
    lines.push(
      `${name}: count=${summary.count}, sum=${summary.sum}, mean=${summary.mean}, min=${summary.min}, max=${summary.max}, median=${summary.median}`,
    );
  }

  if (source.groupedCounts) {
    lines.push(
      "",
      "GROUPED COUNTS",
      "--------------",
    );

    for (const [group, count] of Object.entries(
      source.groupedCounts,
    )) {
      lines.push(`${group}: ${count}`);
    }
  }

  lines.push(
    "",
    "DATA ROWS",
    "---------",
  );

  const headers = source.columns.map(
    (column) => column.name,
  );

  if (headers.length > 0) {
    lines.push(headers.join("\t"));

    for (const row of source.rows) {
      lines.push(
        headers
          .map((header) => normalizeCellValue(row[header]))
          .join("\t"),
      );
    }
  }

  if (source.limitations.length > 0) {
    lines.push(
      "",
      "LIMITATIONS",
      "-----------",
      ...source.limitations.map(
        (limitation) => `- ${limitation}`,
      ),
    );
  }

  lines.push("");

  return lines.join("\n");
}

function buildArtifactContent(
  source: AIOSDataSourceResult,
  format: AIOSArtifactFormat,
): string {
  switch (format) {
    case "csv":
      return buildCsv(source);

    case "json":
      return buildJson(source);

    case "md":
      return buildMarkdown(source);

    case "txt":
      return buildText(source);

    default: {
      const unsupported: never = format;

      throw new Error(
        `Unsupported artifact format: ${String(unsupported)}`,
      );
    }
  }
}

function validateSource(
  source: AIOSDataSourceResult,
): void {
  if (
    !source ||
    typeof source !== "object"
  ) {
    throw new Error("A valid analysis source is required.");
  }

  if (
    typeof source.inputId !== "string" ||
    typeof source.fileName !== "string"
  ) {
    throw new Error("Analysis source metadata is invalid.");
  }

  if (
    !Array.isArray(source.columns) ||
    !Array.isArray(source.rows)
  ) {
    throw new Error("Analysis source rows or columns are invalid.");
  }

  if (
    source.rows.length > 5000 ||
    source.columns.length > 200
  ) {
    throw new Error("Analysis source exceeds artifact limits.");
  }

  for (const row of source.rows) {
    if (
      row === null ||
      typeof row !== "object" ||
      Array.isArray(row)
    ) {
      throw new Error("Analysis source contains an invalid row.");
    }
  }
}

export function generateAIOSArtifact(
  request: AIOSArtifactRequest,
): AIOSArtifactResult {
  if (
    !request ||
    !FORMAT_DEFINITIONS[request.format]
  ) {
    throw new Error("Unsupported AIOS artifact format.");
  }

  validateSource(request.source);

  const definition = FORMAT_DEFINITIONS[request.format];

  const baseName = normalizeFileName(
    request.source.fileName,
  );

  const fileName = `${baseName}-analysis.${definition.extension}`;

  const text = buildArtifactContent(
    request.source,
    request.format,
  );

  const content = Buffer.from(
    text,
    "utf8",
  );

  if (content.byteLength > MAX_ARTIFACT_BYTES) {
    throw new Error(
      `Generated artifact exceeds the ${MAX_ARTIFACT_BYTES} byte limit.`,
    );
  }

  return {
    success: true,
    fileName,
    mimeType: definition.mimeType,
    format: request.format,
    sizeBytes: content.byteLength,
    content,
    generatedAt: new Date().toISOString(),
    safetyBoundary: {
      modelExecution: false,
      plannerDispatched: false,
      tradingExecuted: false,
    },
  };
}
