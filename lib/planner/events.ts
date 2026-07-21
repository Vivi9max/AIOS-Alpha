export const PLANNER_REFRESH_EVENT =
  "aios:planner:refresh";

export type PlannerRefreshReason =
  | "task-created"
  | "task-updated"
  | "task-completed"
  | "task-deleted"
  | "memory-updated"
  | "manual"
  | "unknown";

export interface PlannerRefreshDetail {
  reason:
    PlannerRefreshReason;

  timestamp:
    number;
}

export function requestPlannerRefresh(
  reason:
    PlannerRefreshReason =
      "manual"
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const detail:
    PlannerRefreshDetail = {
    reason,
    timestamp:
      Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent<
      PlannerRefreshDetail
    >(
      PLANNER_REFRESH_EVENT,
      {
        detail,
      }
    )
  );
}