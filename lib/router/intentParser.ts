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

  const completedPatterns = [
    /^我有哪些已完成任务[？?。]?$/,
    /^查看(?:我的)?已完成任务[。]?$/,
    /^列出(?:我的)?已完成任务[。]?$/,
    /^已完成任务[。]?$/,
  ];

  if (
    completedPatterns.some(
      (pattern) =>
        pattern.test(normalized)
    )
  ) {
    return {
      type: "task.list",
      filter: "completed",
    };
  }

  const activePatterns = [
    /^我有哪些待办任务[？?。]?$/,
    /^我还有哪些任务没完成[？?。]?$/,
    /^查看(?:我的)?待处理任务[。]?$/,
    /^查看(?:我的)?未完成任务[。]?$/,
    /^待办任务[。]?$/,
  ];

  if (
    activePatterns.some(
      (pattern) =>
        pattern.test(normalized)
    )
  ) {
    return {
      type: "task.list",
      filter: "active",
    };
  }

  const allPatterns = [
    /^我有哪些任务[？?。]?$/,
    /^我的任务是什么[？?。]?$/,
    /^查看(?:我的)?任务[。]?$/,
    /^列出(?:我的)?任务[。]?$/,
    /^任务列表[。]?$/,
  ];

  if (
    allPatterns.some(
      (pattern) =>
        pattern.test(normalized)
    )
  ) {
    return {
      type: "task.list",
      filter: "all",
    };
  }

  return null;
}

function parseTaskComplete(
  prompt: string
): WorkspaceAction | null {
  const patterns = [
    /^(?:请)?完成任务[：:\s]+(.+)$/i,
    /^(?:请)?把任务[「“"]?(.+?)[」”"]?标记为已完成[。]?$/i,
    /^(?:请)?将任务[「“"]?(.+?)[」”"]?设为已完成[。]?$/i,
    /^任务[「“"]?(.+?)[」”"]?已完成[。]?$/i,
  ];

  for (const pattern of patterns) {
    const match =
      prompt.match(pattern);

    const query =
      match?.[1]
        ? cleanValue(match[1])
        : "";

    if (query) {
      return {
        type: "task.complete",
        query,
      };
    }
  }

  return null;
}

function parseTaskReopen(
  prompt: string
): WorkspaceAction | null {
  const patterns = [
    /^(?:请)?重新打开任务[：:\s]+(.+)$/i,
    /^(?:请)?恢复任务[：:\s]+(.+)$/i,
    /^(?:请)?把任务[「“"]?(.+?)[」”"]?改为待处理[。]?$/i,
    /^(?:请)?将任务[「“"]?(.+?)[」”"]?设为未完成[。]?$/i,
  ];

  for (const pattern of patterns) {
    const match =
      prompt.match(pattern);

    const query =
      match?.[1]
        ? cleanValue(match[1])
        : "";

    if (query) {
      return {
        type: "task.reopen",
        query,
      };
    }
  }

  return null;
}

function parseTaskDelete(
  prompt: string
): WorkspaceAction | null {
  const patterns = [
    /^(?:请)?删除任务[：:\s]+(.+)$/i,
    /^(?:请)?移除任务[：:\s]+(.+)$/i,
    /^(?:请)?删除[「“"]?(.+?)[」”"]?这个任务[。]?$/i,
  ];

  for (const pattern of patterns) {
    const match =
      prompt.match(pattern);

    const query =
      match?.[1]
        ? cleanValue(match[1])
        : "";

    if (query) {
      return {
        type: "task.delete",
        query,
      };
    }
  }

  return null;
}

function parseProfileRead(
  prompt: string
): WorkspaceAction | null {
  const normalized =
    prompt.trim();

  const fieldPatterns: Array<{
    field:
      | "name"
      | "location"
      | "project"
      | "goal"
      | "preference";
    patterns: RegExp[];
  }> = [
    {
      field: "name",
      patterns: [
        /^我叫什么[？?。]?$/,
        /^我的名字是什么[？?。]?$/,
      ],
    },
    {
      field: "location",
      patterns: [
        /^我来自哪里[？?。]?$/,
        /^我的所在地是哪里[？?。]?$/,
        /^我目前在哪里[？?。]?$/,
      ],
    },
    {
      field: "project",
      patterns: [
        /^我的项目是什么[？?。]?$/,
        /^我正在开发什么项目[？?。]?$/,
        /^当前项目是什么[？?。]?$/,
      ],
    },
    {
      field: "goal",
      patterns: [
        /^我的目标是什么[？?。]?$/,
        /^我的长期目标是什么[？?。]?$/,
      ],
    },
    {
      field: "preference",
      patterns: [
        /^我的偏好是什么[？?。]?$/,
        /^我喜欢什么工作方式[？?。]?$/,
      ],
    },
  ];

  for (const item of fieldPatterns) {
    if (
      item.patterns.some(
        (pattern) =>
          pattern.test(normalized)
      )
    ) {
      return {
        type: "profile.read",
        field: item.field,
      };
    }
  }

  const allPatterns = [
    /^介绍一下我[。]?$/,
    /^我的资料是什么[？?。]?$/,
    /^查看我的资料[。]?$/,
    /^查看我的Profile[。]?$/i,
    /^我的Profile是什么[？?。]?$/i,
  ];

  if (
    allPatterns.some(
      (pattern) =>
        pattern.test(normalized)
    )
  ) {
    return {
      type: "profile.read",
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

  const taskComplete =
    parseTaskComplete(prompt);

  if (taskComplete) {
    return taskComplete;
  }

  const taskReopen =
    parseTaskReopen(prompt);

  if (taskReopen) {
    return taskReopen;
  }

  const taskDelete =
    parseTaskDelete(prompt);

  if (taskDelete) {
    return taskDelete;
  }

  const taskList =
    parseTaskList(prompt);

  if (taskList) {
    return taskList;
  }

  /*
   * 查询必须放在更新前面，
   * 避免“我的项目是什么”被误识别为资料更新。
   */
  const profileRead =
    parseProfileRead(prompt);

  if (profileRead) {
    return profileRead;
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