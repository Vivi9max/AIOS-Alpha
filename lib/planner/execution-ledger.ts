import "server-only";

import { storage } from "@/lib/server-storage";
import { createUserStorageKey } from "@/lib/storage/data-scope";
import type { PlannerAdaptiveMode } from "@/lib/planner/runtime";

export type ExecutionLedgerAction =
  | "task-create"
  | "task-start"
  | "task-complete"
  | "task-update"
  | "task-delete"
  | "outcome-start-next"
  | "outcome-complete-current";

export type ExecutionLedgerDecision = "allowed" | "blocked";

export interface ExecutionLedgerEntry {
  id: string;
  action: ExecutionLedgerAction;
  decision: ExecutionLedgerDecision;
  mode: PlannerAdaptiveMode;
  code: string | null;
  message: string;
  taskId: string | null;
  taskTitle: string | null;
  outcomeId: string | null;
  maxConcurrentTasks: number;
  doingCount: number;
  createdAt: number;
}

export interface AppendExecutionLedgerInput {
  action: ExecutionLedgerAction;
  decision: ExecutionLedgerDecision;
  mode: PlannerAdaptiveMode;
  code?: string | null;
  message: string;
  taskId?: string | null;
  taskTitle?: string | null;
  outcomeId?: string | null;
  maxConcurrentTasks: number;
  doingCount: number;
}

export interface ExecutionLedgerSummary {
  total: number;
  allowed: number;
  blocked: number;
  completed: number;
  latestAt: number | null;
}

const MAX_LEDGER_ENTRIES = 100;

function ledgerKey(): string {
  return createUserStorageKey("planner-execution-ledger");
}

function isEntry(value: unknown): value is ExecutionLedgerEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ExecutionLedgerEntry>;
  return typeof item.id === "string" &&
    typeof item.action === "string" &&
    (item.decision === "allowed" || item.decision === "blocked") &&
    typeof item.createdAt === "number";
}

export async function listExecutionLedger(
  limit = 50
): Promise<ExecutionLedgerEntry[]> {
  const stored = await storage.get<unknown[]>(ledgerKey());
  const entries = Array.isArray(stored) ? stored.filter(isEntry) : [];
  return entries
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(1, Math.min(MAX_LEDGER_ENTRIES, limit)));
}

export async function appendExecutionLedger(
  input: AppendExecutionLedgerInput
): Promise<ExecutionLedgerEntry> {
  const current = await listExecutionLedger(MAX_LEDGER_ENTRIES);
  const createdAt = Date.now();
  const entry: ExecutionLedgerEntry = {
    id: `ledger-${createdAt}-${Math.random().toString(36).slice(2, 9)}`,
    action: input.action,
    decision: input.decision,
    mode: input.mode,
    code: input.code ?? null,
    message: input.message,
    taskId: input.taskId ?? null,
    taskTitle: input.taskTitle ?? null,
    outcomeId: input.outcomeId ?? null,
    maxConcurrentTasks: input.maxConcurrentTasks,
    doingCount: input.doingCount,
    createdAt,
  };
  await storage.set(ledgerKey(), [entry, ...current].slice(0, MAX_LEDGER_ENTRIES));
  return entry;
}

export function summarizeExecutionLedger(
  entries: ExecutionLedgerEntry[]
): ExecutionLedgerSummary {
  return {
    total: entries.length,
    allowed: entries.filter((entry) => entry.decision === "allowed").length,
    blocked: entries.filter((entry) => entry.decision === "blocked").length,
    completed: entries.filter((entry) => entry.action === "task-complete" && entry.decision === "allowed").length,
    latestAt: entries[0]?.createdAt ?? null,
  };
}
