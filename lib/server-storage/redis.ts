import type {
  StorageAdapter,
} from "./types";
interface RedisResponse<T> {
  result?: T;
  error?: string;
}
const redisURL =
  process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
function encodeCommandPart(value: string): string {
  return encodeURIComponent(value);
}
async function executeRedis<T>(command: string[]): Promise<T> {
  if (!redisURL || !redisToken) {
    throw new Error("Redis environment variables are missing.");
  }
  const path = command.map(encodeCommandPart).join("/");
  const response = await fetch(`${redisURL}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
    },
    cache: "no-store",
  });
  const data = (await response.json()) as RedisResponse<T>;
  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Redis request failed: ${response.status}`);
  }
  return data.result as T;
}
export interface AtomicMarketResearchUsageResult {
  month: string;
  count: number;
  updatedAt: number;
  reserved: boolean;
}
const RESERVE_MARKET_RESEARCH_SCRIPT = [
  "local raw = redis.call('GET', KEYS[1])",
  "local record = nil",
  "if raw then local ok, parsed = pcall(cjson.decode, raw); if ok and type(parsed) == 'table' then record = parsed end end",
  "if not record or record.month ~= ARGV[1] or type(record.count) ~= 'number' then record = {month=ARGV[1], count=0, updatedAt=tonumber(ARGV[3])} end",
  "local limit = tonumber(ARGV[2])",
  "if limit and limit >= 0 and record.count >= limit then record.reserved = false; return cjson.encode(record) end",
  "record.count = math.floor(math.max(0, record.count)) + 1",
  "record.updatedAt = tonumber(ARGV[3])",
  "record.reserved = true",
  "redis.call('SET', KEYS[1], cjson.encode({month=record.month, count=record.count, updatedAt=record.updatedAt}))",
  "return cjson.encode(record)",
].join("\n");
const RELEASE_MARKET_RESEARCH_SCRIPT = [
  "local raw = redis.call('GET', KEYS[1])",
  "if not raw then return '0' end",
  "local ok, record = pcall(cjson.decode, raw)",
  "if not ok or type(record) ~= 'table' or record.month ~= ARGV[1] or type(record.count) ~= 'number' then return '0' end",
  "record.count = math.max(0, math.floor(record.count) - 1)",
  "record.updatedAt = tonumber(ARGV[2])",
  "redis.call('SET', KEYS[1], cjson.encode(record))",
  "return '1'",
].join("\n");
export async function reserveMarketResearchUsageAtomic(
  key: string,
  month: string,
  limit: number | null,
  now: number,
): Promise<AtomicMarketResearchUsageResult> {
  const result = await executeRedis<string>([
    "EVAL",
    RESERVE_MARKET_RESEARCH_SCRIPT,
    "1",
    key,
    month,
    limit === null ? "-1" : String(limit),
    String(now),
  ]);
  if (typeof result !== "string") {
    throw new Error("Redis returned an invalid atomic usage result.");
  }
  const parsed = JSON.parse(result) as Partial<AtomicMarketResearchUsageResult>;
  if (
    typeof parsed.month !== "string" ||
    typeof parsed.count !== "number" ||
    typeof parsed.updatedAt !== "number" ||
    typeof parsed.reserved !== "boolean"
  ) {
    throw new Error("Redis returned an invalid atomic usage record.");
  }
  return {
    month: parsed.month,
    count: Math.max(0, Math.floor(parsed.count)),
    updatedAt: parsed.updatedAt,
    reserved: parsed.reserved,
  };
}
export async function releaseMarketResearchUsageAtomic(
  key: string,
  month: string,
  now: number,
): Promise<boolean> {
  const result = await executeRedis<string>([
    "EVAL",
    RELEASE_MARKET_RESEARCH_SCRIPT,
    "1",
    key,
    month,
    String(now),
  ]);
  return result === "1";
}
export interface AtomicExecutionUsageResult {
  date: string;
  count: number;
  updatedAt: number;
  reserved: boolean;
}
const RESERVE_EXECUTION_USAGE_SCRIPT = [
  "local raw = redis.call('GET', KEYS[1])",
  "local record = nil",
  "if raw then local ok, parsed = pcall(cjson.decode, raw); if ok and type(parsed) == 'table' then record = parsed end end",
  "if not record or record.date ~= ARGV[1] or type(record.count) ~= 'number' then record = {date=ARGV[1], count=0, updatedAt=tonumber(ARGV[3])} end",
  "local limit = tonumber(ARGV[2])",
  "if limit and limit >= 0 and record.count >= limit then record.reserved = false; return cjson.encode(record) end",
  "record.count = math.floor(math.max(0, record.count)) + 1",
  "record.updatedAt = tonumber(ARGV[3])",
  "record.reserved = true",
  "redis.call('SET', KEYS[1], cjson.encode({date=record.date, count=record.count, updatedAt=record.updatedAt}))",
  "return cjson.encode(record)",
].join("\n");
export async function reserveExecutionUsageAtomic(
  key: string,
  date: string,
  limit: number | null,
  now: number,
): Promise<AtomicExecutionUsageResult> {
  const result = await executeRedis<string>([
    "EVAL",
    RESERVE_EXECUTION_USAGE_SCRIPT,
    "1",
    key,
    date,
    limit === null ? "-1" : String(limit),
    String(now),
  ]);
  if (typeof result !== "string") {
    throw new Error("Redis returned an invalid atomic execution usage result.");
  }
  const parsed = JSON.parse(result) as Partial<AtomicExecutionUsageResult>;
  if (
    typeof parsed.date !== "string" ||
    typeof parsed.count !== "number" ||
    typeof parsed.updatedAt !== "number" ||
    typeof parsed.reserved !== "boolean"
  ) {
    throw new Error("Redis returned an invalid atomic execution usage record.");
  }
  return {
    date: parsed.date,
    count: Math.max(0, Math.floor(parsed.count)),
    updatedAt: parsed.updatedAt,
    reserved: parsed.reserved,
  };
}
export const redisStorage: StorageAdapter = {
  mode: "redis",
  async get<T>(key: string): Promise<T | null> {
    const result = await executeRedis<string | null>(["get", key]);
    if (typeof result !== "string") {
      return null;
    }
    try {
      return JSON.parse(result) as T;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    await executeRedis(["set", key, JSON.stringify(value)]);
  },
  async delete(key: string): Promise<void> {
    await executeRedis(["del", key]);
  },
  async health() {
    try {
      const result = await executeRedis<string>(["ping"]);
      return {
        success: result === "PONG",
        mode: "redis" as const,
      };
    } catch (error) {
      return {
        success: false,
        mode: "redis" as const,
        error: error instanceof Error
          ? error.message
          : "Redis health check failed.",
      };
    }
  },
};
