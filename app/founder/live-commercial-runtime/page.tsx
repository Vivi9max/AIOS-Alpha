"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type VerificationCheck = {
  name: string;
  pass: boolean;
  detail: string;
  latencyMs: number;
};

type CommercialResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  stage?: string;
  runtime?: string;
  runtimeVersion?: string;
  pipeline?: string;
  timestamp?: number;
  latencyMs?: number;

  checks?: VerificationCheck[];

  summary?: {
    passed?: number;
    total?: number;
    failed?: number;
  };

  web?: {
    runtimeRouteVerified?: boolean;
    fullResultVerified?: boolean;
    sourceCount?: number;
    sourceHosts?: string[];
    evidenceCount?: number;
  };

  objective?: {
    id?: string;
    title?: string;
    currency?: string;
    stage?: string;
    status?: string;
  };

  decision?: {
    success?: boolean;
    priority?: string;
    conclusion?: string;
    nextStep?: string;
    evidenceCount?: number;
    verified?: boolean;
  };

  commercial?: {
    success?: boolean;
    status?: string;
    taskId?: string;
    outcomeId?: string;
    milestoneId?: string;
    taskStatus?: string | null;
    conclusion?: string;
    nextStep?: string;
  };

  integrity?: {
    success?: boolean;
    status?: string;
    resultVerified?: boolean;
    taskCompleted?: boolean;
    conclusion?: string;
  };

  error?: string;
};

