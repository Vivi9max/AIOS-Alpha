"use client";

import {
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import type {
  Locale,
} from "@/lib/i18n";

import {
  runBrain,
} from "@/lib/brain";

type CanvasCopy = {
  placeholder: string;
  run: string;
  running: string;
  runtimeUnavailable: string;
  brain: string;
};

const canvasCopy: Record<
  Locale,
  CanvasCopy
> = {
  en: {
    placeholder:
      "What do you want to move forward today?",
    run: "▶ Run AIOS",
    running:
      "AIOS is running…",
    runtimeUnavailable:
      "AIOS Runtime is temporarily unavailable.",
    brain: "AIOS Brain",
  },

  "zh-CN": {
    placeholder:
      "今天，你想推进什么？",
    run: "▶ 运行 AIOS",
    running:
      "AIOS 正在运行…",
    runtimeUnavailable:
      "AIOS Runtime 暂时不可用。",
    brain: "AIOS Brain",
  },

  ja: {
    placeholder:
      "今日は何を前に進めたいですか？",
    run: "▶ AIOS を実行",
    running:
      "AIOS を実行しています…",
    runtimeUnavailable:
      "AIOS Runtime は一時的に利用できません。",
    brain: "AIOS Brain",
  },
};

export default function Canvas() {
  const { locale } =
    useLanguage();

  const copy =
    canvasCopy[locale];

  const [prompt, setPrompt] =
    useState("");

  const [result, setResult] =
    useState("");

  const [provider, setProvider] =
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
      const brain =
        await runBrain({
          prompt: cleanPrompt,
        });

      setResult(
        brain.content
      );

      setProvider(
        brain.provider
      );
    } catch (runError) {
      const message =
        runError instanceof Error
          ? runError.message
          : copy.runtimeUnavailable;

      setError(message);
      setResult("");
      setProvider("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      key={locale}
      style={{
        width: "100%",
        maxWidth: 640,
        margin: "40px auto",
      }}
    >
      <textarea
        value={prompt}
        onChange={(event) =>
          setPrompt(
            event.target.value
          )
        }
        placeholder={
          copy.placeholder
        }
        aria-label={
          copy.placeholder
        }
        rows={5}
        disabled={loading}
        style={{
          width: "100%",
          padding: 16,
          border:
            "1px solid #d1d5db",
          borderRadius: 14,
          background:
            "#ffffff",
          color: "#111827",
          fontSize: 16,
          lineHeight: 1.6,
          resize: "vertical",
          outline: "none",
          boxSizing:
            "border-box",
          opacity:
            loading ? 0.7 : 1,
        }}
      />

      <button
        type="button"
        onClick={handleRun}
        disabled={
          loading ||
          !prompt.trim()
        }
        style={{
          width: "100%",
          marginTop: 16,
          padding: 16,
          border: "none",
          borderRadius: 14,
          background:
            "#111827",
          color: "#ffffff",
          fontSize: 16,
          fontWeight: 800,
          cursor:
            loading ||
            !prompt.trim()
              ? "not-allowed"
              : "pointer",
          opacity:
            loading ||
            !prompt.trim()
              ? 0.55
              : 1,
        }}
      >
        {loading
          ? copy.running
          : copy.run}
      </button>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 20,
            padding: 16,
            border:
              "1px solid #fecaca",
            borderRadius: 14,
            background:
              "#fff7f7",
            color: "#b91c1c",
            lineHeight: 1.6,
            overflowWrap:
              "anywhere",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <article
          style={{
            marginTop: 24,
            padding: 20,
            border:
              "1px solid #e5e7eb",
            borderRadius: 16,
            background:
              "#ffffff",
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <strong>
              {copy.brain}
            </strong>

            {provider && (
              <span
                style={{
                  color:
                    "#6b7280",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform:
                    "capitalize",
                }}
              >
                {provider}
              </span>
            )}
          </div>

          <div
            style={{
              whiteSpace:
                "pre-wrap",
              lineHeight: 1.75,
              overflowWrap:
                "anywhere",
            }}
          >
            {result}
          </div>
        </article>
      )}
    </section>
  );
}
