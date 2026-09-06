import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  verifyRuntimeCore,
  type CoreCheckStatus,
} from "@/lib/runtime/core-verification";

import {
  evaluateAutonomyGate,
} from "@/lib/evolution/autonomy-gate";

export type RegressionCheckStatus =
  | "pass"
  | "warn"
  | "fail";

export interface RegressionCheck {
  id: string;
  status: RegressionCheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface AutonomousLoopRegressionResult {
  success: boolean;

  status:
    | "healthy"
    | "degraded"
    | "failed";

  score: number;

  runtime: {
    id: string;
    stage: string;
    version: string;
    codename: string;
  };

  checks: RegressionCheck[];

  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };

  planner: {
    outcomes: number;
    activeOutcomes: number;
    todoTasks: number;
    doingTasks: number;
    doneTasks: number;
  };

  execution: {
    recentRuns: number;
    recentFailures: number;
    successRate: number | null;
  };

  autonomy: {
    ready: boolean;
    level: string;
    decision: string;
    blockers: string[];
    recommendations: string[];
    candidateTask: {
      id: string;
      title: string;
      description: string;
    } | null;
  };

  timestamp: number;
}

function mapCoreStatus(
  status: CoreCheckStatus,
): RegressionCheckStatus {
  return status;
}

function pushCheck(
  checks: RegressionCheck[],
  check: RegressionCheck,
): void {
  checks.push(check);
}

