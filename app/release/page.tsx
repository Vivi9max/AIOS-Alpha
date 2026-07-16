"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface ReleaseCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  required: boolean;
}

interface ReleaseStatus {
  success: boolean;

  release: {
    name: string;
    version: string;
    stage: string;
    ready: boolean;
    workspace?: string;
    provider?: string;
    storage?: string;
  };

  summary: {
    total: number;
    passed: number;
    failed: number;
    requiredFailed: number;
  };

  checks: ReleaseCheck[];

  error?: string;
  timestamp: number;
}

export default function ReleasePage() {
  const [
    status,
    setStatus,
  ] = useState<
    ReleaseStatus | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadStatus =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/release/status",
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (await response.json()) as ReleaseStatus;

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ??
                "Release check failed."
            );
          }

          setStatus(data);
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "发布状态读取失败。"
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const ready =
    status?.release.ready ??
    false;

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 820,
          margin: "0 auto",
          color: "#111827",
        }}
      >
        <header
          style={{
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            AIOS Alpha
          </p>

          <h1
            style={{
              margin:
                "7px 0 0",
              fontSize: 34,
              lineHeight: 1.15,
            }}
          >
            MVP Release
          </h1>

          <p
            style={{
              margin:
                "10px 0 0",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            首批真实用户测试前的系统检查。
          </p>
        </header>

        <section
          style={{
            marginBottom: 20,
            padding: 20,
            border:
              ready
                ? "1px solid #bbf7d0"
                : "1px solid #fed7aa",
            borderRadius: 18,
            background:
              ready
                ? "#f0fdf4"
                : "#fff7ed",
          }}
        >
          <p
            style={{
              margin: 0,
              color:
                ready
                  ? "#166534"
                  : "#9a3412",
              fontSize: 13,
              fontWeight: 800,
              textTransform:
                "uppercase",
            }}
          >
            Release Status
          </p>

          <h2
            style={{
              margin:
                "8px 0 0",
              fontSize: 27,
            }}
          >
            {loading
              ? "正在检查…"
              : ready
              ? "MVP Ready ✅"
              : "Release Blocked"}
          </h2>

          {status && (
            <div
              style={{
                marginTop: 12,
                color: "#4b5563",
                lineHeight: 1.7,
              }}
            >
              <div>
                Version：{" "}
                <strong>
                  {
                    status
                      .release
                      .version
                  }
                </strong>
              </div>

              <div>
                Workspace：{" "}
                <strong>
                  {status.release
                    .workspace ??
                    "unknown"}
                </strong>
              </div>

              <div>
                Provider：{" "}
                <strong>
                  {status.release
                    .provider ??
                    "unknown"}
                </strong>
              </div>

              <div>
                Storage：{" "}
                <strong>
                  {status.release
                    .storage ??
                    "unknown"}
                </strong>
              </div>
            </div>
          )}
        </section>

        {error && (
          <div
            style={{
              marginBottom: 18,
              padding: 14,
              border:
                "1px solid #fecaca",
              borderRadius: 12,
              background:
                "#fff7f7",
              color: "#b91c1c",
              overflowWrap:
                "anywhere",
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            marginBottom: 20,
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
              marginBottom: 13,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 21,
              }}
            >
              Release Checks
            </h2>

            <button
              type="button"
              onClick={loadStatus}
              disabled={loading}
              style={{
                padding:
                  "10px 13px",
                border:
                  "1px solid #d1d5db",
                borderRadius: 10,
                background:
                  "#ffffff",
                fontWeight: 800,
                opacity:
                  loading
                    ? 0.6
                    : 1,
              }}
            >
              {loading
                ? "检查中…"
                : "重新检查"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: 11,
            }}
          >
            {status?.checks.map(
              (check) => (
                <article
                  key={check.id}
                  style={{
                    display: "flex",
                    alignItems:
                      "flex-start",
                    gap: 12,
                    padding: 15,
                    border:
                      "1px solid #e5e7eb",
                    borderRadius:
                      14,
                    background:
                      "#ffffff",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      fontSize: 20,
                    }}
                  >
                    {check.passed
                      ? "✅"
                      : check.required
                      ? "❌"
                      : "⚠️"}
                  </span>

                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <strong>
                      {check.label}
                    </strong>

                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        color:
                          "#6b7280",
                        fontSize: 13,
                        lineHeight:
                          1.5,
                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {check.detail}
                    </p>
                  </div>
                </article>
              )
            )}
          </div>
        </section>

        {status && (
          <section
            style={{
              padding: 18,
              border:
                "1px solid #e5e7eb",
              borderRadius: 16,
              background:
                "#ffffff",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              Summary
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 10,
                marginTop: 14,
              }}
            >
              <SummaryCard
                label="Passed"
                value={
                  status.summary
                    .passed
                }
              />

              <SummaryCard
                label="Failed"
                value={
                  status.summary
                    .failed
                }
              />

              <SummaryCard
                label="Required"
                value={
                  status.summary
                    .requiredFailed
                }
              />
            </div>

            <p
              style={{
                margin:
                  "15px 0 0",
                color: "#6b7280",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              最后检查：{" "}
              {new Date(
                status.timestamp
              ).toLocaleString()}
            </p>
          </section>
        )}
      </main>
    </WorkspaceShell>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 13,
        borderRadius: 12,
        background:
          "#f8fafc",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#6b7280",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {label}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: 5,
          fontSize: 24,
        }}
      >
        {value}
      </strong>
    </div>
  );
}