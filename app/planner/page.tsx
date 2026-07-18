"use client";

import {
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface PlannerPlan {
  id: string;
  type: string;
  goal: string;
  intent: string;
  confidence: number;
  capabilities: string[];
  steps: string[];
}

interface PlannerExecution {
  requestId: string;
  provider: string;
  fallbackUsed: boolean;
  content: string;
  latencyMs: number;
}

interface PlannerResponse {
  success: boolean;
  mode?: "plan" | "execute";
  plan?: PlannerPlan;
  execution?: PlannerExecution;
  error?: string;
}

const examples = [
  "把 AIOS Alpha 上线给第一批真实用户测试",
  "规划未来 7 天最重要的开发任务",
  "分析当前项目风险并给出执行顺序",
];

export default function PlannerPage() {
  const [goal, setGoal] =
    useState("");

  const [result, setResult] =
    useState<PlannerResponse | null>(
      null
    );

  const [loadingMode, setLoadingMode] =
    useState<
      "plan" | "execute" | null
    >(null);

  async function runPlanner(
    mode: "plan" | "execute"
  ) {
    const cleanGoal =
      goal.trim();

    if (!cleanGoal) {
      setResult({
        success: false,
        error: "请输入目标。",
      });

      return;
    }

    setLoadingMode(mode);
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/planner",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              goal: cleanGoal,
              mode,
            }),
          }
        );

      const data =
        (await response.json()) as
          PlannerResponse;

      setResult(data);
    } catch {
      setResult({
        success: false,
        error:
          "无法连接 Planner Engine。",
      });
    } finally {
      setLoadingMode(null);
    }
  }

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
            marginBottom: 22,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            AIOS Brain Engine
          </p>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 38,
              lineHeight: 1.12,
            }}
          >
            🧭 Planner
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            输入目标，AIOS 将理解意图、拆解步骤并调度 Runtime。
          </p>
        </header>

        <section
          style={{
            padding: 20,
            borderRadius: 20,
            background: "#111827",
            color: "#ffffff",
          }}
        >
          <label
            htmlFor="planner-goal"
            style={{
              display: "block",
              marginBottom: 10,
              fontWeight: 800,
            }}
          >
            当前目标
          </label>

          <textarea
            id="planner-goal"
            value={goal}
            onChange={(event) =>
              setGoal(
                event.target.value
              )
            }
            placeholder="例如：把 AIOS Alpha 上线给第一批真实用户测试"
            rows={5}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              resize: "vertical",
              border: 0,
              outline: "none",
              borderRadius: 14,
              padding: 15,
              fontSize: 16,
              lineHeight: 1.6,
              fontFamily: "inherit",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button
              type="button"
              disabled={
                loadingMode !== null
              }
              onClick={() =>
                runPlanner("plan")
              }
              style={{
                minHeight: 48,
                border: 0,
                borderRadius: 13,
                background: "#ffffff",
                color: "#111827",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {loadingMode === "plan"
                ? "规划中..."
                : "生成计划"}
            </button>

            <button
              type="button"
              disabled={
                loadingMode !== null
              }
              onClick={() =>
                runPlanner(
                  "execute"
                )
              }
              style={{
                minHeight: 48,
                border:
                  "1px solid #475569",
                borderRadius: 13,
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {loadingMode ===
              "execute"
                ? "执行中..."
                : "规划并执行"}
            </button>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
          }}
        >
          <p
            style={{
              margin:
                "0 0 10px",
              color: "#64748b",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            快速目标
          </p>

          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {examples.map(
              (example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() =>
                    setGoal(example)
                  }
                  style={{
                    padding:
                      "12px 14px",
                    borderRadius: 12,
                    border:
                      "1px solid #e5e7eb",
                    background:
                      "#ffffff",
                    color: "#334155",
                    textAlign: "left",
                    fontWeight: 700,
                  }}
                >
                  {example}
                </button>
              )
            )}
          </div>
        </section>

        {result && (
          <section
            style={{
              marginTop: 20,
              padding: 20,
              borderRadius: 20,
              border:
                "1px solid #e5e7eb",
              background: "#ffffff",
            }}
          >
            {!result.success ? (
              <p
                style={{
                  margin: 0,
                  color: "#dc2626",
                  fontWeight: 800,
                }}
              >
                {result.error ??
                  "Planner 执行失败"}
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    alignItems:
                      "center",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                    }}
                  >
                    执行计划
                  </h2>

                  <span
                    style={{
                      padding:
                        "6px 10px",
                      borderRadius: 999,
                      background:
                        "#dcfce7",
                      color: "#15803d",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {result.mode ===
                    "execute"
                      ? "Executed"
                      : "Planned"}
                  </span>
                </div>

                {result.plan && (
                  <>
                    <div
                      style={{
                        marginTop: 16,
                        padding: 15,
                        borderRadius: 14,
                        background:
                          "#f8fafc",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color:
                            "#64748b",
                          fontSize: 12,
                          fontWeight:
                            800,
                        }}
                      >
                        GOAL
                      </p>

                      <p
                        style={{
                          margin:
                            "6px 0 0",
                          fontWeight:
                            800,
                          lineHeight:
                            1.55,
                        }}
                      >
                        {
                          result.plan
                            .goal
                        }
                      </p>
                    </div>

                    <ol
                      style={{
                        margin:
                          "18px 0 0",
                        paddingLeft: 23,
                      }}
                    >
                      {result.plan.steps.map(
                        (
                          step,
                          index
                        ) => (
                          <li
                            key={`${step}-${index}`}
                            style={{
                              marginBottom:
                                11,
                              lineHeight:
                                1.55,
                              fontWeight:
                                700,
                            }}
                          >
                            {step}
                          </li>
                        )
                      )}
                    </ol>
                  </>
                )}

                {result.execution && (
                  <div
                    style={{
                      marginTop: 18,
                      padding: 16,
                      borderRadius: 15,
                      background:
                        "#111827",
                      color: "#ffffff",
                    }}
                  >
                    <p
                      style={{
                        margin:
                          "0 0 10px",
                        color:
                          "#93c5fd",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      RUNTIME RESULT ·{" "}
                      {
                        result
                          .execution
                          .provider
                      }{" "}
                      ·{" "}
                      {
                        result
                          .execution
                          .latencyMs
                      }
                      ms
                    </p>

                    <div
                      style={{
                        whiteSpace:
                          "pre-wrap",
                        lineHeight: 1.7,
                      }}
                    >
                      {
                        result
                          .execution
                          .content
                      }
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </WorkspaceShell>
  );
}