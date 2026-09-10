"use client";

import { useState } from "react";

type Result = Record<string, unknown>;

const VERIFICATION_TITLE =
  "C142.11 Autonomous Runtime Closed-Loop Verification";

export default function FounderEvolutionVerification() {
  const [accessKey, setAccessKey] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const runVerification = async () => {
    const key = accessKey.trim();

    if (!key) {
      setError("请输入 Founder Access Key");
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);

    try {
      /*
       * Step 1:
       * Create one explicit Founder-approved Outcome.
       *
       * The Outcome is the authorization boundary for autonomous work.
       * AIOS must not invent an unrelated autonomous objective.
       */
      const outcomeResponse = await fetch(
        "/api/outcomes",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            title: VERIFICATION_TITLE,

            description:
              "Verify that the registered AIOS workspace can materialize one pending milestone into a persistent task and execute it through the bounded autonomous runtime with regression evidence.",

            successCriteria:
              "One pending milestone becomes one persistent task, the Safety Gate is evaluated, one bounded runtime operation executes, Autonomous Loop Regression passes, evidence is persisted, and the task reaches done without creating concurrent work.",

            priority: "high",

            milestones: [
              {
                title:
                  "Materialize and verify first autonomous work item",

                description:
                  "Create exactly one persistent task from this milestone, execute one bounded autonomous lifecycle, verify the result, and persist execution evidence.",
              },
            ],
          }),
        },
      );

      const outcomeData =
        (await outcomeResponse.json()) as Result;

      /*
       * A duplicate is safe here:
       * the existing Outcome remains the user's verification target.
       */
      if (
        !outcomeResponse.ok &&
        outcomeData.code !== "DUPLICATE_OUTCOME"
      ) {
        throw new Error(
          typeof outcomeData.error === "string"
            ? outcomeData.error
            : "Verification Outcome creation failed.",
        );
      }

      /*
       * Step 2:
       * Trigger exactly one Founder-authorized Evolution Heartbeat.
       *
       * The secret is sent only as an Authorization header.
       * It is never placed in the URL.
       */
      const heartbeatResponse = await fetch(
        "/api/founder/evolution-heartbeat",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${key}`,
          },
        },
      );

      const heartbeatData =
        (await heartbeatResponse.json()) as Result;

      if (!heartbeatResponse.ok) {
        throw new Error(
          typeof heartbeatData.error === "string"
            ? heartbeatData.error
            : "Evolution Heartbeat failed.",
        );
      }

      /*
       * Step 3:
       * Read the actual persisted Outcome/Task state
       * after the heartbeat completes.
       */
      const stateResponse = await fetch(
        "/api/outcomes",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const stateData =
        (await stateResponse.json()) as Result;

      setResult({
        outcomePreparation: outcomeData,
        heartbeat: heartbeatData,
        persistedState: stateData,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "C142.11.2 verification failed.",
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 28,
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "#dc2626",
              border: "1px solid #dc2626",
              borderRadius: 4,
              padding: "3px 8px",
            }}
          >
            FOUNDER ONLY
          </span>
        </div>

        <h1
          style={{
            fontSize: 21,
            fontWeight: 700,
            margin: "0 0 6px",
            color: "#111",
          }}
        >
          C142.11.2 Autonomous Closed-Loop Verification
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "#666",
            lineHeight: 1.6,
            margin: "0 0 22px",
          }}
        >
          Founder-controlled verification of the real
          Evolution → Work Queue → Runtime → Regression
          → Evidence → Completion pipeline.
        </p>

        <div
          style={{
            padding: 14,
            marginBottom: 18,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#f9fafb",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#444",
          }}
        >
          <strong>Verification target</strong>
          <br />
          {VERIFICATION_TITLE}
          <br />
          <br />
          <strong>Expected boundary</strong>
          <br />
          One Outcome → one pending Milestone →
          one Task → one bounded execution.
        </div>

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: "#333",
          }}
        >
          Founder Access Key
        </label>

        <input
          type="password"
          placeholder="Enter your Founder Access Key"
          value={accessKey}
          onChange={(event) =>
            setAccessKey(event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !running
            ) {
              void runVerification();
            }
          }}
          autoComplete="off"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 7,
            fontSize: 14,
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={() => void runVerification()}
          disabled={running}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "13px 16px",
            background: running
              ? "#6b7280"
              : "#111",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 14,
            fontWeight: 700,
            cursor: running
              ? "not-allowed"
              : "pointer",
          }}
        >
          {running
            ? "Running Closed Loop..."
            : "Run One Autonomous Cycle"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: "1px solid #fecaca",
              borderRadius: 8,
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <section
            style={{
              marginTop: 22,
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: 16,
              background: "#f9fafb",
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 15,
                fontWeight: 700,
                color: "#111",
              }}
            >
              C142.11.2 LIVE RESULT
            </h2>

            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                lineHeight: 1.55,
                color: "#333",
              }}
            >
              {JSON.stringify(
                result,
                null,
                2,
              )}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
