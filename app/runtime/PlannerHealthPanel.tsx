"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

interface PlannerHealthCheck {
  id: string;
  status:
    | "pass"
    | "warn"
    | "fail";
  message: string;
}

interface PlannerHealthResult {
  success: boolean;

  status:
    | "healthy"
    | "idle"
    | "degraded"
    | "failed";

  score: number;

  checks: PlannerHealthCheck[];

  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };

  planner: {
    outcomes: number;
    pendingOutcomes: number;
    activeOutcomes: number;
    completedOutcomes: number;
    totalTasks: number;
    todoTasks: number;
    doingTasks: number;
    doneTasks: number;
  };

  timestamp?: number;
}

export default function PlannerHealthPanel() {
  const [
    data,
    setData,
  ] =
    useState<
      PlannerHealthResult | null
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
              "/api/runtime/planner-health",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as
              PlannerHealthResult;

          if (!result) {
            throw new Error(
              "Planner health verification returned no result.",
            );
          }

          setData(result);

          if (!response.ok) {
            setError(true);
          }
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
          gap: 14,
          flexWrap:
            "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color:
                "#64748b",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing:
                "0.08em",
            }}
          >
            PLANNER HEALTH
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
                  "idle"
                ? "IDLE"
                : data.status ===
                    "degraded"
                  ? "DEGRADED"
                  : "FAILED"}
          </strong>
        )}
      </div>

      {error && data && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background:
              "#fffbeb",
            border:
              "1px solid #fde68a",
            color:
              "#92400e",
            lineHeight: 1.6,
          }}
        >
          Planner Health returned
          a non-success HTTP status.
          The diagnostic result is
          shown below.
        </div>
      )}

      {error && !data && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background:
              "#fef2f2",
            border:
              "1px solid #fecaca",
            color:
              "#991b1b",
          }}
        >
          Unable to complete
          Planner Health verification.
        </div>
      )}

      {data && (
        <>
          <div
            style={{
              display:
                "grid",
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
                  key={
                    check.id
                  }
                  style={{
                    display:
                      "flex",
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
                      lineHeight:
                        1.5,
                    }}
                  >
                    {
                      check.message
                    }
                  </span>

                  <strong
                    style={{
                      flexShrink:
                        0,
                      fontSize: 11,
                    }}
                  >
                    {
                      check.status
                        .toUpperCase()
                    }
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
              background:
                "#f8fafc",
            }}
          >
            <strong>
              Planner Queue
            </strong>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#475569",
                lineHeight:
                  1.7,
              }}
            >
              Outcomes:{" "}
              {
                data.planner
                  .outcomes
              }
              {" · "}
              Pending:{" "}
              {
                data.planner
                  .pendingOutcomes
              }
              {" · "}
              Active:{" "}
              {
                data.planner
                  .activeOutcomes
              }
              {" · "}
              Completed:{" "}
              {
                data.planner
                  .completedOutcomes
              }
              <br />
              Tasks:{" "}
              {
                data.planner
                  .totalTasks
              }
              {" · "}
              Todo:{" "}
              {
                data.planner
                  .todoTasks
              }
              {" · "}
              Doing:{" "}
              {
                data.planner
                  .doingTasks
              }
              {" · "}
              Done:{" "}
              {
                data.planner
                  .doneTasks
              }
            </p>
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
          padding:
            "0 16px",
          border: 0,
          borderRadius: 12,
          background:
            "#111827",
          color:
            "#ffffff",
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
          : "Run Planner Health Again"}
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
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display:
            "block",
          marginTop: 4,
          fontSize: 22,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
