import {
  runMarketDecisionWorkspace,
} from "./market-decision-workspace-runtime";

const TEST_UNIVERSE = [
  {
    symbol: "NVDA",
    market: "us" as const,
  },
  {
    symbol: "0700.HK",
    market: "hk" as const,
  },
  {
    symbol: "600519.SH",
    market: "cn" as const,
  },
];

export async function runMarketDecisionWorkspaceRegression() {
  const startedAt =
    Date.now();

  const result =
    await runMarketDecisionWorkspace({
      universe:
        TEST_UNIVERSE,
    });

  const checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }> = [];

  checks.push({
    name:
      "RUNTIME_COMPLETED",
    passed:
      result.success === true,
    detail:
      `Runtime code: ${result.code}`,
  });

  checks.push({
    name:
      "THREE_MARKET_UNIVERSE",
    passed:
      result.snapshot
        .universeSize === 3,
    detail:
      `Universe=${result.snapshot.universeSize}`,
  });

  checks.push({
    name:
      "WORKSPACES_PRESENT",
    passed:
      result.snapshot
        .workspaces.length === 3,
    detail:
      `Workspaces=${result.snapshot.workspaces.length}`,
  });

  checks.push({
    name:
      "C156_UPSTREAM",
    passed:
      result.upstream
        .researchDossier ===
      "C156.1",
    detail:
      "C156.1 Research Dossier is preserved.",
  });

  checks.push({
    name:
      "EVIDENCE_TRACE",
    passed:
      result.snapshot.workspaces.every(
        (item) =>
          item.evidence
            .sourceCount >= 0 &&
          item.evidence
            .independentDomains >= 0,
      ),
    detail:
      "Evidence provenance remains visible.",
  });

  checks.push({
    name:
      "DECISION_QUESTIONS",
    passed:
      result.snapshot.workspaces.every(
        (item) =>
          item.decisionQuestions
            .length > 0,
      ),
    detail:
      "Every workspace contains human decision questions.",
  });

  checks.push({
    name:
      "EVIDENCE_GAPS",
    passed:
      result.snapshot.workspaces.every(
        (item) =>
          Array.isArray(
            item.evidenceGaps,
          ),
      ),
    detail:
      "Evidence gaps are explicitly represented.",
  });

  checks.push({
    name:
      "INVALIDATION_TRACE",
    passed:
      result.snapshot.workspaces.every(
        (item) =>
          Array.isArray(
            item.invalidationConditions,
          ),
      ),
    detail:
      "Risk invalidation conditions remain traceable.",
  });

  checks.push({
    name:
      "HUMAN_DECISION",
    passed:
      result.humanDecisionRequired ===
        true &&
      result.snapshot.workspaces.every(
        (item) =>
          item.humanDecisionRequired ===
          true,
      ),
    detail:
      "Human decision remains mandatory.",
  });

  checks.push({
    name:
      "NO_DECISION_RECORDING",
    passed:
      result.decisionRecorded ===
        false &&
      result.snapshot.workspaces.every(
        (item) =>
          item.decisionRecorded ===
          false,
      ),
    detail:
      "No human decision is automatically recorded.",
  });

  checks.push({
    name:
      "NO_RECOMMENDATION",
    passed:
      result.recommendationGenerated ===
        false &&
      result.snapshot.workspaces.every(
        (item) =>
          item.recommendationGenerated ===
          false,
      ),
    detail:
      "No investment recommendation is generated.",
  });

  checks.push({
    name:
      "NO_TASK",
    passed:
      result.taskCreated ===
      false,
    detail:
      "No Task was created.",
  });

  checks.push({
    name:
      "NO_PLANNER",
    passed:
      result.plannerDispatched ===
      false,
    detail:
      "Planner was not dispatched.",
  });

  checks.push({
    name:
      "NO_TRADING",
    passed:
      result.tradingExecuted ===
      false,
    detail:
      "Trading was not executed.",
  });

  checks.push({
    name:
      "NO_RECOMMENDATION_LANGUAGE",
    passed:
      result.disclaimer.includes(
        "does not generate buy, sell, hold or target-price",
      ),
    detail:
      "Recommendation boundary remains preserved.",
  });

  const passed =
    checks.filter(
      (check) =>
        check.passed,
    ).length;

  return {
    success:
      passed ===
      checks.length,

    code:
      passed ===
      checks.length
        ? "C157_MARKET_DECISION_WORKSPACE_REGRESSION_PASS"
        : "C157_MARKET_DECISION_WORKSPACE_REGRESSION_FAIL",

    passed,

    total:
      checks.length,

    failed:
      checks.length -
      passed,

    checks,

    runtimeMs:
      Date.now() -
      startedAt,
  };
}
