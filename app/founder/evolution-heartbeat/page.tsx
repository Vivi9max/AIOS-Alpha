"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aios-founder-access-key";

type VerificationResponse = {
  success?: boolean;
  service?: string;
  status?: string;
  mode?: string;
  identity?: {
    userId?: string;
    isolated?: boolean;
  };
  verification?: {
    lineage?: {
      outcomeId?: string | null;
      outcomeTitle?: string | null;
      milestoneId?: string | null;
      milestoneTitle?: string | null;
      taskId?: string | null;
      taskTitle?: string | null;
    };
    persistedState?: {
      taskStatus?: string | null;
      milestoneStatus?: string | null;
      outcomeStatus?: string | null;
      outcomeProgress?: number | null;
    };
    duplication?: {
      matchingOutcomeCount?: number;
      matchingMilestoneCount?: number;
      outcomeLineageUnique?: boolean;
      milestoneLineageUnique?: boolean;
    };
    idempotency?: {
      checked?: boolean;
      passed?: boolean;
      secondHeartbeatAttempted?: boolean;
      secondHeartbeatTaskId?: string | null;
      secondHeartbeatOutcomeId?: string | null;
      newOutcomeCount?: number;
    };
    checks?: Record<string, boolean>;
    passed?: boolean;
    before?: {
      outcomeCount?: number;
      taskCount?: number;
    };
    after?: {
      outcomeCount?: number;
      taskCount?: number;
    };
    queue?: {
      status?: string;
      created?: boolean;
      taskId?: string | null;
      outcomeId?: string | null;
      milestoneId?: string | null;
      message?: string;
    };
  };
  error?: string;
  timestamp?: number;
  durationMs?: number;
};

export default function FounderEvolutionHeartbeatPage() {
  const [accessKey, setAccessKey] = useState("");
  const [result, setResult] =
    useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(STORAGE_KEY) ?? "";

    setAccessKey(storedKey);
  }, []);

  async function runVerification() {
    const key = accessKey.trim();

    if (!key) {
      setError(
        "未检测到 Founder Access Key。请先返回 Founder Console 登录。",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/founder/evolution-heartbeat",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({}),
        },
      );

      const data =
        (await response.json()) as VerificationResponse;

      setResult(data);

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            `Verification failed (HTTP ${response.status}).`,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Evolution Heartbeat request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const passed =
    result?.status === "closed-loop-verified" &&
    result?.verification?.passed === true;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 18px 60px",
        boxSizing: "border-box",
        background: "#f4f6fb",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 860,
          margin: "0 auto",
        }}
      >
        <header>
          <div
            style={{
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: "0.14em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 30,
              lineHeight: 1.15,
            }}
          >
            Evolution Heartbeat
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            C142.11.6 真实闭环验证
          </p>
        </header>

        <section
          style={{
            marginTop: 22,
            padding: 20,
            border: "1px solid #dbe3f0",
            borderRadius: 22,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 17,
            }}
          >
            Outcome → Milestone → Task → Heartbeat
          </div>

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            页面会自动使用当前 Founder Console 会话中的 Access Key，
            无需把密钥再次输入或显示在页面上。
          </p>

          <button
            type="button"
            onClick={() => void runVerification()}
            disabled={loading}
            style={{
              width: "100%",
              minHeight: 52,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background: loading
                ? "#94a3b8"
                : "#0f172a",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 900,
              cursor: loading
                ? "wait"
                : "pointer",
            }}
          >
            {loading
              ? "正在执行真实闭环验证…"
              : "▶ Run C142.11.6 Verification"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background: "#fff1f2",
                color: "#be123c",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}
        </section>

        {result && (
          <section
            style={{
              marginTop: 18,
              padding: 20,
              border:
                passed
                  ? "1px solid #86efac"
                  : "1px solid #fecaca",
              borderRadius: 22,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 950,
                color: passed
                  ? "#166534"
                  : "#b91c1c",
              }}
            >
              {passed
                ? "✓ CLOSED-LOOP VERIFIED"
                : "✕ CLOSED-LOOP FAILED"}
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              HTTP 状态：{result.success ? "200" : "失败"}
              {typeof result.durationMs === "number"
                ? ` · ${result.durationMs} ms`
                : ""}
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 18,
              }}
            >
              <ResultRow
                label="Outcome"
                value={
                  result.verification?.lineage?.outcomeId ??
                  "—"
                }
              />
              <ResultRow
                label="Milestone"
                value={
                  result.verification?.lineage
                    ?.milestoneId ?? "—"
                }
              />
              <ResultRow
                label="Task"
                value={
                  result.verification?.lineage?.taskId ??
                  "—"
                }
              />
              <ResultRow
                label="Task Status"
                value={
                  result.verification?.persistedState
                    ?.taskStatus ?? "—"
                }
              />
              <ResultRow
                label="Milestone Status"
                value={
                  result.verification?.persistedState
                    ?.milestoneStatus ?? "—"
                }
              />
              <ResultRow
                label="Outcome Status"
                value={
                  result.verification?.persistedState
                    ?.outcomeStatus ?? "—"
                }
              />
              <ResultRow
                label="Outcome Progress"
                value={
                  result.verification?.persistedState
                    ?.outcomeProgress != null
                    ? `${result.verification.persistedState.outcomeProgress}%`
                    : "—"
                }
              />
              <ResultRow
                label="Idempotency"
                value={
                  result.verification?.idempotency?.passed ===
                  true
                    ? "PASSED"
                    : "FAILED"
                }
              />
            </div>

            <details
              style={{
                marginTop: 18,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#475569",
                }}
              >
                查看完整 POST JSON
              </summary>

              <pre
                style={{
                  marginTop: 12,
                  padding: 14,
                  overflowX: "auto",
                  borderRadius: 14,
                  background: "#0f172a",
                  color: "#e2e8f0",
                  fontSize: 12,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 14px",
        borderRadius: 13,
        background: "#f8fafc",
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

      <span
        style={{
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 900,
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
