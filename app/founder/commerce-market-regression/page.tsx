"use client";

import {
  useEffect,
  useState,
} from "react";

type RegressionResult = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  latencyMs?: number;

  testProduct?: {
    name?: string;
    category?: string;
    type?: string;
  };

  result?: {
    success?: boolean;
    code?: string;

    marketEvidence?: Array<{
      title?: string;
      hostname?: string;
      sourceUrl?: string;
      kind?: string;
    }>;

    supplyEvidence?: Array<{
      title?: string;
      hostname?: string;
      sourceUrl?: string;
      kind?: string;
    }>;

    priceSignals?: string[];
    competitorSignals?: string[];
    supplierSignals?: string[];

    verification?: {
      marketVerified?: boolean;
      supplyVerified?: boolean;
      priceEvidenceFound?: boolean;
      competitorEvidenceFound?: boolean;
      supplierEvidenceFound?: boolean;
      independentMarketSources?: number;
      independentSupplySources?: number;
      overallVerified?: boolean;
      score?: number;
    };

    confidence?: {
      market?: number;
      supply?: number;
      price?: number;
      competition?: number;
    };

    retrieval?: {
      market?: {
        success?: boolean;
        sourceCount?: number;
        sourceHosts?: string[];
      };
      price?: {
        success?: boolean;
        sourceCount?: number;
        sourceHosts?: string[];
      };
      supply1688?: {
        success?: boolean;
        sourceCount?: number;
        sourceHosts?: string[];
      };
    };

    unknowns?: string[];
    nextActions?: string[];
  };

  checks?: Record<
    string,
    boolean
  >;
};

