import type {
  StorageAdapter,
} from "./types";

type MemoryStorageGlobal =
  typeof globalThis & {
    __aiosPersistentMemory?: Map<
      string,
      unknown
    >;
  };

const globalStorage =
  globalThis as MemoryStorageGlobal;

const memoryStore =
  globalStorage
    .__aiosPersistentMemory ??
  (globalStorage
    .__aiosPersistentMemory =
    new Map<string, unknown>());

export const memoryStorage:
  StorageAdapter = {
  mode: "memory",

  async get<T>(
    key: string
  ): Promise<T | null> {
    if (!memoryStore.has(key)) {
      return null;
    }

    return (
      memoryStore.get(key) as T
    );
  },

  async set<T>(
    key: string,
    value: T
  ): Promise<void> {
    memoryStore.set(
      key,
      value
    );
  },

  async delete(
    key: string
  ): Promise<void> {
    memoryStore.delete(key);
  },

  async health() {
    return {
      success: true,
      mode: "memory",
    };
  },
};