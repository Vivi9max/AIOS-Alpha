import { storage } from "@/lib/server-storage";

export interface MemoryRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

type MemoryGlobal = typeof globalThis & {
  __aiosMemory?: MemoryRecord[];
  __aiosMemorySequence?: number;
  __aiosMemoryHydrated?: boolean;
  __aiosMemoryHydrationPromise?: Promise<void>;
};

const globalMemory =
  globalThis as MemoryGlobal;

const STORAGE_KEY =
  "aios:default:conversation-memory";

const MAX_MEMORY_RECORDS = 100;

const memory: MemoryRecord[] =
  globalMemory.__aiosMemory ??
  (globalMemory.__aiosMemory = []);

function isMemoryRecord(
  value: unknown
): value is MemoryRecord {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const item =
    value as Partial<MemoryRecord>;

  return (
    typeof item.id === "number" &&
    (item.role === "user" ||
      item.role === "assistant") &&
    typeof item.content === "string" &&
    typeof item.timestamp === "number"
  );
}

function normalizeStoredMemory(
  value: unknown
): MemoryRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isMemoryRecord)
    .slice(-MAX_MEMORY_RECORDS);
}

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

async function persistMemory(): Promise<void> {
  await storage.set(
    STORAGE_KEY,
    [...memory]
  );
}

export async function hydrateMemory():
  Promise<void> {
  if (
    globalMemory.__aiosMemoryHydrated
  ) {
    return;
  }

  if (
    globalMemory
      .__aiosMemoryHydrationPromise
  ) {
    return globalMemory
      .__aiosMemoryHydrationPromise;
  }

  const hydrationPromise =
    (async () => {
      try {
        const stored =
          await storage.get<
            MemoryRecord[]
          >(STORAGE_KEY);

        const restored =
          normalizeStoredMemory(
            stored
          );

        memory.length = 0;
        memory.push(...restored);
      } catch (error) {
        console.error(
          "[AIOS Memory Hydration]",
          error
        );
      } finally {
        globalMemory.__aiosMemoryHydrated =
          true;

        globalMemory.__aiosMemoryHydrationPromise =
          undefined;
      }
    })();

  globalMemory.__aiosMemoryHydrationPromise =
    hydrationPromise;

  return hydrationPromise;
}

export function addMemory(
  role: "user" | "assistant",
  content: string
): MemoryRecord | null {
  const value =
    content.trim();

  if (!value) {
    return null;
  }

  const record: MemoryRecord = {
    id: createMemoryId(),
    role,
    content: value,
    timestamp: Date.now(),
  };

  memory.push(record);

  if (
    memory.length >
    MAX_MEMORY_RECORDS
  ) {
    memory.splice(
      0,
      memory.length -
        MAX_MEMORY_RECORDS
    );
  }

  return record;
}

export function addAssistantMemory(
  content: string
): MemoryRecord | null {
  return addMemory(
    "assistant",
    content
  );
}

export async function saveMemory():
  Promise<void> {
  try {
    await persistMemory();
  } catch (error) {
    console.error(
      "[AIOS Memory Save]",
      error
    );

    throw error;
  }
}

export async function addAndSaveMemory(
  role: "user" | "assistant",
  content: string
): Promise<MemoryRecord | null> {
  await hydrateMemory();

  const record =
    addMemory(role, content);

  if (record) {
    await saveMemory();
  }

  return record;
}

export async function addAndSaveAssistantMemory(
  content: string
): Promise<MemoryRecord | null> {
  return addAndSaveMemory(
    "assistant",
    content
  );
}

export function getMemory():
  MemoryRecord[] {
  return [...memory];
}

export async function getPersistentMemory():
  Promise<MemoryRecord[]> {
  await hydrateMemory();

  return getMemory();
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

  if (safeLimit === 0) {
    return [];
  }

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

export async function clearPersistentMemory():
  Promise<void> {
  clearMemory();

  globalMemory.__aiosMemoryHydrated =
    true;

  await storage.delete(
    STORAGE_KEY
  );
}

export function getMemoryStorageKey():
  string {
  return STORAGE_KEY;
}