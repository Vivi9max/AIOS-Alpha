import type {
  WorkspaceAction,
} from "./types";

function cleanValue(
  value: string
): string {
  return value
    .trim()
    .replace(
      /^[：:\s]+|[。！？，,.!?]+$/g,
      ""
    );
}

function parseTaskCreation(
  prompt: string
): WorkspaceAction | null {
  const patterns = [
    /^(?:请)?创建(?:一个|一项)?任务[：:\s]+(.+)$/i,
    /^(?:请)?新建(?:一个|一项)?任务[：:\s]+(.+)$/i,
    /^(?:请)?添加(?:一个|一项)?任务[：:\s]+(.+)$/i,
    /^(?:请)?帮我记一个任务[：:\s]+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match =
      prompt.match(pattern);

    const title =
      match?.[1]
        ? cleanValue(match[1])
        : "";

    if (title) {
      return {
        type: "task.create",
        title,
      };
    }
  }

  return null;
}

function parseTaskList(
  prompt: string
): WorkspaceAction | null {
  const normalized =
    prompt.trim();

  const taskListPatterns = [
    /^我有哪些任务[？?。]?$/,
    /^我的任务是什么[？?。]?$/,
    /^查看(?:我的)?任务[。]?$/,
    /^列出(?:我的)?任务[。]?$/,
    /^任务列表[。]?$/,
  ];

  if (
    taskListPatterns.some(
      (pattern) =>
        pattern.test(normalized)
    )
  ) {
    return {
      type: "task.list",
    };
  }

  return null;
}

function parseProfileUpdate(
  prompt: string
): WorkspaceAction | null {
  const updates: Record<
    string,
    string
  > = {};

  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const nameMatch =
      line.match(
        /^(?:我叫|我的名字是)\s*(.+)$/i
      );

    const locationMatch =
      line.match(
        /^(?:我来自|我住在|我目前在|我的所在地是)\s*(.+)$/i
      );

    const projectMatch =
      line.match(
        /^(?:我的项目是|我正在开发|我正在做|当前项目是)\s*(.+)$/i
      );

    const goalMatch =
      line.match(
        /^(?:我的目标是|我的长期目标是|我希望)\s*(.+)$/i
      );

    const preferenceMatch =
      line.match(
        /^(?:我的偏好是|我偏好|我喜欢)\s*(.+)$/i
      );

    if (nameMatch?.[1]) {
      updates.name =
        cleanValue(
          nameMatch[1]
        );
    }

    if (locationMatch?.[1]) {
      updates.location =
        cleanValue(
          locationMatch[1]
        );
    }

    if (projectMatch?.[1]) {
      updates.project =
        cleanValue(
          projectMatch[1]
        );
    }

    if (goalMatch?.[1]) {
      updates.goal =
        cleanValue(
          goalMatch[1]
        );
    }

    if (
      preferenceMatch?.[1]
    ) {
      updates.preference =
        cleanValue(
          preferenceMatch[1]
        );
    }
  }

  if (
    Object.keys(updates)
      .length === 0
  ) {
    return null;
  }

  return {
    type: "profile.update",
    updates,
  };
}

export function parseWorkspaceIntent(
  prompt: string
): WorkspaceAction {
  const taskCreation =
    parseTaskCreation(prompt);

  if (taskCreation) {
    return taskCreation;
  }

  const taskList =
    parseTaskList(prompt);

  if (taskList) {
    return taskList;
  }

  const profileUpdate =
    parseProfileUpdate(prompt);

  if (profileUpdate) {
    return profileUpdate;
  }

  return {
    type: "none",
  };
}