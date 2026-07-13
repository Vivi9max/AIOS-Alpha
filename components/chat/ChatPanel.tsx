"use client";

import { useEffect, useRef, useState } from "react";

import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "欢迎来到 AIOS Alpha。\n\nAI Engine 已连接。",
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
    const userMessage: Message = {
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
        body: JSON.stringify({
          prompt,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.content ??
            "Unknown Response",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Network Error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border">

      <div className="flex items-center justify-between px-6 py-5 border-b">

        <div>

          <h2 className="text-xl font-bold">
            AIOS Alpha
          </h2>

          <p className="text-sm text-gray-500">
            AI Engine
          </p>

        </div>

        <div className="flex items-center gap-2">

          <div className="w-2 h-2 rounded-full bg-green-500" />

          <span className="text-sm text-gray-500">
            Connected
          </span>

        </div>

      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            role={message.role}
            content={message.content}
          />
        ))}

        {loading && (
          <div className="text-sm text-gray-400">
            AIOS is thinking...
          </div>
        )}

        <div ref={bottomRef} />

      </div>

      <div className="border-t p-5">

        <ChatInput
          loading={loading}
          onSend={handleSend}
        />

      </div>

    </div>
  );
}