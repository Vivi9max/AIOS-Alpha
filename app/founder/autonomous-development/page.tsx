"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "aios-founder-access-key";

type Result = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  error?: string;
  reason?: string;
  taskId?: string;
  repository?: string;
  branch?: string;
  objective?: string;
  discoveredPaths?: string[];
  targetPaths?: string[];
  changedPaths?: string[];
  commitShas?: string[];
  readbackVerified?: boolean;
  verificationPassed?: boolean;
  buildVerification?: "NOT_EXECUTED" | "PASS";
};

const DEFAULT_OBJECTIVE =
  "例如：把 /cn 页面做成正常用户可用的 AIOS CN 工作区，并保持现有 API 与 Founder 权限边界不变。";

export default function FounderAutonomousDevelopmentPage() {
  const [accessKey, setAccessKey] = useState("");
  const [objective, setObjective] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedKey = window.sessionStorage.getItem(STORAGE_KEY);
    if (storedKey) setAccessKey(storedKey);
  }, []);

  const handleRun = async () => {
    const key = accessKey.trim();
    const requestObjective = objective.trim();

    if (!key) {
      setError("请输入 Founder Access Key，或先在 Founder Console 完成验证。");
      return;
    }

    if (!requestObjective) {
      setError("请先告诉 AIOS 你想实现什么，不需要填写 Target Path。");
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, key);
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/founder/autonomous-development",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            action: "autonomous",
            objective: requestObjective,
          }),
        },
      );

      const data = (await response.json()) as Result;
      setResult(data);

      if (!response.ok) {
        if (
          data.code === "FOUNDER_UNAUTHORIZED" ||
          data.code === "FOUNDER_NOT_CONFIGURED"
        ) {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
        setError(data.error || data.reason || `Request failed (${response.status})`);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Autonomous development request failed.",
      );
    } finally {
      setRunning(false);
    }
  };

  const success = result?.success === true || result?.ok === true;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        padding: "20px 14px 44px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: 16 }}>
          <div
            style={{
              color: "#dc2626",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.14em",
            }}
          >
            FOUNDER ONLY · C167.12
          </div>
          <h1
            style={{
              margin: "8px 0 7px",
              fontSize: 28,
              lineHeight: 1.1,
              fontWeight: 850,
              color: "#111827",
            }}
          >
            AIOS Autonomous Development
          </h1>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            你只说需求。AIOS 自动发现仓库 → 读取代码 → 判断目标文件 → 生成完整文件 → GitHub 写入 → Commit → Readback。
          </p>
        </header>

        <section
          style={{
            padding: 16,
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            background: "#ffffff",
            boxShadow: "0 8px 26px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 7,
              marginBottom: 16,
            }}
          >
            {[
              "Understand",
              "Discover",
              "Read",
              "Plan",
              "Generate",
              "Write",
              "Commit",
              "Verify",
            ].map((step, index) => (
              <div
                key={step}
                style={{
                  padding: "8px 5px",
                  borderRadius: 9,
                  background: "#f8fafc",
                  textAlign: "center",
                  color: "#475569",
                  fontSize: 9,
                  fontWeight: 750,
                }}
              >
                <span
                  style={{
                    display: "block",
                    marginBottom: 3,
                    color: "#94a3b8",
                    fontSize: 8,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step}
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                marginBottom: 5,
                color: "#94a3b8",
                fontSize: 10,
                fontWeight: 850,
                letterSpacing: "0.08em",
              }}
            >
              FOUNDER AUTH SESSION
            </div>
            <div
              style={{
                color: accessKey ? "#15803d" : "#64748b",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {accessKey
                ? "Founder Access Key loaded"
                : "Founder Access Key required"}
            </div>
          </div>

          <label
            htmlFor="autonomous-objective"
            style={{
              display: "block",
              marginBottom: 7,
              color: "#334155",
              fontSize: 12,
              fontWeight: 750,
            }}
          >
            What do you want AIOS to build or change?
          </label>

          <textarea
            id="autonomous-objective"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            placeholder={DEFAULT_OBJECTIVE}
            disabled={running}
            rows={7}
            spellCheck={false}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              outline: "none",
              color: "#111827",
              background: "#ffffff",
              fontSize: 14,
              lineHeight: 1.6,
              resize: "vertical",
            }}
          />

          <div
            style={{
              marginTop: 7,
              color: "#94a3b8",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            不需要 Target Path。AIOS 会从真实 GitHub 仓库自行判断需要读取和修改哪些文件。
          </div>

          <button
            type="button"
            disabled={running}
            onClick={() => void handleRun()}
            style={{
              width: "100%",
              minHeight: 48,
              marginTop: 12,
              border: "none",
              borderRadius: 10,
              background: running ? "#94a3b8" : "#111827",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 850,
              cursor: running ? "default" : "pointer",
            }}
          >
            {running ? "AIOS Autonomous Development Running..." : "Start Autonomous Development"}
          </button>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 10,
                padding: 11,
                border: "1px solid #fecaca",
                borderRadius: 10,
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              style={{
                marginTop: 12,
                padding: 13,
                borderRadius: 12,
                border: success
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
                background: success ? "#f0fdf4" : "#fef2f2",
              }}
            >
              <div
                style={{
                  marginBottom: 8,
                  color: success ? "#15803d" : "#b91c1c",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                {success ? "AUTONOMOUS DEVELOPMENT COMPLETED" : "AUTONOMOUS DEVELOPMENT BLOCKED"}
              </div>

              {result.code && (
                <div style={{ color: "#475569", fontSize: 12 }}>
                  <strong>Code:</strong> {result.code}
                </div>
              )}

              {result.taskId && (
                <div style={{ marginTop: 5, color: "#475569", fontSize: 12 }}>
                  <strong>Task:</strong> {result.taskId}
                </div>
              )}

              {result.targetPaths?.length ? (
                <div style={{ marginTop: 9 }}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>
                    AIOS SELECTED FILES
                  </div>
                  {result.targetPaths.map((path) => (
                    <div
                      key={path}
                      style={{
                        marginTop: 4,
                        padding: "5px 7px",
                        borderRadius: 7,
                        background: "#ffffff",
                        color: "#334155",
                        fontSize: 11,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {path}
                    </div>
                  ))}
                </div>
              ) : null}

              {result.changedPaths?.length ? (
                <div style={{ marginTop: 9, color: "#475569", fontSize: 12 }}>
                  <strong>Written:</strong> {result.changedPaths.length} file(s)
                </div>
              ) : null}

              <div style={{ marginTop: 5, color: "#475569", fontSize: 12 }}>
                <strong>Readback:</strong> {result.readbackVerified ? "VERIFIED" : "NOT VERIFIED"}
              </div>

              <div style={{ marginTop: 5, color: "#475569", fontSize: 12 }}>
                <strong>Build:</strong> {result.buildVerification || "NOT EXECUTED"}
              </div>

              {result.reason && (
                <div
                  style={{
                    marginTop: 9,
                    paddingTop: 9,
                    borderTop: "1px solid #e2e8f0",
                    color: "#64748b",
                    fontSize: 11,
                    lineHeight: 1.55,
                  }}
                >
                  {result.reason}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
