import type {
  StorageAdapter,
} from "./types";

import {
  memoryStorage,
} from "./memory";

import {
  redisStorage,
} from "./redis";

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

export const storage:
  StorageAdapter =
  hasRedisConfiguration()
    ? redisStorage
    : memoryStorage;

export function getStorageMode() {
  return storage.mode;
}

export async function getStorageHealth() {
  return storage.health();
}