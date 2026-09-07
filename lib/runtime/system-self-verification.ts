import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  verifyPlannerHealth,
  type PlannerHealthResult,
} from "@/lib/runtime/planner-health";

import {
  runAutonomousLoopRegression,
  type AutonomousLoopRegressionResult,
} from "@/lib/runtime/autonomous-loop-regression";

export type SystemVerificationStatus =
  | "VERIFIED"
  | "DEGRADED"
  | "FAILED";

export interface SystemVerificationCheck {
  id: string;
  status:
    | "pass"
    | "warn"
    | "fail";
  message: string;
  details?: Record<string, unknown>;
}

export interface SystemSelfVerificationResult {
  verified: boolean;

  status: SystemVerificationStatus;

  score: number;

  runtime: {
    id: string;
    stage: string;
    version: string;
    codename: string;
  };

  checks: SystemVerificationCheck[];

  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };

  core: {
    status:
      | "healthy"
      | "degraded"
      | "failed";
    score: number;
    passed: number;
    warnings: number;
    failed: number;
  };

  planner: {
    status:
      | "healthy"
      | "idle"
      | "degraded"
      | "failed";
    score: number;
    passed: number;
    warnings: number;
    failed: number;
  };

  autonomousLoop: {
    status:
      | "healthy"
      | "degraded"
      | "failed";
    score: number;
    passed: number;
    warnings: number;
    failed: number;
  };

  evidence: {
    planner: PlannerHealthResult;
    autonomousLoop: AutonomousLoopRegressionResult;
  };

  timestamp: number;
}

function pushCheck(
  checks: SystemVerificationCheck[],
  check: SystemVerificationCheck,
): void {
  checks.push(check);
}

