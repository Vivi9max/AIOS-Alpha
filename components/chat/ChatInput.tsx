"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

interface Props {
  loading: boolean;
  onSend: (text: string) => void;
}

export default function ChatInput({
  loading,
  onSend,
}: Props) {
  const [value, setValue] =
    useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      150
    )}px`;
  }, [value]);

  function send() {
    const text = value.trim();

    if (!text || loading) {
      return;
    }

    onSend(text);
    setValue("");
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        width: "100%",
      }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={loading}
        placeholder="Message AIOS..."
        onChange={(event) =>
          setValue(event.target.value)
        }
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();
            send();
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          maxHeight: 150,
          boxSizing: "border-box",
          padding: "13px 15px",
          border:
            "1px solid #d1d5db",
          borderRadius: 14,
          background: loading
            ? "#f3f4f6"
            : "#ffffff",
          color: "#111827",
          fontSize: 16,
          lineHeight: 1.45,
          resize: "none",
          outline: "none",
          overflowY: "auto",
        }}
      />

      <button
        type="button"
        disabled={
          loading ||
          !value.trim()
        }
        onClick={send}
        aria-label="发送消息"
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          border: 0,
          borderRadius: 14,
          background:
            loading ||
            !value.trim()
              ? "#d1d5db"
              : "#111827",
          color: "#ffffff",
          fontSize: 21,
          fontWeight: 800,
          cursor:
            loading ||
            !value.trim()
              ? "not-allowed"
              : "pointer",
        }}
      >
        {loading ? "…" : "↑"}
      </button>
    </div>
  );
}