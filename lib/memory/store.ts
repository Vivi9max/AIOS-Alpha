export interface MemoryRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

type MemoryGlobal = typeof globalThis & {
  __aiosMemory?: MemoryRecord[];
  __aiosMemorySequence?: number;
};

const globalMemory =
  globalThis as MemoryGlobal;

const memory: MemoryRecord[] =
  globalMemory.__aiosMemory ??
  (globalMemory.__aiosMemory = []);

function createMemoryId(): number {
  const nextSequence =
    ((globalMemory.__aiosMemorySequence ??
      0) +
      1) %
    1000;

  globalMemory.__aiosMemorySequence =
    nextSequence;

  return (
    Date.now() * 1000 +
    nextSequence
  );
}

export function addMemory(
  role: "user" | "assistant",
  content: string
) {
  const value = content.trim();

  if (!value) {
    return;
  }

  const now = Date.now();

  memory.push({
    id: createMemoryId(),
    role,
    content: value,
    timestamp: now,
  });

  if (memory.length > 100) {
    memory.splice(
      0,
      memory.length - 100
    );
  }
}

export function addAssistantMemory(
  content: string
) {
  addMemory(
    "assistant",
    content
  );
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
  const safeLimit = Math.max(
    0,
    Math.floor(limit)
  );

  return memory.slice(
    -safeLimit
  );
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

  globalMemory.__aiosMemorySequence =
    0;
}