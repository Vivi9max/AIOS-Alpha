"use client";

import {
  useState,
} from "react";

import BrainInput from "@/components/brain/BrainInput";
import BrainResult from "@/components/brain/BrainResult";

interface BrainApiResponse {
  success?: boolean;
  content?: string;
  error?: string;
}

export default function BrainPage() {
  const [prompt, setPrompt] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleRun() {
    const cleanPrompt =
      prompt.trim();

    if (
      !cleanPrompt ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                prompt:
                  cleanPrompt,
              }),
          }
        );

      const result =
        (await response.json()) as BrainApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            result.content ||
            "AIOS Runtime 暂时不可用。"
        );
      }

      setAnswer(
        result.content ??
          ""
      );
    } catch (runError) {
      const message =
        runError instanceof Error
          ? runError.message
          : "AIOS Runtime 暂时不可用。";

      setError(
        message
      );

      setAnswer("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "40px auto",
        padding: 24,
        boxSizing:
          "border-box",
      }}
    >
      <header
        style={{
          marginBottom: 24,
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          AIOS Alpha
        </p>

        <h1
          style={{
            margin:
              "7px 0 0",
            fontSize: 34,
          }}
        >
          🧠 AIOS Runtime
        </h1>

        <p
          style={{
            margin:
              "10px 0 0",
            color: "#6b7280",
            lineHeight: 1.6,
          }}
        >
          通过统一 Runtime
          执行 AIOS Brain。
        </p>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            border:
              "1px solid #fecaca",
            borderRadius: 12,
            background:
              "#fff7f7",
            color: "#b91c1c",
            overflowWrap:
              "anywhere",
          }}
        >
          {error}
        </div>
      )}

      <BrainInput
        value={prompt}
        loading={loading}
        onChange={setPrompt}
        onRun={handleRun}
      />

      <BrainResult
        answer={answer}
      />
    </main>
  );
}