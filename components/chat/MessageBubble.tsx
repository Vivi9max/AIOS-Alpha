“use client”;

import AnswerRenderer from “./AnswerRenderer”;

interface MessageBubbleProps {
role: “user” | “assistant”;
content: string;
}

export default function MessageBubble({
role,
content,
}: MessageBubbleProps) {
const isUser = role === “user”;

return (
<div
style={{
width: “100%”,
display: “flex”,
justifyContent: isUser
? “flex-end”
: “flex-start”,
alignItems: “flex-start”,
gap: 10,
marginBottom: 18,
}}
>
{!isUser && (
<div
style={{
width: 36,
height: 36,
flexShrink: 0,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
borderRadius: “50%”,
background: “#111827”,
color: “#ffffff”,
fontSize: 12,
fontWeight: 800,
}}
>
AI
)}

  <div
    style={{
      maxWidth: "82%",
      minWidth: 0,
      padding: isUser
        ? "12px 14px"
        : "14px 15px",
      borderRadius: isUser
        ? "16px 16px 4px 16px"
        : "16px 16px 16px 4px",
      background: isUser
        ? "#111827"
        : "#ffffff",
      color: isUser
        ? "#ffffff"
        : "#111827",
      border: isUser
        ? "none"
        : "1px solid #e5e7eb",
      lineHeight: 1.6,
      overflowWrap: "anywhere",
      boxShadow:
        "0 4px 14px rgba(15, 23, 42, 0.05)",
    }}
  >
    {isUser ? (
      <div
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 14,
          lineHeight: 1.65,
        }}
      >
        {content}
      </div>
    ) : (
      <AnswerRenderer
        content={content}
      />
    )}
  </div>
  {isUser && (
    <div
      style={{
        width: 36,
        height: 36,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "#4f46e5",
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      V
    </div>
  )}
</div>

);
}
