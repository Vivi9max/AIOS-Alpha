"use client";

import {
  useEffect,
  useState,
} from "react";

interface VisionStatusResponse {
  success: boolean;
  verified: boolean;
  code: string;
  runtime: string;
  runtimeVersion: string;
  timestamp: number;
  latencyMs: number;

  vision: {
    success: boolean;
    code: string;
    provider: "openai";
    model: string;
    apiKeyConfigured: boolean;
    enabled: boolean;
    ready: boolean;
    semanticUnderstandingReady: boolean;
    message: string;
  };
}

export default function VideoVisionStatusPage() {
  const [
    data,
    setData,
  ] =
    useState<
      VisionStatusResponse | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const accessKey =
          sessionStorage.getItem(
            "aios-founder-access-key",
          );

        const response =
          await fetch(
            "/api/founder/video/vision-status",
            {
              method: "GET",

              headers:
                accessKey
                  ? {
                      Authorization:
                        `Bearer ${accessKey}`,
                    }
                  : undefined,

              cache:
                "no-store",
            },
          );

        const payload =
          (await response.json()) as
            VisionStatusResponse;

        if (!active) {
          return;
        }

        if (!response.ok) {
          throw new Error(
            payload.code ||
              "Vision status request failed.",
          );
        }

        setData(
          payload,
        );
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : String(requestError),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1>
        Video Vision Status
      </h1>

      <p>
        C144.9.5 · Founder Diagnostics
      </p>

      {loading && (
        <p>
          Checking Vision provider...
        </p>
      )}

      {error && (
        <section
          style={{
            marginTop: 20,
            padding: 16,
            border:
              "1px solid #d33",
            borderRadius: 8,
          }}
        >
          <strong>
            ERROR
          </strong>

          <div>
            {error}
          </div>
        </section>
      )}

      {data && (
        <section
          style={{
            marginTop: 20,
            padding: 20,
            border:
              "1px solid #ccc",
            borderRadius: 8,
          }}
        >
          <h2>
            {data.vision.ready
              ? "VISION PROVIDER READY"
              : "VISION PROVIDER NOT READY"}
          </h2>

          <p>
            Code:{" "}
            {data.code}
          </p>

          <p>
            Provider:{" "}
            {data.vision.provider}
          </p>

          <p>
            Model:{" "}
            {data.vision.model}
          </p>

          <p>
            API Key:{" "}
            {data.vision.apiKeyConfigured
              ? "CONFIGURED"
              : "NOT CONFIGURED"}
          </p>

          <p>
            Enabled:{" "}
            {data.vision.enabled
              ? "true"
              : "false"}
          </p>

          <p>
            Ready:{" "}
            {data.vision.ready
              ? "true"
              : "false"}
          </p>

          <p>
            Semantic Understanding:{" "}
            {data.vision.semanticUnderstandingReady
              ? "true"
              : "false"}
          </p>

          <p>
            {data.vision.message}
          </p>

          <details
            style={{
              marginTop: 20,
            }}
          >
            <summary>
              Full JSON
            </summary>

            <pre
              style={{
                overflowX:
                  "auto",
                whiteSpace:
                  "pre-wrap",
              }}
            >
              {JSON.stringify(
                data,
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