function Status({
  value,
  label,
}: {
  value: boolean;
  label?: string;
}) {
  return (
    <span
      style={{
        fontWeight: 950,
        color: value
          ? "#166534"
          : "#b91c1c",
      }}
    >
      {label ??
        (value ? "PASS" : "FAIL")}
    </span>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 14,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          color: "#64748b",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 13,
          fontWeight: 800,
          color: "#0f172a",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CheckRow({
  item,
}: {
  item: VerificationCheck;
}) {
  return (
    <div
      style={{
        padding: "13px 0",
        borderBottom:
          "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {item.name}
        </div>

        <Status
          value={item.pass}
        />
      </div>

      <div
        style={{
          marginTop: 5,
          color: "#64748b",
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        {item.detail}
      </div>

      <div
        style={{
          marginTop: 4,
          color: "#94a3b8",
          fontSize: 10,
        }}
      >
        {item.latencyMs} ms
      </div>
    </div>
  );
}

function Section({
  title,
  status,
  children,
}: {
  title: string;
  status?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 16,
        padding: 18,
        border:
          "1px solid #dbe3f0",
        borderRadius: 20,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 950,
          }}
        >
          {title}
        </h2>

        {typeof status ===
          "boolean" && (
          <Status
            value={status}
          />
        )}
      </div>

      <div
        style={{
          marginTop: 14,
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function LiveCommercialRuntimePage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [result, setResult] =
    useState<CommercialResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const stored =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      ) ?? "";

    setAccessKey(stored);
  }, []);

  async function runVerification() {
    const key =
      accessKey.trim();

    if (!key) {
      setError(
        "未检测到 Founder Session。请先进入 Founder Console 完成认证。",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/live-commercial-runtime-verification",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${key}`,
            },
          },
        );

      const data =
        (await response.json()) as
          CommercialResponse;

      setResult(data);

      if (
        response.status ===
        401
      ) {
        setError(
          "Founder Session 已失效，请重新进入 Founder Console 完成认证。",
        );
      } else if (
        !response.ok ||
        data.success !== true
      ) {
        setError(
          `Commercial Runtime verification failed (HTTP ${response.status}).`,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Commercial Runtime verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const checks =
    result?.checks ?? [];

  const summary =
    result?.summary;

  const overallPass =
    result?.success === true &&
    result?.verified === true &&
    result?.code ===
      "C143_31_LIVE_COMMERCIAL_RUNTIME_PASS";

  const webPass =
    result?.web?.runtimeRouteVerified ===
      true &&
    result?.web?.fullResultVerified ===
      true &&
    (result?.web?.evidenceCount ?? 0) >=
      2;

  const decisionPass =
    result?.decision?.success ===
      true &&
    result?.decision?.verified ===
      true &&
    (result?.decision?.evidenceCount ?? 0) >=
      2;

  const objectivePass =
    Boolean(
      result?.objective?.id,
    );

  const commercialPass =
    result?.commercial?.success ===
      true &&
    (
      result?.commercial?.status ===
        "task-started" ||
      result?.commercial?.status ===
        "already-running"
    ) &&
    Boolean(
      result?.commercial?.taskId,
    ) &&
    Boolean(
      result?.commercial?.outcomeId,
    );

  const integrityPass =
    result?.integrity?.success ===
      false &&
    result?.integrity?.status ===
      "blocked" &&
    result?.integrity?.resultVerified ===
      false &&
    result?.integrity?.taskCompleted ===
      false;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding:
          "24px 16px 60px",
        boxSizing: "border-box",
        background: "#f4f6fb",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 920,
          margin: "0 auto",
        }}
      >
        <header>
          <div
            style={{
              color: "#2563eb",
              fontSize: 11,
              fontWeight: 950,
              letterSpacing:
                "0.14em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                "8px 0 0",
              fontSize: 30,
              lineHeight: 1.15,
              fontWeight: 950,
            }}
          >
            Commercial Runtime
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
              fontSize: 13,
            }}
          >
            C143.31 Production
            Verification
          </p>
        </header>

        <section
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 22,
            background:
              overallPass
                ? "#f0fdf4"
                : "#ffffff",
            border:
              overallPass
                ? "1px solid #bbf7d0"
                : "1px solid #dbe3f0",
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 950,
            }}
          >
            Live Intelligence
            {" → "}
            Decision
            {" → "}
            Commercial Objective
            {" → "}
            Outcome
            {" → "}
            Task
            {" → "}
            Result Gate
          </div>

          <p
            style={{
              margin:
                "9px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Founder-only production
            verification of the AIOS
            commercial operating loop.
          </p>

          <button
            type="button"
            onClick={() =>
              void runVerification()
            }
            disabled={loading}
            style={{
              width: "100%",
              minHeight: 54,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background:
                loading
                  ? "#94a3b8"
                  : "#0f172a",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 900,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "正在执行真实 Commercial Runtime 验证..."
              : "Run C143.31 Commercial Runtime Verification"}
          </button>

          {overallPass && (
            <div
              style={{
                marginTop: 18,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 950,
                  color: "#166534",
                }}
              >
                ✓ COMMERCIAL RUNTIME VERIFIED
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                {summary?.passed ?? 0}
                {" / "}
                {summary?.total ?? 0}
                {" checks passed · "}
                {summary?.failed ?? 0}
                {" failed"}
              </div>
            </div>
          )}
        </section>

        {error && (
          <section
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 15,
              background: "#fef2f2",
              border:
                "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 12,
              lineHeight: 1.6,
              fontWeight: 750,
            }}
          >
            {error}
          </section>
        )}

        {result && (
          <>
            <Section
              title="Pipeline Status"
              status={overallPass}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 9,
                }}
              >
                <InfoCard
                  label="WEB INTELLIGENCE"
                  value={
                    webPass
                      ? "VERIFIED"
                      : "FAILED"
                  }
                />

                <InfoCard
                  label="DECISION"
                  value={
                    decisionPass
                      ? "READY"
                      : "FAILED"
                  }
                />

                <InfoCard
                  label="OBJECTIVE"
                  value={
                    objectivePass
                      ? "CREATED"
                      : "FAILED"
                  }
                />

                <InfoCard
                  label="COMMERCIAL TASK"
                  value={
                    commercialPass
                      ? (
                          result
                            .commercial
                            ?.taskStatus ??
                          "STARTED"
                        ).toUpperCase()
                      : "FAILED"
                  }
                />

                <InfoCard
                  label="RESULT GATE"
                  value={
                    integrityPass
                      ? "BLOCKED CORRECTLY"
                      : "FAILED"
                  }
                />
              </div>
            </Section>

            <Section
              title="Live Intelligence"
              status={webPass}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(145px, 1fr))",
                  gap: 9,
                }}
              >
                <InfoCard
                  label="RUNTIME ROUTE"
                  value={
                    result.web
                      ?.runtimeRouteVerified
                      ? "VERIFIED"
                      : "FAILED"
                  }
                />

                <InfoCard
                  label="FULL RESULT"
                  value={
                    result.web
                      ?.fullResultVerified
                      ? "VERIFIED"
                      : "FAILED"
                  }
                />

                <InfoCard
                  label="EVIDENCE"
                  value={String(
                    result.web
                      ?.evidenceCount ??
                      0,
                  )}
                />

                <InfoCard
                  label="SOURCES"
                  value={String(
                    result.web
                      ?.sourceCount ??
                      0,
                  )}
                />
              </div>

              {result.web
                ?.sourceHosts &&
                result.web.sourceHosts
                  .length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      color: "#64748b",
                      fontSize: 11,
                      lineHeight: 1.6,
                    }}
                  >
                    {result.web.sourceHosts.join(
                      " · ",
                    )}
                  </div>
                )}
            </Section>

            <Section
              title="Decision Layer"
              status={decisionPass}
            >
              <InfoCard
                label="PRIORITY"
                value={
                  result.decision
                    ?.priority ??
                  "N/A"
                }
              />

              {result.decision
                ?.conclusion && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 13,
                    borderRadius: 14,
                    background:
                      "#f0fdf4",
                    color: "#166534",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <strong>
                    Conclusion
                  </strong>

                  <div
                    style={{
                      marginTop: 4,
                    }}
                  >
                    {
                      result.decision
                        .conclusion
                    }
                  </div>
                </div>
              )}

              {result.decision
                ?.nextStep && (
                <div
                  style={{
                    marginTop: 9,
                    padding: 13,
                    borderRadius: 14,
                    background:
                      "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <strong>
                    Next Step
                  </strong>

                  <div
                    style={{
                      marginTop: 4,
                    }}
                  >
                    {
                      result.decision
                        .nextStep
                    }
                  </div>
                </div>
              )}
            </Section>

            <Section
              title="Commercial Objective"
              status={objectivePass}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(145px, 1fr))",
                  gap: 9,
                }}
              >
                <InfoCard
                  label="OBJECTIVE ID"
                  value={
                    result.objective
                      ?.id ??
                    "N/A"
                  }
                />

                <InfoCard
                  label="CURRENCY"
                  value={
                    result.objective
                      ?.currency ??
                    "N/A"
                  }
                />

                <InfoCard
                  label="STAGE"
                  value={
                    result.objective
                      ?.stage ??
                    "N/A"
                  }
                />

                <InfoCard
                  label="STATUS"
                  value={
                    result.objective
                      ?.status ??
                    "N/A"
                  }
                />
              </div>

              {result.objective
                ?.title && (
                <div
                  style={{
                    marginTop: 12,
                    color: "#475569",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  {
                    result.objective
                      .title
                  }
                </div>
              )}
            </Section>

            <Section
              title="Execution Task"
              status={commercialPass}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(145px, 1fr))",
                  gap: 9,
                }}
              >
                <InfoCard
                  label="STATUS"
                  value={
                    result.commercial
                      ?.status ??
                    "N/A"
                  }
                />

                <InfoCard
                  label="TASK ID"
                  value={
                    result.commercial
                      ?.taskId ??
                    "N/A"
                  }
                />

                <InfoCard
                  label="OUTCOME ID"
                  value={
                    result.commercial
                      ?.outcomeId ??
                    "N/A"
                  }
                />

                <InfoCard
                  label="MILESTONE ID"
                  value={
                    result.commercial
                      ?.milestoneId ??
                    "N/A"
                  }
                />

                <InfoCard
                  label="TASK STATE"
                  value={
                    result.commercial
                      ?.taskStatus ??
                    "N/A"
                  }
                />
              </div>

              {result.commercial
                ?.conclusion && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 13,
                    borderRadius: 14,
                    background:
                      "#f8fafc",
                    color: "#475569",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  {
                    result.commercial
                      .conclusion
                  }
                </div>
              )}
            </Section>

            <Section
              title="Result Integrity Gate"
              status={integrityPass}
            >
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background:
                    integrityPass
                      ? "#f0fdf4"
                      : "#fef2f2",
                  border:
                    integrityPass
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 950,
                    color:
                      integrityPass
                        ? "#166534"
                        : "#b91c1c",
                  }}
                >
                  {integrityPass
                    ? "✓ UNVERIFIED RESULT BLOCKED"
                    : "✕ INTEGRITY GATE FAILED"}
                </div>

                <div
                  style={{
                    marginTop: 7,
                    fontSize: 12,
                    lineHeight: 1.65,
                    color: "#64748b",
                  }}
                >
                  AIOS attempted to submit an
                  intentionally unverified
                  commercial result containing
                  fabricated revenue and customer
                  values.
                  <br />
                  The runtime must reject it and
                  must not mark the task completed.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(145px, 1fr))",
                    gap: 9,
                  }}
                >
                  <InfoCard
                    label="RESULT VERIFIED"
                    value={
                      result.integrity
                        ?.resultVerified
                        ? "TRUE"
                        : "FALSE"
                    }
                  />

                  <InfoCard
                    label="TASK COMPLETED"
                    value={
                      result.integrity
                        ?.taskCompleted
                        ? "TRUE"
                        : "FALSE"
                    }
                  />

                  <InfoCard
                    label="GATE STATUS"
                    value={
                      result.integrity
                        ?.status ??
                      "N/A"
                    }
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Verification Checks"
              status={
                checks.length > 0 &&
                checks.every(
                  (item) =>
                    item.pass,
                )
              }
            >
              {checks.map(
                (item, index) => (
                  <CheckRow
                    key={`${item.name}-${index}`}
                    item={item}
                  />
                ),
              )}
            </Section>

            <section
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 18,
                background: "#ffffff",
                border:
                  "1px solid #dbe3f0",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#64748b",
                  letterSpacing:
                    "0.08em",
                }}
              >
                VERIFICATION CODE
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12,
                  wordBreak:
                    "break-word",
                }}
              >
                {result.code ??
                  "N/A"}
              </div>

              {result.latencyMs !==
                undefined && (
                <div
                  style={{
                    marginTop: 7,
                    color: "#94a3b8",
                    fontSize: 11,
                  }}
                >
                  {result.latencyMs}
                  {" ms · "}
                  {result.runtime ??
                    "AIOS"}
                  {" · "}
                  {result.runtimeVersion ??
                    "unknown"}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
