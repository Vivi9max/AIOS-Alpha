"use client";
import {
  useState,
} from "react";
interface ApiResponse {
  success?: boolean;
  verified?: boolean;
  code?: string;
  latencyMs?: number;
  pipeline?: Record<
    string,
    boolean
  >;
  expected?: Record<
    string,
    number
  >;
  actual?: Record<
    string,
    number
  >;
  result?: {
    product?: {
      name?: string;
      category?: string;
      currency?: string;
    };
    baseline?: {
      sellingPrice?: number;
      unitCost?: number;
      contributionSpace?: number;
      contributionMarginPercent?: number;
    };
    actual?: {
      orders?: number;
      unitsSold?: number;
      grossRevenue?: number;
      netRevenue?: number;
      totalActualCost?: number;
      actualUnitCost?: number;
      actualContribution?: number;
      actualContributionPerUnit?: number;
      actualContributionMarginPercent?: number;
      averageOrderValue?: number;
      acquisitionCostPerOrder?: number;
      refundRatePercent?: number;
      conversionRatePercent?: number;
    };
    delta?: {
      sellingPriceDelta?: number;
      unitCostDelta?: number;
      contributionSpaceDelta?: number;
      contributionMarginDeltaPercent?: number;
      acquisitionCostDelta?: number;
      refundRateDeltaPercent?: number;
    };
    evidence?: {
      baseline?: string;
      actual?: string;
      delta?: string;
    };
    realityLoop?: {
      realOrderDataAvailable?: boolean;
      realRevenueDataAvailable?: boolean;
      realCostDataAvailable?: boolean;
      realRefundDataAvailable?: boolean;
      realAcquisitionDataAvailable?: boolean;
      realConversionDataAvailable?: boolean;
      actualUnitEconomicsAvailable?: boolean;
      profitabilityVerified?: boolean;
    };
    decision?: {
      state?: string;
      reasons?: string[];
      nextExperiment?: string[];
    };
    unknowns?: string[];
    boundaries?: string[];
  };
  error?: string;
}
function value(
  item: number | undefined,
) {
  return item === undefined
    ? "-"
    : item;
}
export default function CommerceRealityPage() {
  const [
    data,
    setData,
  ] =
    useState<ApiResponse | null>(
      null,
    );
  const [
    loading,
    setLoading,
  ] =
    useState(false);
  const [
    error,
    setError,
  ] =
    useState("");
  async function runRegression() {
    setLoading(true);
    setError("");
    try {
      const key =
        sessionStorage.getItem(
          "aios-founder-access-key",
        );
      const response =
        await fetch(
          "/api/founder/commerce/reality",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization:
                key
                  ? `Bearer ${key}`
                  : "",
            },
          },
        );
      const json =
        (await response.json()) as ApiResponse;
      setData(json);
      if (!response.ok) {
        setError(
          json.error ||
            "Regression failed.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed.",
      );
    } finally {
      setLoading(false);
    }
  }
  function pass(
    state: boolean | undefined,
  ) {
    return state
      ? "PASS"
      : "FAILED";
  }
  return (
    <main
      style={{
        maxWidth: 1100,
        margin:
          "0 auto",
        padding: 24,
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <h1>
        C145.7 Commerce Reality
      </h1>
      <p>
        Founder-only - Real Commerce
        Data + Baseline / Actual
        Delta Engine
      </p>
      <button
        onClick={
          runRegression
        }
        disabled={loading}
        style={{
          padding:
            "10px 16px",
          cursor:
            loading
              ? "wait"
              : "pointer",
        }}
      >
        {loading
          ? "Running..."
          : "Run C145.7 Regression"}
      </button>
      {error && (
        <pre
          style={{
            marginTop: 20,
            whiteSpace:
              "pre-wrap",
          }}
        >
          {error}
        </pre>
      )}
      {data && (
        <section
          style={{
            marginTop: 24,
          }}
        >
          <h2>
            {data.verified
              ? "C145.7 VERIFIED"
              : "C145.7 FAILED"}
          </h2>
          <p>
            Code:{" "}
            <strong>
              {data.code}
            </strong>
          </p>
          <p>
            Latency:{" "}
            {data.latencyMs ??
              "-"}{" "}
            ms
          </p>
          <h3>
            Regression Pipeline
          </h3>
          {data.pipeline &&
            Object.entries(
              data.pipeline,
            ).map(
              ([
                name,
                state,
              ]) => (
                <div
                  key={name}
                  style={{
                    padding:
                      "4px 0",
                  }}
                >
                  {pass(
                    state,
                  )}{" "}
                  {name}
                </div>
              ),
            )}
          {data.result && (
            <>
              <h3>
                Product
              </h3>
              <p>
                {
                  data.result
                    .product
                    ?.name
                }
              </p>
              <p>
                Category:{" "}
                {
                  data.result
                    .product
                    ?.category
                }
              </p>
              <h3>
                Baseline
              </h3>
              <p>
                Selling Price:{" "}
                {value(
                  data.result
                    .baseline
                    ?.sellingPrice,
                )}
              </p>
              <p>
                Unit Cost:{" "}
                {value(
                  data.result
                    .baseline
                    ?.unitCost,
                )}
              </p>
              <p>
                Contribution:{" "}
                {value(
                  data.result
                    .baseline
                    ?.contributionSpace,
                )}
              </p>
              <p>
                Contribution Margin:{" "}
                {value(
                  data.result
                    .baseline
                    ?.contributionMarginPercent,
                )}
                %
              </p>
              <h3>
                Actual Reality
              </h3>
              <p>
                Orders:{" "}
                {value(
                  data.result
                    .actual
                    ?.orders,
                )}
              </p>
              <p>
                Units Sold:{" "}
                {value(
                  data.result
                    .actual
                    ?.unitsSold,
                )}
              </p>
              <p>
                Gross Revenue:{" "}
                {value(
                  data.result
                    .actual
                    ?.grossRevenue,
                )}
              </p>
              <p>
                Net Revenue:{" "}
                {value(
                  data.result
                    .actual
                    ?.netRevenue,
                )}
              </p>
              <p>
                Actual Unit Cost:{" "}
                {value(
                  data.result
                    .actual
                    ?.actualUnitCost,
                )}
              </p>
              <p>
                Actual Contribution:{" "}
                {value(
                  data.result
                    .actual
                    ?.actualContribution,
                )}
              </p>
              <p>
                Actual Contribution /
                Unit:{" "}
                {value(
                  data.result
                    .actual
                    ?.actualContributionPerUnit,
                )}
              </p>
              <p>
                Actual Contribution
                Margin:{" "}
                {value(
                  data.result
                    .actual
                    ?.actualContributionMarginPercent,
                )}
                %
              </p>
              <p>
                Acquisition Cost /
                Order:{" "}
                {value(
                  data.result
                    .actual
                    ?.acquisitionCostPerOrder,
                )}
              </p>
              <p>
                Refund Rate:{" "}
                {value(
                  data.result
                    .actual
                    ?.refundRatePercent,
                )}
                %
              </p>
              <h3>
                Reality Delta
              </h3>
              <p>
                Selling Price Delta:{" "}
                {value(
                  data.result
                    .delta
                    ?.sellingPriceDelta,
                )}
              </p>
              <p>
                Unit Cost Delta:{" "}
                {value(
                  data.result
                    .delta
                    ?.unitCostDelta,
                )}
              </p>
              <p>
                Contribution Delta:{" "}
                {value(
                  data.result
                    .delta
                    ?.contributionSpaceDelta,
                )}
              </p>
              <p>
                Contribution Margin
                Delta:{" "}
                {value(
                  data.result
                    .delta
                    ?.contributionMarginDeltaPercent,
                )}
                %
              </p>
              <h3>
                Evidence
              </h3>
              <p>
                Baseline:{" "}
                {
                  data.result
                    .evidence
                    ?.baseline
                }
              </p>
              <p>
                Actual:{" "}
                {
                  data.result
                    .evidence
                    ?.actual
                }
              </p>
              <p>
                Delta:{" "}
                {
                  data.result
                    .evidence
                    ?.delta
                }
              </p>
              <h3>
                Reality Loop
              </h3>
              <p>
                Real Order Data:{" "}
                {pass(
                  data.result
                    .realityLoop
                    ?.realOrderDataAvailable,
                )}
              </p>
              <p>
                Real Revenue Data:{" "}
                {pass(
                  data.result
                    .realityLoop
                    ?.realRevenueDataAvailable,
                )}
              </p>
              <p>
                Real Cost Data:{" "}
                {pass(
                  data.result
                    .realityLoop
                    ?.realCostDataAvailable,
                )}
              </p>
              <p>
                Actual Unit Economics:{" "}
                {pass(
                  data.result
                    .realityLoop
                    ?.actualUnitEconomicsAvailable,
                )}
              </p>
              <p>
                Profitability Verified:
                NO
              </p>
              <h3>
                Decision
              </h3>
              <p>
                State:{" "}
                {
                  data.result
                    .decision
                    ?.state
                }
              </p>
              <ul>
                {(
                  data.result
                    .decision
                    ?.reasons ||
                  []
                ).map(
                  (item) => (
                    <li
                      key={item}
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <h3>
                Next Experiment
              </h3>
              <ul>
                {(
                  data.result
                    .decision
                    ?.nextExperiment ||
                  []
                ).map(
                  (item) => (
                    <li
                      key={item}
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <h3>
                Unknowns
              </h3>
              <ul>
                {(
                  data.result
                    .unknowns ||
                  []
                ).map(
                  (item) => (
                    <li
                      key={item}
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <h3>
                Boundaries
              </h3>
              <ul>
                {(
                  data.result
                    .boundaries ||
                  []
                ).map(
                  (item) => (
                    <li
                      key={item}
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
          <h3>
            Full JSON
          </h3>
          <pre
            style={{
              overflowX:
                "auto",
              padding: 16,
              background:
                "#f5f5f5",
              whiteSpace:
                "pre-wrap",
              wordBreak:
                "break-word",
            }}
          >
            {JSON.stringify(
              data,
              null,
              2,
            )}
          </pre>
        </section>
      )}
    </main>
  );
}
