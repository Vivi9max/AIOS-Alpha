export interface MemoryRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

type MemoryGlobal = typeof globalThis & {
  __aiosMemory?: MemoryRecord[];
};

const globalMemory = globalThis as MemoryGlobal;

const memory: MemoryRecord[] =
  globalMemory.__aiosMemory ??
  (globalMemory.__aiosMemory = []);

export function addMemory(
  role: "user" | "assistant",
  content: string
) {
  const value = content.trim();

  if (!value) {
    return;
  }

  memory.push({
    id: Date.now(),
    role,
    content: value,
    timestamp: Date.now(),
  });

  if (memory.length > 100) {
    memory.splice(0, memory.length - 100);
  }
}

export function addAssistantMemory(
  content: string
) {
  addMemory("assistant", content);
}

export function getMemory(): MemoryRecord[] {
  return [...memory];
}

export function searchMemory(
  keyword: string
): MemoryRecord[] {
  const query = keyword
    .trim()
    .toLowerCase();

  if (!query) {
    return [];
  }

  return memory.filter((item) =>
    item.content
      .toLowerCase()
      .includes(query)
  );
}

export function getRecentMemory(
  limit = 10
): MemoryRecord[] {
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