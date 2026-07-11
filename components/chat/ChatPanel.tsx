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

  function send() {
    if (!input.trim()) return;

    setMessages([
      ...messages,
      {
        role: "user",
        content: input,
      },
    ]);

    setInput("");
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
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
      />
    </div>
  );
}