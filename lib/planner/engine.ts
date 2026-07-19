import type {
  Task,
} from "@/lib/task/types";

import type {
  PlannerMission,
  PlannerPlan,
  PlannerPriority,
  PlannerProgress,
  PlannerQueueItem,
  PlannerSnapshot,
  PlannerState,
} from "@/lib/planner/types";

const STATUS_ORDER = {
  doing: 0,
  todo: 1,
  done: 2,
} as const;

function cleanText(
  value: string | undefined
): string {
  return value?.trim() ?? "";
}

function calculatePercentage(
  completed: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (completed / total) * 100
      )
    )
  );
}

function sortTasks(
  tasks: Task[]
): Task[] {
  return [...tasks].sort(
    (first, second) => {
      const statusDifference =
        STATUS_ORDER[first.status] -
        STATUS_ORDER[second.status];

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return (
        second.updatedAt -
        first.updatedAt
      );
    }
  );
}

function getPriority(
  task: Task,
  position: number
): PlannerPriority {
  if (task.status === "done") {
    return "completed";
  }

  if (
    task.status === "doing" &&
    position === 0
  ) {
    return "critical";
  }

  if (
    task.status === "doing" ||
    position <= 1
  ) {
    return "high";
  }

  return "normal";
}

function createQueue(
  tasks: Task[]
): PlannerQueueItem[] {
  return sortTasks(tasks).map(
    (task, index) => ({
      id: task.id,
      title: task.title,
      description:
        cleanText(
          task.description
        ),
      status: task.status,
      priority: getPriority(
        task,
        index
      ),
      position: index + 1,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })
  );
}

function createProgress(
  tasks: Task[]
): PlannerProgress {
  const doing =
    tasks.filter(
      (task) =>
        task.status === "doing"
    ).length;

  const todo =
    tasks.filter(
      (task) =>
        task.status === "todo"
    ).length;

  const completed =
    tasks.filter(
      (task) =>
        task.status === "done"
    ).length;

  return {
    total: tasks.length,
    active: doing + todo,
    doing,
    todo,
    completed,
    percentage:
      calculatePercentage(
        completed,
        tasks.length
      ),
  };
}

function createState(
  progress: PlannerProgress
): PlannerState {
  if (progress.total === 0) {
    return "idle";
  }

  if (
    progress.completed ===
    progress.total
  ) {
    return "completed";
  }

  if (progress.doing > 0) {
    return "executing";
  }

  return "ready";
}

function createMission(
  queue: PlannerQueueItem[]
): PlannerMission {
  const current =
    queue.find(
      (task) =>
        task.status === "doing"
    ) ??
    queue.find(
      (task) =>
        task.status === "todo"
    );

  if (!current) {
    return {
      id: null,
      title:
        "创建 AIOS Alpha 的下一项目标",
      description:
        "当前没有等待执行的任务。创建新任务后，Planner 将自动生成执行计划。",
      status: "idle",
      priority: "normal",
    };
  }

  return {
    id: current.id,
    title: current.title,
    description:
      current.description ||
      "当前最高优先级执行任务。",
    status: current.status,
    priority: current.priority,
  };
}

function createPlan(
  queue: PlannerQueueItem[],
  mission: PlannerMission,
  progress: PlannerProgress
): PlannerPlan {
  const activeQueue =
    queue.filter(
      (task) =>
        task.status !== "done"
    );

  const nextTask =
    activeQueue.find(
      (task) =>
        task.id !==
        mission.id
    );

  if (
    progress.total === 0
  ) {
    return {
      currentGoal:
        "建立第一条执行目标",
      nextStep:
        "创建一项明确、可完成、可验证的任务",
      expectedResult:
        "形成 AIOS Alpha 的第一条 Planner 执行路径",
      executionState:
        "Planner Ready",
    };
  }

  if (
    progress.completed ===
    progress.total
  ) {
    return {
      currentGoal:
        "当前任务已经全部完成",
      nextStep:
        "创建下一阶段目标",
      expectedResult:
        "进入新的执行周期",
      executionState:
        `${progress.completed} 项任务已完成`,
    };
  }

  return {
    currentGoal:
      mission.title,

    nextStep:
      nextTask?.title ??
      "完成当前任务并更新执行状态",

    expectedResult:
      "形成可验证、可记录的完成结果",

    executionState:
      progress.doing > 0
        ? `${progress.doing} 项正在执行，${progress.todo} 项等待执行`
        : `${progress.todo} 项等待执行`,
  };
}

export function buildPlannerSnapshot(
  tasks: Task[]
): PlannerSnapshot {
  const safeTasks =
    Array.isArray(tasks)
      ? tasks
      : [];

  const queue =
    createQueue(safeTasks);

  const progress =
    createProgress(safeTasks);

  const state =
    createState(progress);

  const mission =
    createMission(queue);

  const plan =
    createPlan(
      queue,
      mission,
      progress
    );

  const completedTasks =
    sortTasks(
      safeTasks.filter(
        (task) =>
          task.status === "done"
      )
    );

  return {
    state,
    mission,
    plan,
    queue,
    progress,
    completedTasks,
    generatedAt: Date.now(),
  };
}