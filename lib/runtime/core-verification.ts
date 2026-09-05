import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  getRuntimeHealth,
} from "@/lib/runtime/providerManager";

import {
  getStorageHealth,
  getStorageMode,
} from "@/lib/server-storage";

import {
  listOutcomes,
} from "@/lib/outcome/store";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  getPersistentExecutionMemory,
} from "@/lib/memory/execution-memory";

export type CoreCheckStatus =
  | "pass"
  | "warn"
  | "fail";

export interface CoreCheck {
  id: string;
  status: CoreCheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface CoreVerificationResult {
  success: boolean;

  runtime: {
    id: string;
    stage: string;
    version: string;
    codename: string;
  };

  status:
    | "healthy"
    | "degraded"
    | "failed";

  score:
    number;

  checks:
    CoreCheck[];

  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };

  planner: {
    outcomes: number;
    activeOutcomes: number;
    todoTasks: number;
    doingTasks: number;
    doneTasks: number;
  };

  execution: {
    recentRuns: number;
    recentFailures: number;
    successRate: number | null;
  };

  timestamp:
    number;
}

export async function verifyRuntimeCore():
  Promise<CoreVerificationResult> {
  const timestamp =
    Date.now();

  const checks:
    CoreCheck[] = [];

  const health =
    getRuntimeHealth();

  if (
    health.status ===
    "online"
  ) {
    checks.push({
      id:
        "runtime-health",

      status:
        "pass",

      message:
        "Runtime health is online.",

      details: {
        provider:
          health.provider.id,

        configured:
          health.provider.configured,

        enabled:
          health.provider.enabled,
      },
    });
  } else if (
    health.status ===
    "degraded"
  ) {
    checks.push({
      id:
        "runtime-health",

      status:
        "warn",

      message:
        "Runtime is available but operating in a degraded state.",

      details: {
        provider:
          health.provider.id,

        reasons:
          health.reasons,
      },
    });
  } else {
    checks.push({
      id:
        "runtime-health",

      status:
        "fail",

      message:
        "Runtime provider health is offline.",

      details: {
        reasons:
          health.reasons,
      },
    });
  }

  const storageHealth =
    await getStorageHealth();

  const storageMode =
    getStorageMode();

  if (
    storageHealth.success &&
    storageMode ===
      "redis"
  ) {
    checks.push({
      id:
        "persistent-storage",

      status:
        "pass",

      message:
        "Persistent storage is ready.",

      details: {
        mode:
          storageMode,
      },
    });
  } else {
    checks.push({
      id:
        "persistent-storage",

      status:
        "warn",

      message:
        "Persistent Redis storage is not active.",

      details: {
        mode:
          storageMode,
      },
    });
  }

  const [
    outcomes,
    tasks,
    memory,
  ] =
    await Promise.all([
      listOutcomes(),
      listPersistentTasks(),
      getPersistentExecutionMemory(),
    ]);

  const activeOutcomes =
    outcomes.filter(
      (item) =>
        item.status ===
        "active"
    ).length;

  const todoTasks =
    tasks.filter(
      (item) =>
        item.status ===
        "todo"
    ).length;

  const doingTasks =
    tasks.filter(
      (item) =>
        item.status ===
        "doing"
    ).length;

  const doneTasks =
    tasks.filter(
      (item) =>
        item.status ===
        "done"
    ).length;

  if (
    outcomes.length ===
      0
  ) {
    checks.push({
      id:
        "planner-outcomes",

      status:
        "warn",

      message:
        "Planner has no Outcomes available.",
    });
  } else {
    checks.push({
      id:
        "planner-outcomes",

      status:
        "pass",

      message:
        "Planner Outcomes are readable.",

      details: {
        outcomes:
          outcomes.length,

        activeOutcomes,
      },
    });
  }

  if (
    doingTasks >
    0
  ) {
    checks.push({
      id:
        "planner-queue",

      status:
        "warn",

      message:
        "Planner currently has an executing task.",

      details: {
        todoTasks,
        doingTasks,
      },
    });
  } else {
    checks.push({
      id:
        "planner-queue",

      status:
        "pass",

      message:
        "Planner queue is structurally available.",

      details: {
        todoTasks,
        doingTasks,
      },
    });
  }

  const recentCutoff =
    timestamp -
    24 *
      60 *
      60 *
      1000;

  const recentMemory =
    memory.filter(
      (item) =>
        item.createdAt >=
        recentCutoff
    );

  const recentFailures =
    recentMemory.filter(
      (item) =>
        !item.success
    ).length;

  const recentRuns =
    recentMemory.length;

  const successRate =
    recentRuns >
    0
      ? Math.round(
          ((recentRuns -
            recentFailures) /
            recentRuns) *
            100
        )
      : null;

  if (
    recentFailures ===
    0
  ) {
    checks.push({
      id:
        "execution-health",

      status:
        "pass",

      message:
        "No execution failures were recorded in the last 24 hours.",

      details: {
        recentRuns,
        recentFailures,
        successRate,
      },
    });
  } else {
    checks.push({
      id:
        "execution-health",

      status:
        "warn",

      message:
        "Recent execution failures require observation.",

      details: {
        recentRuns,
        recentFailures,
        successRate,
      },
    });
  }

  if (
    doneTasks >
    0
  ) {
    checks.push({
      id:
        "execution-memory",

      status:
        "pass",

      message:
        "Execution history contains completed tasks.",

      details: {
        doneTasks,
      },
    });
  } else {
    checks.push({
      id:
        "execution-memory",

      status:
        "warn",

      message:
        "No completed Planner tasks are recorded yet.",
    });
  }

  const passed =
    checks.filter(
      (check) =>
        check.status ===
        "pass"
    ).length;

  const warnings =
    checks.filter(
      (check) =>
        check.status ===
        "warn"
    ).length;

  const failed =
    checks.filter(
      (check) =>
        check.status ===
        "fail"
    ).length;

  const total =
    checks.length;

  const score =
    total > 0
      ? Math.round(
          ((passed +
            warnings *
              0.5) /
            total) *
            100
        )
      : 0;

  const status =
    failed > 0
      ? "failed"
      : warnings > 0
        ? "degraded"
        : "healthy";

  return {
    success:
      failed === 0,

    runtime: {
      id:
        APP_CONFIG.runtimeId,

      stage:
        APP_CONFIG.stage,

      version:
        APP_CONFIG.version,

      codename:
        APP_CONFIG.codename,
    },

    status,

    score,

    checks,

    summary: {
      passed,
      warnings,
      failed,
      total,
    },

    planner: {
      outcomes:
        outcomes.length,

      activeOutcomes,

      todoTasks,

      doingTasks,

      doneTasks,
    },

    execution: {
      recentRuns,

      recentFailures,

      successRate,
    },

    timestamp,
  };
}
