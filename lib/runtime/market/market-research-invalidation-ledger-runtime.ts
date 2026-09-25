import { createHash } from "node:crypto";
import { storage } from "@/lib/server-storage";
import type {
  MarketResearchOutcomeReconciliationResult,
} from "./market-research-outcome-reconciliation-types";
import type {
  MarketResearchInvalidationLedgerRecord,
  MarketResearchInvalidationLedgerRequest,
  MarketResearchInvalidationLedgerResult,
} from "./market-research-invalidation-ledger-types";
const STORAGE_PREFIX =
  "aios:market:research-invalidation-ledger:v1:";
const DISCLAIMER =
  "C161.1 preserves C160 invalidation conditions for explicit human review. It does not automatically evaluate invalidation, generate recommendations, record decisions, dispatch Planner work, or execute trading.";
type AcceptedC160SourceCode =
  | "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PASS"
  | "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL";
function normalizeText(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .trim()
    .slice(0, maxLength);
}
function normalizeSymbol(
  value: unknown,
): string {
  return normalizeText(
    value,
    32,
  ).toUpperCase();
}
function isAcceptedC160SourceCode(
  value: unknown,
): value is AcceptedC160SourceCode {
  return (
    value ===
      "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PASS" ||
    value ===
      "C160_MARKET_RESEARCH_OUTCOME_RECONCILIATION_PARTIAL"
  );
}
function isValidReconciliation(
  value: unknown,
): value is MarketResearchOutcomeReconciliationResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }
  const item =
    value as Record<string, unknown>;
  if (item.success !== true) {
    return false;
  }
  if (
    !isAcceptedC160SourceCode(
      item.code,
    )
  ) {
    return false;
  }
  if (
    item.state !== "reconciled" &&
    item.state !== "review-required"
  ) {
    return false;
  }
  if (
    typeof item.symbol !== "string" ||
    typeof item.market !== "string"
  ) {
    return false;
  }
  if (
    !item.reconciliation ||
    typeof item.reconciliation !== "object"
  ) {
    return false;
  }
  if (!Array.isArray(item.conditionReviews)) {
    return false;
  }
  if (!Array.isArray(item.findings)) {
    return false;
  }
  if (
    !item.boundary ||
    typeof item.boundary !== "object"
  ) {
    return false;
  }
  return true;
}
function fingerprint(
  reconciliation: MarketResearchOutcomeReconciliationResult,
): string {
  const canonical = JSON.stringify({
    symbol: normalizeSymbol(
      reconciliation.symbol,
    ),
    market:
      reconciliation.market,
    code:
      reconciliation.code,
    state:
      reconciliation.state,
    reconciliation:
      reconciliation.reconciliation,
    conditionReviews:
      reconciliation.conditionReviews,
    findings:
      reconciliation.findings,
    generatedAt:
      reconciliation.generatedAt,
  });
  return createHash("sha256")
    .update(canonical)
    .digest("hex")
    .slice(0, 32);
}
function storageKey(
  ledgerId: string,
): string {
  return `${STORAGE_PREFIX}${ledgerId}`;
}
function createLedgerId(
  reconciliation: MarketResearchOutcomeReconciliationResult,
): string {
  return [
    "C1611",
    normalizeSymbol(
      reconciliation.symbol,
    ),
    reconciliation.market,
    fingerprint(
      reconciliation,
    ),
  ].join(":");
}
/**
 * Persistent Ledger Boundary.
 *
 * This follows the exact
 * MarketResearchInvalidationLedgerRecord contract.
 *
 * It intentionally does not contain decisionRecorded.
 */
function buildLedgerBoundary(): MarketResearchInvalidationLedgerRecord["boundary"] {
  return {
    automaticInvalidationEvaluation:
      false,
    recommendationGenerated:
      false,
    decisionAutomaticallyGenerated:
      false,
    taskCreated:
      false,
    plannerDispatched:
      false,
    brokerConnected:
      false,
    liveOrderPlaced:
      false,
    tradingExecuted:
      false,
  };
}
/**
 * Runtime Result Boundary.
 *
 * This follows the exact
 * MarketResearchInvalidationLedgerResult contract.
 */
