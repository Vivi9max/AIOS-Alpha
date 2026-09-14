"use client";

import AnswerRenderer from "./AnswerRenderer";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export default function MessageBubble({
  role,
  content,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        width: "100%",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "min(760px, 92%)",
          padding: isUser ? "10px 14px" : "4px 0",
          borderRadius: isUser ? 16 : 0,
          background: isUser ? "#f1f5f9" : "transparent",
          color: "#111827",
          fontSize: 15,
          lineHeight: 1.65,
          overflowWrap: "anywhere",
        }}
      >
        {isUser ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
        ) : (
          <AnswerRenderer content={content} />
        )}
      </div>
    </div>
  );
}
