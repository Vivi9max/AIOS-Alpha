"use client";
import {
  useState,
} from "react";
interface RegressionResponse {
  success: boolean;
  verified: boolean;
  code: string;
  latencyMs: number;
  testMode: string;
  supportedCandidateCount: number;
  requestedCandidateCount: number;
  pipeline: Record<string, boolean>;
  result?: {
    success: boolean;
    code: string;
    requestedCount: number;
    processedCount: number;
    verifiedCount: number;
    highPriorityCount: number;
    candidates: Array<{
      rank: number;
      candidate: {
        name: string;
        category: string;
        type: string;
      };
      evidenceScore: number;
      evidenceCompleteness: number;
      priceSignalScore: number;
      supplySignalScore: number;
      competitionSignalScore: number;
      contentSignalScore: number;
      verified: boolean;
      priority: string;
      unknowns: string[];
    }>;
    shortlist: Array<{
      rank: number;
      candidate: {
        name: string;
        category: string;
        type: string;
      };
      evidenceScore: number;
      evidenceCompleteness: number;
      priority: string;
    }>;
    comparison: {
      rankingMethod: string[];
      strongestEvidence: string[];
      weakestEvidence: string[];
    };
    boundaries: string[];
  };
}
export default function CommerceCandidatePoolRegressionPage() {
  const [loading, setLoading] =
    useState(false);
  const [data, setData] =
    useState<RegressionResponse | null>(
      null,
    );
  async function runVerification() {
    setLoading(true);
    try {
      const accessKey =
        sessionStorage.getItem(
          "aios-founder-access-key",
        );
      const response =
        await fetch(
          "/api/founder/commerce/candidate-pool-regression",
          {
            method: "GET",
            headers: accessKey
              ? {
                  Authorization:
                    `Bearer ${accessKey}`,
                }
              : {},
          },
        );
      const json =
        (await response.json()) as RegressionResponse;
      setData(json);
    } catch {
      setData({
        success: false,
        verified: false,
        code:
          "C145_4_BROWSER_REQUEST_ERROR",
        latencyMs: 0,
        testMode: "browser-error",
        supportedCandidateCount: 30,
        requestedCandidateCount: 0,
        pipeline: {},
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <main
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: 24,
        fontFamily:
          "system-ui, sans-serif",
      }}
    >
      <h1>
        C145.4 Commerce Candidate Pool
      </h1>
      <p>
        Founder-only - 30-product
        evidence comparison engine
      </p>
      <button
        onClick={runVerification}
        disabled={loading}
        style={{
          padding: "10px 16px",
          marginBottom: 20,
          cursor:
            loading
              ? "wait"
              : "pointer",
        }}
      >
        {loading
          ? "Running..."
          : "Run C145.4 Verification"}
      </button>
      {data && (
        <section>
          <h2>
            {data.verified
              ? "C145.4 COMMERCE CANDIDATE POOL PASS"
              : "C145.4 REGRESSION FAILED"}
          </h2>
          <p>
            Code:{" "}
            <strong>
              {data.code}
            </strong>
          </p>
          <p>
            Latency:{" "}
            {data.latencyMs} ms
          </p>
          <p>
            Regression:{" "}
            {data.testMode}
          </p>
          <p>
            Supported candidate pool:{" "}
            {data.supportedCandidateCount}
          </p>
          <p>
            Tested candidates:{" "}
            {data.requestedCandidateCount}
          </p>
          <h2>
            Pipeline
          </h2>
          {Object.entries(
            data.pipeline,
          ).map(
            ([key, value]) => (
              <div
                key={key}
                style={{
                  margin: "4px 0",
                }}
              >
                {value ? "PASS" : "FAIL"}{" "}
                {key}
              </div>
            ),
          )}
          {data.result && (
            <>
              <h2>
                Candidate Comparison
              </h2>
              <p>
                Processed:{" "}
                {data.result.processedCount}
                {" | "}
                Verified:{" "}
                {data.result.verifiedCount}
                {" | "}
                High Priority:{" "}
                {data.result.highPriorityCount}
              </p>
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product</th>
                      <th>Evidence</th>
                      <th>Completeness</th>
                      <th>Price</th>
                      <th>Supply</th>
                      <th>
                        Competition Evidence
                      </th>
                      <th>Content</th>
                      <th>Priority</th>
                      <th>Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.result.candidates.map(
                      (item) => (
                        <tr
                          key={`${item.rank}-${item.candidate.name}`}
                        >
                          <td>
                            {item.rank}
                          </td>
                          <td>
                            {item.candidate.name}
                          </td>
                          <td>
                            {item.evidenceScore}
                          </td>
                          <td>
                            {item.evidenceCompleteness}%
                          </td>
                          <td>
                            {item.priceSignalScore}
                          </td>
                          <td>
                            {item.supplySignalScore}
                          </td>
                          <td>
                            {item.competitionSignalScore}
                          </td>
                          <td>
                            {item.contentSignalScore}
                          </td>
                          <td>
                            {item.priority}
                          </td>
                          <td>
                            {item.verified
                              ? "PASS"
                              : "-"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              <h2>
                Shortlist
              </h2>
              {data.result.shortlist.map(
                (item) => (
                  <div
                    key={`${item.rank}-${item.candidate.name}`}
                    style={{
                      padding:
                        "10px 0",
                    }}
                  >
                    <strong>
                      #{item.rank}{" "}
                      {item.candidate.name}
                    </strong>
                    {" | "}
                    Evidence{" "}
                    {item.evidenceScore}
                    /100
                    {" | "}
                    Completeness{" "}
                    {item.evidenceCompleteness}%
                    {" | "}
                    {item.priority}
                  </div>
                ),
              )}
              <h2>
                Comparison Method
              </h2>
              {data.result.comparison.rankingMethod.map(
                (item) => (
                  <div
                    key={item}
                    style={{
                      margin: "5px 0",
                    }}
                  >
                    - {item}
                  </div>
                ),
              )}
              <h2>
                Boundaries
              </h2>
              {data.result.boundaries.map(
                (item) => (
                  <div
                    key={item}
                    style={{
                      margin: "5px 0",
                    }}
                  >
                    - {item}
                  </div>
                ),
              )}
              <h2>
                Full JSON
              </h2>
              <pre
                style={{
                  whiteSpace:
                    "pre-wrap",
                  wordBreak:
                    "break-word",
                  fontSize: 12,
                  background:
                    "#f5f5f5",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {JSON.stringify(
                  data,
                  null,
                  2,
                )}
              </pre>
            </>
          )}
        </section>
      )}
    </main>
  );
}