export default function CommerceMarketRegressionPage() {
  const [
    result,
    setResult,
  ] = useState<RegressionResult | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function runRegression() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const accessKey =
        sessionStorage.getItem(
          "aios-founder-access-key",
        );

      if (!accessKey) {
        throw new Error(
          "Founder access key not found in this browser session.",
        );
      }

      const response =
        await fetch(
          "/api/founder/commerce/market-regression",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${accessKey}`,
            },
          },
        );

      const data =
        await response.json();

      setResult(data);

      if (!response.ok) {
        setError(
          data?.message ??
            data?.code ??
            "Regression request failed.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(err),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runRegression();
  }, []);

  const checks =
    result?.checks ?? {};

  const checkLabels: Array<
    [string, string]
  > = [
    [
      "founderAuth",
      "Founder Auth",
    ],
    [
      "productInput",
      "Product Input",
    ],
    [
      "marketRetrieval",
      "Market Retrieval",
    ],
    [
      "priceRetrieval",
      "Price Retrieval",
    ],
    [
      "supply1688Retrieval",
      "1688 Supply Retrieval",
    ],
    [
      "marketEvidence",
      "Market Evidence",
    ],
    [
      "supplyEvidence",
      "Supply Evidence",
    ],
    [
      "priceEvidence",
      "Price Evidence",
    ],
    [
      "competitorEvidence",
      "Competitor Evidence",
    ],
    [
      "supplierEvidence",
      "Supplier Evidence",
    ],
    [
      "verificationExecuted",
      "Source Verification",
    ],
    [
      "finalRegressionPass",
      "Final Regression",
    ],
  ];

  const market =
    result?.result;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <h1>
          C145.2 Commerce Market & Supply Regression
        </h1>

        <p>
          Founder-only · Real external Web Intelligence verification
        </p>

        <button
          type="button"
          onClick={runRegression}
          disabled={loading}
          style={{
            padding:
              "10px 16px",
            marginBottom: 20,
            cursor:
              loading
                ? "wait"
                : "pointer",
          }}
        >
          {loading
            ? "Running..."
            : "Run C145.2 Verification"}
        </button>

        {error && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              border:
                "1px solid #dc2626",
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <>
            <section
              style={{
                padding: 16,
                marginBottom: 16,
                border:
                  "1px solid #d1d5db",
                borderRadius: 10,
              }}
            >
              <h2>
                {result.success
                  ? "✓ C145.2 COMMERCE MARKET & SUPPLY PASS"
                  : "✗ C145.2 COMMERCE MARKET & SUPPLY FAILED"}
              </h2>

              <p>
                Code:{" "}
                <strong>
                  {result.code}
                </strong>
              </p>

              <p>
                Latency:{" "}
                {result.latencyMs ?? "-"} ms
              </p>

              <p>
                Test Product:{" "}
                {result.testProduct?.name ??
                  "-"}
              </p>
            </section>

            <section
              style={{
                padding: 16,
                marginBottom: 16,
                border:
                  "1px solid #d1d5db",
                borderRadius: 10,
              }}
            >
              <h2>Pipeline</h2>

              {checkLabels.map(
                ([key, label]) => (
                  <div
                    key={key}
                    style={{
                      padding:
                        "6px 0",
                    }}
                  >
                    {checks[key]
                      ? "✓"
                      : "✗"}{" "}
                    {label}
                  </div>
                ),
              )}
            </section>

            {market && (
              <>
                <section
                  style={{
                    padding: 16,
                    marginBottom: 16,
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 10,
                  }}
                >
                  <h2>
                    Evidence
                  </h2>

                  <p>
                    Market Evidence:{" "}
                    {market.marketEvidence?.length ??
                      0}
                  </p>

                  <p>
                    Supply Evidence:{" "}
                    {market.supplyEvidence?.length ??
                      0}
                  </p>

                  <p>
                    Price Signals:{" "}
                    {market.priceSignals?.length ??
                      0}
                  </p>

                  <p>
                    Competitor Signals:{" "}
                    {market.competitorSignals?.length ??
                      0}
                  </p>

                  <p>
                    Supplier Signals:{" "}
                    {market.supplierSignals?.length ??
                      0}
                  </p>
                </section>

                <section
                  style={{
                    padding: 16,
                    marginBottom: 16,
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 10,
                  }}
                >
                  <h2>
                    Verification
                  </h2>

                  <p>
                    Market Verified:{" "}
                    {market.verification?.marketVerified
                      ? "true"
                      : "false"}
                  </p>

                  <p>
                    Supply Verified:{" "}
                    {market.verification?.supplyVerified
                      ? "true"
                      : "false"}
                  </p>

                  <p>
                    Independent Market Sources:{" "}
                    {market.verification?.independentMarketSources ??
                      0}
                  </p>

                  <p>
                    Independent Supply Sources:{" "}
                    {market.verification?.independentSupplySources ??
                      0}
                  </p>

                  <p>
                    Overall Verified:{" "}
                    {market.verification?.overallVerified
                      ? "true"
                      : "false"}
                  </p>

                  <p>
                    Score:{" "}
                    {market.verification?.score ??
                      0}
                    /100
                  </p>
                </section>

                <section
                  style={{
                    padding: 16,
                    marginBottom: 16,
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 10,
                  }}
                >
                  <h2>
                    Retrieval
                  </h2>

                  <p>
                    Market:{" "}
                    {market.retrieval?.market?.sourceCount ??
                      0} sources
                  </p>

                  <p>
                    Price:{" "}
                    {market.retrieval?.price?.sourceCount ??
                      0} sources
                  </p>

                  <p>
                    1688 Supply:{" "}
                    {market.retrieval?.supply1688?.sourceCount ??
                      0} sources
                  </p>
                </section>
              </>
            )}

            <details>
              <summary>
                Full Regression JSON
              </summary>

              <pre
                style={{
                  whiteSpace:
                    "pre-wrap",
                  overflowX:
                    "auto",
                  padding: 16,
                  marginTop: 12,
                  border:
                    "1px solid #d1d5db",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              >
                {JSON.stringify(
                  result,
                  null,
                  2,
                )}
              </pre>
            </details>
          </>
        )}
      </div>
    </main>
  );
}
