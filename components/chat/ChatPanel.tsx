"use client";

import { useEffect, useRef, useState } from "react";

import ChatInput from "./ChatInput";
import MessageList, { type ChatMessage } from "./MessageList";

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "欢迎来到 AIOS Alpha。\n\nAI Engine 已连接。",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function handleSend(prompt: string) {
    const userMessage: ChatMessage = {
      role: "user",
      content: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content ?? "Unknown Response",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network Error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full bg-white rounded-2xl shadow flex flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <MessageList messages={messages} />

        {loading && (
          <div className="text-sm text-gray-400">
            AIOS is thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4">
        <ChatInput
          loading={loading}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}