export async function verifyAISystem(): Promise<SystemSelfVerificationResult> {
  const timestamp = Date.now();

  try {
    /*
     * Autonomous Loop Regression already executes
     * Runtime Core Verification internally.
     *
     * Planner Health is executed independently so that
     * the final system verdict does not rely only on
     * shallow planner metrics.
     */
    const [
      planner,
      autonomousLoop,
    ] = await Promise.all([
      verifyPlannerHealth(),
      runAutonomousLoopRegression(),
    ]);

    const checks: SystemVerificationCheck[] = [];

    /*
     * Runtime Core evidence comes from the Autonomous
     * Loop Regression's embedded Core Verification.
     */
    const coreChecks =
      autonomousLoop.checks.filter(
        (check) =>
          check.id.startsWith(
            "core-",
          ),
      );

    for (const check of coreChecks) {
      pushCheck(
        checks,
        {
          id:
            check.id,

          status:
            check.status,

          message:
            check.message,

          details:
            check.details,
        },
      );
    }

    /*
     * Planner Health must independently pass its
     * structural contract.
     */
    pushCheck(
      checks,
      {
        id:
          "planner-health",

        status:
          planner.summary.failed > 0
            ? "fail"
            : planner.summary.warnings > 0
              ? "warn"
              : "pass",

        message:
          planner.summary.failed > 0
            ? "Planner Health verification failed."
            : planner.summary.warnings > 0
              ? "Planner Health verification completed with warnings."
              : "Planner Health verification passed.",

        details: {
          status:
            planner.status,

          score:
            planner.score,

          summary:
            planner.summary,
        },
      },
    );

    /*
     * Autonomous Loop Regression must pass.
     */
    pushCheck(
      checks,
      {
        id:
          "autonomous-loop-regression",

        status:
          autonomousLoop.summary.failed > 0
            ? "fail"
            : autonomousLoop.summary.warnings > 0
              ? "warn"
              : "pass",

        message:
          autonomousLoop.summary.failed > 0
            ? "Autonomous Loop Regression failed."
            : autonomousLoop.summary.warnings > 0
              ? "Autonomous Loop Regression completed with warnings."
              : "Autonomous Loop Regression passed.",

        details: {
          status:
            autonomousLoop.status,

          score:
            autonomousLoop.score,

          summary:
            autonomousLoop.summary,
        },
      },
    );

    /*
     * Cross-layer consistency:
     *
     * Planner Health and Autonomous Loop Regression
     * must agree on the core planner counters.
     */
    const plannerConsistency =
      planner.planner.outcomes ===
        autonomousLoop.planner.outcomes &&
      planner.planner.activeOutcomes ===
        autonomousLoop.planner.activeOutcomes &&
      planner.planner.todoTasks ===
        autonomousLoop.planner.todoTasks &&
      planner.planner.doingTasks ===
        autonomousLoop.planner.doingTasks &&
      planner.planner.doneTasks ===
        autonomousLoop.planner.doneTasks;

    pushCheck(
      checks,
      {
        id:
          "planner-cross-layer-consistency",

        status:
          plannerConsistency
            ? "pass"
            : "fail",

        message:
          plannerConsistency
            ? "Planner Health and Autonomous Loop evidence agree."
            : "Planner Health and Autonomous Loop evidence disagree.",

        details: {
          planner: {
            outcomes:
              planner.planner.outcomes,

            activeOutcomes:
              planner.planner.activeOutcomes,

            todoTasks:
              planner.planner.todoTasks,

            doingTasks:
              planner.planner.doingTasks,

            doneTasks:
              planner.planner.doneTasks,
          },

          autonomousLoop:
            autonomousLoop.planner,
        },
      },
    );

    /*
     * The final verification contract is intentionally
     * stricter than the individual module success flags.
     *
     * VERIFIED requires:
     *
     * 1. no failures
     * 2. no warnings
     * 3. Core healthy
     * 4. Planner healthy or idle
     * 5. Autonomous Loop healthy
     * 6. cross-layer consistency
     */
    const failed =
      checks.filter(
        (check) =>
          check.status ===
          "fail",
      ).length;

    const warnings =
      checks.filter(
        (check) =>
          check.status ===
          "warn",
      ).length;

    const passed =
      checks.filter(
        (check) =>
          check.status ===
          "pass",
      ).length;

    const total =
      checks.length;

    const coreHealthy =
      coreChecks.length > 0 &&
      coreChecks.every(
        (check) =>
          check.status ===
          "pass",
      );

    const plannerHealthy =
      planner.status ===
        "healthy" ||
      planner.status ===
        "idle";

    const autonomousLoopHealthy =
      autonomousLoop.status ===
      "healthy";

    const finalVerified =
      failed === 0 &&
      warnings === 0 &&
      coreHealthy &&
      plannerHealthy &&
      autonomousLoopHealthy &&
      plannerConsistency;

    const status =
      finalVerified
        ? "VERIFIED"
        : failed > 0
          ? "FAILED"
          : "DEGRADED";

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

    return {
      verified:
        finalVerified,

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

      core: {
        status:
          autonomousLoop.status,

        score:
          autonomousLoop.score,

        passed:
          coreChecks.filter(
            (check) =>
              check.status ===
              "pass",
          ).length,

        warnings:
          coreChecks.filter(
            (check) =>
              check.status ===
              "warn",
          ).length,

        failed:
          coreChecks.filter(
            (check) =>
              check.status ===
              "fail",
          ).length,
      },

      planner: {
        status:
          planner.status,

        score:
          planner.score,

        passed:
          planner.summary.passed,

        warnings:
          planner.summary.warnings,

        failed:
          planner.summary.failed,
      },

      autonomousLoop: {
        status:
          autonomousLoop.status,

        score:
          autonomousLoop.score,

        passed:
          autonomousLoop.summary.passed,

        warnings:
          autonomousLoop.summary.warnings,

        failed:
          autonomousLoop.summary.failed,
      },

      evidence: {
        planner,

        autonomousLoop,
      },

      timestamp,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AIOS system self-verification failed.";

    return {
      verified:
        false,

      status:
        "FAILED",

      score:
        0,

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

      checks: [
        {
          id:
            "system-self-verification",

          status:
            "fail",

          message,
        },
      ],

      summary: {
        passed: 0,
        warnings: 0,
        failed: 1,
        total: 1,
      },

      core: {
        status:
          "failed",
        score: 0,
        passed: 0,
        warnings: 0,
        failed: 1,
      },

      planner: {
        status:
          "failed",
        score: 0,
        passed: 0,
        warnings: 0,
        failed: 1,
      },

      autonomousLoop: {
        status:
          "failed",
        score: 0,
        passed: 0,
        warnings: 0,
        failed: 1,
      },

      evidence: {
        planner:
          {
            success: false,
            status: "failed",
            score: 0,
            checks: [],
            summary: {
              passed: 0,
              warnings: 0,
              failed: 1,
              total: 1,
            },
            planner: {
              outcomes: 0,
              plannedOutcomes: 0,
              activeOutcomes: 0,
              blockedOutcomes: 0,
              completedOutcomes: 0,
              archivedOutcomes: 0,
              totalTasks: 0,
              todoTasks: 0,
              doingTasks: 0,
              doneTasks: 0,
            },
            timestamp,
          },

        autonomousLoop:
          {
            success: false,
            status: "failed",
            score: 0,
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
            checks: [],
            summary: {
              passed: 0,
              warnings: 0,
              failed: 1,
              total: 1,
            },
            planner: {
              outcomes: 0,
              activeOutcomes: 0,
              todoTasks: 0,
              doingTasks: 0,
              doneTasks: 0,
            },
            execution: {
              recentRuns: 0,
              recentFailures: 0,
              successRate: null,
            },
            autonomy: {
              ready: false,
              level: "unknown",
              decision: "observe",
              blockers: [
                message,
              ],
              recommendations: [],
              candidateTask: null,
            },
            timestamp,
          },
      },

      timestamp,
    };
  }
}
