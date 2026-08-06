import "server-only";

import {
  buildPlannerLearningSnapshot,
} from "@/lib/planner/learning";

import type {
  PlannerLearningSnapshot,
} from "@/lib/planner/learning";

import {
  buildPlannerAdaptiveStrategy,
  buildPlannerLearningHistory,
  MAX_PLANNER_LEARNING_HISTORY,
  toPlannerHistoryPoint,
} from "@/lib/planner/runtime";

import type {
  PlannerAdaptiveStrategy,
  PlannerLearningHistory,
} from "@/lib/planner/runtime";

import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

import type {
  Task,
} from "@/lib/task/types";

export interface PlannerRuntimeIntelligence {
  learning:
    PlannerLearningSnapshot;

  learningHistory:
    PlannerLearningHistory;

  adaptiveStrategy:
    PlannerAdaptiveStrategy;

  generatedAt:
    number;
}

export interface PlannerRuntimeIntelligenceOptions {
  generatedAt?:
    number;

  recordHistory?:
    boolean;
}

function learningHistoryKey():
  string {
  return createUserStorageKey(
    "planner-learning-history"
  );
}

function safeGeneratedAt(
  value:
    number |
    undefined
): number {
  return typeof value ===
      "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : Date.now();
}

export async function buildPlannerRuntimeIntelligence(
  tasks:
    Task[],

  options:
    PlannerRuntimeIntelligenceOptions = {}
): Promise<PlannerRuntimeIntelligence> {
  const generatedAt =
    safeGeneratedAt(
      options.generatedAt
    );

  const learning =
    buildPlannerLearningSnapshot(
      tasks,
      generatedAt
    );

  const storedHistory =
    await storage.get<
      unknown[]
    >(
      learningHistoryKey()
    );

  const history =
    buildPlannerLearningHistory(
      toPlannerHistoryPoint(
        learning
      ),
      storedHistory
    );

  if (
    options.recordHistory !==
      false &&
    history.changed
  ) {
    await storage.set(
      learningHistoryKey(),
      history.history.slice(
        -MAX_PLANNER_LEARNING_HISTORY
      )
    );
  }

  return {
    learning,

    learningHistory:
      history.result,

    adaptiveStrategy:
      buildPlannerAdaptiveStrategy(
        learning,
        history.result
      ),

    generatedAt,
  };
}

