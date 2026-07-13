interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({
  role,
  content,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full mb-6 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="mr-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
            AI
          </div>
        </div>
      )}

      <div
        className={`rounded-3xl px-5 py-4 max-w-[80%] whitespace-pre-wrap break-words shadow-sm ${
          isUser
            ? "bg-black text-white"
            : "bg-gray-100 text-black"
        }`}
      >
        {content}
      </div>

      {isUser && (
        <div className="ml-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            U
          </div>
        </div>
      )}
    </div>
  );
}