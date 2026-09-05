"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import ChatInput from "./ChatInput";

import MessageList, {
  type ChatMessage,
} from "./MessageList";

interface MemoryRecord {
  id: number;
  role:
    | "user"
    | "assistant";
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

const providerLabels: Record<
  ProviderName,
  string
> = {
  mock: "Mock",
  qwen: "Qwen",
  deepseek: "DeepSeek",
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
};

const defaultProviderState: ProviderViewState =
  {
    provider: "mock",
    requestedProvider: "mock",
    fallbackUsed: false,
  };

const chatCopy = {
  en: {
    welcome:
      "Welcome to AIOS Alpha.\n\nAI Engine is connected.",
    restoring:
      "Restoring your conversation…",
    thinking:
      "AIOS is thinking…",
    connectionError:
      "Connection failed. Please try again shortly.",
    runtimeError:
      "AIOS Runtime error",
    unknownResponse:
      "No response was returned.",
    providerFallback:
      "Provider fallback reason:",
    memoryConnected:
      "Memory connected",
    failed:
      "failed",
  },

  "zh-CN": {
    welcome:
      "欢迎来到 AIOS Alpha。\n\nAI Engine 已连接。",
    restoring:
      "正在恢复你的对话……",
    thinking:
      "AIOS 正在思考……",
    connectionError:
      "连接失败，请稍后再试。",
    runtimeError:
      "AIOS Runtime 错误",
    unknownResponse:
      "AIOS 没有返回有效响应。",
    providerFallback:
      "Provider 回退原因：",
    memoryConnected:
      "Memory 已连接",
    failed:
      "失败",
  },

  ja: {
    welcome:
      "AIOS Alpha へようこそ。\n\nAI Engine に接続されています。",
    restoring:
      "会話を復元しています…",
    thinking:
      "AIOS が考えています…",
    connectionError:
      "接続に失敗しました。しばらくしてからもう一度お試しください。",
    runtimeError:
      "AIOS Runtime エラー",
    unknownResponse:
      "AIOS から応答が返ってきませんでした。",
    providerFallback:
      "Provider の切り替え理由：",
    memoryConnected:
      "Memory に接続されています",
    failed:
      "失敗",
  },
} as const;

function isRuntimeWrapper(
  content: string
): boolean {
  const raw =
    content.trim();

  if (!raw) {
    return false;
  }

  return (
    raw.includes(
      "你是 AIOS Runtime 的执行引擎"
    ) &&
    raw.includes(
      "内部执行步骤："
    ) &&
    raw.includes(
      "最终回答规则："
    )
  );
}

function sanitizeRestoredMessages(
  memory: MemoryRecord[]
): ChatMessage[] {
  return memory
    .filter(
      (item) =>
        (
          item.role === "user" ||
          item.role === "assistant"
        ) &&
        !isRuntimeWrapper(
          item.content
        )
    )
    .map((item) => ({
      role: item.role,
      content: item.content,
    }));
}

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
  const {
    locale,
  } = useLanguage();

  const copy =
    chatCopy[locale];

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>(
    []
  );

  const [loading, setLoading] =
    useState(false);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [
    providerState,
    setProviderState,
  ] =
    useState<ProviderViewState>(
      defaultProviderState
    );

  const bottomRef =
    useRef<HTMLDivElement>(
      null
    );

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

        if (
          runtimeResponse.ok
        ) {
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
          sanitizeRestoredMessages(
            memory
          );

        setMessages(
          restoredMessages.length > 0
            ? restoredMessages
            : [
                {
                  role:
                    "assistant",
                  content:
                    copy.welcome,
                },
              ]
        );
      } catch {
        if (active) {
          setMessages([
            {
              role:
                "assistant",
              content:
                copy.welcome,
            },
          ]);
        }
      } finally {
        if (active) {
          setHistoryLoading(
            false
          );
        }
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [locale, copy.welcome]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior:
          historyLoading
            ? "auto"
            : "smooth",
      }
    );
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

    setMessages(
      (current) => [
        ...current,
        {
          role: "user",
          content:
            cleanPrompt,
        },
      ]
    );

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              "x-aios-locale":
                locale,
            },

            body: JSON.stringify({
              prompt:
                cleanPrompt,
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
            copy.runtimeError
        );
      }

      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",
            content:
              data.content ??
              copy.unknownResponse,
          },
        ]
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : copy.connectionError;

      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",
            content:
              message,
          },
        ]
      );
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
      providerState.requestedProvider
    ];

  const providerSummary =
    providerState.fallbackUsed
      ? `${actualProviderLabel} ← ${requestedProviderLabel} ${copy.failed}`
      : actualProviderLabel;

  return (
    <section
      key={locale}
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
          padding:
            "18px 20px",
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
            margin:
              "6px 0 0",
            color:
              providerState.fallbackUsed
                ? "#b45309"
                : "#6b7280",
            fontSize: 13,
            fontWeight:
              providerState.fallbackUsed
                ? 700
                : 500,
          }}
        >
          {copy.memoryConnected} ·{" "}
          {providerSummary}
          {typeof providerState.latencyMs ===
            "number" &&
            ` · ${providerState.latencyMs}ms`}
        </p>

        {providerState.fallbackUsed &&
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
                lineHeight:
                  1.55,
                overflowWrap:
                  "anywhere",
              }}
            >
              <strong>
                {copy.providerFallback}
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
            {copy.restoring}
          </div>
        ) : (
          <MessageList
            messages={
              messages
            }
          />
        )}

        {loading && (
          <div
            aria-live="polite"
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 10,
              marginBottom:
                18,
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
                display:
                  "flex",
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
                fontWeight:
                  800,
              }}
            >
              AI
            </span>

            <span>
              {copy.thinking}
            </span>
          </div>
        )}

        <div
          ref={bottomRef}
        />
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
          onSend={
            handleSend
          }
        />
      </div>
    </section>
  );
}
