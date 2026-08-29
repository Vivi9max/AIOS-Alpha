"use client";

import { useState } from "react";

type Result = {
  success?: boolean;
  code?: string;
  phase?: string;
  error?: string;

  path?: string;
  commitSha?: string;
  commitUrl?: string;
  readbackVerified?: boolean;

  checks?: string[];

  verification?: {
    success?: boolean;
    checks?: string[];
    reason?: string;
  };
};

export default function FounderAutonomousDevelopmentPage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [running, setRunning] =
    useState(false);

  const [result, setResult] =
    useState<Result | null>(null);

  const [error, setError] =
    useState("");

  const handleRun = async () => {
    const key =
      accessKey.trim();

    if (!key) {
      setError(
        "请输入 Founder Access Key",
      );
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/autonomous-development",
          {
            method: "POST",

            cache: "no-store",

            headers: {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${key}`,
            },

            body: "{}",
          },
        );

      const data =
        (await response.json()) as Result;

      setResult(data);

      if (!response.ok) {
        setError(
          data.error ||
            `Request failed (${response.status})`,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "C141.12-F Live Test failed.",
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
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          padding: 28,
          boxSizing: "border-box",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.05)",
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
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          FOUNDER ONLY
        </div>

        <h1
          style={{
            margin:
              "12px 0 6px",
            fontSize: 22,
            fontWeight: 750,
            color: "#111",
          }}
        >
          C141.12-F
        </h1>

        <h2
          style={{
            margin:
              "0 0 12px",
            fontSize: 16,
            fontWeight: 650,
            color: "#333",
          }}
        >
          Autonomous Development Live Test
        </h2>

        <p
          style={{
            margin:
              "0 0 22px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#666",
          }}
        >
          Founder-only production verification of
          the AIOS autonomous development loop.
        </p>

        <div
          style={{
            padding: 14,
            borderRadius: 9,
            background: "#f8fafc",
            border:
              "1px solid #e5e7eb",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginBottom: 6,
            }}
          >
            FIXED TEST TARGET
          </div>

          <code
            style={{
              fontSize: 13,
              color: "#111",
              wordBreak:
                "break-all",
            }}
          >
            docs/c141-autonomous-development-live-test.md
          </code>
        </div>

        <div
          style={{
            marginBottom: 20,
          }}
        >
          <label
            htmlFor="founder-access-key"
            style={{
              display: "block",
              marginBottom: 7,
              fontSize: 13,
              fontWeight: 650,
              color: "#333",
            }}
          >
            Founder Access Key
          </label>

          <input
            id="founder-access-key"
            type="password"
            value={accessKey}
            onChange={(event) =>
              setAccessKey(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !running
              ) {
                void handleRun();
              }
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter Founder Access Key"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding:
                "11px 12px",
              border:
                "1px solid #d1d5db",
              borderRadius: 7,
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() =>
            void handleRun()
          }
          style={{
            width: "100%",
            padding:
              "12px 16px",
            border: "none",
            borderRadius: 7,
            background:
              running
                ? "#6b7280"
                : "#111",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor:
              running
                ? "not-allowed"
                : "pointer",
          }}
        >
          {running
            ? "Running Autonomous Test..."
            : "RUN C141.12-F LIVE TEST"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              border:
                "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            borderTop:
              "1px solid #e5e7eb",
            paddingTop: 18,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#666",
              marginBottom: 12,
              letterSpacing:
                "0.04em",
            }}
          >
            EXECUTION PIPELINE
          </div>

          {[
            "FOUNDER_AUTH",
            "READ",
            "ANALYZE",
            "PLAN",
            "WRITE",
            "COMMIT",
            "READBACK",
            "VERIFY",
          ].map((step) => (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 9,
                padding:
                  "6px 0",
                fontSize: 13,
                color: "#333",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius:
                    "50%",
                  background:
                    "#9ca3af",
                  flexShrink: 0,
                }}
              />

              {step}
            </div>
          ))}
        </div>

        {result && (
          <section
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 10,
              border:
                result.success
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
              background:
                result.success
                  ? "#f0fdf4"
                  : "#fef2f2",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 750,
                marginBottom: 14,
                color: "#111",
              }}
            >
              {result.success
                ? "C141.12-F VERIFIED"
                : "C141.12-F FAILED"}
            </div>

            <div
              style={{
                display: "grid",
                gap: 9,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {result.code && (
                <div>
                  <strong>Code:</strong>{" "}
                  {result.code}
                </div>
              )}

              {result.phase && (
                <div>
                  <strong>Phase:</strong>{" "}
                  {result.phase}
                </div>
              )}

              {result.path && (
                <div
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  <strong>Path:</strong>{" "}
                  {result.path}
                </div>
              )}

              {result.commitSha && (
                <div
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  <strong>
                    Commit SHA:
                  </strong>{" "}
                  {result.commitSha}
                </div>
              )}

              <div>
                <strong>
                  Readback:
                </strong>{" "}
                {result.readbackVerified
                  ? "VERIFIED"
                  : "NOT VERIFIED"}
              </div>
            </div>

            {result.commitUrl && (
              <a
                href={
                  result.commitUrl
                }
                target="_blank"
                rel="noreferrer"
                style={{
                  display:
                    "inline-block",
                  marginTop: 14,
                  color: "#2563eb",
                  fontSize: 13,
                  textDecoration:
                    "underline",
                }}
              >
                Open GitHub Commit
              </a>
            )}

            {result.checks &&
              result.checks.length >
                0 && (
                <div
                  style={{
                    marginTop: 18,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#666",
                      marginBottom: 8,
                    }}
                  >
                    VERIFICATION CHECKS
                  </div>

                  {result.checks.map(
                    (check) => (
                      <div
                        key={check}
                        style={{
                          fontSize: 12,
                          padding:
                            "4px 0",
                          color:
                            "#166534",
                        }}
                      >
                        ✓ {check}
                      </div>
                    ),
                  )}
                </div>
              )}

            {result.verification
              ?.checks &&
              result.verification
                .checks.length >
                0 && (
                <div
                  style={{
                    marginTop: 12,
                  }}
                >
                  {result.verification.checks.map(
                    (check) => (
                      <div
                        key={check}
                        style={{
                          fontSize: 12,
                          padding:
                            "3px 0",
                          color:
                            "#166534",
                        }}
                      >
                        ✓ {check}
                      </div>
                    ),
                  )}
                </div>
              )}

            {result.error && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  color: "#b91c1c",
                }}
              >
                {result.error}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
