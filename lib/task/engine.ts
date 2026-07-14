import type { Task } from "./types";

const tasks: Task[] = [];

export function createTask(
  title: string,
  description = ""
): Task {
  const now = Date.now();

  const task: Task = {
    id: now.toString(),
    title,
    description,
    status: "todo",
    createdAt: now,
    updatedAt: now,
  };

  tasks.push(task);

  return task;
}

export function listTasks() {
  return tasks;
}