export type OutcomeStatus =
  | "planned"
  | "active"
  | "blocked"
  | "completed"
  | "archived";

export type OutcomePriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type MilestoneStatus =
  | "pending"
  | "active"
  | "completed"
  | "blocked";

export interface OutcomeMilestone {
  id: string;

  title: string;

  description: string;

  status:
    MilestoneStatus;

  order: number;

  taskIds:
    string[];

  createdAt:
    number;

  updatedAt:
    number;

  completedAt?:
    number;
}

export interface Outcome {
  id: string;

  title: string;

  description: string;

  successCriteria: string;

  status:
    OutcomeStatus;

  priority:
    OutcomePriority;

  progress:
    number;

  targetDate:
    number | null;

  milestones:
    OutcomeMilestone[];

  taskIds:
    string[];

  createdAt:
    number;

  updatedAt:
    number;

  completedAt?:
    number;
}

export interface CreateOutcomeInput {
  title: string;

  description?: string;

  successCriteria?: string;

  priority?:
    OutcomePriority;

  targetDate?:
    number | null;

  milestones?: Array<{
    title: string;

    description?: string;
  }>;
}

export interface UpdateOutcomeInput {
  title?: string;

  description?: string;

  successCriteria?: string;

  status?:
    OutcomeStatus;

  priority?:
    OutcomePriority;

  targetDate?:
    number | null;

  progress?:
    number;

  taskIds?:
    string[];
}

export interface OutcomeSummary {
  total: number;

  planned: number;

  active: number;

  blocked: number;

  completed: number;

  archived: number;

  averageProgress: number;
}