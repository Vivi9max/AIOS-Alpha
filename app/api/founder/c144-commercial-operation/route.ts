import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  runC144CommercialOperation,
  isC144CommercialOperationReady,
} from "@/lib/commercial/c144-commercial-operation";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  const identity =
    resolveAlphaIdentity(
      request,
    );

  try {
    const result =
      await runWithUserContext(
        identity.userId,
        async () =>
          runC144CommercialOperation(),
      );

    const ready =
      isC144CommercialOperationReady(
        result,
      );

    return NextResponse.json(
      {
        success:
          ready,

        code:
          ready
            ? "C144_COMMERCIAL_OPERATION_READY"
            : "C144_COMMERCIAL_OPERATION_BLOCKED",

        verification:
          "C144.3.8",

        status:
          ready
            ? "READY"
            : result.status ===
                "insufficient-evidence"
              ? "INSUFFICIENT_EVIDENCE"
              : "BLOCKED",

        latencyMs:
          Date.now() -
          startedAt,

        operation: {
          id:
            result.operationId,

          version:
            result.version,

          marketStrategy:
            result.marketStrategy,

          stage:
            result.stage,
        },

        project: {
          id:
            result.projectId,

          objectiveId:
            result.objectiveId,

          initialized:
            result.projectId.length >
            0,
        },

        web: result.web,

        decision:
          result.decision
            ? {
                success:
                  result.decision.success,

                priority:
                  result.decision.priority,

                conclusion:
                  result.decision.conclusion,

                nextStep:
                  result.decision.nextStep,

                factCount:
                  result.decision.facts.length,

                opportunityCount:
                  result.decision.opportunities.length,

                riskCount:
                  result.decision.risks.length,
              }
            : null,

        experiments:
          result.experiments.map(
            (item) => ({
              id:
                item.id,

              title:
                item.title,

              stage:
                item.stage,

              market:
                item.market,

              product:
                item.product,

              priceModel:
                item.priceModel,

              directCostModel:
                item.directCostModel,

              acquisitionModel:
                item.acquisitionModel,

              targetFirstPriceCny:
                item.targetFirstPriceCny,

              targetDirectCostCny:
                item.targetDirectCostCny,

              targetProfitCny:
                item.targetProfitCny,

              sourceCount:
                item.sourceCount,

              independentHosts:
                item.independentHosts,

              confidence:
                item.confidence,

              founderNextAction:
                item.founderNextAction,

              successSignal:
                item.successSignal,

              requiresManualFounderAction:
                item.requiresManualFounderAction,

              externalSideEffectExecuted:
                item.externalSideEffectExecuted,
            }),
          ),

        selectedExperiment:
          result.selectedExperiment
            ? {
                id:
                  result.selectedExperiment.id,

                title:
                  result.selectedExperiment.title,

                product:
                  result.selectedExperiment.product,

                targetFirstPriceCny:
                  result.selectedExperiment.targetFirstPriceCny,

                targetDirectCostCny:
                  result.selectedExperiment.targetDirectCostCny,

                targetProfitCny:
                  result.selectedExperiment.targetProfitCny,

                founderNextAction:
                  result.selectedExperiment.founderNextAction,

                successSignal:
                  result.selectedExperiment.successSignal,

                confidence:
                  result.selectedExperiment.confidence,
              }
            : null,

        integrity:
          result.integrity,

        conclusion:
          result.conclusion,

        nextStep:
          result.nextStep,

        timestamp:
          result.generatedAt,
      },
      {
        status:
          ready
            ? 200
            : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success:
          false,

        code:
          "C144_COMMERCIAL_OPERATION_ERROR",

        verification:
          "C144.3.8",

        status:
          "ERROR",

        message:
          error instanceof Error
            ? error.message
            : "C144 commercial operation failed.",

        latencyMs:
          Date.now() -
          startedAt,
      },
      {
        status:
          500,
      },
    );
  }
}
