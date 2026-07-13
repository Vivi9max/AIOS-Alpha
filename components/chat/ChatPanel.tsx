"use client";

import { useState } from "react";
import Message from "./Message";
import ChatInput from "./ChatInput";

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Welcome to AIOS.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;

    const prompt = input;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: prompt,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.content ??
            "AI returned an empty response.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Failed to connect to AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          flex: 1,
          padding: 20,
          overflowY: "auto",
        }}
      >
        {messages.map((message, index) => (
          <Message
            key={index}
            role={message.role as "user" | "assistant"}
            content={message.content}
          />
        ))}

        {loading && (
          <Message
            role="assistant"
            content="Thinking..."
          />
        )}
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
      />
    </div>
  );
}