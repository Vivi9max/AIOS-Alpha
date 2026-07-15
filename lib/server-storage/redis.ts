import type {
  StorageAdapter,
} from "./types";

interface RedisResponse<T> {
  result?: T;
  error?: string;
}

const redisURL =
  process.env
    .UPSTASH_REDIS_REST_URL
    ?.trim() ?? "";

const redisToken =
  process.env
    .UPSTASH_REDIS_REST_TOKEN
    ?.trim() ?? "";

function encodeCommandPart(
  value: string
): string {
  return encodeURIComponent(value);
}

async function executeRedis<T>(
  command: string[]
): Promise<T> {
  if (
    !redisURL ||
    !redisToken
  ) {
    throw new Error(
      "Redis environment variables are missing."
    );
  }

  const path = command
    .map(encodeCommandPart)
    .join("/");

  const response = await fetch(
    `${redisURL}/${path}`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${redisToken}`,
      },

      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as RedisResponse<T>;

  if (
    !response.ok ||
    data.error
  ) {
    throw new Error(
      data.error ??
        `Redis request failed: ${response.status}`
    );
  }

  return data.result as T;
}

export const redisStorage:
  StorageAdapter = {
  mode: "redis",

  async get<T>(
    key: string
  ): Promise<T | null> {
    const result =
      await executeRedis<
        string | null
      >([
        "get",
        key,
      ]);

    if (
      typeof result !== "string"
    ) {
      return null;
    }

    try {
      return JSON.parse(
        result
      ) as T;
    } catch {
      return null;
    }
  },

  async set<T>(
    key: string,
    value: T
  ): Promise<void> {
    await executeRedis([
      "set",
      key,
      JSON.stringify(value),
    ]);
  },

  async delete(
    key: string
  ): Promise<void> {
    await executeRedis([
      "del",
      key,
    ]);
  },

  async health() {
    try {
      const result =
        await executeRedis<string>([
          "ping",
        ]);

      return {
        success:
          result === "PONG",
        mode: "redis" as const,
      };
    } catch (error) {
      return {
        success: false,
        mode: "redis" as const,
        error:
          error instanceof Error
            ? error.message
            : "Redis health check failed.",
      };
    }
  },
};