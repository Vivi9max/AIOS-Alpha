"use client";

import { useState } from "react";

interface Props {
  loading: boolean;
  onSend: (text: string) => void;
}

export default function ChatInput({
  loading,
  onSend,
}: Props) {
  const [value, setValue] = useState("");

  function send() {
    const text = value.trim();

    if (!text || loading) return;

    onSend(text);

    setValue("");
  }

  return (
    <div className="flex items-end gap-3">

      <textarea
        rows={2}
        value={value}
        disabled={loading}
        placeholder="Message AIOS..."
        className="flex-1 rounded-2xl border border-gray-300 p-4 resize-none outline-none focus:border-black"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />

      <button
        disabled={loading}
        onClick={send}
        className="h-12 px-6 rounded-full bg-black text-white disabled:opacity-50"
      >
        {loading ? "..." : "➜"}
      </button>

    </div>
  );
}