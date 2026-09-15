"use client";
import { useState } from "react";
type CheckResult = {
  name: string;
  passed: boolean;
  detail: string;
};
type VerificationResult = {
  success?: boolean;
  code?: string;
  verification?: string;
  status?: string;
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    latencyMs?: number;
  };
  objective?: {
    id?: string;
    title?: string;
    currency?: string;
    reused?: boolean;
  };
  pipeline?: string[];
  web?: {
    success?: boolean;
    verified?: boolean;
    evidenceCount?: number;
    sourceCount?: number;
    independentHosts?: number;
  } | null;
  decision?: {
    success?: boolean;
    verified?: boolean;
    priority?: string;
    actionCount?: number;
    conclusion?: string;
    nextStep?: string;
  } | null;
  executionPlan?: {
    success?: boolean;
    status?: string;
    stepCount?: number;
    evidenceCount?: number;
    verified?: boolean;
  } | null;
  actionPackage?: {
    success?: boolean;
    status?: string;
    actionType?: string;
    title?: string;
    primaryAction?: string;
    measurableTarget?: string;
    successSignal?: string;
    executionChannels?: string[];
    externalSideEffectRequired?: boolean;
    externalSideEffectExecuted?: boolean;
    verified?: boolean;
  } | null;
  checks?: CheckResult[];
  integrity?: {
    fabricatedActuals?: boolean;
    verifiedResultGate?: boolean;
  };
  capabilityTrace?: string[];
  error?: string;
};
function readError(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return "Verification request failed.";
}
export default function FounderCommercialActionVerification() {
  const [accessKey, setAccessKey] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] =
    useState<VerificationResult | null>(null);
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
      const response = await fetch(
        "/api/founder/live-commercial-action-verification",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${key}`,
          },
        },
      );
      const data =
        (await response.json()) as VerificationResult;
      if (!response.ok || data.success !== true) {
        setResult(data);
        if (response.status === 401) {
          setError(
            "Founder / Alpha authorization failed. Please verify the current Founder Access Key.",
          );
        } else if (data.error) {
          setError(data.error);
        } else if (data.code) {
          setError(
            `Verification did not pass: ${data.code}`,
          );
        } else {
          setError(readError(data));
        }
        return;
      }
      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach the verification endpoint.",
      );
    } finally {
      setRunning(false);
    }
  };
  const checks = result?.checks ?? [];
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f8",
        padding: "20px 14px 40px",
        color: "#111827",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "4px 9px",
              border: "1px solid #dc2626",
              borderRadius: 5,
              color: "#dc2626",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            FOUNDER ONLY
          </div>
          <h1
            style={{
              margin: "0 0 6px",
              fontSize: 22,
              lineHeight: 1.3,
              fontWeight: 800,
            }}
          >
            C143.33.1 Live Commercial Action
          </h1>
          <p
            style={{
              margin: "0 0 18px",
              color: "#6b7280",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Production verification of the AIOS pipeline from
            live external intelligence to a concrete commercial
            action package.
          </p>
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 14,
              marginBottom: 18,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <strong>Pipeline</strong>
            <br />
            Live Web Intelligence → Verified Evidence →
            Live Decision → Commercial Execution Plan →
            Live Commercial Action Package
            <br />
            <br />
            <strong>Execution boundary</strong>
            <br />
            AIOS generates the action package.
            External side effects remain blocked until a
            real execution integration is explicitly added.
          </div>
          <label
            htmlFor="founder-access-key"
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Founder Access Key
          </label>
          <input
            id="founder-access-key"
            type="password"
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
            placeholder="Enter Founder Access Key"
            autoComplete="off"
            disabled={running}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 13px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#ffffff",
              color: "#111827",
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
              border: "none",
              borderRadius: 8,
              background: running
                ? "#6b7280"
                : "#111827",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 800,
              cursor: running
                ? "not-allowed"
                : "pointer",
            }}
          >
            {running
              ? "Running C143.33.1..."
              : "Run C143.33.1 Verification"}
          </button>
          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}
        </section>
        {result && (
          <>
            <section
              style={{
                marginTop: 14,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    VERIFICATION STATUS
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {result.status ?? "UNKNOWN"}
                  </div>
                </div>
                <div
                  style={{
                    padding: "7px 10px",
                    borderRadius: 7,
                    background:
                      result.success === true
                        ? "#ecfdf5"
                        : "#fef2f2",
                    color:
                      result.success === true
                        ? "#047857"
                        : "#b91c1c",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {result.success === true
                    ? "PASS"
                    : "FAILED"}
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                <Metric
                  label="Passed"
                  value={String(
                    result.summary?.passed ?? 0,
                  )}
                />
                <Metric
                  label="Failed"
                  value={String(
                    result.summary?.failed ?? 0,
                  )}
                />
                <Metric
                  label="Latency"
                  value={`${result.summary?.latencyMs ?? 0} ms`}
                />
                <Metric
                  label="Code"
                  value={result.code ?? "-"}
                />
              </div>
            </section>
            <section
              style={{
                marginTop: 14,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 18,
              }}
            >
              <SectionTitle title="Verification Checks" />
              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {checks.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 9,
                      padding: 11,
                      background: item.passed
                        ? "#f9fffc"
                        : "#fffafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: item.passed
                            ? "#047857"
                            : "#b91c1c",
                        }}
                      >
                        {item.passed
                          ? "PASS"
                          : "FAIL"}
                      </span>
                      <strong
                        style={{
                          fontSize: 12,
                        }}
                      >
                        {item.name}
                      </strong>
                    </div>
                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                        color: "#6b7280",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            {result.web && (
              <section
                style={{
                  marginTop: 14,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <SectionTitle title="Live Web Intelligence" />
                <InfoRow
                  label="Verified"
                  value={
                    result.web.verified
                      ? "YES"
                      : "NO"
                  }
                />
                <InfoRow
                  label="Evidence"
                  value={String(
                    result.web.evidenceCount ?? 0,
                  )}
                />
                <InfoRow
                  label="Sources"
                  value={String(
                    result.web.sourceCount ?? 0,
                  )}
                />
                <InfoRow
                  label="Independent Hosts"
                  value={String(
                    result.web.independentHosts ?? 0,
                  )}
                />
              </section>
            )}
            {result.decision && (
              <section
                style={{
                  marginTop: 14,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <SectionTitle title="Live Decision" />
                <InfoRow
                  label="Verified"
                  value={
                    result.decision.verified
                      ? "YES"
                      : "NO"
                  }
                />
                <InfoRow
                  label="Priority"
                  value={
                    result.decision.priority ?? "-"
                  }
                />
                <InfoRow
                  label="Recommended Actions"
                  value={String(
                    result.decision.actionCount ?? 0,
                  )}
                />
                <TextBlock
                  label="Conclusion"
                  value={
                    result.decision.conclusion ?? "-"
                  }
                />
                <TextBlock
                  label="Next Step"
                  value={
                    result.decision.nextStep ?? "-"
                  }
                />
              </section>
            )}
            {result.executionPlan && (
              <section
                style={{
                  marginTop: 14,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <SectionTitle title="Commercial Execution Plan" />
                <InfoRow
                  label="Status"
                  value={
                    result.executionPlan.status ?? "-"
                  }
                />
                <InfoRow
                  label="Verified"
                  value={
                    result.executionPlan.verified
                      ? "YES"
                      : "NO"
                  }
                />
                <InfoRow
                  label="Steps"
                  value={String(
                    result.executionPlan.stepCount ?? 0,
                  )}
                />
                <InfoRow
                  label="Evidence"
                  value={String(
                    result.executionPlan.evidenceCount ?? 0,
                  )}
                />
              </section>
            )}
            {result.actionPackage && (
              <section
                style={{
                  marginTop: 14,
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <SectionTitle title="Live Commercial Action Package" />
                <div
                  style={{
                    padding: 12,
                    marginBottom: 14,
                    borderRadius: 9,
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#92400e",
                      letterSpacing: "0.06em",
                    }}
                  >
                    EXECUTION BOUNDARY
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#78350f",
                    }}
                  >
                    {result.actionPackage.status ??
                      "manual-execution-required"}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "#92400e",
                    }}
                  >
                    AIOS has generated the action package,
                    but has not executed the external
                    side effect.
                  </div>
                </div>
                <InfoRow
                  label="Action Type"
                  value={
                    result.actionPackage.actionType ??
                    "-"
                  }
                />
                <InfoRow
                  label="Verified"
                  value={
                    result.actionPackage.verified
                      ? "YES"
                      : "NO"
                  }
                />
                <TextBlock
                  label="Action"
                  value={
                    result.actionPackage.primaryAction ??
                    "-"
                  }
                />
                <TextBlock
                  label="Measurable Target"
                  value={
                    result.actionPackage
                      .measurableTarget ?? "-"
                  }
                />
                <TextBlock
                  label="Success Signal"
                  value={
                    result.actionPackage
                      .successSignal ?? "-"
                  }
                />
                <TextBlock
                  label="Execution Channels"
                  value={
                    result.actionPackage.executionChannels
                      ?.join(", ") ?? "-"
                  }
                />
                <InfoRow
                  label="External Side Effect Required"
                  value={
                    result.actionPackage
                      .externalSideEffectRequired
                      ? "YES"
                      : "NO"
                  }
                />
                <InfoRow
                  label="External Side Effect Executed"
                  value={
                    result.actionPackage
                      .externalSideEffectExecuted
                      ? "YES"
                      : "NO"
                  }
                />
              </section>
            )}
            <section
              style={{
                marginTop: 14,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 18,
              }}
            >
              <SectionTitle title="Integrity" />
              <InfoRow
                label="Fabricated Actuals"
                value={
                  result.integrity?.fabricatedActuals
                    ? "YES"
                    : "NO"
                }
              />
              <InfoRow
                label="Verified Result Gate"
                value={
                  result.integrity
                    ?.verifiedResultGate
                    ? "ACTIVE"
                    : "NOT ACTIVE"
                }
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <h2
      style={{
        margin: "0 0 14px",
        fontSize: 15,
        fontWeight: 800,
      }}
    >
      {title}
    </h2>
  );
}
function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          fontWeight: 800,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 14,
        padding: "8px 0",
        borderBottom: "1px solid #f3f4f6",
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: "#6b7280",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <strong
        style={{
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}
function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        marginTop: 12,
      }}
    >
      <div
        style={{
          marginBottom: 5,
          fontSize: 11,
          color: "#6b7280",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: 10,
          borderRadius: 8,
          background: "#f9fafb",
          border: "1px solid #f3f4f6",
          fontSize: 12,
          lineHeight: 1.55,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
