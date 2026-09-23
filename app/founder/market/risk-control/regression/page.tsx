“use client”;

import {
useEffect,
useState,
} from “react”;

const STORAGE_KEY =
“aios-founder-access-key”;

type Check = {
name: string;
passed: boolean;
detail: string;
};

type RegressionResponse = {
success?: boolean;
verified?: boolean;
code?: string;
stage?: string;
checks?: Check[];
passed?: number;
failed?: number;
plannerDispatched?: boolean;
tradingExecuted?: boolean;
mutationPerformed?: boolean;
humanReviewRequired?: boolean;
runtime?: {
name?: string;
version?: string;
generatedAt?: string;
latencyMs?: number;
};
principles?: string[];
disclaimer?: string;
error?: string;
};

function Section({
title,
children,
}: {
title: string;
children: React.ReactNode;
}) {
return (
<section
style={{
marginTop: 16,
padding: 16,
borderRadius: 14,
border:
“1px solid rgba(255,255,255,0.10)”,
background:
“rgba(255,255,255,0.035)”,
}}
>
<h2
style={{
margin: “0 0 12px”,
fontSize: 16,
}}
>
{title}
  {children}
</section>

);
}

function Status({
passed,
}: {
passed: boolean;
}) {
return (
<strong
style={{
color: passed
? “#86efac”
: “#fca5a5”,
}}
>
{passed
? “PASS”
: “FAIL”}
);
}

export default function MarketRiskControlRegressionPage() {
const [
founderReady,
setFounderReady,
] = useState(false);

const [
running,
setRunning,
] = useState(false);

const [
error,
setError,
] = useState<string | null>(
null,
);

const [
data,
setData,
] =
useState<RegressionResponse | null>(
null,
);

useEffect(() => {
const key =
window.sessionStorage.getItem(
STORAGE_KEY,
);

setFounderReady(
  Boolean(key),
);

}, []);

async function runRegression() {
setRunning(true);
setError(null);
setData(null);

try {
  const accessKey =
    window.sessionStorage.getItem(
      STORAGE_KEY,
    );
  if (!accessKey) {
    throw new Error(
      "Founder Session not found. Open Founder Console first.",
    );
  }
  const response =
    await fetch(
      "/api/founder/market/risk-control/regression",
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization:
            `Bearer ${accessKey}`,
          "x-aios-founder-key":
            accessKey,
        },
      },
    );
  const payload =
    (await response.json()) as RegressionResponse;
  if (
    !response.ok &&
    !payload.code
  ) {
    throw new Error(
      `Regression request failed with HTTP ${response.status}.`,
    );
  }
  if (
    payload.code ===
    "FOUNDER_AUTH_REQUIRED"
  ) {
    throw new Error(
      "Founder authentication is required. Re-open Founder Console and retry.",
    );
  }
  setData(payload);
} catch (caught) {
  setError(
    caught instanceof Error
      ? caught.message
      : "Unknown regression error.",
  );
} finally {
  setRunning(false);
}

}

