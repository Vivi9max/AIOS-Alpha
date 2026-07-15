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

const welcomeMessage: ChatMessage = {
  role: "assistant",
  content:
    "欢迎来到 AIOS Alpha。\n\nAI Engine 已连接。",
};

export default function ChatPanel() {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [historyLoading, setHistoryLoading] =
    useState(true);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const response = await fetch(
          "/api/memory",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load chat history."
          );
        }

        const data =
          await response.json();

        const memory: MemoryRecord[] =
          Array.isArray(data.items)
            ? data.items
            : [];

        if (!active) {
          return;
        }

        const restoredMessages =
          memory
            .filter(
              (item) =>
                item.role === "user" ||
                item.role === "assistant"
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

    loadHistory();

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
        await response.json();

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
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "连接失败，请稍后再试。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        minHeight:
          "calc(100vh - 165px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#ffffff",
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
            color: "#6b7280",
            fontSize: 13,
          }}
        >
          Memory connected · Provider
          Mock
        </p>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "22px 18px",
          background: "#f8fafc",
        }}
      >
        {historyLoading ? (
          <div
            style={{
              padding: 18,
              color: "#6b7280",
              textAlign: "center",
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
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                borderRadius: "50%",
                background: "#111827",
                color: "#ffffff",
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
          background: "#ffffff",
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