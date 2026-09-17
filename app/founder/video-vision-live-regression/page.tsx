"use client";

import {
  useEffect,
  useState,
} from "react";

type RegressionResult = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  latencyMs?: number;
  selectedUrl?: string;
  mediaType?: string;
  candidateCount?: number;
  vision?: {
    success?: boolean;
    code?: string;
    provider?: string;
    model?: string;
    frameCount?: number;
    analyzedFrameCount?: number;
    semanticUnderstandingReady?: boolean;
    content?: string;
    error?: string;
  };
  checks?: Record<string, boolean>;
};

export default function VideoVisionLiveRegressionPage() {
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
          "/api/founder/video/vision-live-regression",
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
      "auth",
      "Founder Auth",
    ],
    [
      "resolverSuccess",
      "Video Resolver",
    ],
    [
      "primaryVideoFound",
      "Primary Video",
    ],
    [
      "decoderAvailable",
      "FFmpeg Decoder",
    ],
    [
      "mediaReadable",
      "Actual Media",
    ],
    [
      "processingSuccess",
      "Metadata / Track Processing",
    ],
    [
      "evidenceSamplingSuccess",
      "Evidence Sampling",
    ],
    [
      "frameExtractionAttempted",
      "Frame Extraction",
    ],
    [
      "framesDecoded",
      "Frames Decoded",
    ],
    [
      "imagesExtracted",
      "Images Extracted",
    ],
    [
      "dimensionsDetected",
      "Dimensions Detected",
    ],
    [
      "visualEvidenceSuccess",
      "Visual Evidence",
    ],
    [
      "visionReady",
      "Vision Ready",
    ],
    [
      "visionModelSuccess",
      "OpenAI Vision API",
    ],
    [
      "semanticUnderstandingReady",
      "Semantic Understanding",
    ],
  ];

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
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1>
          C144.9.6 Live Vision Regression
        </h1>

        <p>
          Founder-only · Real OpenAI Vision
          API verification
        </p>

        <button
          type="button"
          onClick={runRegression}
          disabled={loading}
          style={{
            padding:
              "10px 16px",
            marginBottom: 20,
            cursor: loading
              ? "wait"
              : "pointer",
          }}
        >
          {loading
            ? "Running..."
            : "Run C144.9.6 Verification"}
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
                  ? "✓ C144.9.6 VIDEO VISION LIVE PASS"
                  : "✗ C144.9.6 VIDEO VISION LIVE FAILED"}
              </h2>

              <p>
                Code:{" "}
                <strong>
                  {result.code}
                </strong>
              </p>

              <p>
                Latency:{" "}
                {result.latencyMs ??
                  "-"}{" "}
                ms
              </p>

              <p>
                Media Type:{" "}
                {result.mediaType ??
                  "-"}
              </p>

              <p>
                Candidates:{" "}
                {result.candidateCount ??
                  "-"}
              </p>

              {result.selectedUrl && (
                <p
                  style={{
                    wordBreak:
                      "break-all",
                  }}
                >
                  Primary:{" "}
                  {result.selectedUrl}
                </p>
              )}
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
                Pipeline
              </h2>

              {checkLabels.map(
                ([key, label]) => (
                  <div
                    key={key}
                    style={{
                      padding:
                        "7px 0",
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
                Vision Model
              </h2>

              <p>
                Provider:{" "}
                {result.vision
                  ?.provider ??
                  "-"}
              </p>

              <p>
                Model:{" "}
                {result.vision
                  ?.model ??
                  "-"}
              </p>

              <p>
                Frames:{" "}
                {result.vision
                  ?.analyzedFrameCount ??
                  0}
                /
                {result.vision
                  ?.frameCount ??
                  0}
              </p>

              <p>
                Semantic Understanding:{" "}
                {result.vision
                  ?.semanticUnderstandingReady
                  ? "PASSED"
                  : "NOT READY"}
              </p>

              {result.vision
                ?.content && (
                <pre
                  style={{
                    whiteSpace:
                      "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {
                    result.vision
                      .content
                  }
                </pre>
              )}

              {result.vision
                ?.error && (
                <p>
                  Error:{" "}
                  {result.vision.error}
                </p>
              )}
            </section>

            <details>
              <summary>
                Full JSON
              </summary>

              <pre
                style={{
                  whiteSpace:
                    "pre-wrap",
                    wordBreak:
                      "break-word",
                  marginTop: 12,
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
