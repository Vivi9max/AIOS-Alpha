import {
  createPersistentTask,
  listPersistentTasks,
} from "@/lib/task/server-store";

import {
  updateAndSaveManualProfile,
} from "@/lib/memory/profile-store";

import type {
  ActionExecutionResult,
  WorkspaceAction,
} from "./types";

function buildProfileReply(
  updates: Record<
    string,
    unknown
  >
): string {
  const labels: Record<
    string,
    string
  > = {
    name: "姓名",
    location: "所在地",
    project: "当前项目",
    goal: "长期目标",
    preference: "用户偏好",
  };

  const lines =
    Object.entries(updates)
      .filter(
        ([, value]) =>
          typeof value ===
            "string" &&
          value.trim().length > 0
      )
      .map(
        ([key, value]) =>
          `• ${
            labels[key] ?? key
          }：${value}`
      );

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

export async function executeWorkspaceAction(
  action: WorkspaceAction
): Promise<ActionExecutionResult> {
  switch (action.type) {
    case "task.create": {
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

      if (
        tasks.length === 0
      ) {
        return {
          handled: true,
          content:
            "目前还没有任务。",
        };
      }

      const statusLabels = {
        todo: "待处理",
        doing: "进行中",
        done: "已完成",
      };

      return {
        handled: true,
        content: [
          `你目前有 ${tasks.length} 项任务：`,
          "",
          ...tasks.map(
            (task, index) =>
              `${index + 1}. ${task.title} · ${
                statusLabels[
                  task.status
                ]
              }`
          ),
        ].join("\n"),
      };
    }

    case "profile.update": {
      await updateAndSaveManualProfile(
        action.updates
      );

      return {
        handled: true,
        content:
          buildProfileReply(
            action.updates
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