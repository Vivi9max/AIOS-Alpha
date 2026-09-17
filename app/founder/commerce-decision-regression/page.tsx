"use client";

import {
  useState,
} from "react";

interface RegressionResult {
  success: boolean;
  verified: boolean;
  code: string;
  latencyMs?: number;
  testProduct?: {
    name: string;
    category: string;
    type: string;
  };
  pipeline?: Record<
    string,
    boolean
  >;
  evidence?: Record<
    string,
    number
  >;
  decision?: {
    code: string;
    success: boolean;
    testPriority:
      | "high"
      | "medium"
      | "low"
      | "unknown";
    score: number;
    rationale: string[];
    priceAnalysis?: unknown;
    competitionAnalysis?: unknown;
    supplyAnalysis?: unknown;
    contentAnalysis?: unknown;
  };
  verification?: Record<
    string,
    boolean
  >;
  unknowns?: string[];
  nextActions?: string[];
  boundaries?: string[];
  error?: string;
}

function status(
  value: boolean | undefined,
): string {
  return value
    ? "✓"
    : "✗";
}

export default function CommerceDecisionRegressionPage() {
  const [
    result,
    setResult,
  ] =
    useState<
      RegressionResult | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  async function runRegression() {
    setLoading(true);
    setResult(null);

    try {
      const key =
        sessionStorage.getItem(
          "aios-founder-access-key",
        );

      const response =
        await fetch(
          "/api/founder/commerce/decision-regression",
          {
            method: "GET",
            headers: key
              ? {
                  Authorization:
                    `Bearer ${key}`,
                }
              : {},
          },
        );

      const data =
        await response.json();

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        verified: false,
        code:
          "C145_3_COMMERCE_DECISION_REGRESSION_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Request failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  const pipeline =
    result?.pipeline ?? {};

  const evidence =
    result?.evidence ?? {};

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1>
        C145.3 Commerce Decision Regression
      </h1>

      <p>
        Founder-only · Evidence-driven
        Commerce Decision Engine verification
      </p>

      <button
        onClick={runRegression}
        disabled={loading}
        style={{
          padding:
            "12px 18px",
          borderRadius: 8,
          border: "1px solid #ccc",
          background:
            "transparent",
          cursor:
            loading
              ? "wait"
              : "pointer",
        }}
      >
        {loading
          ? "Running..."
          : "Run C145.3 Verification"}
      </button>

      {result && (
        <section
          style={{
            marginTop: 24,
          }}
        >
          <h2>
            {result.success
              ? "✓ C145.3 COMMERCE DECISION PASS"
              : "✗ C145.3 COMMERCE DECISION FAILED"}
          </h2>

          <p>
            Code:{" "}
            <strong>
              {result.code}
            </strong>
          </p>

          {result.latencyMs !==
            undefined && (
            <p>
              Latency:{" "}
              {result.latencyMs} ms
            </p>
          )}

          {result.testProduct && (
            <section>
              <h3>
                Test Product
              </h3>

              <p>
                {result.testProduct.name}
              </p>

              <p>
                {result.testProduct.category}
                {" · "}
                {result.testProduct.type}
              </p>
            </section>
          )}

          <section>
            <h3>
              Pipeline
            </h3>

            {Object.entries(
              pipeline,
            ).map(
              ([
                key,
                value,
              ]) => (
                <p
                  key={key}
                >
                  {status(value)}
                  {" "}
                  {key}
                </p>
              ),
            )}
          </section>

          <section>
            <h3>
              Evidence
            </h3>

            {Object.entries(
              evidence,
            ).map(
              ([
                key,
                value,
              ]) => (
                <p
                  key={key}
                >
                  {key}:{" "}
                  <strong>
                    {value}
                  </strong>
                </p>
              ),
            )}
          </section>

          {result.decision && (
            <section>
              <h3>
                Decision
              </h3>

              <p>
                Engine:{" "}
                {result.decision.code}
              </p>

              <p>
                Test Priority:{" "}
                <strong>
                  {result.decision.testPriority.toUpperCase()}
                </strong>
              </p>

              <p>
                Score:{" "}
                <strong>
                  {result.decision.score}
                  /100
                </strong>
              </p>

              <h4>
                Rationale
              </h4>

              {result.decision.rationale.map(
                (
                  item,
                  index,
                ) => (
                  <p
                    key={index}
                  >
                    {index + 1}.{" "}
                    {item}
                  </p>
                ),
              )}

              <details>
                <summary>
                  Price Analysis
                </summary>

                <pre>
                  {JSON.stringify(
                    result.decision
                      .priceAnalysis,
                    null,
                    2,
                  )}
                </pre>
              </details>

              <details>
                <summary>
                  Competition Analysis
                </summary>

                <pre>
                  {JSON.stringify(
                    result.decision
                      .competitionAnalysis,
                    null,
                    2,
                  )}
                </pre>
              </details>

              <details>
                <summary>
                  Supply Analysis
                </summary>

                <pre>
                  {JSON.stringify(
                    result.decision
                      .supplyAnalysis,
                    null,
                    2,
                  )}
                </pre>
              </details>

              <details>
                <summary>
                  Content Analysis
                </summary>

                <pre>
                  {JSON.stringify(
                    result.decision
                      .contentAnalysis,
                    null,
                    2,
                  )}
                </pre>
              </details>
            </section>
          )}

          {result.verification && (
            <section>
              <h3>
                Verification
              </h3>

              {Object.entries(
                result.verification,
              ).map(
                ([
                  key,
                  value,
                ]) => (
                  <p
                    key={key}
                  >
                    {status(value)}
                    {" "}
                    {key}
                  </p>
                ),
              )}
            </section>
          )}

          {result.unknowns &&
            result.unknowns.length >
              0 && (
              <section>
                <h3>
                  Unknowns
                </h3>

                {result.unknowns.map(
                  (
                    item,
                    index,
                  ) => (
                    <p
                      key={index}
                    >
                      {index + 1}.{" "}
                      {item}
                    </p>
                  ),
                )}
              </section>
            )}

          {result.nextActions &&
            result.nextActions.length >
              0 && (
              <section>
                <h3>
                  Next Actions
                </h3>

                {result.nextActions.map(
                  (
                    item,
                    index,
                  ) => (
                    <p
                      key={index}
                    >
                      {index + 1}.{" "}
                      {item}
                    </p>
                  ),
                )}
              </section>
            )}

          {result.boundaries &&
            result.boundaries.length >
              0 && (
              <section>
                <h3>
                  Boundaries
                </h3>

                {result.boundaries.map(
                  (
                    item,
                    index,
                  ) => (
                    <p
                      key={index}
                    >
                      {index + 1}.{" "}
                      {item}
                    </p>
                  ),
                )}
              </section>
            )}

          {result.error && (
            <pre>
              {result.error}
            </pre>
          )}

          <details
            style={{
              marginTop: 24,
            }}
          >
            <summary>
              Full JSON
            </summary>

            <pre
              style={{
                whiteSpace:
                  "pre-wrap",
                overflow:
                  "auto",
              }}
            >
              {JSON.stringify(
                result,
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
}
