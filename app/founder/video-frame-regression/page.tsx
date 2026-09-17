"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type FrameSample = {
  index?: number;
  timestampSeconds?: number;
  ratio?: number;
  success?: boolean;
  mimeType?: string;
  bytesRead?: number;
  width?: number;
  height?: number;
  checksum?: string;
  error?: string;
};

type RegressionResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  error?: string;
  runtime?: string;
  runtimeVersion?: string;
  timestamp?: number;
  latencyMs?: number;

  sourceUrl?: string;
  selectedUrl?: string;
  mediaType?: string;
  candidateCount?: number;

  decoder?: {
    success?: boolean;
    code?: string;
    available?: boolean;
    decoder?: {
      name?: string;
      path?: string;
      source?:
        | "bundled"
        | "environment"
        | "system";
      version?: string;
    };
    checkedSources?: string[];
    error?: string;
  };

  media?: {
    success?: boolean;
    code?: string;
    statusCode?: number;
    contentType?: string;
    contentLength?: number;
    bytesRead?: number;
    rangeSupported?: boolean;
    container?: string;
    majorBrand?: string;
    moovFound?: boolean;
  };

  processing?: {
    success?: boolean;
    code?: string;
    durationSeconds?: number;
    width?: number;
    height?: number;
    frameRate?: number;
    videoCodec?: string;
    audioCodec?: string;
    videoTrackCount?: number;
    audioTrackCount?: number;
  };

  frames?: {
    success?: boolean;
    code?: string;
    mediaUrl?: string;
    mediaType?: string;

    decoder?: {
      available?: boolean;
      name?: string;
      version?: string;
      source?:
        | "bundled"
        | "environment"
        | "system";
      path?: string;
    };

    frameCount?: number;
    successfulFrameCount?: number;
    totalBytesRead?: number;

    frames?: FrameSample[];

    visualEvidence?: {
      framesDecoded?: boolean;
      imagesExtracted?: boolean;
      dimensionsDetected?: boolean;
      semanticUnderstandingReady?: boolean;
    };

    error?: string;
  };

  checks?: {
    auth?: boolean;
    resolverSuccess?: boolean;
    primaryVideoFound?: boolean;
    decoderAvailable?: boolean;
    mediaReadable?: boolean;
    processingSuccess?: boolean;
    frameExtractionAttempted?: boolean;
    framesDecoded?: boolean;
    imagesExtracted?: boolean;
    dimensionsDetected?: boolean;
    semanticUnderstandingReady?: boolean;
    finalRegressionPass?: boolean;
  };
};

