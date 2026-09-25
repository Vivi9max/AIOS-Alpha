import {
  runMarketResearchDossier,
} from "./market-research-dossier-runtime";

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

export async function runMarketResearchDossierRegression() {
  const startedAt =
    Date.now();

  const result =
    await runMarketResearchDossier({
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
      "DOSSIERS_PRESENT",
    passed:
      result.snapshot.dossiers
        .length === 3,
    detail:
      `Dossiers=${result.snapshot.dossiers.length}`,
  });

  checks.push({
    name:
      "C155_UPSTREAM",
    passed:
      result.upstream
        .marketOperatingSystem ===
      "C155.1",
    detail:
      "C155.1 Market Operating System is the monitoring upstream.",
  });

  checks.push({
    name:
      "C147_4_UPSTREAM",
    passed:
      result.upstream
        .selectionFramework ===
      "C147.4",
    detail:
      "C147.4 research framework is preserved.",
  });

  checks.push({
    name:
      "C147_6_UPSTREAM",
    passed:
      result.upstream
        .evidenceMatrix ===
      "C147.6",
    detail:
      "C147.6 evidence matrix is preserved.",
  });

  checks.push({
    name:
      "C149_UPSTREAM",
    passed:
      result.upstream
        .valuation ===
      "C149",
    detail:
      "C149 valuation layer is preserved.",
  });

  checks.push({
    name:
      "C147_17_UPSTREAM",
    passed:
      result.upstream
        .riskControl ===
      "C147.17",
    detail:
      "C147.17 risk control is preserved.",
  });

  checks.push({
    name:
      "EVIDENCE_TRACE",
    passed:
      result.snapshot.dossiers.every(
        (item) =>
          item.evidence
            .sourceCount >= 0 &&
          item.evidence
            .independentDomains >= 0,
      ),
    detail:
      "Every dossier contains evidence provenance metadata.",
  });

  checks.push({
    name:
      "RESEARCH_STAGES",
    passed:
      result.snapshot.dossiers.every(
        (item) =>
          item.stages.some(
            (stage) =>
              stage.stage ===
              "industry",
          ) &&
          item.stages.some(
            (stage) =>
              stage.stage ===
              "company",
          ) &&
          item.stages.some(
            (stage) =>
              stage.stage ===
              "fundamentals",
          ) &&
          item.stages.some(
            (stage) =>
              stage.stage ===
              "valuation",
          ) &&
          item.stages.some(
            (stage) =>
              stage.stage ===
              "risk",
          ),
      ),
    detail:
      "Industry → Company → Fundamentals → Valuation → Risk stages are traceable.",
  });

  checks.push({
    name:
      "HUMAN_DECISION",
    passed:
      result.humanDecisionRequired ===
      true &&
      result.snapshot.dossiers.every(
        (item) =>
          item.humanDecisionRequired ===
          true,
      ),
    detail:
      "Human decision remains mandatory.",
  });

  checks.push({
    name:
      "NO_MUTATION",
    passed:
      result.mutationPerformed ===
      false,
    detail:
      "No market state was mutated.",
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
      "NO_RECOMMENDATION",
    passed:
      result.disclaimer.includes(
        "does not generate buy, sell, hold or target-price",
      ),
    detail:
      "Investment recommendation boundary remains preserved.",
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
        ? "C156_MARKET_RESEARCH_DOSSIER_REGRESSION_PASS"
        : "C156_MARKET_RESEARCH_DOSSIER_REGRESSION_FAIL",

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
