export interface MemoryRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const memory: MemoryRecord[] = [];

export function addMemory(
  role: "user" | "assistant",
  content: string
) {
  memory.push({
    id: Date.now(),
    role,
    content,
    timestamp: Date.now(),
  });
}

export function addAssistantMemory(
  content: string
) {
  addMemory("assistant", content);
}

export function getMemory() {
  return memory;
}

export function searchMemory(keyword: string) {
  const q = keyword.trim().toLowerCase();

  if (!q) {
    return [];
  }

  return memory.filter((item) =>
    item.content.toLowerCase().includes(q)
  );
}

export function getRecentMemory(
  limit = 10
) {
  return memory.slice(-limit);
}

export function buildConversationContext(
  limit = 10
): string {
  return getRecentMemory(limit)
    .map(
      (item) =>
        `${item.role}: ${item.content}`
    )
    .join("\n");
}

export function clearMemory() {
  memory.length = 0;
}