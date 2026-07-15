"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import ChatInput from "./ChatInput";

import MessageList, {
  type ChatMessage,
} from "./MessageList";

interface MemoryRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

type ProviderName =
  | "mock"
  | "qwen"
  | "deepseek"
  | "openai"
  | "gemini"
  | "claude";

interface ChatApiResponse {
  success?: boolean;
  provider?: ProviderName;
  requestedProvider?: ProviderName;
  fallbackUsed?: boolean;
  error?: string;
  content?: string;
  latencyMs?: number;
}

interface RuntimeStatusResponse {
  success?: boolean;
  provider?: ProviderName;

  providerRuntime?: {
    provider?: ProviderName;
    requestedProvider?: ProviderName;
    fallbackUsed?: boolean;
    success?: boolean;
    error?: string;
    latencyMs?: number;
    lastRequestAt?: number | null;
  };
}

interface ProviderViewState {
  provider: ProviderName;
  requestedProvider: ProviderName;
  fallbackUsed: boolean;
  error?: string;
  latencyMs?: number;
}

const welcomeMessage: ChatMessage = {
  role: "assistant",
  content:
    "欢迎来到 AIOS Alpha。\n\nAI Engine 已连接。",
};

const providerLabels:
  Record<ProviderName, string> = {
  mock: "Mock",
  qwen: "Qwen",
  deepseek: "DeepSeek",
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
};

const defaultProviderState:
  ProviderViewState = {
  provider: "mock",
  requestedProvider: "mock",
  fallbackUsed: false,
};

function normalizeProvider(
  value: unknown,
  fallback: ProviderName = "mock"
): ProviderName {
  if (
    value === "mock" ||
    value === "qwen" ||
    value === "deepseek" ||
    value === "openai" ||
    value === "gemini" ||
    value === "claude"
  ) {
    return value;
  }

  return fallback;
}

