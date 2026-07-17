import {
  getRecentMemory,
  hydrateMemory,
  type MemoryRecord,
} from "@/lib/memory/store";

import {
  getManualProfile,
  hydrateManualProfile,
} from "@/lib/memory/profile-store";

import type {
  MemoryProfile,
} from "@/lib/memory/index";

import {
  listPersistentTasks,
} from "@/lib/task/server-store";

import type {
  Task,
} from "@/lib/task/types";

import type {
  RuntimeCapability,
  RuntimePlan,
} from "./planner";

export type CapabilityStatus =
  | "completed"
  | "skipped"
  | "failed";

export interface CapabilityTrace {
  capability:
    RuntimeCapability;

  status:
    CapabilityStatus;

  durationMs:
    number;

  detail?:
    string;
}

export interface RuntimeContextSnapshot {
  memory:
    MemoryRecord[];

  profile:
    MemoryProfile;

  tasks:
    Task[];

  trace:
    CapabilityTrace[];
}

function hasCapability(
  plan: RuntimePlan,
  capability: RuntimeCapability
): boolean {
  return plan.capabilities.includes(
    capability
  );
}

function createEmptySnapshot():
  RuntimeContextSnapshot {
  return {
    memory: [],
    profile: {},
    tasks: [],
    trace: [],
  };
}

async function executeCapability<T>({
  capability,
  enabled,
  execute,
  fallback,
}: {
  capability:
    RuntimeCapability;

  enabled:
    boolean;

  execute:
    () => Promise<T>;

  fallback:
    T;
}): Promise<{
  value: T;
  trace: CapabilityTrace;
}> {
  if (!enabled) {
    return {
      value:
        fallback,

      trace: {
        capability,
        status:
          "skipped",
        durationMs:
          0,
      },
    };
  }

  const startedAt =
    Date.now();

  try {
    const value =
      await execute();

    return {
      value,

      trace: {
        capability,
        status:
          "completed",
        durationMs:
          Date.now() -
          startedAt,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Capability execution failed.";

    console.error(
      `[AIOS Capability Router: ${capability}]`,
      error
    );

    return {
      value:
        fallback,

      trace: {
        capability,
        status:
          "failed",
        durationMs:
          Date.now() -
          startedAt,
        detail:
          message,
      },
    };
  }
}

async function readMemoryCapability(
  plan: RuntimePlan
) {
  return executeCapability({
    capability:
      "memory.read",

    enabled:
      hasCapability(
        plan,
        "memory.read"
      ),

    execute:
      async () => {
        await hydrateMemory();

        return getRecentMemory(
          12
        );
      },

    fallback:
      [] as MemoryRecord[],
  });
}

async function readProfileCapability(
  plan: RuntimePlan
) {
  return executeCapability({
    capability:
      "profile.read",

    enabled:
      hasCapability(
        plan,
        "profile.read"
      ),

    execute:
      async () => {
        await hydrateManualProfile();

        return getManualProfile();
      },

    fallback:
      {} as MemoryProfile,
  });
}

async function readTasksCapability(
  plan: RuntimePlan
) {
  return executeCapability({
    capability:
      "tasks.read",

    enabled:
      hasCapability(
        plan,
        "tasks.read"
      ),

    execute:
      async () =>
        listPersistentTasks(),

    fallback:
      [] as Task[],
  });
}

export async function buildRuntimeContext(
  plan: RuntimePlan
): Promise<RuntimeContextSnapshot> {
  const snapshot =
    createEmptySnapshot();

  const [
    memoryResult,
    profileResult,
    taskResult,
  ] =
    await Promise.all([
      readMemoryCapability(
        plan
      ),

      readProfileCapability(
        plan
      ),

      readTasksCapability(
        plan
      ),
    ]);

  snapshot.memory =
    memoryResult.value;

  snapshot.profile =
    profileResult.value;

  snapshot.tasks =
    taskResult.value;

  snapshot.trace.push(
    memoryResult.trace,
    profileResult.trace,
    taskResult.trace
  );

  return snapshot;
}

function formatMemory(
  memory: MemoryRecord[]
): string {
  if (
    memory.length === 0
  ) {
    return "无相关对话记录";
  }

  return memory
    .slice(-8)
    .map(
      (item) => {
        const role =
          item.role === "user"
            ? "用户"
            : "AIOS";

        const content =
          item.content
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 280);

        return `${role}：${content}`;
      }
    )
    .join("\n");
}

function formatProfile(
  profile: MemoryProfile
): string {
  const entries =
    Object.entries(
      profile
    ).filter(
      (
        entry
      ): entry is [
        string,
        string,
      ] =>
        typeof entry[1] ===
          "string" &&
        entry[1].trim().length >
          0
    );

  if (
    entries.length === 0
  ) {
    return "个人资料尚未完善";
  }

  const labels:
    Record<string, string> = {
      name:
        "姓名",
      location:
        "所在地",
      project:
        "当前项目",
      goal:
        "长期目标",
      preference:
        "偏好",
    };

  return entries
    .map(
      ([key, value]) =>
        `${labels[key] ?? key}：${value}`
    )
    .join("\n");
}

function formatTasks(
  tasks: Task[]
): string {
  if (
    tasks.length === 0
  ) {
    return "当前没有任务";
  }

  const statusLabels = {
    todo:
      "待处理",
    doing:
      "进行中",
    done:
      "已完成",
  } as const;

  return tasks
    .slice(0, 12)
    .map(
      (task, index) =>
        `${index + 1}. ${task.title}（${
          statusLabels[
            task.status
          ]
        }）`
    )
    .join("\n");
}

export function buildRuntimeContextText(
  snapshot:
    RuntimeContextSnapshot
): string {
  return [
    "以下是 AIOS 已真实读取的当前用户上下文。",
    "只在与用户请求相关时使用，不要机械复述。",
    "",
    "【Memory Profile】",
    formatProfile(
      snapshot.profile
    ),
    "",
    "【当前任务】",
    formatTasks(
      snapshot.tasks
    ),
    "",
    "【最近对话】",
    formatMemory(
      snapshot.memory
    ),
  ].join("\n");
}