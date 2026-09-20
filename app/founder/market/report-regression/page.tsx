"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

interface RegressionCheck {
  name: string;
  passed: boolean;
  detail: string;
}

interface RegressionResult {
  name: string;
  passed: boolean;
  code: string;
  checks: RegressionCheck[];
  universeSize: number;
  evaluatedCount: number;
  candidateCount: number;
  excludedCount: number;
  insufficientDataCount: number;
  totalSources: number;
  verifiedCount: number;
  knownTimestampCount: number;
  latencyMs: number;
  error?: string;
}

interface RegressionResponse {
  success: boolean;
  code: string;
  stage: string;
  verified: boolean;
  passed: number;
  failed: number;
  total: number;
  verificationMode: string;
  latencyMs: number;
  results: RegressionResult[];
  principle: string;
  disclaimer: string;
}

function CaseCard({
  result,
}: {
  result: RegressionResult;
}) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 15,
        borderRadius: 12,
        border:
          "1px solid rgba(255,255,255,0.10)",
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
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
        <strong>
          {result.name}
        </strong>

        <strong
          style={{
            color:
              result.passed
                ? "#86efac"
                : "#fca5a5",
          }}
        >
          {result.passed
            ? "PASS"
            : "FAIL"}
        </strong>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.8,
          opacity: 0.75,
        }}
      >
        Code:
        {" "}
        {result.code}

        <br />

        Universe:
        {" "}
        {result.universeSize}
        {" · Evaluated: "}
        {result.evaluatedCount}

        <br />

        Candidates:
        {" "}
        {result.candidateCount}
        {" · Excluded: "}
        {result.excludedCount}
        {" · Insufficient: "}
        {result.insufficientDataCount}

        <br />

        Evidence:
        {" "}
        {result.totalSources}
        {" · Verified: "}
        {result.verifiedCount}

        <br />

        Timestamped:
        {" "}
        {result.knownTimestampCount}

        <br />

        Latency:
        {" "}
        {result.latencyMs}
        {" ms"}
      </div>

      <div
        style={{
          marginTop: 12,
        }}
      >
        {result.checks.map(
          (
            item,
            index,
          ) => (
            <div
              key={`${item.name}-${index}`}
              style={{
                padding:
                  "7px 0",
                borderTop:
                  "1px solid rgba(255,255,255,0.06)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <strong
                style={{
                  color:
                    item.passed
                      ? "#86efac"
                      : "#fca5a5",
                }}
              >
                {item.passed
                  ? "✓"
                  : "✕"}{" "}
                {item.name}
              </strong>

              <div
                style={{
                  opacity:
                    0.65,
                  marginTop:
                    2,
                }}
              >
                {item.detail}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export default function MarketReportRegressionPage() {
  const [
    founderReady,
    setFounderReady,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    response,
    setResponse,
  ] =
    useState<RegressionResponse | null>(
      null,
    );

  const [
    error,
    setError,
  ] = useState("");

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
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const key =
        window.sessionStorage.getItem(
          STORAGE_KEY,
        );

      if (!key) {
        throw new Error(
          "Founder Session not found. Open Founder Console first.",
        );
      }

      const result =
        await fetch(
          "/api/founder/market/report-regression",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${key}`,

              "x-aios-founder-key":
                key,
            },
          },
        );

      const data =
        (await result.json()) as RegressionResponse;

      setResponse(
        data,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "C147.3.2 regression failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#09090b",

        color:
          "#fff",

        padding:
          "24px 16px 60px",

        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            960,

          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            opacity:
              0.55,

            fontSize:
              12,

            letterSpacing:
              1,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            margin:
              "8px 0 4px",

            fontSize:
              28,
          }}
        >
          Market Research Report Regression
        </h1>

        <p
          style={{
            marginTop:
              0,

            opacity:
              0.65,

            lineHeight:
              1.6,
          }}
        >
          C147.3.2.1 · Report structure ·
          evidence propagation · exclusion
          propagation · insufficient-data
          propagation · human decision gate
        </p>

        <section
          style={{
            marginTop:
              18,

            padding:
              16,

            borderRadius:
              14,

            border:
              "1px solid rgba(255,255,255,0.10)",

            background:
              "rgba(255,255,255,0.035)",
          }}
        >
          <div
            style={{
              lineHeight:
                1.8,
              fontSize:
                13,
            }}
          >
            Founder Session:
            {" "}
            <strong
              style={{
                color:
                  founderReady
                    ? "#86efac"
                    : "#fca5a5",
              }}
            >
              {founderReady
                ? "PASS"
                : "NOT DETECTED"}
            </strong>

            <br />

            Authentication:
            {" "}
            {founderReady
              ? "Current Founder Console session will be reused."
              : "Open Founder Console first."}
          </div>

          <button
            onClick={
              runRegression
            }
            disabled={
              loading ||
              !founderReady
            }
            style={{
              marginTop:
                14,

              width:
                "100%",

              padding:
                "14px 16px",

              borderRadius:
                10,

              border:
                "none",

              background:
                loading ||
                !founderReady
                  ? "#3f3f46"
                  : "#fff",

              color:
                loading ||
                !founderReady
                  ? "#aaa"
                  : "#09090b",

              fontWeight:
                700,

              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "Running Regression…"
              : "▶ Run C147.3.2.1 Regression"}
          </button>
        </section>

        {error && (
          <section
            style={{
              marginTop:
                18,

              padding:
                16,

              borderRadius:
                14,

              border:
                "1px solid rgba(255,255,255,0.10)",

              background:
                "rgba(255,255,255,0.035)",

              color:
                "#fca5a5",
            }}
          >
            {error}
          </section>
        )}

        {response && (
          <>
            <section
              style={{
                marginTop:
                  18,

                padding:
                  16,

                borderRadius:
                  14,

                border:
                  "1px solid rgba(255,255,255,0.10)",

                background:
                  "rgba(255,255,255,0.035)",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 12px",
                  fontSize:
                    18,
                }}
              >
                Regression Summary
              </h2>

              <div
                style={{
                  fontSize:
                    18,

                  fontWeight:
                    700,

                  color:
                    response.verified
                      ? "#86efac"
                      : "#fca5a5",
                }}
              >
                {response.code}
              </div>

              <div
                style={{
                  marginTop:
                    10,

                  lineHeight:
                    1.8,

                  fontSize:
                    13,

                  opacity:
                    0.75,
                }}
              >
                Passed:
                {" "}
                {response.passed}

                {" · Failed: "}
                {response.failed}

                {" · Total: "}
                {response.total}

                <br />

                Stage:
                {" "}
                {response.stage}

                <br />

                Mode:
                {" "}
                {response.verificationMode}

                <br />

                Runtime:
                {" "}
                {response.latencyMs}
                {" ms"}
              </div>
            </section>

            {response.results.map(
              (result) => (
                <CaseCard
                  key={
                    result.name
                  }
                  result={
                    result
                  }
                />
              ),
            )}

            <section
              style={{
                marginTop:
                  18,

                padding:
                  16,

                borderRadius:
                  14,

                border:
                  "1px solid rgba(255,255,255,0.10)",

                background:
                  "rgba(255,255,255,0.035)",

                fontSize:
                  12,

                lineHeight:
                  1.7,

                opacity:
                  0.65,
              }}
            >
              {response.principle}

              <br />
              <br />

              {response.disclaimer}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
