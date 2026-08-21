export type ExecutionJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type ExecutionVerificationStatus =
  | "pending"
  | "passed"
  | "failed";

export interface ExecutionJobVerification {
  status: ExecutionVerificationStatus;
  message?: string;
  checkedAt: number;
}

export interface ExecutionJob {
  id: string;
  planId?: string;
  goal: string;
  taskId?: string;
  status: ExecutionJobStatus;
  input: string;
  result?: string;
  error?: string;
  retryCount: number;
  verification: ExecutionJobVerification;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
}
