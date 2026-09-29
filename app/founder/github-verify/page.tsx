"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

interface VerifyResult {
  success?: boolean;
  phase?: string;
  code?: string;
  error?: string;
  repository?: string;
  branch?: string;
  timestamp?: string;
  durationMs?: number;
  checks?: Record<string, string>;
  read?: Record<string, unknown>;
  write?: Record<string, unknown>;
  commit?: {
    sha?: string;
    url?: string;
  };
}

export default function FounderGitHubVerifyPage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [running, setRunning] =
    useState(false);

  const [result, setResult] =
    useState<VerifyResult | null>(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (storedKey) {
      setAccessKey(storedKey);
    }
  }, []);

  async function runVerification() {
    const key = accessKey.trim();

    if (!key) {
      setError(
        "Founder Access Key is required.",
      );
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);

    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        key,
      );

      const response =
        await fetch(
          "/api/founder/github-verify",
          {
            method: "POST",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              Authorization:
                "Bearer " + key,
            },
          },
        );

      const data =
        (await response.json()) as VerifyResult;

      setResult(data);

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            data.code ||
            "GitHub bridge verification failed.",
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "GitHub bridge verification failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  const checks =
    result?.checks ?? {};

  return (
    <main
      style={{
        minHeight: "100vh",
        padding:
          "24px 18px 60px",
        boxSizing:
          "border-box",
        background:
          "#f4f6fb",
        color:
          "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <Link
          href="/founder"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {"<- Founder Console"}
        </Link>

        <section
          style={{
            marginTop: 18,
            padding: 22,
            borderRadius: 22,
            background: "#0f172a",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              color: "#93c5fd",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: "0.12em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 28,
            }}
          >
            GitHub Bridge Verification
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#cbd5e1",
              lineHeight: 1.6,
              fontSize: 13,
            }}
          >
            C141.10 live verification of Founder Contract governed GitHub read, write, commit and readback.
          </p>
        </section>

        <section
          style={{
            marginTop: 16,
            padding: 20,
            border:
              "1px solid #dbe3f0",
            borderRadius: 20,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Target
          </div>

          <div
            style={{
              marginTop: 8,
              fontWeight: 950,
              fontSize: 17,
            }}
          >
            Vivi9max/AIOS-Alpha
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#64748b",
              fontSize: 13,
            }}
          >
            main · GitHub App · Founder-only
          </div>

          <button
            type="button"
            disabled={running}
            onClick={() =>
              void runVerification()
            }
            style={{
              width: "100%",
              minHeight: 52,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background:
                running
                  ? "#94a3b8"
                  : "#2563eb",
              color: "#ffffff",
              fontWeight: 950,
              fontSize: 15,
              cursor:
                running
                  ? "default"
                  : "pointer",
            }}
          >
            {running
              ? "Running live verification..."
              : "Run GitHub Bridge Verification"}
          </button>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                padding: 13,
                borderRadius: 13,
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: 13,
                lineHeight: 1.55,
                overflowWrap: "anywhere",
              }}
            >
              {error}
            </div>
          )}
        </section>

        {result && (
          <section
            style={{
              marginTop: 16,
              padding: 20,
              borderRadius: 20,
              background:
                result.success
                  ? "#052e16"
                  : "#450a0a",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: 12,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                {result.success
                  ? "VERIFICATION PASS"
                  : "VERIFICATION FAILED"}
              </h2>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {result.phase ||
                  "unknown"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(145px, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              {Object.entries(
                checks,
              ).map(
                ([name, status]) => (
                  <div
                    key={name}
                    style={{
                      padding: 12,
                      borderRadius: 13,
                      background:
                        "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        color: "#cbd5e1",
                        fontSize: 11,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      {name}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontWeight: 950,
                      }}
                    >
                      {status}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 7,
                color: "#cbd5e1",
                fontSize: 13,
              }}
            >
              <div>
                Repository:{" "}
                {result.repository ||
                  "Vivi9max/AIOS-Alpha"}
              </div>

              <div>
                Branch:{" "}
                {result.branch || "main"}
              </div>

              <div>
                Duration:{" "}
                {typeof result.durationMs ===
                "number"
                  ? result.durationMs +
                    " ms"
                  : "n/a"}
              </div>

              {result.commit?.sha && (
                <div
                  style={{
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  Commit:{" "}
                  {result.commit.sha}
                </div>
              )}
            </div>

            {result.commit?.url && (
              <a
                href={result.commit.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  marginTop: 16,
                  color: "#bfdbfe",
                  fontWeight: 900,
                }}
              >
                Open verified commit
              </a>
            )}
          </section>
        )}

        <section
          style={{
            marginTop: 16,
            padding: 18,
            borderRadius: 18,
            border:
              "1px solid #dbe3f0",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              fontWeight: 950,
            }}
          >
            Safety boundary
          </div>

          <div
            style={{
              marginTop: 7,
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            This test is Founder-only and targets only the selected AIOS Alpha repository on main. It performs a controlled repository read, writes the existing C141 live-test file, commits it, and verifies the resulting content by readback.
          </div>
        </section>
      </div>
    </main>
  );
}
