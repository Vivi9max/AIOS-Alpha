"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

interface RegressionCheck {
  id: string;
  status:
    | "pass"
    | "warn"
    | "fail";
  message: string;
}

interface RegressionResult {
  success: boolean;

  status:
    | "healthy"
    | "degraded"
    | "failed";

  score: number;

  checks: RegressionCheck[];

  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };

  planner: {
    outcomes: number;
    activeOutcomes: number;
    todoTasks: number;
    doingTasks: number;
    doneTasks: number;
  };

  execution: {
    recentRuns: number;
    recentFailures: number;
    successRate:
      number | null;
  };

  autonomy: {
    ready: boolean;
    level: string;
    decision: string;
    blockers: string[];
    recommendations: string[];
    candidateTask: {
      id: string;
      title: string;
      description: string;
    } | null;
  };
}

export default function AutonomousLoopRegressionPanel() {
  const [
    data,
    setData,
  ] =
    useState<
      RegressionResult | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState(false);

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError(false);

        try {
          const response =
            await fetch(
              "/api/runtime/autonomous-regression",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as
              RegressionResult;

          if (
            !response.ok ||
            !result
          ) {
            throw new Error(
              "Regression verification failed.",
            );
          }

          setData(result);
        } catch {
          setData(null);
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      style={{
        marginTop: 18,
        padding: 20,
        borderRadius: 20,
        border:
          "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing:
                "0.08em",
            }}
          >
            AUTONOMOUS LOOP REGRESSION
          </p>

          <h2
            style={{
              margin:
                "6px 0 0",
              fontSize: 28,
            }}
          >
            {loading
              ? "Verifying..."
              : data
                ? `${data.score}/100`
                : "Unavailable"}
          </h2>
        </div>

        {data && (
          <strong>
            {data.status ===
            "healthy"
              ? "HEALTHY"
              : data.status ===
                  "degraded"
                ? "DEGRADED"
                : "FAILED"}
          </strong>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background: "#fef2f2",
            color: "#991b1b",
            lineHeight: 1.6,
          }}
        >
          Unable to complete autonomous
          loop regression verification.
        </div>
      )}

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            <Metric
              label="Passed"
              value={
                data.summary
                  .passed
              }
            />

            <Metric
              label="Warnings"
              value={
                data.summary
                  .warnings
              }
            />

            <Metric
              label="Failed"
              value={
                data.summary
                  .failed
              }
            />
          </div>

          <div
            style={{
              marginTop: 16,
            }}
          >
            {data.checks.map(
              (check) => (
                <div
                  key={check.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: 12,
                    padding:
                      "10px 0",
                    borderBottom:
                      "1px solid #f1f5f9",
                  }}
                >
                  <span
                    style={{
                      lineHeight: 1.5,
                    }}
                  >
                    {check.message}
                  </span>

                  <strong
                    style={{
                      flexShrink: 0,
                      fontSize: 11,
                    }}
                  >
                    {check.status.toUpperCase()}
                  </strong>
                </div>
              ),
            )}
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 15,
              borderRadius: 15,
              background: "#f8fafc",
            }}
          >
            <strong>
              Planner / Execution Health
            </strong>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              Outcomes:{" "}
              {data.planner.outcomes}
              {" · "}
              Active:{" "}
              {data.planner.activeOutcomes}
              {" · "}
              Todo:{" "}
              {data.planner.todoTasks}
              {" · "}
              Doing:{" "}
              {data.planner.doingTasks}
              {" · "}
              Done:{" "}
              {data.planner.doneTasks}
              <br />
              Recent runs:{" "}
              {data.execution.recentRuns}
              {" · "}
              Failures:{" "}
              {data.execution.recentFailures}
              {" · "}
              Success rate:{" "}
              {data.execution.successRate ===
              null
                ? "—"
                : `${data.execution.successRate}%`}
            </p>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 15,
              borderRadius: 15,
              background:
                data.autonomy.ready
                  ? "#f0fdf4"
                  : "#fffbeb",
            }}
          >
            <strong>
              Autonomy Gate
            </strong>

            <p
              style={{
                margin:
                  "8px 0 0",
                lineHeight: 1.6,
              }}
            >
              Level:{" "}
              {data.autonomy.level}
              {" · "}
              Decision:{" "}
              {data.autonomy.decision}
              {" · "}
              Ready:{" "}
              {data.autonomy.ready
                ? "YES"
                : "NO"}
            </p>

            {data.autonomy
              .candidateTask && (
              <p
                style={{
                  margin:
                    "8px 0 0",
                  color: "#475569",
                }}
              >
                Candidate:{" "}
                {
                  data.autonomy
                    .candidateTask
                    .title
                }
              </p>
            )}

            {data.autonomy
              .blockers.length >
              0 && (
              <div
                style={{
                  marginTop: 10,
                }}
              >
                <strong>
                  Blockers
                </strong>

                <ul
                  style={{
                    margin:
                      "8px 0 0",
                    paddingLeft: 20,
                    color:
                      "#92400e",
                  }}
                >
                  {data.autonomy.blockers.map(
                    (blocker) => (
                      <li
                        key={blocker}
                        style={{
                          marginBottom: 4,
                        }}
                      >
                        {blocker}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            {data.autonomy
              .recommendations.length >
              0 && (
              <div
                style={{
                  marginTop: 10,
                }}
              >
                <strong>
                  Recommendations
                </strong>

                <ul
                  style={{
                    margin:
                      "8px 0 0",
                    paddingLeft: 20,
                    color:
                      "#475569",
                  }}
                >
                  {data.autonomy.recommendations.map(
                    (recommendation) => (
                      <li
                        key={
                          recommendation
                        }
                        style={{
                          marginBottom: 4,
                        }}
                      >
                        {
                          recommendation
                        }
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() =>
          void load()
        }
        disabled={loading}
        style={{
          marginTop: 16,
          minHeight: 42,
          padding: "0 16px",
          border: 0,
          borderRadius: 12,
          background: "#111827",
          color: "#ffffff",
          fontWeight: 800,
          cursor:
            loading
              ? "wait"
              : "pointer",
          opacity:
            loading
              ? 0.7
              : 1,
        }}
      >
        {loading
          ? "Verifying..."
          : "Run Regression Again"}
      </button>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 13,
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 4,
          fontSize: 22,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
