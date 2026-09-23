"use client";
import {
  useState,
} from "react";
export default function MarketHumanReviewHistoryRegressionPage() {
  const [
    running,
    setRunning,
  ] = useState(false);
  const [
    result,
    setResult,
  ] = useState<unknown>(
    null,
  );
  async function runRegression() {
    setRunning(true);
    setResult(null);
    try {
      const key =
        window.sessionStorage.getItem(
          "aios-founder-access-key",
        );
      const response =
        await fetch(
          "/api/founder/market/human-review-history-regression",
          {
            method:
              "GET",
            headers:
              key
                ? {
                    Authorization:
                      `Bearer ${key}`,
                  }
                : {},
            cache:
              "no-store",
          },
        );
      const data =
        await response.json();
      setResult(
        data,
      );
    } catch (error) {
      setResult({
        success:
          false,
        error:
          error instanceof Error
            ? error.message
            : "Regression request failed.",
      });
    } finally {
      setRunning(false);
    }
  }
  const data =
    result as
      | {
          success?: boolean;
          code?: string;
          stage?: string;
          mode?: string;
          passed?: number;
          failed?: number;
          total?: number;
          runtimeMs?: number;
          cases?: Array<{
            name: string;
            passed: boolean;
            checks: Array<{
              name: string;
              passed: boolean;
              detail: string;
            }>;
            latencyMs: number;
          }>;
          safetyBoundary?: string;
          error?: string;
        }
      | null;
  return (
    <main
      style={{
        minHeight:
          "100vh",
        padding:
          "32px 20px",
        background:
          "#0b0d10",
        color:
          "#f5f7fa",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
            marginBottom:
              28,
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
              marginBottom:
                8,
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>
          <h1
            style={{
              margin:
                0,
              fontSize:
                28,
            }}
          >
            C147.16 Human Review History Regression
          </h1>
          <p
            style={{
              marginTop:
                10,
              opacity:
                0.7,
              lineHeight:
                1.6,
            }}
          >
            C147.16.1 · Persistent History → Filtering → Read-Only Integrity
          </p>
        </div>
        <div
          style={{
            border:
              "1px solid #252a31",
            borderRadius:
              14,
            padding:
              20,
            marginBottom:
              20,
            background:
              "#11151a",
          }}
        >
          <div
            style={{
              fontSize:
                14,
              lineHeight:
                1.7,
              opacity:
                0.8,
            }}
          >
            This regression creates temporary Founder-only
            human-review records, verifies the C147.16
            read-only audit layer, then removes the temporary
            regression records.
          </div>
          <button
            type="button"
            onClick={
              runRegression
            }
            disabled={
              running
            }
            style={{
              marginTop:
                18,
              padding:
                "12px 18px",
              borderRadius:
                10,
              border:
                "1px solid #3a424d",
              background:
                running
                  ? "#20252c"
                  : "#f5f7fa",
              color:
                running
                  ? "#9aa3ad"
                  : "#0b0d10",
              cursor:
                running
                  ? "wait"
                  : "pointer",
              fontWeight:
                700,
            }}
          >
            {running
              ? "Running C147.16.1..."
              : "▶ Run C147.16.1 Regression"}
          </button>
        </div>
        {data && (
          <div
            style={{
              border:
                "1px solid #252a31",
              borderRadius:
                14,
              padding:
                20,
              background:
                "#11151a",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap:
                  12,
                marginBottom:
                  20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      12,
                    opacity:
                      0.55,
                  }}
                >
                  Status
                </div>
                <div
                  style={{
                    fontSize:
                      22,
                    fontWeight:
                      800,
                    marginTop:
                      4,
                  }}
                >
                  {data.success
                    ? "PASS"
                    : "FAILED"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize:
                      12,
                    opacity:
                      0.55,
                  }}
                >
                  Passed
                </div>
                <div
                  style={{
                    fontSize:
                      22,
                    fontWeight:
                      800,
                    marginTop:
                      4,
                  }}
                >
                  {data.passed ??
                    0}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize:
                      12,
                    opacity:
                      0.55,
                  }}
                >
                  Failed
                </div>
                <div
                  style={{
                    fontSize:
                      22,
                    fontWeight:
                      800,
                    marginTop:
                      4,
                  }}
                >
                  {data.failed ??
                    0}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize:
                      12,
                    opacity:
                      0.55,
                  }}
                >
                  Runtime
                </div>
                <div
                  style={{
                    fontSize:
                      22,
                    fontWeight:
                      800,
                    marginTop:
                      4,
                  }}
                >
                  {data.runtimeMs ??
                    0}
                  ms
                </div>
              </div>
            </div>
            <div
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize:
                  13,
                marginBottom:
                  20,
                opacity:
                  0.8,
              }}
            >
              {data.code ??
                data.error ??
                "No result"}
            </div>
            {data.cases?.map(
              (
                item,
              ) => (
                <section
                  key={
                    item.name
                  }
                  style={{
                    borderTop:
                      "1px solid #252a31",
                    padding:
                      "18px 0",
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
                      marginBottom:
                        12,
                    }}
                  >
                    <strong>
                      {item.name}
                    </strong>
                    <span>
                      {item.passed
                        ? "PASS"
                        : "FAIL"}
                    </span>
                  </div>
                  {item.checks.map(
                    (
                      check,
                    ) => (
                      <div
                        key={
                          check.name
                        }
                        style={{
                          padding:
                            "8px 0",
                          borderTop:
                            "1px solid #1d2228",
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              700,
                            fontSize:
                              13,
                          }}
                        >
                          {check.passed
                            ? "✓"
                            : "✗"}{" "}
                          {check.name}
                        </div>
                        <div
                          style={{
                            marginTop:
                              4,
                            fontSize:
                              12,
                            lineHeight:
                              1.5,
                            opacity:
                              0.65,
                          }}
                        >
                          {
                            check.detail
                          }
                        </div>
                      </div>
                    ),
                  )}
                </section>
              ),
            )}
            {data.safetyBoundary && (
              <div
                style={{
                  marginTop:
                    18,
                  padding:
                    14,
                  borderRadius:
                    10,
                  background:
                    "#171b20",
                  fontSize:
                    12,
                  lineHeight:
                    1.6,
                  opacity:
                    0.7,
                }}
              >
                {data.safetyBoundary}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
