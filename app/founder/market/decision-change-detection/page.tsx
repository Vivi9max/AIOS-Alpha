“use client”;

import Link from “next/link”;

import {
useEffect,
useState,
} from “react”;

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
“aios-founder-access-key”;

function getFounderKey(): string {
if (
typeof window ===
“undefined”
) {
return “”;
}

return (
window.sessionStorage.getItem(
STORAGE_KEY,
) ?? “”
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
useState<
DetectionResult | null
>(null);

const [
error,
setError,
] =
useState<
string | null
>(null);

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
“100vh”,

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
              "block",
            textAlign:
              "center",
            padding:
              "13px 16px",
            borderRadius:
              9,
            background:
              "#f5f5f5",
            color:
              "#000",
            textDecoration:
              "none",
            fontWeight:
              700,
          }}
        >
          Enter Founder Console
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
            18,
          marginBottom:
            20,
        }}
      >
        <div
          style={{
            fontWeight:
              700,
            marginBottom:
              6,
          }}
        >
          Founder Session
        </div>
        <div
          style={{
            fontSize:
              14,
            opacity:
              0.7,
          }}
        >
          Status: READY
        </div>
        <div
          style={{
            fontSize:
              13,
            opacity:
              0.55,
            marginTop:
              6,
          }}
        >
          Existing Founder Console session
          will be used automatically.
        </div>
      </section>
    )}
    <button
      onClick={
        runDetection
      }
      disabled={
        running ||
        !sessionReady
      }
      style={{
        width:
          "100%",
        padding:
          "14px 18px",
        borderRadius:
          10,
        border:
          "1px solid #444",
        background:
          running ||
          !sessionReady
            ? "#222"
            : "#f5f5f5",
        color:
          running ||
          !sessionReady
            ? "#777"
            : "#000",
        cursor:
          running ||
          !sessionReady
            ? "not-allowed"
            : "pointer",
        fontWeight:
          700,
      }}
    >
      {running
        ? "Running C147.12..."
        : "▶ Run C147.12 Change Detection"}
    </button>
    {error && (
      <section
        style={{
          marginTop:
            20,
          border:
            "1px solid #633",
          borderRadius:
            12,
          padding:
            18,
          background:
            "#160909",
        }}
      >
        <strong>
          Detection Error
        </strong>
        <div
          style={{
            marginTop:
              8,
            lineHeight:
              1.6,
          }}
        >
          {error}
        </div>
        {!sessionReady && (
          <Link
            href="/founder"
            style={{
              display:
                "inline-block",
              marginTop:
                14,
              color:
                "#fff",
              textDecoration:
                "underline",
            }}
          >
            Return to Founder Console
          </Link>
        )}
      </section>
    )}
    {result && (
      <section
        style={{
          marginTop:
            24,
        }}
      >
        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap:
              10,
            marginBottom:
              20,
          }}
        >
          {[
            [
              "Status",
              result.success
                ? "PASS"
                : "PARTIAL",
            ],
            [
              "Changed",
              result.changedCount,
            ],
            [
              "Reassessment",
              result.reassessmentRequiredCount,
            ],
            [
              "Runtime",
              `${result.runtime.latencyMs}ms`,
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <div
                key={
                  label
                }
                style={{
                  border:
                    "1px solid #252525",
                  borderRadius:
                    10,
                  padding:
                    14,
                }}
              >
                <div
                  style={{
                    fontSize:
                      11,
                    opacity:
                      0.5,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    marginTop:
                      6,
                    fontWeight:
                      700,
                  }}
                >
                  {value}
                </div>
              </div>
            ),
          )}
        </div>
        <div
          style={{
            opacity:
              0.6,
            fontSize:
              13,
            marginBottom:
              18,
          }}
        >
          {result.code}
          {" · "}
          Read-only detection
          {" · "}
          Mutation:
          {" "}
          {result.mutationPerformed
            ? "YES"
            : "NO"}
        </div>
        {result.items.map(
          (
            item,
          ) => (
            <article
              key={`${item.market}:${item.symbol}`}
              style={{
                border:
                  "1px solid #252525",
                borderRadius:
                  12,
                padding:
                  18,
                marginBottom:
                  14,
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
                }}
              >
                <strong>
                  {item.market.toUpperCase()}
                  {" "}
                  {item.symbol}
                </strong>
                <span
                  style={{
                    fontWeight:
                      700,
                  }}
                >
                  {item.action}
                </span>
              </div>
              <div
                style={{
                  fontSize:
                    13,
                  opacity:
                    0.65,
                  marginTop:
                    10,
                  lineHeight:
                    1.6,
                }}
              >
                Observation changed:
                {" "}
                {item.observationChanged
                  ? "YES"
                  : "NO"}
                <br />
                Material change:
                {" "}
                {item.materialChange
                  ? "YES"
                  : "NO"}
                <br />
                Version:
                {" "}
                {item.previousVersion}
                {" → "}
                {item.currentVersion}
              </div>
            </article>
          ),
        )}
      </section>
    )}
  </div>
</main>

);
}
