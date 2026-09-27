"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";
import {
  chatPanelCopy,
} from "@/lib/i18n/chat-panel";
import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";
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
  conversation?: MemoryRecord[];
  inputResult?: {
    success?: boolean;
    code?:
      | "AIOS_INPUT_ACCEPTED"
      | "AIOS_INPUT_PARTIAL"
      | "AIOS_INPUT_REJECTED";
    acceptedCount?: number;
    rejectedCount?: number;
    limitations?: string[];
  };
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
const defaultProviderState:
  ProviderViewState = {
  provider: "mock",
  requestedProvider: "mock",
  fallbackUsed: false,
};
function isRuntimeWrapper(
  content: string,
): boolean {
  const raw = content.trim();
  if (!raw) {
    return false;
  }
  return (
    raw.includes(
      "你是 AIOS Runtime 的执行引擎",
    ) &&
    raw.includes(
      "内部执行步骤：",
    ) &&
    raw.includes(
      "最终回答规则：",
    )
  );
}
function sanitizeRestoredMessages(
  memory: MemoryRecord[],
): ChatMessage[] {
  return memory
    .filter(
      (item) =>
        (
          item.role === "user" ||
          item.role === "assistant"
        ) &&
        !isRuntimeWrapper(
          item.content,
        ),
    )
    .map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
    }));
}
function normalizeProvider(
  value: unknown,
  fallback: ProviderName = "mock",
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
function buildInputSummary(
  inputs: AIOSInputItem[],
): string {
  const names = inputs
    .map(
      (item) =>
        item.metadata.name,
    )
    .filter(
      (
        name,
      ): name is string =>
        typeof name === "string" &&
        name.trim().length > 0,
    );
  if (names.length === 0) {
    return `Attached inputs: ${inputs.length}`;
  }
  return `Attached inputs: ${names.join(", ")}`;
}
export default function ChatPanel() {
  const {
    locale,
  } = useLanguage();
  const copy =
    chatPanelCopy[locale];
  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>(
    [],
  );
  const [
    loading,
    setLoading,
  ] = useState(false);
  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);
  const [
    providerState,
    setProviderState,
  ] =
    useState<ProviderViewState>(
      defaultProviderState,
    );
  const scrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );
  const scrollToBottom =
    useCallback(
      (
        behavior:
          | ScrollBehavior
          = "smooth",
      ) => {
        window.requestAnimationFrame(
          () => {
            const element =
              scrollRef.current;
            if (!element) {
              return;
            }
            element.scrollTo({
              top:
                element.scrollHeight,
              behavior,
            });
          },
        );
      },
      [],
    );
  const loadConversation =
    useCallback(
      async (
        showLoading = false,
      ): Promise<
        ChatMessage[] | null
      > => {
        if (showLoading) {
          setHistoryLoading(true);
        }
        try {
          const response =
            await fetch(
              "/api/memory",
              {
                cache:
                  "no-store",
                credentials:
                  "same-origin",
                headers: {
                  "Cache-Control":
                    "no-cache",
                },
              },
            );
          if (!response.ok) {
            throw new Error(
              "Failed to load chat history.",
            );
          }
          const data =
            await response.json();
          const memory:
            MemoryRecord[] =
            Array.isArray(
              data.items,
            )
              ? data.items
              : [];
          const restoredMessages =
            sanitizeRestoredMessages(
              memory,
            );
          const nextMessages =
            restoredMessages.length >
            0
              ? restoredMessages
              : [
                  {
                    role:
                      "assistant" as const,
                    content:
                      copy.welcome,
                  },
                ];
          setMessages(
            nextMessages,
          );
          return nextMessages;
        } catch (error) {
          console.error(
            "[AIOS Chat History]",
            error,
          );
          return null;
        } finally {
          if (showLoading) {
            setHistoryLoading(
              false,
            );
          }
        }
      },
      [copy.welcome],
    );
  const loadRuntimeStatus =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/runtime/status",
              {
                cache:
                  "no-store",
                credentials:
                  "same-origin",
              },
            );
          if (!response.ok) {
            return;
          }
          const runtimeData =
            (await response.json()) as
              RuntimeStatusResponse;
          const runtime =
            runtimeData.providerRuntime;
          const activeProvider =
            normalizeProvider(
              runtimeData.provider,
              "mock",
            );
          const actualProvider =
            normalizeProvider(
              runtime?.provider,
              activeProvider,
            );
          const requestedProvider =
            normalizeProvider(
              runtime?.requestedProvider,
              activeProvider,
            );
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
        } catch (error) {
          console.error(
            "[AIOS Runtime Status]",
            error,
          );
        }
      },
      [],
    );
  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      await Promise.all([
        loadConversation(true),
        loadRuntimeStatus(),
      ]);
      if (!active) {
        return;
      }
      scrollToBottom("auto");
    }
    void loadInitialData();
    return () => {
      active = false;
    };
  }, [
    loadConversation,
    loadRuntimeStatus,
    scrollToBottom,
  ]);
  useEffect(() => {
    scrollToBottom(
      historyLoading
        ? "auto"
        : "smooth",
    );
  }, [
    messages,
    loading,
    historyLoading,
    scrollToBottom,
  ]);
  function handleMessageDeleted(
    messageId: number,
  ) {
    setMessages(
      (current) =>
        current.filter(
          (message) =>
            message.id !==
            messageId,
        ),
    );
  }
  async function handleSend(
    prompt: string,
    inputs?: AIOSInputItem[],
  ) {
    const cleanPrompt =
      prompt.trim();
    const normalizedInputs =
      Array.isArray(inputs)
        ? inputs
        : [];
    if (
      (
        !cleanPrompt &&
        normalizedInputs.length === 0
      ) ||
      loading
    ) {
      return;
    }
    const userContent =
      cleanPrompt ||
      buildInputSummary(
        normalizedInputs,
      );
    setMessages(
      (current) => [
        ...current,
        {
          role: "user",
          content:
            userContent,
        },
      ],
    );
    setLoading(true);
    scrollToBottom("smooth");
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
            credentials:
              "same-origin",
            body:
              JSON.stringify({
                prompt:
                  cleanPrompt,
                inputs:
                  normalizedInputs,
              }),
          },
        );
      const data =
        (await response.json()) as
          ChatApiResponse;
      const actualProvider =
        normalizeProvider(
          data.provider,
          "mock",
        );
      const requestedProvider =
        normalizeProvider(
          data.requestedProvider,
          actualProvider,
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
            copy.runtimeError,
        );
      }
      const assistantContent =
        typeof data.content ===
          "string" &&
        data.content.trim()
          ? data.content.trim()
          : copy.unknownResponse;
      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",
            content:
              assistantContent,
          },
        ],
      );
      scrollToBottom("smooth");
      window.requestAnimationFrame(
        () => {
          if (
            !Array.isArray(
              data.conversation,
            )
          ) {
            return;
          }
          const canonical =
            sanitizeRestoredMessages(
              data.conversation,
            );
          if (
            canonical.length ===
            0
          ) {
            return;
          }
          const canonicalHasLatestAssistant =
            canonical.some(
              (message) =>
                message.role ===
                  "assistant" &&
                message.content ===
                  assistantContent,
            );
          if (
            !canonicalHasLatestAssistant
          ) {
            return;
          }
          setMessages(
            canonical,
          );
          scrollToBottom(
            "smooth",
          );
        },
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
        ],
      );
      scrollToBottom("smooth");
    } finally {
      setLoading(false);
      void loadRuntimeStatus();
      window.requestAnimationFrame(
        () =>
          scrollToBottom(
            "smooth",
          ),
      );
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
      ? `${actualProviderLabel} <- ${requestedProviderLabel}`
      : actualProviderLabel;
  return (
    <section
      style={{
        minHeight:
          "calc(100vh - 150px)",
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
          "0 8px 28px rgba(15, 23, 42, 0.05)",
      }}
    >
      <header
        style={{
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          gap: 12,
          padding:
            "14px 18px",
          borderBottom:
            "1px solid #eef2f7",
          background:
            "#ffffff",
        }}
      >
        <div>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius:
                  "50%",
                background:
                  providerState.fallbackUsed
                    ? "#f59e0b"
                    : "#22c55e",
              }}
            />
            <strong
              style={{
                color:
                  "#111827",
                fontSize: 15,
                letterSpacing:
                  "-0.01em",
              }}
            >
              AIOS
            </strong>
          </div>
          <div
            style={{
              marginTop: 3,
              color:
                "#94a3b8",
              fontSize: 11,
            }}
          >
            {providerSummary}
            {typeof providerState.latencyMs ===
              "number" &&
              ` · ${providerState.latencyMs}ms`}
          </div>
        </div>
        {providerState.fallbackUsed &&
          providerState.error && (
            <span
              title={
                providerState.error
              }
              style={{
                color:
                  "#b45309",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Fallback
            </span>
          )}
      </header>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY:
            "auto",
          padding:
            "24px 18px 30px",
          background:
            "#ffffff",
          WebkitOverflowScrolling:
            "touch",
        }}
      >
        {historyLoading ? (
          <div
            style={{
              minHeight: 160,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              color:
                "#94a3b8",
              fontSize: 13,
            }}
          >
            {copy.restoring}
          </div>
        ) : (
          <MessageList
            messages={
              messages
            }
            onMessageDeleted={
              handleMessageDeleted
            }
            onConversationChanged={
              () =>
                void loadConversation(
                  false,
                )
            }
          />
        )}
        {loading && (
          <div
            aria-live="polite"
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 10,
              marginTop: 6,
              color:
                "#94a3b8",
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexShrink: 0,
                borderRadius:
                  "50%",
                background:
                  "#111827",
                color:
                  "#ffffff",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              AI
            </span>
            <span>
              {copy.thinking}
            </span>
          </div>
        )}
      </div>
      <div
        style={{
          padding:
            "12px 14px 14px",
          borderTop:
            "1px solid #eef2f7",
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