return (
<main
style={{
minHeight: “100vh”,
background: “#09090b”,
color: “#fff”,
padding:
“24px 16px 60px”,
fontFamily:
“system-ui, -apple-system, BlinkMacSystemFont, sans-serif”,
}}
>
<div
style={{
maxWidth: 960,
margin: “0 auto”,
}}
>
<div
style={{
opacity: 0.55,
fontSize: 12,
letterSpacing: 1.1,
fontWeight: 700,
}}
>
PRIVATE FOUNDER ACCESS
    <h1
      style={{
        margin:
          "8px 0 4px",
        fontSize: 28,
      }}
    >
      Market Risk Control Regression
    </h1>
    <p
      style={{
        marginTop: 0,
        opacity: 0.65,
        lineHeight: 1.6,
      }}
    >
      C147.17.1 · Structured Market
      Risk Control · Evidence
      Integrity · Invalidation ·
      Human Review
    </p>
    <Section title="Founder Session">
      <div
        style={{
          lineHeight: 1.8,
          fontSize: 13,
        }}
      >
        Session:{" "}
        <Status
          passed={
            founderReady
          }
        />
        <br />
        Authentication:{" "}
        {founderReady
          ? "Current Founder Console session will be reused."
          : "Founder session not detected. Open Founder Console first."}
      </div>
      <button
        onClick={
          runRegression
        }
        disabled={
          running ||
          !founderReady
        }
        style={{
          marginTop: 16,
          width: "100%",
          padding:
            "14px 16px",
          borderRadius: 10,
          border: "none",
          background:
            running ||
            !founderReady
              ? "#3f3f46"
              : "#fff",
          color:
            running ||
            !founderReady
              ? "#aaa"
              : "#09090b",
          fontWeight: 700,
          cursor:
            running
              ? "wait"
              : "pointer",
        }}
      >
        {running
          ? "Running Regression…"
          : "▶ Run C147.17.1 Regression"}
      </button>
    </Section>
    <Section title="Regression Scope">
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.8,
          opacity: 0.72,
        }}
      >
        1. Runtime execution
        <br />
        2. Risk schema integrity
        <br />
        3. Evidence metadata preservation
        <br />
        4. Safety boundary
        <br />
        5. Read-only runtime
        <br />
        6. Live market runtime
        <br />
        7. Invalidation → Human
        Review chain
      </div>
    </Section>
    {error && (
      <Section title="Error">
        <div
          style={{
            color: "#fca5a5",
            lineHeight: 1.6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      </Section>
    )}
    {data && (
      <>
        <Section title="Regression Summary">
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color:
                data.verified
                  ? "#86efac"
                  : "#fca5a5",
            }}
          >
            {data.verified
              ? "PASS"
              : "FAIL"}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              opacity: 0.72,
              lineHeight: 1.8,
            }}
          >
            Code:{" "}
            {data.code ??
              "UNKNOWN"}
            <br />
            Stage:{" "}
            {data.stage ??
              "C147.17.1"}
            <br />
            Passed:{" "}
            {data.passed ??
              0}
            {" · "}
            Failed:{" "}
            {data.failed ??
              0}
            <br />
            Runtime:{" "}
            {data.runtime
              ?.latencyMs ??
              0}
            {" ms"}
          </div>
        </Section>
        {data.checks &&
          data.checks.map(
            (
              check,
              index,
            ) => (
              <Section
                key={`${check.name}-${index}`}
                title={`${index + 1}. ${check.name}`}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color:
                      check.passed
                        ? "#86efac"
                        : "#fca5a5",
                  }}
                >
                  <Status
                    passed={
                      check.passed
                    }
                  />
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    lineHeight: 1.7,
                    opacity: 0.72,
                  }}
                >
                  {check.detail}
                </div>
              </Section>
            ),
          )}
        <Section title="Safety Boundary">
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            <div>
              Human review required:{" "}
              <strong>
                {data.humanReviewRequired
                  ? "YES"
                  : "NO"}
              </strong>
            </div>
            <div>
              Mutation performed:{" "}
              <strong>
                {data.mutationPerformed
                  ? "YES"
                  : "NO"}
              </strong>
            </div>
            <div>
              Planner dispatched:{" "}
              <strong>
                {data.plannerDispatched
                  ? "YES"
                  : "NO"}
              </strong>
            </div>
            <div>
              Trading executed:{" "}
              <strong>
                {data.tradingExecuted
                  ? "YES"
                  : "NO"}
              </strong>
            </div>
          </div>
        </Section>
        {data.runtime && (
          <Section title="Runtime">
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.8,
                opacity: 0.72,
              }}
            >
              Name:{" "}
              {data.runtime.name ??
                "market-risk-control-regression-runtime"}
              <br />
              Version:{" "}
              {data.runtime.version ??
                "C147.17.1"}
              <br />
              Generated:{" "}
              {data.runtime.generatedAt ??
                "N/A"}
              <br />
              Latency:{" "}
              {data.runtime.latencyMs ??
                0}
              {" ms"}
            </div>
          </Section>
        )}
        {data.principles &&
          data.principles.length >
            0 && (
            <Section title="Principles">
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.8,
                  opacity: 0.65,
                }}
              >
                {data.principles.map(
                  (
                    principle,
                    index,
                  ) => (
                    <div
                      key={`${index}-${principle}`}
                      style={{
                        marginBottom: 6,
                      }}
                    >
                      • {principle}
                    </div>
                  ),
                )}
              </div>
            </Section>
          )}
        {data.disclaimer && (
          <div
            style={{
              marginTop: 18,
              fontSize: 12,
              lineHeight: 1.7,
              opacity: 0.45,
            }}
          >
            {data.disclaimer}
          </div>
        )}
      </>
    )}
  </div>
</main>

);
}
