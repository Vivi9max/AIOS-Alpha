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

function getMemoryStates():
  Map<string, UserMemoryState> {
  return (
    globalMemory
      .__aiosUserMemoryStates ??
    (globalMemory
      .__aiosUserMemoryStates =
      new Map())
  );
}

const userMemoryStates =
  getMemoryStates();

function getStorageKey():
  string {
  return createUserStorageKey(
    "conversation-memory"
  );
}

/**
 * C141.6:
 * Persisted conversation history is data, never Runtime policy.
 *
 * Older releases could have stored the Founder/Runtime wrapper
 * as a user message. Those records must not be allowed to survive
 * hydration and become active conversation context after refresh.
 */
function sanitizeMemoryContent(
  content: string
): string | null {
  const raw =
    content.trim();

  if (!raw) {
    return null;
  }

  const hasRuntimeWrapper =
    raw.includes(
      "你是 AIOS Runtime 的执行引擎"
    ) &&
    raw.includes(
      "内部执行步骤："
    ) &&
    raw.includes(
      "最终回答规则："
    ) &&
    raw.includes(
      "用户请求："
    );

  if (!hasRuntimeWrapper) {
    return raw;
  }

  const marker =
    "用户请求：";

  const requestIndex =
    raw.lastIndexOf(
      marker
    );

  if (requestIndex < 0) {
    return null;
  }

  const extracted =
    raw
      .slice(
        requestIndex +
          marker.length
      )
      .trim();

  return extracted
    ? extracted
        .replace(/\s+/g, " ")
        .trim()
    : null;
}

function sanitizeMemoryRecord(
  item: MemoryRecord
): MemoryRecord | null {
  const content =
    sanitizeMemoryContent(
      item.content
    );

  if (!content) {
    return null;
  }

  return {
    ...item,
    content,
  };
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
    .map(
      sanitizeMemoryRecord
    )
    .filter(
      (
        item
      ): item is MemoryRecord =>
        item !== null
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
      state.sequence + 1
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

        /*
         * If legacy polluted records were removed or normalized,
         * persist the cleaned snapshot immediately. This makes the
         * recovery permanent rather than only fixing one request.
         */
        if (
          Array.isArray(stored)
        ) {
          const original =
            stored.filter(
              isMemoryRecord
            );

          const changed =
            JSON.stringify(
              original
            ) !==
            JSON.stringify(
              restored
            );

          if (changed) {
            await storage.set(
              storageKey,
              [
                ...restored,
              ]
            );
          }
        }

        /*
         * Keep sequence ahead of restored IDs.
         * This prevents a newly created message from accidentally
         * colliding with an existing restored record.
         */
        const maxId =
          state.records.reduce(
            (
              maximum,
              item
            ) =>
              Math.max(
                maximum,
                item.id
              ),
            0
          );

        const sequence =
          maxId %
          1000;

        state.sequence =
          Number.isFinite(
            sequence
          )
            ? sequence
            : 0;
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
    sanitizeMemoryContent(
      content
    );

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

/**
 * C143.18:
 * Remove one conversation record from the current user's memory.
 *
 * The complete removed record is returned so the caller can offer
 * an explicit undo operation without reconstructing the message.
 */
export function removeMemoryById(
  id: number
): MemoryRecord | null {
  const state =
    getMemoryState();

  const index =
    state.records.findIndex(
      (item) =>
        item.id === id
    );

  if (index < 0) {
    return null;
  }

  const [
    removed,
  ] =
    state.records.splice(
      index,
      1
    );

  return removed ?? null;
}

/**
 * C143.18:
 * Restore an exact previously removed record.
 *
 * Records are ordered by timestamp and ID after restoration so
 * undo does not disturb chronological conversation order.
 */
export function restoreMemoryRecord(
  record: MemoryRecord
): MemoryRecord | null {
  if (
    !isMemoryRecord(
      record
    )
  ) {
    return null;
  }

  const state =
    getMemoryState();

  const sanitized =
    sanitizeMemoryRecord(
      record
    );

  if (!sanitized) {
    return null;
  }

  const exists =
    state.records.some(
      (item) =>
        item.id ===
        sanitized.id
    );

  if (exists) {
    return (
      state.records.find(
        (item) =>
          item.id ===
          sanitized.id
      ) ?? null
    );
  }

  state.records.push(
    sanitized
  );

  state.records.sort(
    (a, b) => {
      if (
        a.timestamp !==
        b.timestamp
      ) {
        return (
          a.timestamp -
          b.timestamp
        );
      }

      return (
        a.id -
        b.id
      );
    }
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

  const sequence =
    sanitized.id %
    1000;

  if (
    Number.isFinite(
      sequence
    )
  ) {
    state.sequence =
      sequence;
  }

  return sanitized;
}

export async function removeAndSaveMemory(
  id: number
): Promise<MemoryRecord | null> {
  await hydrateMemory();

  const removed =
    removeMemoryById(
      id
    );

  if (!removed) {
    return null;
  }

  await saveMemory();

  return removed;
}

export async function restoreAndSaveMemory(
  record: MemoryRecord
): Promise<MemoryRecord | null> {
  await hydrateMemory();

  const restored =
    restoreMemoryRecord(
      record
    );

  if (!restored) {
    return null;
  }

  await saveMemory();

  return restored;
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
