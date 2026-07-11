"use client";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatInput({
  value,
  onChange,
  onSend,
}: ChatInputProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 16,
        borderTop: "1px solid #eee",
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask AIOS..."
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ddd",
          fontSize: 16,
        }}
      />

      <button
        onClick={onSend}
        style={{
          padding: "12px 18px",
          borderRadius: 8,
          border: "none",
          background: "#111",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Send
      </button>
    </div>
  );
}