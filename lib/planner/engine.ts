import type {
  Task,
  TaskStatus,
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

const STATUS_ORDER: Record<
  TaskStatus,
  number
> = {
  doing: 0,
  todo: 1,
  done: 2,
};

const HOUR_MS =
  60 * 60 * 1000;

const STALE_DOING_MS =
  24 * HOUR_MS;

function cleanText(
  value: unknown
): string {
  return typeof value ===
    "string"
    ? value
        .trim()
        .replace(
          /\s+/g,
          " "
        )
    : "";
}

function safeTimestamp(
  value: unknown,
  fallback: number
): number {
  return typeof value ===
      "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : fallback;
}

function isTaskStatus(
  value: unknown
): value is TaskStatus {
  return (
    value === "todo" ||
    value === "doing" ||
    value === "done"
  );
}

function normalizeTask(
  value: unknown
): Task | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const candidate =
    value as Partial<Task>;

  const id = cleanText(
    candidate.id
  );

  const title = cleanText(
    candidate.title
  );

  if (
    !id ||
    !title ||
    !isTaskStatus(
      candidate.status
    )
  ) {
    return null;
  }

  const createdAt =
    safeTimestamp(
      candidate.createdAt,
      Date.now()
    );

  const updatedAt =
    Math.max(
      createdAt,
      safeTimestamp(
        candidate.updatedAt,
        createdAt
      )
    );

  return {
    id,
    title,
    description:
      cleanText(
        candidate.description
      ),
    status:
      candidate.status,
    createdAt,
    updatedAt,
  };
}

function normalizeTasks(
  tasks: unknown
): Task[] {
  if (!Array.isArray(tasks)) {
    return [];
  }

  const uniqueTasks =
    new Map<string, Task>();

  for (const value of tasks) {
    const task =
      normalizeTask(value);

    if (!task) {
      continue;
    }

    const existing =
      uniqueTasks.get(
        task.id
      );

    if (
      !existing ||
      task.updatedAt >=
        existing.updatedAt
    ) {
      uniqueTasks.set(
        task.id,
        task
      );
    }
  }

  return [
    ...uniqueTasks.values(),
  ];
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
        (completed / total) *
          100
      )
    )
  );
}

function compareTasks(
  first: Task,
  second: Task
): number {
  const statusDifference =
    STATUS_ORDER[
      first.status
    ] -
    STATUS_ORDER[
      second.status
    ];

  if (statusDifference !== 0) {
    return statusDifference;
  }

  const updateDifference =
    second.updatedAt -
    first.updatedAt;

  if (updateDifference !== 0) {
    return updateDifference;
  }

  const createDifference =
    first.createdAt -
    second.createdAt;

  if (createDifference !== 0) {
    return createDifference;
  }

  return first.id.localeCompare(
    second.id
  );
}

function sortTasks(
  tasks: Task[]
): Task[] {
  return [...tasks].sort(
    compareTasks
  );
}

function getPriority(
  task: Task,
  activePosition: number,
  generatedAt: number
): PlannerPriority {
  if (task.status === "done") {
    return "completed";
  }

  if (
    task.status === "doing" &&
    (activePosition === 0 ||
      generatedAt -
        task.updatedAt >=
        STALE_DOING_MS)
  ) {
    return "critical";
  }

  if (
    task.status === "doing" ||
    activePosition <= 1
  ) {
    return "high";
  }

  return "normal";
}

function createQueue(
  tasks: Task[],
  generatedAt: number
): PlannerQueueItem[] {
  let activePosition = 0;

  return sortTasks(tasks).map(
    (task, index) => {
      const currentActivePosition =
        task.status === "done"
          ? Number.MAX_SAFE_INTEGER
          : activePosition++;

      return {
        id: task.id,
        title: task.title,
        description:
          cleanText(
            task.description
          ),
        status: task.status,
        priority:
          getPriority(
            task,
            currentActivePosition,
            generatedAt
          ),
        position: index + 1,
        createdAt:
          task.createdAt,
        updatedAt:
          task.updatedAt,
      };
    }
  );
}

function createProgress(
  tasks: Task[]
): PlannerProgress {
  const doing =
    tasks.filter(
      (task) =>
        task.status ===
        "doing"
    ).length;

  const todo =
    tasks.filter(
      (task) =>
        task.status ===
        "todo"
    ).length;

  const completed =
    tasks.filter(
      (task) =>
        task.status ===
        "done"
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
        task.status ===
        "doing"
    ) ??
    queue.find(
      (task) =>
        task.status ===
        "todo"
    );

  if (!current) {
    return {
      id: null,
      title:
        "创建下一项成果目标",
      description:
        "当前执行周期已完成。定义下一项可验证成果后，Planner 将自动建立执行路径。",
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

function createExpectedResult(
  mission: PlannerMission
): string {
  if (
    mission.status === "idle"
  ) {
    return "形成一项可执行、可验证、可记录的新成果目标";
  }

  return mission.description
    ? `完成“${mission.title}”，并产出可验证结果：${mission.description}`
    : `完成“${mission.title}”，记录执行结果与验证证据`;
}

function createPlan(
  queue: PlannerQueueItem[],
  mission: PlannerMission,
  progress: PlannerProgress,
  generatedAt: number
): PlannerPlan {
  const activeQueue =
    queue.filter(
      (task) =>
        task.status !==
        "done"
    );

  const nextTask =
    activeQueue.find(
      (task) =>
        task.id !==
        mission.id
    );

  if (progress.total === 0) {
    return {
      currentGoal:
        "建立第一项成果目标",
      nextStep:
        "创建一项明确、可完成、可验证的任务",
      expectedResult:
        "形成 AIOS Alpha 的第一条闭环执行路径",
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
        "当前执行周期已经完成",
      nextStep:
        "根据已完成结果创建下一阶段目标",
      expectedResult:
        "启动新的成果执行周期",
      executionState:
        `${progress.completed} 项任务已完成`,
    };
  }

  const currentTask =
    mission.id
      ? activeQueue.find(
          (task) =>
            task.id ===
            mission.id
        )
      : undefined;

  const isStale =
    currentTask?.status ===
      "doing" &&
    generatedAt -
      currentTask.updatedAt >=
      STALE_DOING_MS;

  return {
    currentGoal:
      mission.title,
    nextStep: isStale
      ? `检查“${mission.title}”的阻碍并更新执行状态`
      : mission.status ===
          "todo"
        ? `开始执行“${mission.title}”`
        : nextTask?.title
          ? `完成当前任务后推进“${nextTask.title}”`
          : "完成当前任务并记录验证结果",
    expectedResult:
      createExpectedResult(
        mission
      ),
    executionState:
      progress.doing > 0
        ? `${progress.doing} 项正在执行，${progress.todo} 项等待执行`
        : `${progress.todo} 项等待执行`,
  };
}

export function buildPlannerSnapshot(
  tasks: Task[]
): PlannerSnapshot {
  const generatedAt =
    Date.now();

  const safeTasks =
    normalizeTasks(tasks);

  const queue =
    createQueue(
      safeTasks,
      generatedAt
    );

  const progress =
    createProgress(
      safeTasks
    );

  const state =
    createState(progress);

  const mission =
    createMission(queue);

  const plan =
    createPlan(
      queue,
      mission,
      progress,
      generatedAt
    );

  const completedTasks =
    sortTasks(
      safeTasks.filter(
        (task) =>
          task.status ===
          "done"
      )
    );

  return {
    state,
    mission,
    plan,
    queue,
    progress,
    completedTasks,
    generatedAt,
  };
}
