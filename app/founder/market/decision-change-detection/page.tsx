"use client";
import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
type DetectionItem = {
  symbol: string;
  market: string;
  action: string;
  observationChanged: boolean;
  materialChange: boolean;
  previousVersion: number;
  currentVersion: number;
};
type DetectionResult = {
  success: boolean;
  code: string;
  universeSize: number;
  evaluatedCount: number;
  changedCount: number;
  reassessmentRequiredCount: number;
  noMaterialChangeCount: number;
  noHistoryCount: number;
  blockedCount: number;
  mutationPerformed: boolean;
  items: DetectionItem[];
  runtime: {
    latencyMs: number;
  };
};
const STORAGE_KEY =
  "aios-founder-access-key";
function getFounderKey(): string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }
  return (
    window.sessionStorage.getItem(
      STORAGE_KEY,
    ) ?? ""
  );
}
export default function MarketDecisionChangeDetectionPage() {
  const [
    sessionReady,
    setSessionReady,
  ] = useState(false);
  const [
    running,
    setRunning,
  ] = useState(false);
  const [
    result,
    setResult,
  ] =
    useState<DetectionResult | null>(
      null,
    );
  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );
  useEffect(() => {
    setSessionReady(
      Boolean(
        getFounderKey(),
      ),
    );
  }, []);
  async function runDetection() {
    const key =
      getFounderKey();
    if (!key) {
      setSessionReady(false);
      setError(
        "Founder Session is required. Enter the Founder Console first.",
      );
      return;
    }
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const response =
        await fetch(
          "/api/founder/market/decision-change-detection",
          {
            method: "POST",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${key}`,
            },
            body:
              JSON.stringify({
                universe: [
                  {
                    symbol:
                      "0700",
                    market:
                      "hk",
                  },
                  {
                    symbol:
                      "9988",
                    market:
                      "hk",
                  },
                  {
                    symbol:
                      "NVDA",
                    market:
                      "us",
                  },
                  {
                    symbol:
                      "600519",
                    market:
                      "cn",
                  },
                ],
                includeExcluded:
                  true,
                includeInsufficientData:
                  true,
              }),
          },
        );
      const payload =
        await response.json();
      if (
        response.status ===
          401 ||
        payload?.code ===
          "FOUNDER_AUTH_REQUIRED"
      ) {
        window.sessionStorage.removeItem(
          STORAGE_KEY,
        );
        setSessionReady(false);
        throw new Error(
          "Founder Session expired. Please enter the Founder Console again.",
        );
      }
      if (
        !response.ok
      ) {
        throw new Error(
          payload?.error ??
            payload?.code ??
            `Change detection failed with HTTP ${response.status}.`,
        );
      }
      setResult(
        payload,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Change detection failed.",
      );
    } finally {
      setRunning(false);
    }
  }
  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#050505",
        color:
          "#f5f5f5",
        padding:
          "32px 20px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            900,
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            fontSize:
              12,
            letterSpacing:
              1.5,
            opacity:
              0.6,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>
        <h1
          style={{
            margin:
              "10px 0 6px",
            fontSize:
              28,
          }}
        >
          Market Decision Change Detection
        </h1>
        <div
          style={{
            opacity:
              0.65,
            marginBottom:
              24,
          }}
        >
          C147.12 · Observation → Fingerprint →
          Compare → Reassessment Detection
        </div>
        {!sessionReady && (
          <section
            style={{
              border:
                "1px solid #4a3d20",
              borderRadius:
                12,
              padding:
                20,
              marginBottom:
                20,
              background:
                "#151108",
            }}
          >
            <div
              style={{
                fontWeight:
                  700,
                fontSize:
                  17,
                marginBottom:
                  8,
              }}
            >
              Founder Session Required
            </div>
            <div
              style={{
                fontSize:
                  14,
                opacity:
                  0.7,
                lineHeight:
                  1.6,
                marginBottom:
                  16,
              }}
            >
              C147.12 is protected by the existing
              Founder authentication boundary.
              No Access Key is displayed here.
            </div>
            <Link
              href="/founder"
              style={{
                display:
                  "inline-block",
                padding:
                  "10px 14px",
                borderRadius:
                  8,
                background:
                  "#ffffff",
                color:
                  "#000000",
                textDecoration:
                  "none",
                fontWeight:
                  700,
              }}
            >
              Open Founder Console
            </Link>
          </section>
        )}
        {sessionReady && (
          <section
            style={{
              border:
                "1px solid #252525",
              borderRadius:
                12,
              padding:
                20,
              marginBottom:
                20,
              background:
                "#0d0d0d",
            }}
          >
            <div
              style={{
                fontSize:
                  14,
                opacity:
                  0.7,
                lineHeight:
                  1.6,
                marginBottom:
                  16,
              }}
            >
              Reads the latest persisted observation,
              generates the current decision record,
              compares fingerprints, and invokes
              reassessment only when an observation changed.
            </div>
            <button
              type="button"
              onClick={
                runDetection
              }
              disabled={
                running
              }
              style={{
                border:
                  "1px solid #444",
                borderRadius:
                  8,
                padding:
                  "12px 16px",
                background:
                  running
                    ? "#222"
                    : "#f5f5f5",
                color:
                  running
                    ? "#aaa"
                    : "#050505",
                fontWeight:
                  700,
                cursor:
                  running
                    ? "wait"
                    : "pointer",
              }}
            >
              {running
                ? "Running C147.12..."
                : "Run C147.12 Change Detection"}
            </button>
          </section>
        )}
        {error && (
          <section
            style={{
              border:
                "1px solid #5a2525",
              borderRadius:
                12,
              padding:
                16,
              marginBottom:
                20,
              background:
                "#170909",
              color:
                "#ffb0b0",
            }}
          >
            {error}
          </section>
        )}
        {result && (
          <>
            <section
              style={{
                border:
                  "1px solid #252525",
                borderRadius:
                  12,
                padding:
                  20,
                marginBottom:
                  20,
                background:
                  "#0d0d0d",
              }}
            >
              <div
                style={{
                  fontSize:
                    13,
                  opacity:
                    0.6,
                  marginBottom:
                    8,
                }}
              >
                STATUS
              </div>
              <div
                style={{
                  fontSize:
                    24,
                  fontWeight:
                    800,
                  marginBottom:
                    16,
                }}
              >
                {result.success
                  ? "PASS"
                  : "INSUFFICIENT"}
              </div>
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap:
                    12,
                  fontSize:
                    14,
                }}
              >
                <Metric
                  label="Universe"
                  value={
                    result.universeSize
                  }
                />
                <Metric
                  label="Evaluated"
                  value={
                    result.evaluatedCount
                  }
                />
                <Metric
                  label="Changed"
                  value={
                    result.changedCount
                  }
                />
                <Metric
                  label="Reassessment Required"
                  value={
                    result.reassessmentRequiredCount
                  }
                />
                <Metric
                  label="No Material Change"
                  value={
                    result.noMaterialChangeCount
                  }
                />
                <Metric
                  label="No History"
                  value={
                    result.noHistoryCount
                  }
                />
                <Metric
                  label="Blocked"
                  value={
                    result.blockedCount
                  }
                />
                <Metric
                  label="Latency"
                  value={`${result.runtime.latencyMs} ms`}
                />
              </div>
            </section>
            <section
              style={{
                border:
                  "1px solid #252525",
                borderRadius:
                  12,
                padding:
                  20,
                marginBottom:
                  20,
                background:
                  "#0d0d0d",
              }}
            >
              <div
                style={{
                  fontSize:
                    13,
                  opacity:
                    0.6,
                  marginBottom:
                    12,
                }}
              >
                MUTATION SAFETY
              </div>
              <div
                style={{
                  fontSize:
                    18,
                  fontWeight:
                    800,
                  marginBottom:
                    8,
                }}
              >
                Mutation: NO
              </div>
              <div
                style={{
                  fontSize:
                    14,
                  opacity:
                    0.7,
                  lineHeight:
                    1.6,
                }}
              >
                C147.12 is strictly read-only.
                Explicit history mutation remains
                isolated in C147.11.
              </div>
            </section>
            <section
              style={{
                display:
                  "grid",
                gap:
                  12,
              }}
            >
              {result.items.map(
                (item) => (
                  <article
                    key={`${item.market}-${item.symbol}`}
                    style={{
                      border:
                        "1px solid #252525",
                      borderRadius:
                        12,
                      padding:
                        18,
                      background:
                        "#0d0d0d",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          12,
                        flexWrap:
                          "wrap",
                        marginBottom:
                          10,
                      }}
                    >
                      <strong>
                        {item.market.toUpperCase()}
                        {" "}
                        {item.symbol}
                      </strong>
                      <span
                        style={{
                          fontSize:
                            12,
                          padding:
                            "5px 8px",
                          border:
                            "1px solid #333",
                          borderRadius:
                            6,
                        }}
                      >
                        {item.action}
                      </span>
                    </div>
                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap:
                          8,
                        fontSize:
                          13,
                        opacity:
                          0.75,
                      }}
                    >
                      <div>
                        Observation Changed:{" "}
                        {item.observationChanged
                          ? "YES"
                          : "NO"}
                      </div>
                      <div>
                        Material Change:{" "}
                        {item.materialChange
                          ? "YES"
                          : "NO"}
                      </div>
                      <div>
                        Previous Version:{" "}
                        {item.previousVersion}
                      </div>
                      <div>
                        Current Version:{" "}
                        {item.currentVersion}
                      </div>
                    </div>
                  </article>
                ),
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        border:
          "1px solid #242424",
        borderRadius:
          8,
        padding:
          12,
        background:
          "#111111",
      }}
    >
      <div
        style={{
          fontSize:
            11,
          opacity:
            0.55,
          marginBottom:
            5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize:
            17,
          fontWeight:
            700,
        }}
      >
        {value}
      </div>
    </div>
  );
}
