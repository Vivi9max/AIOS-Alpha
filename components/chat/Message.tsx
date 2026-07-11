type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

export default function Message({
  role,
  content,
}: MessageProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          role === "user"
            ? "flex-end"
            : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          padding: "12px 16px",
          borderRadius: 12,
          background:
            role === "user"
              ? "#111"
              : "#f2f2f2",
          color:
            role === "user"
              ? "#fff"
              : "#111",
        }}
      >
        {content}
      </div>
    </div>
  );
}