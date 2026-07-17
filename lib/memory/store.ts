import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
  getUserStorageScope,
} from "@/lib/storage/data-scope";

export interface MemoryRecord {
  id: number;
  role:
    | "user"
    | "assistant";
  content: string;
  timestamp: number;
}

interface UserMemoryState {
  records: MemoryRecord[];
  sequence: number;
  hydrated: boolean;
  hydrationPromise?: Promise<void>;
}

type MemoryGlobal =
  typeof globalThis & {
    __aiosUserMemoryStates?: Map<
      string,
      UserMemoryState
    >;
  };

const globalMemory =
  globalThis as MemoryGlobal;

const MAX_MEMORY_RECORDS =
  100;

const userMemoryStates =
  globalMemory
    .__aiosUserMemoryStates ??
  (globalMemory
    .__aiosUserMemoryStates =
    new Map());

function getStorageKey():
  string {
  return createUserStorageKey(
    "conversation-memory"
  );
}

function getMemoryState():
  UserMemoryState {
  const scope =
    getUserStorageScope();

  const existing =
    userMemoryStates.get(
      scope
    );

  if (existing) {
    return existing;
  }

  const created:
    UserMemoryState = {
    records: [],
    sequence: 0,
    hydrated: false,
  };

  userMemoryStates.set(
    scope,
    created
  );

  return created;
}

function isMemoryRecord(
  value: unknown
): value is MemoryRecord {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const item =
    value as Partial<MemoryRecord>;

  return (
    typeof item.id ===
      "number" &&
    (
      item.role ===
        "user" ||
      item.role ===
        "assistant"
    ) &&
    typeof item.content ===
      "string" &&
    typeof item.timestamp ===
      "number"
  );
}

function normalizeStoredMemory(
  value: unknown
): MemoryRecord[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      isMemoryRecord
    )
    .slice(
      -MAX_MEMORY_RECORDS
    );
}

function createMemoryId():
  number {
  const state =
    getMemoryState();

  state.sequence =
    (
      state.sequence +
      1
    ) %
    1000;

  return (
    Date.now() *
      1000 +
    state.sequence
  );
}

async function persistMemory():
  Promise<void> {
  const state =
    getMemoryState();

  await storage.set(
    getStorageKey(),
    [
      ...state.records,
    ]
  );
}

export async function hydrateMemory():
  Promise<void> {
  const state =
    getMemoryState();

  if (
    state.hydrated
  ) {
    return;
  }

  if (
    state.hydrationPromise
  ) {
    return state
      .hydrationPromise;
  }

  const storageKey =
    getStorageKey();

  const hydrationPromise =
    (async () => {
      try {
        const stored =
          await storage.get<
            MemoryRecord[]
          >(
            storageKey
          );

        const restored =
          normalizeStoredMemory(
            stored
          );

        state.records.length =
          0;

        state.records.push(
          ...restored
        );
      } catch (error) {
        console.error(
          "[AIOS Memory Hydration]",
          error
        );
      } finally {
        state.hydrated =
          true;

        state.hydrationPromise =
          undefined;
      }
    })();

  state.hydrationPromise =
    hydrationPromise;

  return hydrationPromise;
}

export function addMemory(
  role:
    | "user"
    | "assistant",
  content: string
): MemoryRecord | null {
  const value =
    content.trim();

  if (!value) {
    return null;
  }

  const state =
    getMemoryState();

  const record:
    MemoryRecord = {
    id:
      createMemoryId(),

    role,

    content:
      value,

    timestamp:
      Date.now(),
  };

  state.records.push(
    record
  );

  if (
    state.records.length >
    MAX_MEMORY_RECORDS
  ) {
    state.records.splice(
      0,
      state.records.length -
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
  role:
    | "user"
    | "assistant",
  content: string
): Promise<MemoryRecord | null> {
  await hydrateMemory();

  const record =
    addMemory(
      role,
      content
    );

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
  const state =
    getMemoryState();

  return [
    ...state.records,
  ];
}

export async function getPersistentMemory():
  Promise<MemoryRecord[]> {
  await hydrateMemory();

  return getMemory();
}

export function searchMemory(
  keyword: string
): MemoryRecord[] {
  const query =
    keyword
      .trim()
      .toLowerCase();

  if (!query) {
    return [];
  }

  return getMemory().filter(
    (item) =>
      item.content
        .toLowerCase()
        .includes(
          query
        )
  );
}

export function getRecentMemory(
  limit = 10
): MemoryRecord[] {
  const safeLimit =
    Math.max(
      0,
      Math.floor(
        limit
      )
    );

  if (
    safeLimit === 0
  ) {
    return [];
  }

  return getMemory().slice(
    -safeLimit
  );
}

export function buildConversationContext(
  limit = 10
): string {
  return getRecentMemory(
    limit
  )
    .map(
      (item) =>
        `${item.role}: ${item.content}`
    )
    .join("\n");
}

export function clearMemory():
  void {
  const state =
    getMemoryState();

  state.records.length =
    0;

  state.sequence =
    0;
}

export async function clearPersistentMemory():
  Promise<void> {
  const state =
    getMemoryState();

  clearMemory();

  state.hydrated =
    true;

  await storage.delete(
    getStorageKey()
  );
}

export function getMemoryStorageKey():
  string {
  return getStorageKey();
}