"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type Result = {
  ok?: boolean;
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

function isNoEligibleTask(
  result: Result | null,
): boolean {
  return (
    result?.code ===
    "PLANNER_NO_ELIGIBLE_TASK"
  );
}

export default function FounderAutonomousDevelopmentPage() {
  const [
    accessKey,
    setAccessKey,
  ] = useState("");

  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<Result | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (storedKey) {
      setAccessKey(
        storedKey,
      );
    }
  }, []);

  const handleRun =
    async () => {
      const key =
        accessKey.trim();

      if (!key) {
        setError(
          "请输入 Founder Access Key，或先在 Founder Console 完成验证。",
        );
        return;
      }

      window.sessionStorage.setItem(
        STORAGE_KEY,
        key,
      );

      setRunning(true);
      setError("");
      setResult(null);

      try {
        const response =
          await fetch(
            "/api/founder/autonomous-development",
            {
              method:
                "POST",
              cache:
                "no-store",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
                Authorization:
                  `Bearer ${key}`,
              },
              body:
                JSON.stringify({
                  action:
                    "dispatch-planner",
                }),
            },
          );

        const data =
          (await response.json()) as Result;

        setResult(
          data,
        );

        if (
          !response.ok
        ) {
          if (
            data.code ===
              "FOUNDER_UNAUTHORIZED" ||
            data.code ===
              "FOUNDER_NOT_CONFIGURED"
          ) {
            window.sessionStorage.removeItem(
              STORAGE_KEY,
            );
          }

          setError(
            data.error ||
              `Request failed (${response.status})`,
          );

          return;
        }

        if (
          data.ok ===
            false &&
          data.success !==
            true &&
          !isNoEligibleTask(
            data,
          )
        ) {
          setError(
            data.error ||
              "Autonomous development dispatch failed.",
          );
        }
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Autonomous development request failed.",
        );
      } finally {
        setRunning(
          false,
        );
      }
    };

  const idle =
    isNoEligibleTask(
      result,
    );

  const accepted =
    Boolean(
      result?.ok ||
        result?.success,
    );

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f6f7fb",
        padding:
          "24px 16px 48px",
        boxSizing:
          "border-box",
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            720,
          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            marginBottom:
              18,
          }}
        >
          <div
            style={{
              color:
                "#dc2626",
              fontSize:
                10,
              fontWeight:
                900,
              letterSpacing:
                "0.14em",
            }}
          >
            FOUNDER ONLY
          </div>

          <h1
            style={{
              margin:
                "8px 0 6px",
              fontSize:
                28,
              lineHeight:
                1.1,
              fontWeight:
                850,
              color:
                "#111827",
            }}
          >
            24h Autonomous Runtime
          </h1>

          <p
            style={{
              margin:
                0,
              color:
                "#64748b",
              fontSize:
                13,
              lineHeight:
                1.6,
            }}
          >
            Research → Detect → Plan → GitHub →
            Verify → Deploy → Monitor → Continue
          </p>
        </header>

        <section
          style={{
            padding:
              18,
            border:
              "1px solid #e2e8f0",
            borderRadius:
              18,
            background:
              "#ffffff",
            boxShadow:
              "0 8px 26px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap:
                7,
              marginBottom:
                18,
            }}
          >
            {[
              "Research",
              "Detect",
              "Plan",
              "GitHub",
              "Verify",
              "Deploy",
              "Monitor",
              "Continue",
            ].map(
              (
                step,
                index,
              ) => (
                <div
                  key={
                    step
                  }
                  style={{
                    position:
                      "relative",
                    padding:
                      "9px 6px",
                    borderRadius:
                      9,
                    background:
                      "#f8fafc",
                    textAlign:
                      "center",
                    color:
                      "#475569",
                    fontSize:
                      10,
                    fontWeight:
                      750,
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom:
                        4,
                      color:
                        "#94a3b8",
                      fontSize:
                        9,
                    }}
                  >
                    {String(
                      index +
                        1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </span>

                  {step}
                </div>
              ),
            )}
          </div>

          <div
            style={{
              padding:
                13,
              borderRadius:
                12,
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0",
              marginBottom:
                14,
            }}
          >
            <div
              style={{
                marginBottom:
                  5,
                color:
                  "#94a3b8",
                fontSize:
                  10,
                fontWeight:
                  850,
                letterSpacing:
                  "0.08em",
              }}
            >
              FOUNDER AUTH SESSION
            </div>

            <div
              style={{
                color:
                  accessKey
                    ? "#15803d"
                    : "#64748b",
                fontSize:
                  13,
                fontWeight:
                  700,
              }}
            >
              {accessKey
                ? "Founder Access Key loaded"
                : "Founder Access Key required"}
            </div>
          </div>

          <label
            htmlFor="founder-access-key"
            style={{
              display:
                "block",
              marginBottom:
                7,
              color:
                "#334155",
              fontSize:
                12,
              fontWeight:
                750,
            }}
          >
            Founder Access Key
          </label>

          <input
            id="founder-access-key"
            type="password"
            value={
              accessKey
            }
            onChange={(
              event,
            ) =>
              setAccessKey(
                event.target
                  .value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  "Enter" &&
                !running
              ) {
                void handleRun();
              }
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter Founder Access Key"
            style={{
              width:
                "100%",
              height:
                46,
              boxSizing:
                "border-box",
              padding:
                "0 12px",
              border:
                "1px solid #cbd5e1",
              borderRadius:
                10,
              outline:
                "none",
              color:
                "#111827",
              background:
                "#ffffff",
              fontSize:
                14,
            }}
          />

          <button
            type="button"
            disabled={
              running
            }
            onClick={() =>
              void handleRun()
            }
            style={{
              width:
                "100%",
              height:
                46,
              marginTop:
                10,
              border:
                "none",
              borderRadius:
                10,
              background:
                running
                  ? "#94a3b8"
                  : "#111827",
              color:
                "#ffffff",
              fontSize:
                13,
              fontWeight:
                850,
              cursor:
                running
                  ? "default"
                  : "pointer",
            }}
          >
            {running
              ? "Checking Planner..."
              : "Run Planner Autonomous Dispatch"}
          </button>

          {error && (
            <div
              role="alert"
              style={{
                marginTop:
                  10,
                padding:
                  11,
                border:
                  "1px solid #fecaca",
                borderRadius:
                  10,
                background:
                  "#fef2f2",
                color:
                  "#b91c1c",
                fontSize:
                  12,
                lineHeight:
                  1.5,
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              style={{
                marginTop:
                  12,
                padding:
                  13,
                borderRadius:
                  12,
                border:
                  idle
                    ? "1px solid #dbeafe"
                    : accepted
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                background:
                  idle
                    ? "#eff6ff"
                    : accepted
                      ? "#f0fdf4"
                      : "#fef2f2",
              }}
            >
              <div
                style={{
                  marginBottom:
                    6,
                  color:
                    idle
                      ? "#1d4ed8"
                      : accepted
                        ? "#15803d"
                        : "#b91c1c",
                  fontSize:
                    12,
                  fontWeight:
                    850,
                }}
              >
                {idle
                  ? "PLANNER IDLE"
                  : accepted
                    ? "DISPATCH ACCEPTED"
                    : "DISPATCH BLOCKED"}
              </div>

              {idle ? (
                <div
                  style={{
                    color:
                      "#475569",
                    fontSize:
                      12,
                    lineHeight:
                      1.6,
                  }}
                >
                  当前没有符合自动执行条件的
                  Planner Task。GitHub Direct
                  Control 不受影响。
                </div>
              ) : (
                <>
                  {result.code && (
                    <div
                      style={{
                        color:
                          "#475569",
                        fontSize:
                          12,
                      }}
                    >
                      <strong>
                        Code:
                      </strong>{" "}
                      {
                        result.code
                      }
                    </div>
                  )}

                  {result.phase && (
                    <div
                      style={{
                        marginTop:
                          5,
                        color:
                          "#475569",
                        fontSize:
                          12,
                      }}
                    >
                      <strong>
                        Phase:
                      </strong>{" "}
                      {
                        result.phase
                      }
                    </div>
                  )}

                  {result.readbackVerified !==
                    undefined && (
                    <div
                      style={{
                        marginTop:
                          5,
                        color:
                          "#475569",
                        fontSize:
                          12,
                      }}
                    >
                      <strong>
                        Readback:
                      </strong>{" "}
                      {result
                        .readbackVerified
                        ? "VERIFIED"
                        : "NOT VERIFIED"}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
