import type {
  StorageAdapter,
} from "./types";

import {
  memoryStorage,
} from "./memory";

import {
  redisStorage,
} from "./redis";

const DEFAULT_WORKSPACE_ID =
  "default";

function hasRedisConfiguration():
  boolean {
  return Boolean(
    process.env
      .UPSTASH_REDIS_REST_URL
      ?.trim() &&
    process.env
      .UPSTASH_REDIS_REST_TOKEN
      ?.trim()
  );
}

function sanitizeWorkspaceId(
  value: string | undefined
): string {
  const cleaned =
    value
      ?.trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]+/g,
        "-"
      )
      .replace(
        /^[-_]+|[-_]+$/g,
        ""
      )
      .slice(0, 64);

  return (
    cleaned ||
    DEFAULT_WORKSPACE_ID
  );
}

const workspaceId =
  sanitizeWorkspaceId(
    process.env
      .AIOS_WORKSPACE_ID
  );

const baseStorage:
  StorageAdapter =
  hasRedisConfiguration()
    ? redisStorage
    : memoryStorage;

function namespaceKey(
  key: string
): string {
  const defaultPrefix =
    "aios:default:";

  /*
   * 默认 Workspace 必须继续使用旧 Key，
   * 确保 C90-C98 已保存的数据不会迁移或丢失。
   */
  if (
    workspaceId ===
    DEFAULT_WORKSPACE_ID
  ) {
    return key;
  }

  if (
    key.startsWith(
      defaultPrefix
    )
  ) {
    return [
      "aios:",
      workspaceId,
      ":",
      key.slice(
        defaultPrefix.length
      ),
    ].join("");
  }

  if (
    key.startsWith(
      "aios:"
    )
  ) {
    return [
      "aios:",
      workspaceId,
      ":",
      key.slice(5),
    ].join("");
  }

  return [
    "aios:",
    workspaceId,
    ":",
    key,
  ].join("");
}

export const storage:
  StorageAdapter = {
  mode:
    baseStorage.mode,

  async get<T>(
    key: string
  ): Promise<T | null> {
    return baseStorage.get<T>(
      namespaceKey(key)
    );
  },

  async set<T>(
    key: string,
    value: T
  ): Promise<void> {
    await baseStorage.set(
      namespaceKey(key),
      value
    );
  },

  async delete(
    key: string
  ): Promise<void> {
    await baseStorage.delete(
      namespaceKey(key)
    );
  },

  async health() {
    return baseStorage.health();
  },
};

export function getStorageMode() {
  return storage.mode;
}

export function getWorkspaceId():
  string {
  return workspaceId;
}

export function getNamespacedStorageKey(
  key: string
): string {
  return namespaceKey(key);
}

export async function getStorageHealth() {
  return storage.health();
}