export async function runAutonomousLoopRegression(): Promise<AutonomousLoopRegressionResult> {
  const timestamp = Date.now();

  const [
    core,
    autonomy,
  ] = await Promise.all([
    verifyRuntimeCore(),
    evaluateAutonomyGate(),
  ]);

  const checks: RegressionCheck[] = [];

  for (const check of core.checks) {
    pushCheck(checks, {
      id: `core-${check.id}`,
      status: mapCoreStatus(check.status),
      message: check.message,
      details: check.details,
    });
  }

  const plannerHealthy =
    core.planner.outcomes >= 0 &&
    core.planner.activeOutcomes >= 0 &&
    core.planner.todoTasks >= 0 &&
    core.planner.doingTasks >= 0 &&
    core.planner.doneTasks >= 0;

  pushCheck(checks, {
    id: "planner-health-contract",
    status: plannerHealthy
      ? "pass"
      : "fail",
    message: plannerHealthy
      ? "Planner health metrics are structurally valid."
      : "Planner health metrics are invalid.",
    details: {
      outcomes:
        core.planner.outcomes,
      activeOutcomes:
        core.planner.activeOutcomes,
      todoTasks:
        core.planner.todoTasks,
      doingTasks:
        core.planner.doingTasks,
      doneTasks:
        core.planner.doneTasks,
    },
  });

  const executionHealthy =
    core.execution.recentFailures === 0;

  pushCheck(checks, {
    id: "execution-health-contract",
    status: executionHealthy
      ? "pass"
      : "fail",
    message: executionHealthy
      ? "Execution health has no recent recorded failures."
      : "Execution health reports recent failures.",
    details: {
      recentRuns:
        core.execution.recentRuns,
      recentFailures:
        core.execution.recentFailures,
      successRate:
        core.execution.successRate,
    },
  });

  const gateReadyContract =
    autonomy.ready
      ? autonomy.level ===
          "autonomous" &&
        autonomy.decision ===
          "execute-one" &&
        autonomy.blockers.length ===
          0 &&
        autonomy.candidateTask !==
          null
      : autonomy.decision !==
          "execute-one" &&
        (
          autonomy.blockers.length >
            0 ||
          autonomy.candidateTask ===
            null
        );

  pushCheck(checks, {
    id: "autonomy-gate-contract",
    status: gateReadyContract
      ? "pass"
      : "fail",
    message: gateReadyContract
      ? "Autonomy Gate state is internally consistent."
      : "Autonomy Gate returned an internally inconsistent state.",
    details: {
      ready:
        autonomy.ready,
      level:
        autonomy.level,
      decision:
        autonomy.decision,
      blockerCount:
        autonomy.blockers.length,
      hasCandidate:
        autonomy.candidateTask !==
        null,
    },
  });

  const queueContract =
    autonomy.checks.todoTasks ===
      core.planner.todoTasks &&
    autonomy.checks.doingTasks ===
      core.planner.doingTasks &&
    autonomy.checks.activeOutcomes ===
      core.planner.activeOutcomes;

  pushCheck(checks, {
    id: "planner-autonomy-consistency",
    status: queueContract
      ? "pass"
      : "fail",
    message: queueContract
      ? "Planner metrics and Autonomy Gate metrics agree."
      : "Planner metrics and Autonomy Gate metrics disagree.",
    details: {
      coreTodoTasks:
        core.planner.todoTasks,
      gateTodoTasks:
        autonomy.checks.todoTasks,
      coreDoingTasks:
        core.planner.doingTasks,
      gateDoingTasks:
        autonomy.checks.doingTasks,
      coreActiveOutcomes:
        core.planner.activeOutcomes,
      gateActiveOutcomes:
        autonomy.checks.activeOutcomes,
    },
  });

  const candidateContract =
    autonomy.ready
      ? autonomy.candidateTask !==
        null
      : true;

  pushCheck(checks, {
    id: "candidate-task-contract",
    status: candidateContract
      ? "pass"
      : "fail",
    message: candidateContract
      ? "Autonomy candidate-task contract is valid."
      : "Autonomy Gate claims readiness without an eligible candidate task.",
    details: {
      ready:
        autonomy.ready,
      candidateTaskId:
        autonomy.candidateTask?.id ??
        null,
    },
  });

  const safetyContract =
    autonomy.ready
      ? autonomy.blockers.length ===
          0 &&
        autonomy.decision ===
          "execute-one"
      : autonomy.decision !==
        "execute-one";

  pushCheck(checks, {
    id: "autonomous-safety-contract",
    status: safetyContract
      ? "pass"
      : "fail",
    message: safetyContract
      ? "Autonomous execution remains bounded by the safety gate."
      : "Autonomous execution safety boundary is inconsistent.",
    details: {
      ready:
        autonomy.ready,
      decision:
        autonomy.decision,
      blockers:
        autonomy.blockers,
    },
  });

  if (
    !autonomy.ready &&
    autonomy.blockers.length > 0
  ) {
    pushCheck(checks, {
      id: "autonomy-observation",
      status: "warn",
      message:
        "Autonomous execution is currently blocked or observing; this is expected until all safety prerequisites are satisfied.",
      details: {
        level:
          autonomy.level,
        decision:
          autonomy.decision,
        blockers:
          autonomy.blockers,
      },
    });
  } else if (
    autonomy.ready
  ) {
    pushCheck(checks, {
      id: "autonomy-observation",
      status: "pass",
      message:
        "Autonomy Gate currently permits exactly one eligible task.",
      details: {
        candidateTask:
          autonomy.candidateTask,
      },
    });
  } else {
    pushCheck(checks, {
      id: "autonomy-observation",
      status: "warn",
      message:
        "Autonomy Gate is not ready and returned no explicit blocker.",
      details: {
        level:
          autonomy.level,
        decision:
          autonomy.decision,
      },
    });
  }

  const passed =
    checks.filter(
      (check) =>
        check.status ===
        "pass",
    ).length;

  const warnings =
    checks.filter(
      (check) =>
        check.status ===
        "warn",
    ).length;

  const failed =
    checks.filter(
      (check) =>
        check.status ===
        "fail",
    ).length;

  const total =
    checks.length;

  const score =
    total > 0
      ? Math.round(
          (
            passed +
            warnings * 0.5
          ) /
            total *
            100,
        )
      : 0;

  const status =
    failed > 0
      ? "failed"
      : warnings > 0
        ? "degraded"
        : "healthy";

  return {
    success:
      failed === 0,

    status,

    score,

    runtime: {
      id:
        APP_CONFIG.runtimeId,
      stage:
        APP_CONFIG.stage,
      version:
        APP_CONFIG.version,
      codename:
        APP_CONFIG.codename,
    },

    checks,

    summary: {
      passed,
      warnings,
      failed,
      total,
    },

    planner: {
      outcomes:
        core.planner.outcomes,
      activeOutcomes:
        core.planner.activeOutcomes,
      todoTasks:
        core.planner.todoTasks,
      doingTasks:
        core.planner.doingTasks,
      doneTasks:
        core.planner.doneTasks,
    },

    execution: {
      recentRuns:
        core.execution.recentRuns,
      recentFailures:
        core.execution.recentFailures,
      successRate:
        core.execution.successRate,
    },

    autonomy: {
      ready:
        autonomy.ready,
      level:
        autonomy.level,
      decision:
        autonomy.decision,
      blockers:
        autonomy.blockers,
      recommendations:
        autonomy.recommendations,
      candidateTask:
        autonomy.candidateTask,
    },

    timestamp,
  };
}