export default function FounderVideoFrameRegressionPage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [result, setResult] =
    useState<RegressionResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      ) ?? "";

    setAccessKey(storedKey);
  }, []);

  async function runRegression() {
    const key =
      accessKey.trim();

    if (!key) {
      setError(
        "未检测到 Founder Console 会话。请先进入 /founder 完成 Founder 登录。",
      );

      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/video/frame-regression",
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
        (await response.json()) as RegressionResponse;

      setResult(data);

      if (
        !response.ok ||
        data.success !== true
      ) {
        setError(
          data.message ||
            data.error ||
            `Regression failed (HTTP ${response.status}).`,
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Video frame regression request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const checks =
    result?.checks;

  const frames =
    result?.frames;

  const passed =
    result?.success === true &&
    result?.verified === true &&
    checks?.auth === true &&
    checks?.resolverSuccess === true &&
    checks?.primaryVideoFound === true &&
    checks?.decoderAvailable === true &&
    checks?.mediaReadable === true &&
    checks?.processingSuccess === true &&
    checks?.frameExtractionAttempted === true &&
    checks?.framesDecoded === true &&
    checks?.imagesExtracted === true &&
    checks?.finalRegressionPass === true &&
    result?.code ===
      "C144_7_7_VIDEO_FRAME_REGRESSION_PASS";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding:
          "24px 18px 60px",
        boxSizing: "border-box",
        background: "#f4f6fb",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <header>
          <div
            style={{
              color: "#2563eb",
              fontSize: 12,
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
            }}
          >
            Video Frame Runtime
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            C144.7.7 End-to-End Frame Extraction Regression
          </p>
        </header>

        <section
          style={{
            marginTop: 22,
            padding: 20,
            border:
              "1px solid #dbe3f0",
            borderRadius: 22,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 17,
              lineHeight: 1.5,
            }}
          >
            Resolver
            {" → "}
            Media
            {" → "}
            Processing
            {" → "}
            FFmpeg
            {" → "}
            Frame Extraction
          </div>

          <p
            style={{
              margin:
                "8px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            当前页面自动使用 Founder
            Console 会话中的 Access Key。
            不显示、不要求再次输入密钥。
          </p>

          <button
            type="button"
            onClick={() =>
              void runRegression()
            }
            disabled={loading}
            style={{
              width: "100%",
              minHeight: 52,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background: loading
                ? "#94a3b8"
                : "#0f172a",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 900,
              cursor: loading
                ? "wait"
                : "pointer",
            }}
          >
            {loading
              ? "正在执行 C144.7.7 视频帧回归验证…"
              : "▶ Run C144.7.7 Frame Regression"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background: "#fff1f2",
                color: "#be123c",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}
        </section>

        {result && (
          <>
            <section
              style={{
                marginTop: 18,
                padding: 20,
                border: passed
                  ? "1px solid #86efac"
                  : "1px solid #fecaca",
                borderRadius: 22,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 950,
                  color: passed
                    ? "#166534"
                    : "#b91c1c",
                  lineHeight: 1.35,
                }}
              >
                {passed
                  ? "✓ C144.7.7 VIDEO FRAME REGRESSION PASS"
                  : "✕ C144.7.7 VIDEO FRAME REGRESSION FAILED"}
              </div>

              <div
                style={{
                  marginTop: 7,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                {result.code ??
                  "UNKNOWN"}
                {typeof result.latencyMs ===
                "number"
                  ? ` · ${result.latencyMs} ms`
                  : ""}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <ResultRow
                  label="Founder Auth"
                  value={
                    checks?.auth === true
                      ? "PASSED"
                      : "FAILED"
                  }
                />

                <ResultRow
                  label="Video Resolver"
                  value={
                    checks?.resolverSuccess ===
                    true
                      ? "PASSED"
                      : "FAILED"
                  }
                />

                <ResultRow
                  label="Primary Video"
                  value={
                    checks?.primaryVideoFound ===
                    true
                      ? "FOUND"
                      : "FAILED"
                  }
                />

                <ResultRow
                  label="FFmpeg Decoder"
                  value={
                    checks?.decoderAvailable ===
                    true
                      ? "AVAILABLE"
                      : "UNAVAILABLE"
                  }
                />

                <ResultRow
                  label="Actual Media"
                  value={
                    checks?.mediaReadable ===
                    true
                      ? "PASSED"
                      : "FAILED"
                  }
                />

                <ResultRow
                  label="Metadata / Track Processing"
                  value={
                    checks?.processingSuccess ===
                    true
                      ? "PASSED"
                      : "FAILED"
                  }
                />

                <ResultRow
                  label="Frame Extraction"
                  value={
                    checks?.frameExtractionAttempted ===
                    true
                      ? "EXECUTED"
                      : "NOT EXECUTED"
                  }
                />

                <ResultRow
                  label="Frames Decoded"
                  value={
                    checks?.framesDecoded ===
                    true
                      ? "PASSED"
                      : "FAILED"
                  }
                />

                <ResultRow
                  label="Images Extracted"
                  value={
                    checks?.imagesExtracted ===
                    true
                      ? "PASSED"
                      : "FAILED"
                  }
                />

                <ResultRow
                  label="Dimensions Detected"
                  value={
                    checks?.dimensionsDetected ===
                    true
                      ? "PASSED"
                      : "FAILED"
                  }
                />

                <ResultRow
                  label="Semantic Understanding"
                  value={
                    checks?.semanticUnderstandingReady ===
                    true
                      ? "READY"
                      : "NOT YET"
                  }
                />

                <ResultRow
                  label="Final Regression"
                  value={
                    checks?.finalRegressionPass ===
                    true
                      ? "PASS"
                      : "FAILED"
                  }
                />
              </div>
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  "1px solid #dbe3f0",
                borderRadius: 22,
                background: "#ffffff",
              }}
            >
              <SectionTitle>
                Decoder
              </SectionTitle>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <ResultRow
                  label="Available"
                  value={
                    result.decoder
                      ?.available
                      ? "YES"
                      : "NO"
                  }
                />

                <ResultRow
                  label="Source"
                  value={
                    result.decoder
                      ?.decoder
                      ?.source ??
                    "unknown"
                  }
                />

                <ResultRow
                  label="Name"
                  value={
                    result.decoder
                      ?.decoder
                      ?.name ??
                    "unknown"
                  }
                />

                <ResultRow
                  label="Version"
                  value={
                    result.decoder
                      ?.decoder
                      ?.version ??
                    "unknown"
                  }
                />

                <ResultRow
                  label="Path"
                  value={
                    result.decoder
                      ?.decoder
                      ?.path ??
                    "unknown"
                  }
                />
              </div>
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  "1px solid #dbe3f0",
                borderRadius: 22,
                background: "#ffffff",
              }}
            >
              <SectionTitle>
                Video Processing
              </SectionTitle>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <ResultRow
                  label="Media Type"
                  value={
                    result.mediaType ??
                    "unknown"
                  }
                />

                <ResultRow
                  label="Container"
                  value={
                    result.media
                      ?.container ??
                    "unknown"
                  }
                />

                <ResultRow
                  label="Duration"
                  value={
                    typeof result.processing
                      ?.durationSeconds ===
                    "number"
                      ? `${result.processing.durationSeconds.toFixed(3)} s`
                      : "unknown"
                  }
                />

                <ResultRow
                  label="Resolution"
                  value={
                    result.processing
                      ?.width &&
                    result.processing
                      ?.height
                      ? `${result.processing.width} × ${result.processing.height}`
                      : "unknown"
                  }
                />

                <ResultRow
                  label="FPS"
                  value={
                    typeof result.processing
                      ?.frameRate ===
                    "number"
                      ? result.processing.frameRate.toFixed(
                          3,
                        )
                      : "unknown"
                  }
                />

                <ResultRow
                  label="Video Codec"
                  value={
                    result.processing
                      ?.videoCodec ??
                    "unknown"
                  }
                />

                <ResultRow
                  label="Audio Codec"
                  value={
                    result.processing
                      ?.audioCodec ??
                    "unknown"
                  }
                />
              </div>
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  "1px solid #dbe3f0",
                borderRadius: 22,
                background: "#ffffff",
              }}
            >
              <SectionTitle>
                Frame Extraction
              </SectionTitle>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <ResultRow
                  label="Frame Count"
                  value={String(
                    frames?.frameCount ??
                      0,
                  )}
                />

                <ResultRow
                  label="Successful Frames"
                  value={String(
                    frames?.successfulFrameCount ??
                      0,
                  )}
                />

                <ResultRow
                  label="Total Frame Bytes"
                  value={`${frames?.totalBytesRead ?? 0} bytes`}
                />

                <ResultRow
                  label="Frames Decoded"
                  value={
                    frames?.visualEvidence
                      ?.framesDecoded
                      ? "YES"
                      : "NO"
                  }
                />

                <ResultRow
                  label="Images Extracted"
                  value={
                    frames?.visualEvidence
                      ?.imagesExtracted
                      ? "YES"
                      : "NO"
                  }
                />

                <ResultRow
                  label="Dimensions Detected"
                  value={
                    frames?.visualEvidence
                      ?.dimensionsDetected
                      ? "YES"
                      : "NO"
                  }
                />
              </div>

              {frames?.frames &&
                frames.frames.length > 0 && (
                  <div
                    style={{
                      marginTop: 18,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {frames.frames.map(
                      (
                        frame,
                        index,
                      ) => (
                        <div
                          key={
                            `${frame.index ?? index}-${frame.timestampSeconds ?? 0}`
                          }
                          style={{
                            padding: 14,
                            borderRadius: 14,
                            background:
                              "#f8fafc",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              gap: 12,
                              fontWeight: 900,
                              fontSize: 13,
                            }}
                          >
                            <span>
                              Frame{" "}
                              {frame.index ??
                                index}
                            </span>

                            <span>
                              {frame.success
                                ? "✓ SUCCESS"
                                : "✕ FAILED"}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              color:
                                "#64748b",
                              fontSize: 12,
                              lineHeight: 1.7,
                            }}
                          >
                            时间：
                            {typeof frame.timestampSeconds ===
                            "number"
                              ? `${frame.timestampSeconds.toFixed(3)}s`
                              : "unknown"}
                            <br />
                            Ratio：
                            {typeof frame.ratio ===
                            "number"
                              ? frame.ratio
                              : "unknown"}
                            <br />
                            Bytes：
                            {frame.bytesRead ??
                              0}
                            <br />
                            尺寸：
                            {frame.width &&
                            frame.height
                              ? `${frame.width} × ${frame.height}`
                              : "unknown"}
                            <br />
                            MIME：
                            {frame.mimeType ??
                              "unknown"}
                          </div>

                          {frame.checksum && (
                            <div
                              style={{
                                marginTop: 8,
                                fontSize: 11,
                                color:
                                  "#475569",
                                wordBreak:
                                  "break-all",
                              }}
                            >
                              SHA-256：
                              {" "}
                              {frame.checksum}
                            </div>
                          )}

                          {frame.error && (
                            <div
                              style={{
                                marginTop: 8,
                                color:
                                  "#b91c1c",
                                fontSize: 12,
                              }}
                            >
                              {frame.error}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
            </section>

            {result.selectedUrl && (
              <section
                style={{
                  marginTop: 18,
                  padding: 20,
                  border:
                    "1px solid #dbe3f0",
                  borderRadius: 22,
                  background:
                    "#ffffff",
                }}
              >
                <SectionTitle>
                  Selected Media
                </SectionTitle>

                <div
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 14,
                    background:
                      "#f8fafc",
                    color: "#334155",
                    fontSize: 12,
                    lineHeight: 1.6,
                    wordBreak:
                      "break-all",
                  }}
                >
                  {result.selectedUrl}
                </div>
              </section>
            )}

            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  "1px solid #dbe3f0",
                borderRadius: 22,
                background: "#ffffff",
              }}
            >
              <details>
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 900,
                    color: "#475569",
                  }}
                >
                  查看完整 C144.7.7 Regression JSON
                </summary>

                <pre
                  style={{
                    marginTop: 12,
                    padding: 14,
                    overflowX:
                      "auto",
                    borderRadius: 14,
                    background:
                      "#0f172a",
                    color:
                      "#e2e8f0",
                    fontSize: 12,
                    lineHeight: 1.55,
                    whiteSpace:
                      "pre-wrap",
                    wordBreak:
                      "break-word",
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
          </>
        )}
      </div>
    </main>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontSize: 18,
        fontWeight: 950,
      }}
    >
      {children}
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding:
          "12px 14px",
        borderRadius: 13,
        background:
          "#f8fafc",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 900,
          textAlign: "right",
          wordBreak:
            "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
