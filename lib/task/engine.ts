import {
  storageGet,
  storageSet,
} from "../storage";

import type {
  Task,
  TaskStatus,
} from "./types";

const STORAGE_KEY = "aios-tasks";

function loadTasks(): Task[] {
  return storageGet<Task[]>(
    STORAGE_KEY,
    []
  );
}

function saveTasks(tasks: Task[]) {
  storageSet(STORAGE_KEY, tasks);
}

export function createTask(
  title: string,
  description = ""
): Task {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error(
      "Task title is required."
    );
  }

  const now = Date.now();

  const task: Task = {
    id: `${now}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    title: cleanTitle,
    description: description.trim(),
    status: "todo",
    createdAt: now,
    updatedAt: now,
  };

  const tasks = loadTasks();

  tasks.push(task);
  saveTasks(tasks);

  return task;
}

export function listTasks(): Task[] {
  return loadTasks().sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function getTask(
  id: string
): Task | undefined {
  return loadTasks().find(
    (task) => task.id === id
  );
}

export function updateTask(
  id: string,
  updates: {
    title?: string;
    description?: string;
    status?: TaskStatus;
  }
): Task | null {
  const tasks = loadTasks();

  const index = tasks.findIndex(
    (task) => task.id === id
  );

  if (index === -1) {
    return null;
  }

  const current = tasks[index];

  const updated: Task = {
    ...current,
    title:
      updates.title !== undefined
        ? updates.title.trim() ||
          current.title
        : current.title,
    description:
      updates.description !== undefined
        ? updates.description.trim()
        : current.description,
    status:
      updates.status ??
      current.status,
    updatedAt: Date.now(),
  };

  tasks[index] = updated;
  saveTasks(tasks);

  return updated;
}

export function completeTask(
  id: string
): Task | null {
  return updateTask(id, {
    status: "done",
  });
}

export function deleteTask(
  id: string
): boolean {
  const tasks = loadTasks();

  const nextTasks = tasks.filter(
    (task) => task.id !== id
  );

  if (
    nextTasks.length === tasks.length
  ) {
    return false;
  }

  saveTasks(nextTasks);
  return true;
}

export function clearTasks() {
  saveTasks([]);
}