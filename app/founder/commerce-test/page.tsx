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
  plan?: {
    product?: {
      name?: string;
    };
    testPlan?: {
      targetSellingPrice?: number;
      baselineUnitCost?: number;
      baselineContributionSpace?: number;
      baselineContributionMarginPercent?: number;
      recommendedTestQuantity?: number;
      maximumInitialTestQuantity?: number;
      testBudget?: number;
      requiredMetrics?: string[];
      stopConditions?: string[];
      continueConditions?: string[];
    };
  };
  actual?: {
    actualResults?: {
      orders?: number;
      unitsSold?: number;
      grossRevenue?: number;
      netRevenue?: number;
      totalActualCost?: number;
      actualContribution?: number;
      actualContributionMarginPercent?: number;
      actualAverageOrderValue?: number;
      actualAcquisitionCostPerOrder?: number;
      actualRefundRatePercent?: number;
    };
    realityLoop?: {
      realOrderDataAvailable?: boolean;
      actualUnitEconomicsAvailable?: boolean;
      profitabilityVerified?: boolean;
    };
  };
  result?: unknown;
  error?: string;
}
export default function CommerceTestPage() {
  const [data, setData] =
    useState<ApiResponse | null>(
      null,
    );
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
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
          "/api/founder/commerce/test",
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
  function booleanLabel(
    value: boolean | undefined,
  ) {
    return value
      ? "PASS"
      : "FAILED";
  }
  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: 24,
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <h1>
        C145.6 Commerce Test
      </h1>
      <p>
        Founder-only - real-world
        commerce experiment layer
      </p>
      <button
        onClick={runRegression}
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
          : "Run C145.6 Regression"}
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
              ? "C145.6 VERIFIED"
              : "C145.6 FAILED"}
          </h2>
          <p>
            Code:{" "}
            <strong>
              {data.code}
            </strong>
          </p>
          <p>
            Latency:{" "}
            {data.latencyMs ?? "-"} ms
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
                value,
              ]) => (
                <div
                  key={name}
                  style={{
                    padding:
                      "4px 0",
                  }}
                >
                  {booleanLabel(
                    value,
                  )}{" "}
                  {name}
                </div>
              ),
            )}
          {data.plan?.testPlan && (
            <>
              <h3>
                Test Plan
              </h3>
              <p>
                Target Selling Price:{" "}
                {
                  data.plan
                    .testPlan
                    .targetSellingPrice
                }
              </p>
              <p>
                Baseline Unit Cost:{" "}
                {
                  data.plan
                    .testPlan
                    .baselineUnitCost
                }
              </p>
              <p>
                Baseline Contribution:{" "}
                {
                  data.plan
                    .testPlan
                    .baselineContributionSpace
                }
              </p>
              <p>
                Baseline Contribution
                Margin:{" "}
                {
                  data.plan
                    .testPlan
                    .baselineContributionMarginPercent
                }%
              </p>
              <p>
                Recommended Test
                Quantity:{" "}
                {
                  data.plan
                    .testPlan
                    .recommendedTestQuantity
                }
              </p>
              <p>
                Maximum Initial
                Test Quantity:{" "}
                {
                  data.plan
                    .testPlan
                    .maximumInitialTestQuantity
                }
              </p>
              <p>
                Test Budget:{" "}
                {
                  data.plan
                    .testPlan
                    .testBudget
                }
              </p>
            </>
          )}
          {data.actual
            ?.actualResults && (
            <>
              <h3>
                Actual Test Results
              </h3>
              <p>
                Orders:{" "}
                {
                  data.actual
                    .actualResults
                    .orders
                }
              </p>
              <p>
                Units Sold:{" "}
                {
                  data.actual
                    .actualResults
                    .unitsSold
                }
              </p>
              <p>
                Gross Revenue:{" "}
                {
                  data.actual
                    .actualResults
                    .grossRevenue
                }
              </p>
              <p>
                Net Revenue:{" "}
                {
                  data.actual
                    .actualResults
                    .netRevenue
                }
              </p>
              <p>
                Total Actual Cost:{" "}
                {
                  data.actual
                    .actualResults
                    .totalActualCost
                }
              </p>
              <p>
                Actual Contribution:{" "}
                {
                  data.actual
                    .actualResults
                    .actualContribution
                }
              </p>
              <p>
                Actual Contribution
                Margin:{" "}
                {
                  data.actual
                    .actualResults
                    .actualContributionMarginPercent
                }%
              </p>
              <p>
                Average Order Value:{" "}
                {
                  data.actual
                    .actualResults
                    .actualAverageOrderValue
                }
              </p>
              <p>
                Acquisition Cost /
                Order:{" "}
                {
                  data.actual
                    .actualResults
                    .actualAcquisitionCostPerOrder
                }
              </p>
              <p>
                Refund Rate:{" "}
                {
                  data.actual
                    .actualResults
                    .actualRefundRatePercent
                }%
              </p>
            </>
          )}
          {data.actual
            ?.realityLoop && (
            <>
              <h3>
                Reality Loop
              </h3>
              <p>
                Real Order Data:{" "}
                {
                  booleanLabel(
                    data.actual
                      .realityLoop
                      .realOrderDataAvailable,
                  )
                }
              </p>
              <p>
                Actual Unit Economics:{" "}
                {
                  booleanLabel(
                    data.actual
                      .realityLoop
                      .actualUnitEconomicsAvailable,
                  )
                }
              </p>
              <p>
                Profitability Verified:{" "}
                NO
              </p>
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
