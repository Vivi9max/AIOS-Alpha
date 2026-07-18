"use client";

import {
  useState,
} from "react";

import Link from "next/link";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

import BrainInput from "@/components/brain/BrainInput";
import BrainResult from "@/components/brain/BrainResult";

interface BrainApiResponse {
  success?: boolean;
  content?: string;
  error?: string;
}

const runtimeExamples = [
  "读取我当前的待办任务并告诉我最高优先级",
  "分析 AIOS Alpha 当前最明显的风险",
  "根据我的长期目标给出今天最重要的一步",
];

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
        (await response.json()) as
          BrainApiResponse;

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
        result.content ?? ""
      );
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "AIOS Runtime 暂时不可用。"
      );

      setAnswer("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 840,
          margin: "0 auto",
          color: "#111827",
        }}
      >
        <header
          style={{
            marginBottom: 22,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            AIOS Runtime
          </p>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 37,
            }}
          >
            🧠 Runtime Console
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#64748b",
              lineHeight: 1.65,
            }}
          >
            直接向 AIOS Runtime 提交单次任务。复杂目标建议使用 Planner。
          </p>
        </header>

        <section
          style={{
            marginBottom: 18,
            padding: 16,
            borderRadius: 17,
            border:
              "1px solid #bfdbfe",
            background: "#eff6ff",
          }}
        >
          <strong>
            Runtime Console 适合：
          </strong>

          <p
            style={{
              margin: "7px 0 0",
              color: "#475569",
              lineHeight: 1.6,
            }}
          >
            查询信息、分析问题、创建任务、保存记忆或执行一个明确操作。
          </p>

          <Link
            href="/planner"
            style={{
              display:
                "inline-block",
              marginTop: 10,
              color: "#1d4ed8",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            复杂目标前往 Planner →
          </Link>
        </section>

        <section
          style={{
            display: "grid",
            gap: 8,
            marginBottom: 18,
          }}
        >
          {runtimeExamples.map(
            (example) => (
              <button
                key={example}
                type="button"
                onClick={() =>
                  setPrompt(example)
                }
                style={{
                  padding:
                    "13px 15px",
                  borderRadius: 13,
                  border:
                    "1px solid #e5e7eb",
                  background:
                    "#ffffff",
                  color: "#334155",
                  textAlign: "left",
                  fontWeight: 800,
                }}
              >
                {example}
              </button>
            )
          )}
        </section>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              border:
                "1px solid #fecaca",
              borderRadius: 12,
              background: "#fff7f7",
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 10,
            marginTop: 18,
          }}
        >
          <Link
            href="/runtime"
            style={bottomLinkStyle}
          >
            Runtime 状态
          </Link>

          <Link
            href="/runtime/trace"
            style={bottomLinkStyle}
          >
            Execution Trace
          </Link>
        </div>
      </main>
    </WorkspaceShell>
  );
}

const bottomLinkStyle = {
  display: "block",
  padding: "14px",
  borderRadius: 13,
  border:
    "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#111827",
  textAlign: "center",
  textDecoration: "none",
  fontWeight: 900,
} as const;