export default function ChatPanel() {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [
    providerState,
    setProviderState,
  ] = useState<ProviderViewState>(
    defaultProviderState
  );

  const bottomRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [
          memoryResponse,
          runtimeResponse,
        ] = await Promise.all([
          fetch("/api/memory", {
            cache: "no-store",
          }),

          fetch(
            "/api/runtime/status",
            {
              cache: "no-store",
            }
          ),
        ]);

        if (!memoryResponse.ok) {
          throw new Error(
            "Failed to load chat history."
          );
        }

        const memoryData =
          await memoryResponse.json();

        const memory: MemoryRecord[] =
          Array.isArray(
            memoryData.items
          )
            ? memoryData.items
            : [];

        if (runtimeResponse.ok) {
          const runtimeData =
            (await runtimeResponse.json()) as RuntimeStatusResponse;

          const runtime =
            runtimeData.providerRuntime;

          const activeProvider =
            normalizeProvider(
              runtimeData.provider,
              "mock"
            );

          const actualProvider =
            normalizeProvider(
              runtime?.provider,
              activeProvider
            );

          const requestedProvider =
            normalizeProvider(
              runtime?.requestedProvider,
              activeProvider
            );

          if (active) {
            setProviderState({
              provider:
                actualProvider,
              requestedProvider,
              fallbackUsed:
                runtime?.fallbackUsed ??
                false,
              error:
                runtime?.error,
              latencyMs:
                runtime?.latencyMs,
            });
          }
        }

        if (!active) {
          return;
        }

        const restoredMessages =
          memory
            .filter(
              (item) =>
                item.role === "user" ||
                item.role ===
                  "assistant"
            )
            .map((item) => ({
              role: item.role,
              content: item.content,
            }));

        setMessages(
          restoredMessages.length > 0
            ? restoredMessages
            : [welcomeMessage]
        );
      } catch {
        if (active) {
          setMessages([
            welcomeMessage,
          ]);
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: historyLoading
        ? "auto"
        : "smooth",
    });
  }, [
    messages,
    loading,
    historyLoading,
  ]);

  async function handleSend(
    prompt: string
  ) {
    const cleanPrompt =
      prompt.trim();

    if (
      !cleanPrompt ||
      loading
    ) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: cleanPrompt,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setLoading(true);

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            prompt: cleanPrompt,
          }),
        }
      );

      const data =
        (await response.json()) as ChatApiResponse;

      const actualProvider =
        normalizeProvider(
          data.provider,
          "mock"
        );

      const requestedProvider =
        normalizeProvider(
          data.requestedProvider,
          actualProvider
        );

      setProviderState({
        provider:
          actualProvider,

        requestedProvider,

        fallbackUsed:
          data.fallbackUsed ??
          false,

        error:
          data.error,

        latencyMs:
          data.latencyMs,
      });

      if (!response.ok) {
        throw new Error(
          data.content ??
            "AIOS Runtime Error"
        );
      }

      setMessages((current) => [
        ...current,

        {
          role: "assistant",

          content:
            data.content ??
            "Unknown Response",
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "连接失败，请稍后再试。";

      setMessages((current) => [
        ...current,

        {
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const actualProviderLabel =
    providerLabels[
      providerState.provider
    ];

  const requestedProviderLabel =
    providerLabels[
      providerState
        .requestedProvider
    ];

  const providerSummary =
    providerState.fallbackUsed
      ? `${actualProviderLabel} ← ${requestedProviderLabel} Failed`
      : actualProviderLabel;

  return (
    <section
      style={{
        minHeight:
          "calc(100vh - 165px)",

        display: "flex",

        flexDirection:
          "column",

        overflow: "hidden",

        background:
          "#ffffff",

        border:
          "1px solid #e5e7eb",

        borderRadius: 18,

        boxShadow:
          "0 12px 32px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          padding: "18px 20px",

          borderBottom:
            "1px solid #e5e7eb",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 21,
          }}
        >
          AIOS Brain
        </h1>

        <p
          style={{
            margin: "6px 0 0",

            color:
              providerState
                .fallbackUsed
                ? "#b45309"
                : "#6b7280",

            fontSize: 13,

            fontWeight:
              providerState
                .fallbackUsed
                ? 700
                : 500,
          }}
        >
          Memory connected ·{" "}
          {providerSummary}

          {typeof providerState
            .latencyMs ===
            "number" &&
            ` · ${providerState.latencyMs}ms`}
        </p>

        {providerState
          .fallbackUsed &&
          providerState.error && (
            <div
              style={{
                marginTop: 10,

                padding:
                  "10px 12px",

                border:
                  "1px solid #fed7aa",

                borderRadius: 10,

                background:
                  "#fff7ed",

                color:
                  "#9a3412",

                fontSize: 12,

                lineHeight: 1.55,

                overflowWrap:
                  "anywhere",
              }}
            >
              <strong>
                Provider 回退原因：
              </strong>{" "}
              {providerState.error}
            </div>
          )}
      </div>

      <div
        style={{
          flex: 1,

          minHeight: 0,

          overflowY: "auto",

          padding:
            "22px 18px",

          background:
            "#f8fafc",
        }}
      >
        {historyLoading ? (
          <div
            style={{
              padding: 18,

              color:
                "#6b7280",

              textAlign:
                "center",
            }}
          >
            正在恢复对话……
          </div>
        ) : (
          <MessageList
            messages={messages}
          />
        )}

        {loading && (
          <div
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 10,

              marginBottom: 18,

              color:
                "#6b7280",

              fontSize: 14,
            }}
          >
            <span
              style={{
                width: 34,

                height: 34,

                flexShrink: 0,

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                borderRadius:
                  "50%",

                background:
                  "#111827",

                color:
                  "#ffffff",

                fontWeight: 800,
              }}
            >
              AI
            </span>

            AIOS 正在思考……
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: 14,

          borderTop:
            "1px solid #e5e7eb",

          background:
            "#ffffff",
        }}
      >
        <ChatInput
          loading={
            loading ||
            historyLoading
          }

          onSend={handleSend}
        />
      </div>
    </section>
  );
}