function buildResultBoundary(): MarketResearchInvalidationLedgerResult["boundary"] {
  return {
    automaticInvalidationEvaluation:
      false,
    decisionAutomaticallyGenerated:
      false,
    decisionRecorded:
      false,
    taskCreated:
      false,
    plannerDispatched:
      false,
    brokerConnected:
      false,
    liveOrderPlaced:
      false,
    tradingExecuted:
      false,
  };
}
/**
 * Explicit mapping between the persisted Ledger Boundary
 * and the public Runtime Result Boundary.
 *
 * These are intentionally different contracts.
 */
function toResultBoundary(
  boundary: MarketResearchInvalidationLedgerRecord["boundary"],
): MarketResearchInvalidationLedgerResult["boundary"] {
  return {
    automaticInvalidationEvaluation:
      boundary.automaticInvalidationEvaluation,
    decisionAutomaticallyGenerated:
      boundary.decisionAutomaticallyGenerated,
    decisionRecorded:
      false,
    taskCreated:
      boundary.taskCreated,
    plannerDispatched:
      boundary.plannerDispatched,
    brokerConnected:
      boundary.brokerConnected,
    liveOrderPlaced:
      boundary.liveOrderPlaced,
    tradingExecuted:
      boundary.tradingExecuted,
  };
}
function buildPrinciples(): string[] {
  return [
    "C161.1 consumes an actual C160 reconciliation result.",
    "C161.1 accepts only C160 PASS or PARTIAL reconciliation states.",
    "C161.1 preserves invalidation conditions without automatically evaluating them.",
    "Historical paper-trading outcomes remain descriptive evidence.",
    "The ledger is immutable for duplicate submissions.",
    "A duplicate C160 reconciliation returns the existing ledger.",
    "Human review remains mandatory.",
    "No investment recommendation is generated.",
    "No decision is automatically recorded.",
    "No Planner task is created.",
    "No broker is connected.",
    "No live order is placed.",
    "No live trading is executed.",
  ];
}
function insufficientResult(
  reason: string,
  startedAt: number,
): MarketResearchInvalidationLedgerResult {
  return {
    success:
      false,
    code:
      "C161_1_RESEARCH_INVALIDATION_LEDGER_INSUFFICIENT",
    action:
      "ledger-blocked",
    ledger:
      null,
    mutationPerformed:
      false,
    humanReviewRequired:
      true,
    boundary:
      buildResultBoundary(),
    runtime: {
      name:
        "market-research-invalidation-ledger-runtime",
      version:
        "C161.1",
      upstream:
        "C160",
      generatedAt:
        new Date().toISOString(),
      latencyMs:
        Date.now() - startedAt,
    },
    principles: [
      "C161.1 requires a valid C160 reconciliation result.",
      "Incomplete reconciliation is not converted into an invalidation ledger.",
      reason,
    ],
    disclaimer:
      DISCLAIMER,
  };
}
export async function runMarketResearchInvalidationLedger(
  request: MarketResearchInvalidationLedgerRequest,
): Promise<MarketResearchInvalidationLedgerResult> {
  const startedAt =
    Date.now();
  const reconciliation =
    request?.reconciliation;
  if (
    !isValidReconciliation(
      reconciliation,
    )
  ) {
    return insufficientResult(
      "The supplied C160 reconciliation is invalid or incomplete.",
      startedAt,
    );
  }
  const sourceCode: AcceptedC160SourceCode =
    reconciliation.code;
  const symbol =
    normalizeSymbol(
      reconciliation.symbol,
    );
  if (!symbol) {
    return insufficientResult(
      "A valid market symbol is required.",
      startedAt,
    );
  }
  const conditions =
    reconciliation.conditionReviews
      .map(
        (item) =>
          normalizeText(
            item.condition,
            1000,
          ),
      )
      .filter(Boolean);
  if (
    conditions.length === 0
  ) {
    return insufficientResult(
      "C160 did not provide an invalidation condition to preserve.",
      startedAt,
    );
  }
  const ledgerId =
    createLedgerId(
      reconciliation,
    );
  const existing =
    await storage.get<MarketResearchInvalidationLedgerRecord>(
      storageKey(ledgerId),
    );
  /**
   * Existing Ledger:
   *
   * - no mutation
   * - no duplicate ledger
   * - no automatic decision
   * - no human decision recording
   * - no Planner dispatch
   * - no trading execution
   */
  if (existing) {
    return {
      success:
        true,
      code:
        "C161_1_RESEARCH_INVALIDATION_LEDGER_ALREADY_EXISTS",
      action:
        "ledger-already-exists",
      ledger:
        existing,
      mutationPerformed:
        false,
      humanReviewRequired:
        true,
      boundary:
        toResultBoundary(
          existing.boundary,
        ),
      runtime: {
        name:
          "market-research-invalidation-ledger-runtime",
        version:
          "C161.1",
        upstream:
          "C160",
        generatedAt:
          new Date().toISOString(),
        latencyMs:
          Date.now() - startedAt,
      },
      principles:
        buildPrinciples(),
      disclaimer:
        DISCLAIMER,
    };
  }
  const now =
    new Date().toISOString();
  const ledgerBoundary =
    buildLedgerBoundary();
  const ledger:
    MarketResearchInvalidationLedgerRecord =
    {
      ledgerId,
      source:
        "C160",
      sourceCode,
      symbol,
      market:
        reconciliation.market,
      status:
        "pending-human-review",
      invalidationConditions:
        conditions,
      findings:
        reconciliation.findings,
      reconciliation: {
        decisionState:
          reconciliation.reconciliation
            .decisionState,
        decisionReviewStatus:
          reconciliation.reconciliation
            .decisionReviewStatus,
        materialChange:
          reconciliation.reconciliation
            .materialChange,
        evidenceVerified:
          reconciliation.reconciliation
            .evidenceVerified,
        paperTradingState:
          reconciliation.reconciliation
            .paperTradingState,
        paperTradingSuccess:
          reconciliation.reconciliation
            .paperTradingSuccess,
        netProfit:
          reconciliation.reconciliation
            .netProfit,
        totalReturnPercent:
          reconciliation.reconciliation
            .totalReturnPercent,
        maxDrawdown:
          reconciliation.reconciliation
            .maxDrawdown,
        maxDrawdownPercent:
          reconciliation.reconciliation
            .maxDrawdownPercent,
        filledOrders:
          reconciliation.reconciliation
            .filledOrders,
        rejectedOrders:
          reconciliation.reconciliation
            .rejectedOrders,
        openPositions:
          reconciliation.reconciliation
            .openPositions,
      },
      sourceGeneratedAt:
        reconciliation.generatedAt,
      humanReview: {
        required:
          true,
        status:
          "pending",
        decisionRecorded:
          false,
        decision:
          null,
      },
      boundary:
        ledgerBoundary,
      createdAt:
        now,
      updatedAt:
        now,
    };
  await storage.set(
    storageKey(ledgerId),
    ledger,
  );
  return {
    success:
      true,
    code:
      "C161_1_RESEARCH_INVALIDATION_LEDGER_PASS",
    action:
      "ledger-created",
    ledger,
    mutationPerformed:
      true,
    humanReviewRequired:
      true,
    boundary:
      toResultBoundary(
        ledgerBoundary,
      ),
    runtime: {
      name:
        "market-research-invalidation-ledger-runtime",
      version:
        "C161.1",
      upstream:
        "C160",
      generatedAt:
        now,
      latencyMs:
        Date.now() - startedAt,
    },
    principles:
      buildPrinciples(),
    disclaimer:
      DISCLAIMER,
  };
}
export async function getMarketResearchInvalidationLedger(
  ledgerId: string,
): Promise<MarketResearchInvalidationLedgerRecord | null> {
  const normalized =
    normalizeText(
      ledgerId,
      300,
    );
  if (!normalized) {
    return null;
  }
  return (
    await storage.get<MarketResearchInvalidationLedgerRecord>(
      storageKey(normalized),
    )
  ) ?? null;
}
export async function deleteMarketResearchInvalidationLedger(
  ledgerId: string,
): Promise<void> {
  const normalized =
    normalizeText(
      ledgerId,
      300,
    );
  if (!normalized) {
    return;
  }
  await storage.delete(
    storageKey(normalized),
  );
}
