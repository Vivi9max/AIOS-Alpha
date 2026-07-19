"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

type TraceStatus =
  | "waiting"
  | "running"
  | "completed"
  | "failed";

interface CapabilityTraceItem {
  capability?: string;
  status?: string;
  success?: boolean;
  durationMs?: number;
  error?: string;
}

interface RuntimeTrace {
  requestId?: string;
  planId?: string;
  promptPreview?: string;
  goal?: string;
  intent?: string;
  planType?: string;
  provider?: string;
  success?: boolean;
  fallbackUsed?: boolean;
  latencyMs?: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  capabilityTrace?: CapabilityTraceItem[];
}

interface TraceResponse {
  success: boolean;
  runtime?: string;
  version?: string;
  hasTrace?: boolean;
  trace?: RuntimeTrace | null;
  timestamp?: number;
}

interface QueueItem {
  id: string;
  capability: string;
  status: TraceStatus;
  durationMs: number | null;
  error: string | null;
}

interface TimelineItem {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  status: TraceStatus;
}

const PAGE_BACKGROUND =
  "linear-gradient(180deg, #f8fafc 0%, #ffffff 44%)";

function formatDateTime(
  value?: number
): string {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleString(
    "zh-CN",
    {
      hour12: false,
    }
  );
}

function formatClockTime(
  value?: number
): string {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleTimeString(
    "zh-CN",
    {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

function formatDuration(
  milliseconds?: number
): string {
  if (
    milliseconds === undefined ||
    !Number.isFinite(
      milliseconds
    )
  ) {
    return "—";
  }

  if (
    milliseconds < 1000
  ) {
    return `${Math.max(
      0,
      Math.round(
        milliseconds
      )
    )} ms`;
  }

  const seconds =
    milliseconds / 1000;

  if (
    seconds < 60
  ) {
    return `${seconds.toFixed(
      seconds >= 10
        ? 0
        : 1
    )} s`;
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    Math.round(
      seconds % 60
    );

  return `${minutes} min ${remainingSeconds} s`;
}

function normalizeStatus(
  item: CapabilityTraceItem
): TraceStatus {
  if (
    item.success === false ||
    item.status
      ?.toLowerCase()
      .includes(
        "fail"
      )
  ) {
    return "failed";
  }

  const status =
    item.status
      ?.trim()
      .toLowerCase() ??
    "";

  if (
    status.includes(
      "running"
    ) ||
    status.includes(
      "executing"
    ) ||
    status.includes(
      "processing"
    ) ||
    status.includes(
      "started"
    )
  ) {
    return "running";
  }

  if (
    status.includes(
      "waiting"
    ) ||
    status.includes(
      "pending"
    ) ||
    status.includes(
      "queued"
    )
  ) {
    return "waiting";
  }

  return "completed";
}

function getStatusLabel(
  status: TraceStatus
): string {
  switch (status) {
    case "running":
      return "Running";

    case "completed":
      return "Completed";

    case "failed":
      return "Failed";

    default:
      return "Waiting";
  }
}

function getStatusIcon(
  status: TraceStatus
): string {
  switch (status) {
    case "running":
      return "▶";

    case "completed":
      return "✓";

    case "failed":
      return "×";

    default:
      return "•";
  }
}

function getStatusColor(
  status: TraceStatus
): string {
  switch (status) {
    case "running":
      return "#2563eb";

    case "completed":
      return "#15803d";

    case "failed":
      return "#dc2626";

    default:
      return "#64748b";
  }
}

function getStatusBackground(
  status: TraceStatus
): string {
  switch (status) {
    case "running":
      return "#dbeafe";

    case "completed":
      return "#dcfce7";

    case "failed":
      return "#fee2e2";

    default:
      return "#f1f5f9";
  }
}

function calculateProgress(
  trace: RuntimeTrace | null
): number {
  if (!trace) {
    return 0;
  }

  if (
    trace.success === true
  ) {
    return 100;
  }

  const capabilities =
    trace.capabilityTrace ??
    [];

  if (
    capabilities.length ===
    0
  ) {
    return trace.completedAt
      ? 100
      : 0;
  }

  const totalProgress =
    capabilities.reduce(
      (
        total,
        item
      ) => {
        const status =
          normalizeStatus(
            item
          );

        if (
          status ===
          "completed"
        ) {
          return (
            total + 100
          );
        }

        if (
          status ===
          "failed"
        ) {
          return (
            total + 100
          );
        }

        if (
          status ===
          "running"
        ) {
          return total + 55;
        }

        return total;
      },
      0
    );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        totalProgress /
          capabilities.length
      )
    )
  );
}

function getProgressLabel(
  progress: number,
  failed: boolean
): string {
  if (failed) {
    return "Needs attention";
  }

  if (
    progress >= 100
  ) {
    return "Completed";
  }

  if (
    progress >= 75
  ) {
    return "Finishing";
  }

  if (
    progress >= 40
  ) {
    return "Executing";
  }

  if (
    progress > 0
  ) {
    return "Preparing";
  }

  return "Waiting";
}

function shortenId(
  value?: string
): string {
  if (!value) {
    return "—";
  }

  if (
    value.length <= 18
  ) {
    return value;
  }

  return `${value.slice(
    0,
    10
  )}…${value.slice(
    -6
  )}`;
}

export default function RuntimeTracePage() {
  const [data, setData] =
    useState<TraceResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [rawOpen, setRawOpen] =
    useState(false);

  const loadTrace =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/runtime/trace",
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            TraceResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            "Execution Trace 读取失败。"
          );
        }

        setData(result);
      } catch (traceError) {
        setError(
          traceError instanceof Error
            ? traceError.message
            : "Execution Trace 读取失败。"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadTrace();
  }, [loadTrace]);

  const trace =
    data?.trace ?? null;

  const queue =
    useMemo<QueueItem[]>(
      () =>
        (
          trace?.capabilityTrace ??
          []
        ).map(
          (
            item,
            index
          ) => ({
            id: `${item.capability ?? "capability"}-${index}`,

            capability:
              item.capability ??
              `Capability ${index + 1}`,

            status:
              normalizeStatus(
                item
              ),

            durationMs:
              typeof item.durationMs ===
              "number"
                ? item.durationMs
                : null,

            error:
              item.error ??
              null,
          })
        ),
      [trace]
    );

  const progress =
    useMemo(
      () =>
        calculateProgress(
          trace
        ),
      [trace]
    );

  const completedCount =
    queue.filter(
      (item) =>
        item.status ===
        "completed"
    ).length;

  const failedCount =
    queue.filter(
      (item) =>
        item.status ===
        "failed"
    ).length;

  const currentItem =
    queue.find(
      (item) =>
        item.status ===
        "running"
    ) ??
    queue.find(
      (item) =>
        item.status ===
        "failed"
    ) ??
    (
      trace?.success
        ? queue[
            queue.length - 1
          ]
        : queue[0]
    ) ??
    null;

  const executionStatus:
    TraceStatus =
    trace?.success === true
      ? "completed"
      : failedCount > 0 ||
          trace?.error
        ? "failed"
        : currentItem?.status ===
            "running"
          ? "running"
          : trace
            ? "waiting"
            : "waiting";

  const durationMs =
    typeof trace?.latencyMs ===
    "number"
      ? trace.latencyMs
      : trace?.startedAt &&
          trace?.completedAt
        ? Math.max(
            0,
            trace.completedAt -
              trace.startedAt
          )
        : undefined;

  const timeline =
    useMemo<
      TimelineItem[]
    >(() => {
      if (!trace) {
        return [];
      }

      const items: TimelineItem[] =
        [];

      const startedAt =
        trace.startedAt ??
        Date.now();

      items.push({
        id: "execution-started",
        timestamp:
          startedAt,
        title:
          "Execution Started",
        description:
          trace.goal ||
          trace.promptPreview ||
          "Runtime received a new request.",
        status:
          "running",
      });

      let cursor =
        startedAt;

      const capabilityDurationTotal =
        (
          trace.capabilityTrace ??
          []
        ).reduce(
          (
            total,
            item
          ) =>
            total +
            (
              item.durationMs ??
              0
            ),
          0
        );

      (
        trace.capabilityTrace ??
        []
      ).forEach(
        (
          item,
          index
        ) => {
          const duration =
            item.durationMs ??
            (
              capabilityDurationTotal >
              0
                ? 0
                : 1
            );

          cursor += duration;

          const status =
            normalizeStatus(
              item
            );

          items.push({
            id: `timeline-${item.capability ?? index}`,

            timestamp:
              Math.min(
                cursor,
                trace.completedAt ??
                  cursor
              ),

            title:
              `${item.capability ?? `Capability ${index + 1}`} ${getStatusLabel(
                status
              )}`,

            description:
              item.error ||
              (
                typeof item.durationMs ===
                "number"
                  ? `Completed in ${formatDuration(
                      item.durationMs
                    )}.`
                  : "Capability execution recorded."
              ),

            status,
          });
        }
      );

      if (
        trace.completedAt
      ) {
        items.push({
          id:
            trace.success
              ? "execution-completed"
              : "execution-failed",

          timestamp:
            trace.completedAt,

          title:
            trace.success
              ? "Execution Completed"
              : "Execution Failed",

          description:
            trace.error ||
            (
              trace.success
                ? "All recorded runtime operations finished."
                : "The runtime stopped before successful completion."
            ),

          status:
            trace.success
              ? "completed"
              : "failed",
        });
      }

      return items.sort(
        (a, b) =>
          a.timestamp -
          b.timestamp
      );
    }, [trace]);

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 1040,
          margin: "0 auto",
          paddingBottom: 42,
          color: "#0f172a",
          background:
            PAGE_BACKGROUND,
        }}
      >
        <Link
          href="/runtime"
          style={{
            display:
              "inline-flex",
            alignItems:
              "center",
            minHeight: 42,
            color: "#475569",
            textDecoration:
              "none",
            fontWeight: 850,
          }}
        >
          ← 返回 Runtime
        </Link>

        <header
          style={{
            marginTop: 14,
            marginBottom: 22,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing:
                "0.08em",
            }}
          >
            AIOS RUNTIME
          </p>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 8,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize:
                    "clamp(30px, 7vw, 42px)",
                  lineHeight: 1.12,
                  letterSpacing:
                    "-0.035em",
                }}
              >
                Execution Trace
              </h1>

              <p
                style={{
                  maxWidth: 690,
                  margin:
                    "12px 0 0",
                  color: "#64748b",
                  lineHeight: 1.7,
                }}
              >
                查看最近一次请求的执行状态、能力队列、时间线和运行结果。
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadTrace()
              }
              disabled={loading}
              style={{
                minHeight: 44,
                padding:
                  "0 17px",
                border:
                  "1px solid #dbe3ee",
                borderRadius: 13,
                background:
                  "#ffffff",
                color: "#0f172a",
                fontWeight: 900,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
                opacity:
                  loading
                    ? 0.65
                    : 1,
              }}
            >
              {loading
                ? "刷新中…"
                : "刷新记录"}
            </button>
          </div>
        </header>

        {error && (
          <section
            style={{
              marginBottom: 18,
              padding: 16,
              border:
                "1px solid #fecdd3",
              borderRadius: 16,
              background:
                "#fff1f2",
              color: "#be123c",
              fontWeight: 800,
            }}
          >
            {error}
          </section>
        )}

        {loading &&
          !trace && (
            <section
              style={{
                padding: 24,
                border:
                  "1px solid #e2e8f0",
                borderRadius: 22,
                background:
                  "#ffffff",
              }}
            >
              <strong>
                正在读取 Execution Trace…
              </strong>
            </section>
          )}

        {!loading &&
          !trace &&
          !error && (
            <EmptyTrace />
          )}

        {trace && (
          <>
            <section
              style={{
                padding: 22,
                borderRadius: 24,
                background:
                  "#0f172a",
                color: "#ffffff",
                boxShadow:
                  "0 18px 48px rgba(15, 23, 42, 0.14)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#93c5fd",
                      fontSize: 12,
                      fontWeight: 950,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    EXECUTION OVERVIEW
                  </p>

                  <h2
                    style={{
                      margin:
                        "9px 0 0",
                      fontSize: 25,
                    }}
                  >
                    {trace.success
                      ? "执行完成"
                      : executionStatus ===
                          "failed"
                        ? "执行失败"
                        : "执行处理中"}
                  </h2>

                  <p
                    style={{
                      maxWidth: 620,
                      margin:
                        "10px 0 0",
                      color: "#cbd5e1",
                      lineHeight: 1.65,
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {trace.goal ||
                      trace.promptPreview ||
                      "No request preview available."}
                  </p>
                </div>

                <StatusBadge
                  status={
                    executionStatus
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(135px, 1fr))",
                  gap: 10,
                  marginTop: 22,
                }}
              >
                <DarkMetric
                  label="Status"
                  value={getStatusLabel(
                    executionStatus
                  )}
                />

                <DarkMetric
                  label="Progress"
                  value={`${progress}%`}
                />

                <DarkMetric
                  label="Duration"
                  value={formatDuration(
                    durationMs
                  )}
                />

                <DarkMetric
                  label="Provider"
                  value={
                    trace.provider ??
                    "—"
                  }
                />

                <DarkMetric
                  label="Current"
                  value={
                    currentItem?.capability ??
                    (
                      trace.success
                        ? "Completed"
                        : "—"
                    )
                  }
                />

                <DarkMetric
                  label="Request"
                  value={shortenId(
                    trace.requestId
                  )}
                />
              </div>
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  "1px solid #e2e8f0",
                borderRadius: 22,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    EXECUTION PROGRESS
                  </p>

                  <h2
                    style={{
                      margin:
                        "7px 0 0",
                      fontSize: 21,
                    }}
                  >
                    {getProgressLabel(
                      progress,
                      executionStatus ===
                        "failed"
                    )}
                  </h2>
                </div>

                <strong
                  style={{
                    fontSize: 24,
                  }}
                >
                  {progress}%
                </strong>
              </div>

              <div
                style={{
                  height: 12,
                  marginTop: 18,
                  overflow:
                    "hidden",
                  borderRadius: 999,
                  background:
                    "#e2e8f0",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height:
                      "100%",
                    borderRadius: 999,
                    background:
                      executionStatus ===
                      "failed"
                        ? "#dc2626"
                        : progress >=
                            100
                          ? "#16a34a"
                          : "#2563eb",
                    transition:
                      "width 240ms ease",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 8,
                  marginTop: 10,
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <span>
                  Started
                </span>

                <span>
                  {completedCount}/
                  {queue.length ||
                    1}{" "}
                  capabilities
                </span>

                <span>
                  Completed
                </span>
              </div>
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  "1px solid #bfdbfe",
                borderRadius: 22,
                background:
                  "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#2563eb",
                  fontSize: 12,
                  fontWeight: 950,
                }}
              >
                CURRENT STEP
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  flexWrap: "wrap",
                  gap: 14,
                  marginTop: 10,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 24,
                    }}
                  >
                    {currentItem?.capability ??
                      (
                        trace.success
                          ? "Execution Completed"
                          : "Runtime"
                      )}
                  </h2>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    {currentItem?.error ||
                      (
                        trace.success
                          ? "最近一次执行已经完成。"
                          : "正在等待新的能力执行记录。"
                      )}
                  </p>
                </div>

                <StatusBadge
                  status={
                    currentItem?.status ??
                    executionStatus
                  }
                />
              </div>
            </section>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1.6fr) minmax(240px, 0.7fr)",
                gap: 18,
                marginTop: 18,
              }}
              className="trace-main-grid"
            >
              <div
                style={{
                  display: "grid",
                  gap: 18,
                  minWidth: 0,
                }}
              >
                <section
                  style={{
                    padding: 20,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: 22,
                    background:
                      "#ffffff",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 21,
                    }}
                  >
                    Execution Queue
                  </h2>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    按执行顺序显示本次请求调用的能力。
                  </p>

                  {queue.length ===
                  0 ? (
                    <p
                      style={{
                        margin:
                          "16px 0 0",
                        color: "#64748b",
                      }}
                    >
                      本次执行没有独立能力调用记录。
                    </p>
                  ) : (
                    <div
                      style={{
                        display:
                          "grid",
                        gap: 10,
                        marginTop: 16,
                      }}
                    >
                      {queue.map(
                        (
                          item,
                          index
                        ) => (
                          <QueueRow
                            key={
                              item.id
                            }
                            item={
                              item
                            }
                            index={
                              index
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </section>

                <section
                  style={{
                    padding: 20,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: 22,
                    background:
                      "#ffffff",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 21,
                    }}
                  >
                    Execution Timeline
                  </h2>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    最近一次运行产生的关键执行节点。
                  </p>

                  <div
                    style={{
                      display:
                        "grid",
                      gap: 0,
                      marginTop: 18,
                    }}
                  >
                    {timeline.map(
                      (
                        item,
                        index
                      ) => (
                        <TimelineRow
                          key={
                            item.id
                          }
                          item={
                            item
                          }
                          isLast={
                            index ===
                            timeline.length -
                              1
                          }
                        />
                      )
                    )}
                  </div>
                </section>
              </div>

              <aside
                style={{
                  minWidth: 0,
                }}
              >
                <section
                  style={{
                    position:
                      "sticky",
                    top: 18,
                    padding: 20,
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: 22,
                    background:
                      "#ffffff",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    EXECUTION SUMMARY
                  </p>

                  <div
                    style={{
                      display:
                        "grid",
                      gap: 0,
                      marginTop: 10,
                    }}
                  >
                    <SummaryRow
                      label="Events"
                      value={String(
                        timeline.length
                      )}
                    />

                    <SummaryRow
                      label="Capabilities"
                      value={String(
                        queue.length
                      )}
                    />

                    <SummaryRow
                      label="Completed"
                      value={String(
                        completedCount
                      )}
                    />

                    <SummaryRow
                      label="Failed"
                      value={String(
                        failedCount
                      )}
                    />

                    <SummaryRow
                      label="Progress"
                      value={`${progress}%`}
                    />

                    <SummaryRow
                      label="Fallback"
                      value={
                        trace.fallbackUsed
                          ? "Used"
                          : "Not used"
                      }
                    />

                    <SummaryRow
                      label="Started"
                      value={formatClockTime(
                        trace.startedAt
                      )}
                    />

                    <SummaryRow
                      label="Finished"
                      value={formatClockTime(
                        trace.completedAt
                      )}
                      last
                    />
                  </div>
                </section>
              </aside>
            </div>

            <section
              style={{
                marginTop: 18,
                overflow:
                  "hidden",
                border:
                  "1px solid #e2e8f0",
                borderRadius: 22,
                background:
                  "#ffffff",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setRawOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 12,
                  minHeight: 62,
                  padding:
                    "0 20px",
                  border: 0,
                  background:
                    "#ffffff",
                  color: "#0f172a",
                  fontWeight: 900,
                  textAlign:
                    "left",
                  cursor:
                    "pointer",
                }}
              >
                <span>
                  Raw Trace
                </span>

                <span
                  style={{
                    color: "#64748b",
                  }}
                >
                  {rawOpen
                    ? "收起 ↑"
                    : "展开 ↓"}
                </span>
              </button>

              {rawOpen && (
                <pre
                  style={{
                    maxHeight: 540,
                    margin: 0,
                    padding: 20,
                    overflow:
                      "auto",
                    borderTop:
                      "1px solid #e2e8f0",
                    background:
                      "#0f172a",
                    color: "#dbeafe",
                    fontSize: 12,
                    lineHeight: 1.7,
                    whiteSpace:
                      "pre-wrap",
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {JSON.stringify(
                    {
                      runtime:
                        data?.runtime,

                      version:
                        data?.version,

                      trace,

                      timestamp:
                        data?.timestamp,
                    },
                    null,
                    2
                  )}
                </pre>
              )}
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
                marginTop: 18,
              }}
            >
              <InfoCard
                label="Plan"
                value={
                  trace.planType ??
                  trace.intent ??
                  "—"
                }
              />

              <InfoCard
                label="Plan ID"
                value={shortenId(
                  trace.planId
                )}
              />

              <InfoCard
                label="Started"
                value={formatDateTime(
                  trace.startedAt
                )}
              />

              <InfoCard
                label="Completed"
                value={formatDateTime(
                  trace.completedAt
                )}
              />
            </section>
          </>
        )}

        <style jsx>{`
          @media (max-width: 760px) {
            .trace-main-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
    </WorkspaceShell>
  );
}

function StatusBadge({
  status,
}: {
  status: TraceStatus;
}) {
  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        gap: 7,
        minHeight: 34,
        padding:
          "0 12px",
        borderRadius: 999,
        background:
          getStatusBackground(
            status
          ),
        color:
          getStatusColor(
            status
          ),
        fontSize: 12,
        fontWeight: 950,
        whiteSpace:
          "nowrap",
      }}
    >
      <span>
        {getStatusIcon(
          status
        )}
      </span>

      {getStatusLabel(
        status
      )}
    </span>
  );
}

function DarkMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding:
          "13px 14px",
        border:
          "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: 15,
        background:
          "rgba(255, 255, 255, 0.06)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#94a3b8",
          fontSize: 11,
          fontWeight: 900,
        }}
      >
        {label.toUpperCase()}
      </p>

      <p
        title={value}
        style={{
          margin:
            "7px 0 0",
          color: "#ffffff",
          fontWeight: 900,
          overflow:
            "hidden",
          textOverflow:
            "ellipsis",
          whiteSpace:
            "nowrap",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function QueueRow({
  item,
  index,
}: {
  item: QueueItem;
  index: number;
}) {
  const color =
    getStatusColor(
      item.status
    );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "38px minmax(0, 1fr) auto",
        alignItems:
          "center",
        gap: 12,
        padding: 14,
        border:
          item.status ===
          "running"
            ? "1px solid #93c5fd"
            : item.status ===
                "failed"
              ? "1px solid #fecaca"
              : "1px solid #e2e8f0",
        borderRadius: 16,
        background:
          item.status ===
          "running"
            ? "#eff6ff"
            : item.status ===
                "failed"
              ? "#fff1f2"
              : "#f8fafc",
      }}
    >
      <span
        style={{
          display:
            "inline-flex",
          width: 34,
          height: 34,
          alignItems:
            "center",
          justifyContent:
            "center",
          borderRadius: 11,
          background:
            getStatusBackground(
              item.status
            ),
          color,
          fontWeight: 950,
        }}
      >
        {item.status ===
        "completed"
          ? "✓"
          : index + 1}
      </span>

      <div
        style={{
          minWidth: 0,
        }}
      >
        <strong
          style={{
            display:
              "block",
            overflowWrap:
              "anywhere",
          }}
        >
          {item.capability}
        </strong>

        <span
          style={{
            display:
              "block",
            marginTop: 4,
            color:
              item.error
                ? "#be123c"
                : "#64748b",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {item.error ||
            (
              item.durationMs !==
              null
                ? formatDuration(
                    item.durationMs
                  )
                : "No duration recorded"
            )}
        </span>
      </div>

      <span
        style={{
          color,
          fontSize: 12,
          fontWeight: 950,
          whiteSpace:
            "nowrap",
        }}
      >
        {getStatusLabel(
          item.status
        )}
      </span>
    </div>
  );
}

function TimelineRow({
  item,
  isLast,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const color =
    getStatusColor(
      item.status
    );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "72px 24px minmax(0, 1fr)",
        gap: 10,
      }}
    >
      <time
        style={{
          paddingTop: 2,
          color: "#64748b",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {formatClockTime(
          item.timestamp
        )}
      </time>

      <div
        style={{
          position:
            "relative",
          display: "flex",
          justifyContent:
            "center",
        }}
      >
        {!isLast && (
          <span
            style={{
              position:
                "absolute",
              top: 18,
              bottom: -6,
              width: 2,
              background:
                "#e2e8f0",
            }}
          />
        )}

        <span
          style={{
            position:
              "relative",
            zIndex: 1,
            display:
              "inline-flex",
            width: 20,
            height: 20,
            alignItems:
              "center",
            justifyContent:
              "center",
            borderRadius:
              "50%",
            background:
              getStatusBackground(
                item.status
              ),
            color,
            fontSize: 11,
            fontWeight: 950,
          }}
        >
          {getStatusIcon(
            item.status
          )}
        </span>
      </div>

      <div
        style={{
          paddingBottom:
            isLast
              ? 0
              : 22,
        }}
      >
        <strong>
          {item.title}
        </strong>

        <p
          style={{
            margin:
              "5px 0 0",
            color: "#64748b",
            fontSize: 13,
            lineHeight: 1.55,
            overflowWrap:
              "anywhere",
          }}
        >
          {item.description}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems:
          "center",
        gap: 12,
        minHeight: 47,
        borderBottom:
          last
            ? "none"
            : "1px solid #eef2f7",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          textAlign:
            "right",
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 16,
        border:
          "1px solid #e2e8f0",
        borderRadius: 17,
        background:
          "#ffffff",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 11,
          fontWeight: 950,
        }}
      >
        {label.toUpperCase()}
      </p>

      <p
        title={value}
        style={{
          margin:
            "8px 0 0",
          fontWeight: 900,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyTrace() {
  return (
    <section
      style={{
        padding: 24,
        border:
          "1px solid #e2e8f0",
        borderRadius: 22,
        background:
          "#ffffff",
      }}
    >
      <div
        style={{
          display:
            "inline-flex",
          width: 48,
          height: 48,
          alignItems:
            "center",
          justifyContent:
            "center",
          borderRadius: 15,
          background:
            "#eff6ff",
          fontSize: 23,
        }}
      >
        ◌
      </div>

      <h2
        style={{
          margin:
            "16px 0 0",
        }}
      >
        暂无执行记录
      </h2>

      <p
        style={{
          maxWidth: 590,
          margin:
            "9px 0 0",
          color: "#64748b",
          lineHeight: 1.7,
        }}
      >
        前往 Planner 执行一个目标后，这里会显示 Execution Overview、Queue、Timeline 和完整运行记录。
      </p>

      <Link
        href="/planner"
        style={{
          display:
            "inline-flex",
          alignItems:
            "center",
          minHeight: 44,
          marginTop: 18,
          padding:
            "0 17px",
          borderRadius: 13,
          background:
            "#0f172a",
          color: "#ffffff",
          textDecoration:
            "none",
          fontWeight: 900,
        }}
      >
        打开 Planner →
      </Link>
    </section>
  );
}