"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

import {
  executeAIOSInputUnderstandingBridge,
} from "@/lib/runtime/input/aios-input-understanding-bridge";

import type {
  AIOSDataAnalysisOptions,
  AIOSDataAnalysisResult,
  AIOSDataSourceResult,
} from "@/lib/runtime/analysis/aios-data-analysis-types";

interface AnalysisApiResponse {
  success?: boolean;
  error?: string;
  result?: AIOSDataAnalysisResult;
}

interface SelectedFile {
  id: string;
  file: File;
}

const MAX_FILES = 8;

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = [
  ".csv",
  ".json",
  ".xlsx",
];

const ACCEPTED_MIME_TYPES = [
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
];

function isSupportedDataFile(
  file: File,
): boolean {
  const name = file.name.toLowerCase();

  return (
    ACCEPTED_EXTENSIONS.some(
      (extension) => name.endsWith(extension),
    ) ||
    ACCEPTED_MIME_TYPES.includes(file.type)
  );
}

function getFileFormat(
  fileName: string,
): string {
  const extension = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  return extension ?? "unknown";
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    undefined,
    {
      maximumFractionDigits: 4,
    },
  ).format(value);
}

function formatFileSize(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createInputItem(
  selected: SelectedFile,
): AIOSInputItem {
  const file = selected.file;

  return {
    id: selected.id,

    kind: "file",

    metadata: {
      name: file.name,
      mimeType:
        file.type ||
        "application/octet-stream",
      sizeBytes: file.size,
      lastModifiedAt:
        file.lastModified > 0
          ? new Date(
              file.lastModified,
            ).toISOString()
          : null,
      source: "file-picker",
    },

    localReference: null,

    extractedText: null,

    extractedData: null,

    processingStatus: "pending",

    processingError: null,
  };
}

function getColumnTypeLabel(
  type: string,
): string {
  const labels: Record<string, string> = {
    number: "数值",
    boolean: "布尔值",
    string: "文本",
    mixed: "混合",
    empty: "空字段",
  };

  return labels[type] ?? type;
}

function getFormatLabel(
  format: string,
): string {
  return format.toUpperCase();
}

export default function DataAnalysisPage() {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] =
    useState<SelectedFile[]>([]);

  const [analysisResult, setAnalysisResult] =
    useState<AIOSDataAnalysisResult | null>(
      null,
    );

  const [understoodInputs, setUnderstoodInputs] =
    useState<AIOSInputItem[]>([]);

  const [groupBy, setGroupBy] =
    useState("");

  const [sortBy, setSortBy] =
    useState("");

  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("desc");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const [limitations, setLimitations] =
    useState<string[]>([]);

  const [activeSourceIndex, setActiveSourceIndex] =
    useState(0);

  const availableColumns = useMemo(() => {
    const source =
      analysisResult?.sources[
        activeSourceIndex
      ];

    return source?.columns ?? [];
  }, [
    analysisResult,
    activeSourceIndex,
  ]);

  const activeSource:
    AIOSDataSourceResult | null =
    analysisResult?.sources[
      activeSourceIndex
    ] ?? null;

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const incomingFiles = Array.from(
      event.target.files ?? [],
    );

    event.target.value = "";

    if (incomingFiles.length === 0) {
      return;
    }

    setError("");
    setStatusMessage("");
    setAnalysisResult(null);
    setUnderstoodInputs([]);
    setLimitations([]);

    const nextFiles: SelectedFile[] = [
      ...selectedFiles,
    ];

    const messages: string[] = [];

    for (const file of incomingFiles) {
      if (!isSupportedDataFile(file)) {
        messages.push(
          `${file.name}: 仅支持 CSV、JSON 和 XLSX 数据文件。`,
        );

        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        messages.push(
          `${file.name}: 文件超过 25 MB 限制。`,
        );

        continue;
      }

      const duplicate = nextFiles.some(
        (item) =>
          item.file.name === file.name &&
          item.file.size === file.size &&
          item.file.lastModified ===
            file.lastModified,
      );

      if (duplicate) {
        messages.push(
          `${file.name}: 文件已经添加。`,
        );

        continue;
      }

      if (nextFiles.length >= MAX_FILES) {
        messages.push(
          `最多同时分析 ${MAX_FILES} 个文件。`,
        );

        break;
      }

      nextFiles.push({
        id: crypto.randomUUID(),
        file,
      });
    }

    setSelectedFiles(nextFiles);

    if (messages.length > 0) {
      setError(messages.join("\n"));
    }
  }

  function removeFile(
    id: string,
  ) {
    setSelectedFiles((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    );

    setAnalysisResult(null);
    setUnderstoodInputs([]);
    setLimitations([]);
    setStatusMessage("");
  }

  function buildAnalysisOptions():
    AIOSDataAnalysisOptions {
    return {
      limit: 500,

      ...(groupBy
        ? {
            groupBy,
          }
        : {}),

      ...(sortBy
        ? {
            sortBy,
            sortDirection,
          }
        : {}),
    };
  }

  async function runAnalysis() {
    if (loading) {
      return;
    }

    if (selectedFiles.length === 0) {
      setError("请先选择 CSV、JSON 或 XLSX 文件。");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage(
      "正在通过 AIOS Input Understanding 解析文件...",
    );
    setAnalysisResult(null);
    setUnderstoodInputs([]);
    setLimitations([]);

    try {
      const pendingInputs =
        selectedFiles.map(createInputItem);

      const bridgeResult =
        await executeAIOSInputUnderstandingBridge(
          pendingInputs,
          selectedFiles.map((item) => ({
            inputId: item.id,
            file: item.file,
          })),
          "zh-CN",
        );

      setUnderstoodInputs(
        bridgeResult.inputs,
      );

      if (
        bridgeResult.limitations.length > 0
      ) {
        setLimitations(
          bridgeResult.limitations,
        );
      }

      const readyInputs =
        bridgeResult.inputs.filter(
          (input) =>
            input.processingStatus === "ready" &&
            (
              input.extractedText !== null ||
              input.extractedData?.format === "xlsx"
            ) &&
            isSupportedDataFile(
              selectedFiles.find(
                (item) => item.id === input.id,
              )?.file ?? new File([], ""),
            ),
        );

      if (readyInputs.length === 0) {
        const failedDetails =
          bridgeResult.inputs
            .filter(
              (input) =>
                input.processingStatus !== "ready",
            )
            .map(
              (input) =>
                `${input.metadata.name ?? input.id}: ${
                  input.processingError ??
                  "文件未能完成解析"
                }`,
            );

        setError(
          failedDetails.length > 0
            ? failedDetails.join("\n")
            : "没有可供分析的已解析数据文件。",
        );

        setStatusMessage("");
        return;
      }

      setStatusMessage(
        `文件解析完成，正在分析 ${readyInputs.length} 个数据文件...`,
      );

      const response = await fetch(
        "/api/input/analysis",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "same-origin",

          cache: "no-store",

          body: JSON.stringify({
            inputs: readyInputs,
            options: buildAnalysisOptions(),
          }),
        },
      );

      let payload:
        AnalysisApiResponse;

      try {
        payload =
          (await response.json()) as
            AnalysisApiResponse;
      } catch {
        throw new Error(
          "AIOS Data Analysis API 返回了无法识别的数据。",
        );
      }

      if (
        !response.ok ||
        !payload.result
      ) {
        throw new Error(
          payload.error ??
            `数据分析失败，HTTP ${response.status}`,
        );
      }

      setAnalysisResult(
        payload.result,
      );

      setActiveSourceIndex(0);

      setStatusMessage(
        payload.result.analyzedCount > 0
          ? `分析完成：成功处理 ${payload.result.analyzedCount} 个文件，共 ${payload.result.totalRows} 行数据。`
          : "分析请求已完成，但没有可用的数据分析结果。",
      );

      if (
        payload.result.errors.length > 0
      ) {
        setLimitations((current) => [
          ...current,
          ...payload.result!.errors.map(
            (item) =>
              `${item.fileName}: ${item.error}`,
          ),
        ]);
      }
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "AIOS_DATA_ANALYSIS_FAILED",
      );

      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  }

  async function rerunAnalysis() {
    if (understoodInputs.length === 0) {
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("正在重新执行数据分析...");

    try {
      const readyInputs =
        understoodInputs.filter(
          (input) =>
            input.processingStatus === "ready",
        );

      const response = await fetch(
        "/api/input/analysis",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "same-origin",

          cache: "no-store",

          body: JSON.stringify({
            inputs: readyInputs,
            options: buildAnalysisOptions(),
          }),
        },
      );

      const payload =
        (await response.json()) as
          AnalysisApiResponse;

      if (
        !response.ok ||
        !payload.result
      ) {
        throw new Error(
          payload.error ??
            `分析请求失败，HTTP ${response.status}`,
        );
      }

      setAnalysisResult(
        payload.result,
      );

      setActiveSourceIndex(0);

      setStatusMessage(
        `分析完成：${payload.result.totalRows} 行数据。`,
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "AIOS_DATA_ANALYSIS_FAILED",
      );

      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  }

  function exportCurrentRows() {
    if (!activeSource) {
      return;
    }

    const rows = activeSource.rows;

    if (rows.length === 0) {
      setError("当前结果没有可导出的数据行。");
      return;
    }

    const headers = activeSource.columns.map(
      (column) => column.name,
    );

    const escapeCsv = (
      value: unknown,
    ): string => {
      const text =
        value === null || value === undefined
          ? ""
          : String(value);

      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        headers
          .map((header) =>
            escapeCsv(row[header]),
          )
          .join(","),
      ),
    ].join("\r\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type: "text/csv;charset=utf-8",
      },
    );

    const url = URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download =
      `${activeSource.fileName.replace(/\.[^.]+$/, "")}-analysis.csv`;

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: "28px 18px 60px",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.5,
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            AIOS ALPHA / C169
          </div>

          <h1
            style={{
              margin: "10px 0 8px",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: -0.8,
            }}
          >
            Data Analysis
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 720,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            上传真实数据文件，自动解析字段、计算统计指标、
            分组汇总并生成可导出的分析结果。
          </p>
        </header>

        <section
          style={{
            padding: 20,
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            background: "#ffffff",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 750,
                }}
              >
                数据文件
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                CSV / JSON / XLSX · 最多 8 个文件
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={loading}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 9,
                background: "#ffffff",
                padding: "10px 15px",
                fontWeight: 700,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              + 添加文件
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.json,.xlsx,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileSelection}
              style={{
                display: "none",
              }}
            />
          </div>

          {selectedFiles.length === 0 ? (
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={loading}
              style={{
                width: "100%",
                minHeight: 150,
                border: "1px dashed #94a3b8",
                borderRadius: 12,
                background: "#f8fafc",
                color: "#475569",
                cursor: "pointer",
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  marginBottom: 8,
                }}
              >
                +
              </div>

              <div
                style={{
                  fontWeight: 750,
                }}
              >
                选择需要分析的数据文件
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                }}
              >
                支持 CSV、JSON、XLSX
              </div>
            </button>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              {selectedFiles.map((item) => (
                <div
                  key={item.id}
                  style={{
                    minWidth: 0,
                    padding: 12,
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {getFileFormat(item.file.name).toUpperCase()}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeFile(item.id)
                      }
                      disabled={loading}
                      aria-label={`移除 ${item.file.name}`}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "#64748b",
                        fontSize: 18,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div
                    title={item.file.name}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 9,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {item.file.name}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 11,
                      color: "#64748b",
                    }}
                  >
                    {formatFileSize(item.file.size)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 18,
            }}
          >
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={
                loading ||
                selectedFiles.length === 0
              }
              style={{
                minWidth: 150,
                border: 0,
                borderRadius: 10,
                padding: "12px 20px",
                background:
                  loading ||
                  selectedFiles.length === 0
                    ? "#94a3b8"
                    : "#0f172a",
                color: "#ffffff",
                fontWeight: 750,
                cursor:
                  loading ||
                  selectedFiles.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? "处理中..."
                : "开始数据分析"}
            </button>
          </div>
        </section>

        {(statusMessage || error) && (
          <section
            role={error ? "alert" : "status"}
            style={{
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${
                error ? "#fecaca" : "#bfdbfe"
              }`,
              background: error
                ? "#fef2f2"
                : "#eff6ff",
              color: error
                ? "#991b1b"
                : "#1e40af",
              marginBottom: 20,
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {error || statusMessage}
          </section>
        )}

        {understoodInputs.length > 0 && (
          <section
            style={{
              padding: 16,
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#ffffff",
              marginBottom: 20,
            }}
          >
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: 14,
              }}
            >
              文件解析状态
            </h3>

            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {understoodInputs.map((input) => (
                <div
                  key={input.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {input.metadata.name ?? input.id}
                  </span>

                  <span
                    style={{
                      flexShrink: 0,
                      fontWeight: 700,
                      color:
                        input.processingStatus === "ready"
                          ? "#15803d"
                          : input.processingStatus === "failed"
                            ? "#b91c1c"
                            : "#a16207",
                    }}
                  >
                    {input.processingStatus === "ready"
                      ? "READY"
                      : input.processingStatus === "failed"
                        ? "FAILED"
                        : "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {analysisResult && (
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  分析结果
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  {new Date(
                    analysisResult.generatedAt,
                  ).toLocaleString()}
                </p>
              </div>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#15803d",
                }}
              >
                {analysisResult.code}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
                marginBottom: 18,
              }}
            >
              {[
                {
                  label: "分析文件",
                  value: analysisResult.analyzedCount,
                },
                {
                  label: "总数据行",
                  value: analysisResult.totalRows,
                },
                {
                  label: "拒绝文件",
                  value: analysisResult.rejectedCount,
                },
                {
                  label: "数据来源",
                  value: analysisResult.sourceCount,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: 15,
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      fontSize: 23,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatNumber(item.value)}
                  </div>
                </div>
              ))}
            </div>

            {analysisResult.sources.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  marginBottom: 14,
                }}
              >
                {analysisResult.sources.map(
                  (source, index) => (
                    <button
                      key={source.inputId}
                      type="button"
                      onClick={() =>
                        setActiveSourceIndex(index)
                      }
                      style={{
                        flexShrink: 0,
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        padding: "8px 12px",
                        background:
                          activeSourceIndex === index
                            ? "#0f172a"
                            : "#ffffff",
                        color:
                          activeSourceIndex === index
                            ? "#ffffff"
                            : "#334155",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {source.fileName}
                    </button>
                  ),
                )}
              </div>
            )}

            {activeSource && (
              <>
                <div
                  style={{
                    padding: 18,
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    background: "#ffffff",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                      marginBottom: 15,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 800,
                        }}
                      >
                        {activeSource.fileName}
                      </h3>

                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {getFormatLabel(activeSource.format)}
                        {" · "}
                        {activeSource.rowCount} rows
                        {" · "}
                        {activeSource.columns.length} columns
                      </div>
                    </div>
                  </div>

                  <h4
                    style={{
                      margin: "0 0 10px",
                      fontSize: 13,
                    }}
                  >
                    字段识别
                  </h4>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(150px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {activeSource.columns.map(
                      (column) => (
                        <div
                          key={column.name}
                          style={{
                            padding: 10,
                            border: "1px solid #e2e8f0",
                            borderRadius: 9,
                            background: "#f8fafc",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 750,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {column.name}
                          </div>

                          <div
                            style={{
                              marginTop: 5,
                              fontSize: 10,
                              color: "#64748b",
                            }}
                          >
                            {getColumnTypeLabel(column.type)}
                            {" · "}
                            {column.nonEmptyCount} 非空
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 10,
                              color: "#94a3b8",
                            }}
                          >
                            {column.uniqueCount} 唯一值
                            {" · "}
                            {column.nullCount} 空值
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {Object.keys(
                  activeSource.numericSummaries,
                ).length > 0 && (
                  <div
                    style={{
                      padding: 18,
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      background: "#ffffff",
                      marginBottom: 16,
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 12px",
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      数值统计
                    </h3>

                    <div
                      style={{
                        overflowX: "auto",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 12,
                          textAlign: "right",
                        }}
                      >
                        <thead>
                          <tr>
                            {[
                              "字段",
                              "数量",
                              "总和",
                              "平均值",
                              "最小值",
                              "最大值",
                              "中位数",
                            ].map((heading) => (
                              <th
                                key={heading}
                                style={{
                                  padding: 10,
                                  borderBottom:
                                    "1px solid #e2e8f0",
                                  color: "#64748b",
                                  whiteSpace: "nowrap",
                                  textAlign:
                                    heading === "字段"
                                      ? "left"
                                      : "right",
                                }}
                              >
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {Object.entries(
                            activeSource.numericSummaries,
                          ).map(([name, summary]) => (
                            <tr key={name}>
                              <td
                                style={{
                                  padding: 10,
                                  borderBottom:
                                    "1px solid #f1f5f9",
                                  fontWeight: 750,
                                  textAlign: "left",
                                }}
                              >
                                {name}
                              </td>

                              {[
                                summary.count,
                                summary.sum,
                                summary.mean,
                                summary.min,
                                summary.max,
                                summary.median,
                              ].map((value, index) => (
                                <td
                                  key={index}
                                  style={{
                                    padding: 10,
                                    borderBottom:
                                      "1px solid #f1f5f9",
                                    fontVariantNumeric:
                                      "tabular-nums",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatNumber(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    padding: 18,
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    background: "#ffffff",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      数据结果
                    </h3>

                    <button
                      type="button"
                      onClick={exportCurrentRows}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        padding: "8px 12px",
                        background: "#ffffff",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      导出 CSV
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <label
                      style={{
                        display: "grid",
                        gap: 5,
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      分组字段

                      <select
                        value={groupBy}
                        onChange={(event) =>
                          setGroupBy(event.target.value)
                        }
                        style={{
                          minWidth: 0,
                          padding: 9,
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          background: "#ffffff",
                          color: "#0f172a",
                        }}
                      >
                        <option value="">不分组</option>

                        {availableColumns.map(
                          (column) => (
                            <option
                              key={column.name}
                              value={column.name}
                            >
                              {column.name}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label
                      style={{
                        display: "grid",
                        gap: 5,
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      排序字段

                      <select
                        value={sortBy}
                        onChange={(event) =>
                          setSortBy(event.target.value)
                        }
                        style={{
                          minWidth: 0,
                          padding: 9,
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          background: "#ffffff",
                          color: "#0f172a",
                        }}
                      >
                        <option value="">不排序</option>

                        {availableColumns.map(
                          (column) => (
                            <option
                              key={column.name}
                              value={column.name}
                            >
                              {column.name}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label
                      style={{
                        display: "grid",
                        gap: 5,
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      排序方向

                      <select
                        value={sortDirection}
                        onChange={(event) =>
                          setSortDirection(
                            event.target.value as
                              | "asc"
                              | "desc",
                          )
                        }
                        style={{
                          minWidth: 0,
                          padding: 9,
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          background: "#ffffff",
                          color: "#0f172a",
                        }}
                      >
                        <option value="desc">降序</option>
                        <option value="asc">升序</option>
                      </select>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void rerunAnalysis()
                    }
                    disabled={loading}
                    style={{
                      border: 0,
                      borderRadius: 8,
                      padding: "9px 14px",
                      background: "#334155",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 12,
                      marginBottom: 14,
                    }}
                  >
                    应用分组 / 排序
                  </button>

                  {activeSource.groupedCounts && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 12,
                        borderRadius: 9,
                        background: "#f8fafc",
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 9px",
                          fontSize: 12,
                        }}
                      >
                        分组统计
                      </h4>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {Object.entries(
                          activeSource.groupedCounts,
                        ).map(([name, count]) => (
                          <span
                            key={name}
                            style={{
                              padding: "6px 9px",
                              border: "1px solid #e2e8f0",
                              borderRadius: 7,
                              background: "#ffffff",
                              fontSize: 11,
                            }}
                          >
                            {name}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: 9,
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        minWidth: 600,
                        borderCollapse: "collapse",
                        fontSize: 11,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "#f8fafc",
                          }}
                        >
                          {activeSource.columns.map(
                            (column) => (
                              <th
                                key={column.name}
                                style={{
                                  padding: 10,
                                  borderBottom:
                                    "1px solid #e2e8f0",
                                  textAlign: "left",
                                  whiteSpace: "nowrap",
                                  color: "#475569",
                                }}
                              >
                                {column.name}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {activeSource.rows.map(
                          (row, rowIndex) => (
                            <tr key={rowIndex}>
                              {activeSource.columns.map(
                                (column) => (
                                  <td
                                    key={column.name}
                                    style={{
                                      padding: 10,
                                      borderBottom:
                                        "1px solid #f1f5f9",
                                      maxWidth: 260,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {row[column.name] === null
                                      ? "—"
                                      : String(
                                          row[column.name],
                                        )}
                                  </td>
                                ),
                              )}
                            </tr>
                          ),
                        )}

                        {activeSource.rows.length === 0 && (
                          <tr>
                            <td
                              colSpan={
                                Math.max(
                                  activeSource.columns.length,
                                  1,
                                )
                              }
                              style={{
                                padding: 20,
                                textAlign: "center",
                                color: "#64748b",
                              }}
                            >
                              没有可显示的数据行。
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 10,
                      color: "#94a3b8",
                    }}
                  >
                    当前展示最多 500 行。完整数据行数：
                    {activeSource.rowCount}。
                  </p>
                </div>

                {activeSource.limitations.length > 0 && (
                  <div
                    style={{
                      padding: 14,
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      background: "#f8fafc",
                      marginBottom: 14,
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 8px",
                        fontSize: 12,
                      }}
                    >
                      数据限制说明
                    </h4>

                    {activeSource.limitations.map(
                      (item, index) => (
                        <p
                          key={index}
                          style={{
                            margin: "5px 0",
                            fontSize: 11,
                            color: "#64748b",
                          }}
                        >
                          {item}
                        </p>
                      ),
                    )}
                  </div>
                )}
              </>
            )}

            {limitations.length > 0 && (
              <div
                style={{
                  padding: 14,
                  border: "1px solid #fed7aa",
                  borderRadius: 10,
                  background: "#fff7ed",
                  marginBottom: 14,
                }}
              >
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: 12,
                  }}
                >
                  处理提示
                </h4>

                {limitations.map(
                  (item, index) => (
                    <p
                      key={index}
                      style={{
                        margin: "5px 0",
                        fontSize: 11,
                        color: "#9a3412",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item}
                    </p>
                  ),
                )}
              </div>
            )}

            <div
              style={{
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#ffffff",
                color: "#64748b",
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Runtime boundary: deterministic analysis only.
              Model execution, Planner dispatch and trading execution
              are not performed by this page.
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
