import MessageBubble from "./MessageBubble";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  messages: ChatMessage[];
}

export default function MessageList({
  messages,
}: Props) {
  return (
    <>
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          role={message.role}
          content={message.content}
        />
      ))}
    </>
  );
}