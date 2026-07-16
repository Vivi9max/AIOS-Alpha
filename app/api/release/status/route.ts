import {
  NextResponse,
} from "next/server";

import {
  getPersistentMemory,
} from "@/lib/memory/store";

import {
  buildMemoryProfile,
} from "@/lib/memory/index";

import {
  hydrateManualProfile,
} from "@/lib/memory/profile-store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  getProviderRuntimeStatus,
  providerStatus,
} from "@/lib/runtime/providerManager";

import {
  getStorageHealth,
  getStorageMode,
  getWorkspaceId,
} from "@/lib/server-storage";

export const dynamic =
  "force-dynamic";

interface ReleaseCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  required: boolean;
}

function hasEnvironmentValue(
  name: string
): boolean {
  return Boolean(
    process.env[name]?.trim()
  );
}

export async function GET() {
  const checks:
    ReleaseCheck[] = [];

  try {
    await hydrateManualProfile();

    const [
      memory,
      tasks,
      storageHealth,
    ] = await Promise.all([
      getPersistentMemory(),
      listPersistentTasks(),
      getStorageHealth(),
    ]);

    const configuredProvider =
      providerStatus();

    const providerRuntime =
      getProviderRuntimeStatus();

    const storageMode =
      getStorageMode();

    const workspaceId =
      getWorkspaceId();

    const profile =
      buildMemoryProfile();

    const completedProfileFields =
      Object.values(profile).filter(
        (value) =>
          typeof value ===
            "string" &&
          value.trim().length > 0
      ).length;

    const deepSeekConfigured =
      hasEnvironmentValue(
        "DEEPSEEK_API_KEY"
      );

    const redisUrlConfigured =
      hasEnvironmentValue(
        "UPSTASH_REDIS_REST_URL"
      );

    const redisTokenConfigured =
      hasEnvironmentValue(
        "UPSTASH_REDIS_REST_TOKEN"
      );

    checks.push(
      {
        id: "runtime",
        label: "Runtime",
        passed: true,
        detail:
          "AIOS Runtime online",
        required: true,
      },
      {
        id: "provider-config",
        label:
          "DeepSeek Configuration",
        passed:
          deepSeekConfigured &&
          configuredProvider.current ===
            "deepseek",
        detail:
          deepSeekConfigured
            ? `Configured provider: ${configuredProvider.current}`
            : "DEEPSEEK_API_KEY missing",
        required: true,
      },
      {
        id: "provider-runtime",
        label:
          "Provider Runtime",
        passed:
          providerRuntime.provider ===
            "deepseek" &&
          providerRuntime.success &&
          !providerRuntime.fallbackUsed,
        detail:
          providerRuntime.fallbackUsed
            ? `Fallback active: ${providerRuntime.error ?? "unknown error"}`
            : providerRuntime
                .lastRequestAt
            ? `DeepSeek connected · ${providerRuntime.latencyMs ?? 0}ms`
            : "DeepSeek configured; waiting for first request",
        required: false,
      },
      {
        id: "redis-config",
        label:
          "Redis Configuration",
        passed:
          redisUrlConfigured &&
          redisTokenConfigured,
        detail:
          redisUrlConfigured &&
          redisTokenConfigured
            ? "Upstash REST credentials configured"
            : "Redis environment variables missing",
        required: true,
      },
      {
        id: "storage",
        label:
          "Persistent Storage",
        passed:
          storageMode ===
            "redis" &&
          storageHealth.success,
        detail:
          storageHealth.success
            ? `${storageMode} storage healthy`
            : storageHealth.error ??
              "Storage unavailable",
        required: true,
      },
      {
        id: "workspace",
        label:
          "Workspace Namespace",
        passed:
          workspaceId.length >
          0,
        detail:
          `Workspace: ${workspaceId}`,
        required: true,
      },
      {
        id: "memory",
        label:
          "Conversation Memory",
        passed: true,
        detail:
          `${memory.length} records`,
        required: true,
      },
      {
        id: "profile",
        label:
          "Memory Profile",
        passed: true,
        detail:
          `${completedProfileFields}/5 fields`,
        required: true,
      },
      {
        id: "tasks",
        label:
          "Tasks Engine",
        passed: true,
        detail:
          `${tasks.length} tasks · ${
            tasks.filter(
              (task) =>
                task.status ===
                "done"
            ).length
          } completed`,
        required: true,
      }
    );

    const requiredChecks =
      checks.filter(
        (check) =>
          check.required
      );

    const releaseReady =
      requiredChecks.every(
        (check) =>
          check.passed
      );

    return NextResponse.json({
      success: true,

      release: {
        name:
          "AIOS Alpha",

        version:
          "0.2.0-rc.1",

        stage:
          releaseReady
            ? "release-candidate"
            : "blocked",

        ready:
          releaseReady,

        workspace:
          workspaceId,

        provider:
          configuredProvider.current,

        storage:
          storageMode,
      },

      summary: {
        total:
          checks.length,

        passed:
          checks.filter(
            (check) =>
              check.passed
          ).length,

        failed:
          checks.filter(
            (check) =>
              !check.passed
          ).length,

        requiredFailed:
          requiredChecks.filter(
            (check) =>
              !check.passed
          ).length,
      },

      checks,

      timestamp:
        Date.now(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Release check failed.";

    return NextResponse.json(
      {
        success: false,

        release: {
          name:
            "AIOS Alpha",
          version:
            "0.2.0-rc.1",
          stage:
            "blocked",
          ready: false,
        },

        summary: {
          total:
            checks.length,
          passed:
            checks.filter(
              (check) =>
                check.passed
            ).length,
          failed: 1,
          requiredFailed: 1,
        },

        checks,

        error:
          message,

        timestamp:
          Date.now(),
      },
      {
        status: 500,
      }
    );
  }
}