import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";
import { redisStorage } from "@/lib/server-storage/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SmokeStage =
  | "AUTH"
  | "PING"
  | "SET"
  | "GET"
  | "COMPARE"
  | "DEL"
  | "VERIFY_DELETE"
  | "COMPLETE";

function response(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      service: "AIOS Alpha",
      test: "REDIS_REAL_READ_WRITE_SMOKE_TEST",
      timestamp: new Date().toISOString(),
      ...body,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Unknown Redis smoke test error.";
}

export async function POST(request: NextRequest) {
  if (!isFounderRequest(request)) {
    return response(
      {
        success: false,
        status: "BLOCKED",
        stage: "AUTH",
        code: "FOUNDER_AUTH_REQUIRED",
        error: "Founder authorization is required.",
      },
      401,
    );
  }

  const testId = crypto.randomUUID();

  const testKey = `aios:smoke-test:${testId}`;

  const expectedValue = {
    service: "AIOS Alpha",
    test: "redis-smoke-test",
    testId,
    createdAt: new Date().toISOString(),
  };

  let stage: SmokeStage = "PING";
  let keyCreated = false;
  let keyDeleted = false;

  const checks = {
    redisPing: false,
    set: false,
    get: false,
    valueMatch: false,
    delete: false,
    verifyDelete: false,
  };

  try {
    // 1. Verify Redis connectivity.
    const health = await redisStorage.health();

    if (!health.success || health.mode !== "redis") {
      return response(
        {
          success: false,
          status: "FAIL",
          stage: "PING",
          checks,
          redisMode: health.mode,
          error: health.error ?? "Redis PING failed.",
        },
        503,
      );
    }

    checks.redisPing = true;

    // 2. Write a unique test value.
    stage = "SET";

    await redisStorage.set(testKey, expectedValue);
    keyCreated = true;
    checks.set = true;

    // 3. Read the test value.
    stage = "GET";

    const actualValue =
      await redisStorage.get<typeof expectedValue>(testKey);

    checks.get = actualValue !== null;

    // 4. Compare the written and returned values.
    stage = "COMPARE";

    checks.valueMatch =
      actualValue !== null &&
      actualValue.service === expectedValue.service &&
      actualValue.test === expectedValue.test &&
      actualValue.testId === expectedValue.testId &&
      actualValue.createdAt === expectedValue.createdAt;

    if (!checks.valueMatch) {
      throw new Error("Redis GET value does not match SET value.");
    }

    // 5. Delete the isolated test key.
    stage = "DEL";

    await redisStorage.delete(testKey);
    keyDeleted = true;
    checks.delete = true;

    // 6. Verify the key is actually gone.
    stage = "VERIFY_DELETE";

    const deletedValue =
      await redisStorage.get<typeof expectedValue>(testKey);

    checks.verifyDelete = deletedValue === null;

    if (!checks.verifyDelete) {
      throw new Error("Redis key still exists after DEL.");
    }

    stage = "COMPLETE";

    return response({
      success: true,
      status: "PASS",
      stage,
      testId,
      redisMode: redisStorage.mode,
      checks,
      summary: "Redis PING, SET, GET, value comparison, DEL and post-delete verification all passed.",
    });
  } catch (error) {
    return response(
      {
        success: false,
        status: "FAIL",
        stage,
        testId,
        redisMode: redisStorage.mode,
        checks,
        error: errorMessage(error),
      },
      500,
    );
  } finally {
    // Safety cleanup if the test failed before DEL completed.
    if (keyCreated && !keyDeleted) {
      try {
        await redisStorage.delete(testKey);
      } catch {
        // Cleanup failure must not mask the original test result.
      }
    }
  }
}
