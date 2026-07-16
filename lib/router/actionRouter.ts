import {
  createPersistentTask,
  deletePersistentTask,
  findDuplicateActiveTask,
  listPersistentTasks,
  updatePersistentTask,
} from "@/lib/task/server-store";

import {
  getPersistentManualProfile,
  updateAndSaveManualProfile,
} from "@/lib/memory/profile-store";

import {
  buildMemoryProfile,
} from "@/lib/memory/index";

import type {
  MemoryProfile,
} from "@/lib/memory/index";

import type {
  Task,
} from "@/lib/task/types";

import type {
  ActionExecutionResult,
  WorkspaceAction,
} from "./types";

const profileFields: Array<
  keyof MemoryProfile
> = [
  "name",
  "location",
  "project",
  "goal",
  "preference",
];

const profileLabels: Record<
  keyof MemoryProfile,
  string
> = {
  name: "姓名",
  location: "所在地",
  project: "当前项目",
  goal: "长期目标",
  preference: "用户偏好",
};

const taskStatusLabels = {
  todo: "待处理",
  doing: "进行中",
  done: "已完成",
};

function normalizeText(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function findMatchingTasks(
  tasks: Task[],
  query: string
): Task[] {
  const normalizedQuery =
    normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const exactMatches =
    tasks.filter(
      (task) =>
        normalizeText(
          task.title
        ) === normalizedQuery
    );

  if (
    exactMatches.length > 0
  ) {
    return exactMatches;
  }

  return tasks.filter(
    (task) =>
      normalizeText(
        task.title
      ).includes(
        normalizedQuery
      ) ||
      normalizedQuery.includes(
        normalizeText(
          task.title
        )
      )
  );
}

function buildTaskMatchFailure(
  matches: Task[],
  query: string
): string {
  if (
    matches.length === 0
  ) {
    return [
      `没有找到与“${query}”匹配的任务。`,
      "",
      "请先发送“我有哪些任务？”查看准确标题。",
    ].join("\n");
  }

  return [
    `找到 ${matches.length} 项相似任务，暂未执行：`,
    "",
    ...matches.map(
      (task, index) =>
        `${index + 1}. ${task.title}`
    ),
    "",
    "请使用完整任务标题重新操作。",
  ].join("\n");
}

function buildProfileUpdateReply(
  updates: Partial<MemoryProfile>
): string {
  const lines =
    profileFields
      .filter((field) => {
        const value =
          updates[field];

        return (
          typeof value ===
            "string" &&
          value.trim().length > 0
        );
      })
      .map((field) => {
        const value =
          updates[field];

        return `• ${profileLabels[field]}：${value}`;
      });

  if (
    lines.length === 0
  ) {
    return "没有检测到可保存的资料。";
  }

  return [
    "已更新 Memory Profile：",
    "",
    ...lines,
  ].join("\n");
}

function buildProfileReadReply(
  profile: MemoryProfile,
  field?: keyof MemoryProfile
): string {
  if (field) {
    const value =
      profile[field];

    if (
      !value ||
      !value.trim()
    ) {
      return `${profileLabels[field]}尚未记录。`;
    }

    return `${profileLabels[field]}：${value}`;
  }

  const lines =
    profileFields
      .filter((item) => {
        const value =
          profile[item];

        return (
          typeof value ===
            "string" &&
          value.trim().length > 0
        );
      })
      .map((item) => {
        const value =
          profile[item];

        return `• ${profileLabels[item]}：${value}`;
      });

  if (
    lines.length === 0
  ) {
    return "Memory Profile 尚未记录资料。";
  }

  return [
    "当前 Memory Profile：",
    "",
    ...lines,
  ].join("\n");
}

async function resolveSingleTask(
  query: string
): Promise<{
  task?: Task;
  failure?: string;
}> {
  const tasks =
    await listPersistentTasks();

  const matches =
    findMatchingTasks(
      tasks,
      query
    );

  if (
    matches.length !== 1
  ) {
    return {
      failure:
        buildTaskMatchFailure(
          matches,
          query
        ),
    };
  }

  return {
    task: matches[0],
  };
}

export async function executeWorkspaceAction(
  action: WorkspaceAction
): Promise<ActionExecutionResult> {
  switch (action.type) {
    case "task.create": {
      const duplicate =
        await findDuplicateActiveTask(
          action.title
        );

      if (duplicate) {
        return {
          handled: true,
          content: [
            "检测到同名待完成任务，未重复创建。",
            "",
            `标题：${duplicate.title}`,
            `状态：${taskStatusLabels[duplicate.status]}`,
          ].join("\n"),
        };
      }

      const task =
        await createPersistentTask(
          action.title,
          action.description ?? ""
        );

      return {
        handled: true,
        content: [
          "任务已创建 ✅",
          "",
          `标题：${task.title}`,
          "状态：待处理",
        ].join("\n"),
      };
    }

    case "task.list": {
      const tasks =
        await listPersistentTasks();

      const filteredTasks =
        action.filter === "completed"
          ? tasks.filter(
              (task) =>
                task.status === "done"
            )
          : action.filter === "active"
          ? tasks.filter(
              (task) =>
                task.status !== "done"
            )
          : tasks;

      if (
        filteredTasks.length === 0
      ) {
        if (
          action.filter === "completed"
        ) {
          return {
            handled: true,
            content:
              "目前还没有已完成任务。",
          };
        }

        if (
          action.filter === "active"
        ) {
          return {
            handled: true,
            content:
              "目前没有待完成任务。",
          };
        }

        return {
          handled: true,
          content:
            "目前还没有任务。",
        };
      }

      const title =
        action.filter === "completed"
          ? `你有 ${filteredTasks.length} 项已完成任务：`
          : action.filter === "active"
          ? `你有 ${filteredTasks.length} 项待完成任务：`
          : `你目前有 ${filteredTasks.length} 项任务：`;

      return {
        handled: true,
        content: [
          title,
          "",
          ...filteredTasks.map(
            (task, index) =>
              `${index + 1}. ${task.title} · ${
                taskStatusLabels[
                  task.status
                ]
              }`
          ),
        ].join("\n"),
      };
    }

    case "task.complete": {
      const resolved =
        await resolveSingleTask(
          action.query
        );

      if (!resolved.task) {
        return {
          handled: true,
          content:
            resolved.failure,
        };
      }

      if (
        resolved.task.status ===
        "done"
      ) {
        return {
          handled: true,
          content:
            `任务“${resolved.task.title}”已经是已完成状态。`,
        };
      }

      const updated =
        await updatePersistentTask(
          resolved.task.id,
          {
            status: "done",
          }
        );

      return {
        handled: true,
        content: updated
          ? [
              "任务已完成 ✅",
              "",
              `标题：${updated.title}`,
              "状态：已完成",
            ].join("\n")
          : "任务更新失败。",
      };
    }

    case "task.reopen": {
      const resolved =
        await resolveSingleTask(
          action.query
        );

      if (!resolved.task) {
        return {
          handled: true,
          content:
            resolved.failure,
        };
      }

      if (
        resolved.task.status !==
        "done"
      ) {
        return {
          handled: true,
          content:
            `任务“${resolved.task.title}”当前仍是待完成状态。`,
        };
      }

      const updated =
        await updatePersistentTask(
          resolved.task.id,
          {
            status: "todo",
          }
        );

      return {
        handled: true,
        content: updated
          ? [
              "任务已重新打开 ↩️",
              "",
              `标题：${updated.title}`,
              "状态：待处理",
            ].join("\n")
          : "任务更新失败。",
      };
    }

    case "task.delete.request": {
      const resolved =
        await resolveSingleTask(
          action.query
        );

      if (!resolved.task) {
        return {
          handled: true,
          content:
            resolved.failure,
        };
      }

      return {
        handled: true,
        content: [
          "删除任务需要再次确认。",
          "",
          `即将删除：${resolved.task.title}`,
          "",
          `请发送：确认删除任务：${resolved.task.title}`,
        ].join("\n"),
      };
    }

    case "task.delete.confirm": {
      const resolved =
        await resolveSingleTask(
          action.query
        );

      if (!resolved.task) {
        return {
          handled: true,
          content:
            resolved.failure,
        };
      }

      const deleted =
        await deletePersistentTask(
          resolved.task.id
        );

      return {
        handled: true,
        content: deleted
          ? [
              "任务已删除。",
              "",
              `标题：${resolved.task.title}`,
            ].join("\n")
          : "任务删除失败。",
      };
    }

    case "profile.update": {
      await updateAndSaveManualProfile(
        action.updates
      );

      return {
        handled: true,
        content:
          buildProfileUpdateReply(
            action.updates
          ),
      };
    }

    case "profile.read": {
      await getPersistentManualProfile();

      const profile =
        buildMemoryProfile();

      return {
        handled: true,
        content:
          buildProfileReadReply(
            profile,
            action.field
          ),
      };
    }

    case "none":
    default:
      return {
        handled: false,
      };
  }
}