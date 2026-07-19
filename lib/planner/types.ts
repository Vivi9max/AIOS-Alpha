import type {
  Task,
  TaskStatus,
} from "@/lib/task/types";

export type PlannerState =
  | "idle"
  | "ready"
  | "executing"
  | "completed";

export type PlannerPriority =
  | "critical"
  | "high"
  | "normal"
  | "completed";

export interface PlannerQueueItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: PlannerPriority;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlannerProgress {
  total: number;
  active: number;
  doing: number;
  todo: number;
  completed: number;
  percentage: number;
}

export interface PlannerMission {
  id: string | null;
  title: string;
  description: string;
  status: TaskStatus | "idle";
  priority: PlannerPriority;
}

export interface PlannerPlan {
  currentGoal: string;
  nextStep: string;
  expectedResult: string;
  executionState: string;
}

export interface PlannerSnapshot {
  state: PlannerState;
  mission: PlannerMission;
  plan: PlannerPlan;
  queue: PlannerQueueItem[];
  progress: PlannerProgress;
  completedTasks: Task[];
  generatedAt: number;
}