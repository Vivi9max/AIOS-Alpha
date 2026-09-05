"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

interface CoreCheck {
  id: string;
  status:
    | "pass"
    | "warn"
    | "fail";
  message: string;
}

interface VerificationResult {
  success: boolean;
  status:
    | "healthy"
    | "degraded"
    | "failed";
  score: number;
  checks: CoreCheck[];
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
}

export default function CoreVerificationPanel() {
  const [
    data,
    setData,
  ] =
    useState<
      VerificationResult | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const load =
    useCallback(
      async () => {
        setLoading(
          true
        );

        try {
          const response =
            await fetch(
              "/api/runtime/core-verification",
              {
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as
              VerificationResult;

          setData(
            result
          );
        } catch {
          setData(
            null
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section
        style={{
          marginTop:
            18,

          padding:
            20,

          borderRadius:
            20,

          border:
            "1px solid #e5e7eb",

          background:
            "#ffffff",
        }}
      >
        <strong>
          CORE VERIFICATION
        </strong>

        <p
          style={{
            margin:
              "8px 0 0",

            color:
              "#64748b",
          }}
        >
          Verifying AIOS runtime core...
        </p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section
      style={{
        marginTop:
          18,

        padding:
          20,

        borderRadius:
          20,

        border:
          "1px solid #e5e7eb",

        background:
          "#ffffff",
      }}
    >
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap:
            16,

          alignItems:
            "center",
        }}
      >
        <div>
          <p
            style={{
              margin:
                0,

              color:
                "#64748b",

              fontSize:
                12,

              fontWeight:
                900,
            }}
          >
            CORE VERIFICATION
          </p>

          <h2
            style={{
              margin:
                "6px 0 0",

              fontSize:
                30,
            }}
          >
            {data.score}/100
          </h2>
        </div>

        <strong>
          {data.status ===
          "healthy"
            ? "HEALTHY"
            : data.status ===
                "degraded"
              ? "DEGRADED"
              : "FAILED"}
        </strong>
      </div>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",

          gap:
            10,

          marginTop:
            16,
        }}
      >
        <Metric
          label="Passed"
          value={
            data.summary.passed
          }
        />

        <Metric
          label="Warnings"
          value={
            data.summary.warnings
          }
        />

        <Metric
          label="Failed"
          value={
            data.summary.failed
          }
        />
      </div>

      <div
        style={{
          marginTop:
            16,
        }}
      >
        {data.checks.map(
          (check) => (
            <div
              key={check.id}
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                gap:
                  12,

                padding:
                  "11px 0",

                borderBottom:
                  "1px solid #f1f5f9",
              }}
            >
              <span>
                {check.message}
              </span>

              <strong>
                {check.status
                  .toUpperCase()}
              </strong>
            </div>
          )
        )}
      </div>

      <div
        style={{
          marginTop:
            18,

          padding:
            15,

          borderRadius:
            15,

          background:
            "#f8fafc",
        }}
      >
        <strong>
          Planner / Execution
        </strong>

        <p
          style={{
            margin:
              "8px 0 0",

            color:
              "#475569",

            lineHeight:
              1.6,
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

      <button
        type="button"
        onClick={() =>
          void load()
        }
        style={{
          marginTop:
            16,

          minHeight:
            42,

          padding:
            "0 16px",

          border:
            0,

          borderRadius:
            12,

          background:
            "#111827",

          color:
            "#ffffff",

          fontWeight:
            800,
        }}
      >
        Re-verify Core
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
        padding:
          12,

        borderRadius:
          13,

        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#64748b",

          fontSize:
            11,

          fontWeight:
            800,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display:
            "block",

          marginTop:
            4,

          fontSize:
            22,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
