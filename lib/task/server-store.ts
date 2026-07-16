import { storage } from "@/lib/server-storage";

import type {
  Task,
  TaskStatus,
} from "./types";

const STORAGE_KEY =
  "aios:default:tasks";

const MAX_TASKS = 200;

function isTask(
  value: unknown
): value is Task {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const task =
    value as Partial<Task>;

  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.status === "string" &&
    ["todo", "doing", "done"].includes(
      task.status
    ) &&
    typeof task.createdAt ===
      "number" &&
    typeof task.updatedAt ===
      "number"
  );
}

function normalizeTasks(
  value: unknown
): Task[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isTask)
    .slice(-MAX_TASKS);
}

function normalizeTitle(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

async function readTasks():
  Promise<Task[]> {
  const stored =
    await storage.get<Task[]>(
      STORAGE_KEY
    );

  return normalizeTasks(
    stored
  );
}

async function writeTasks(
  tasks: Task[]
): Promise<void> {
  await storage.set(
    STORAGE_KEY,
    tasks.slice(-MAX_TASKS)
  );
}

function createTaskId(): string {
  return [
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join("-");
}

export async function listPersistentTasks():
  Promise<Task[]> {
  const tasks =
    await readTasks();

  return tasks.sort(
    (a, b) =>
      b.createdAt -
      a.createdAt
  );
}

export async function findDuplicateActiveTask(
  title: string
): Promise<Task | null> {
  const normalized =
    normalizeTitle(title);

  if (!normalized) {
    return null;
  }

  const tasks =
    await readTasks();

  return (
    tasks.find(
      (task) =>
        task.status !== "done" &&
        normalizeTitle(
          task.title
        ) === normalized
    ) ?? null
  );
}

export async function createPersistentTask(
  title: string,
  description = "",
  options?: {
    allowDuplicate?: boolean;
  }
): Promise<Task> {
  const cleanTitle =
    title.trim();

  if (!cleanTitle) {
    throw new Error(
      "Task title is required."
    );
  }

  const tasks =
    await readTasks();

  if (
    !options?.allowDuplicate
  ) {
    const normalized =
      normalizeTitle(
        cleanTitle
      );

    const duplicate =
      tasks.find(
        (task) =>
          task.status !== "done" &&
          normalizeTitle(
            task.title
          ) === normalized
      );

    if (duplicate) {
      throw new Error(
        `DUPLICATE_TASK:${duplicate.id}`
      );
    }
  }

  const now =
    Date.now();

  const task: Task = {
    id: createTaskId(),
    title: cleanTitle,
    description:
      description.trim(),
    status: "todo",
    createdAt: now,
    updatedAt: now,
  };

  tasks.push(task);

  await writeTasks(tasks);

  return task;
}

export async function updatePersistentTask(
  id: string,
  updates: {
    title?: string;
    description?: string;
    status?: TaskStatus;
  }
): Promise<Task | null> {
  const tasks =
    await readTasks();

  const index =
    tasks.findIndex(
      (task) =>
        task.id === id
    );

  if (index === -1) {
    return null;
  }

  const current =
    tasks[index];

  const updated: Task = {
    ...current,

    title:
      updates.title !==
      undefined
        ? updates.title.trim() ||
          current.title
        : current.title,

    description:
      updates.description !==
      undefined
        ? updates.description.trim()
        : current.description,

    status:
      updates.status ??
      current.status,

    updatedAt:
      Date.now(),
  };

  tasks[index] = updated;

  await writeTasks(tasks);

  return updated;
}

export async function deletePersistentTask(
  id: string
): Promise<boolean> {
  const tasks =
    await readTasks();

  const nextTasks =
    tasks.filter(
      (task) =>
        task.id !== id
    );

  if (
    nextTasks.length ===
    tasks.length
  ) {
    return false;
  }

  await writeTasks(
    nextTasks
  );

  return true;
}

export async function clearPersistentTasks():
  Promise<void> {
  await storage.delete(
    STORAGE_KEY
  );
}

export function getTaskStorageKey():
  string {
  return STORAGE_KEY;
}