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
  executeC144FirstCustomerTask,
  isC144FirstCustomerTaskReady,
} from "@/lib/commercial/c144-first-customer";

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
          executeC144FirstCustomerTask(),
      );

    const ready =
      isC144FirstCustomerTaskReady(
        result,
      );

    return NextResponse.json(
      {
        success:
          ready,

        code:
          ready
            ? "C144_FIRST_CUSTOMER_TASK_READY"
            : "C144_FIRST_CUSTOMER_TASK_BLOCKED",

        verification:
          "C144.2",

        status:
          ready
            ? "READY"
            : "BLOCKED",

        latencyMs:
          Date.now() -
          startedAt,

        task: {
          id:
            result.taskId,

          title:
            result.task?.title ||
            "Find and validate the first paying customer",

          status:
            result.task?.status ||
            "blocked",

          priority:
            result.task?.priority ||
            "critical",

          measurableTarget:
            result.task?.measurableTarget ||
            null,

          successSignal:
            result.task?.successSignal ||
            null,

          executionMode:
            result.task?.executionMode ||
            "manual-founder",

          externalSideEffectExecuted:
            result.task
              ?.externalSideEffectExecuted ??
            false,
        },

        project:
          result.project
            ? {
                id:
                  result.project.id,

                title:
                  result.project.title,

                stage:
                  result.project.stage,

                currency:
                  result.project.currency,

                revenueTarget:
                  result.project.revenueTarget,

                customerTarget:
                  result.project.customerTarget,

                costTarget:
                  result.project.costTarget,

                revenueActual:
                  result.project.revenueActual,

                customerActual:
                  result.project.customerActual,

                costActual:
                  result.project.costActual,
              }
            : null,

        opportunity:
          result.opportunity
            ? {
                status:
                  result.opportunity.status,

                success:
                  result.opportunity.success,

                conclusion:
                  result.opportunity.conclusion,

                nextStep:
                  result.opportunity.nextStep,

                web:
                  result.opportunity.web
                    ? {
                        success:
                          result.opportunity.web.success,

                        verified:
                          result.opportunity.web.verified,

                        evidenceCount:
                          result.opportunity.web.evidence.length,

                        sourceCount:
                          result.opportunity.web.sourceCount,

                        independentHosts:
                          result.opportunity.web.sourceHosts.length,
                      }
                    : null,

                decision:
                  result.opportunity.decision
                    ? {
                        success:
                          result.opportunity.decision.success,

                        verified:
                          result.opportunity.decision.verification?.verified ??
                          false,

                        priority:
                          result.opportunity.decision.priority,

                        actionCount:
                          result.opportunity.decision.recommendedActions.length,

                        conclusion:
                          result.opportunity.decision.conclusion,

                        nextStep:
                          result.opportunity.decision.nextStep,
                      }
                    : null,

                runtime:
                  result.opportunity.runtime
                    ? {
                        status:
                          result.opportunity.runtime.status,

                        success:
                          result.opportunity.runtime.success,

                        taskId:
                          result.opportunity.runtime.taskId,

                        outcomeId:
                          result.opportunity.runtime.outcomeId,

                        milestoneId:
                          result.opportunity.runtime.milestoneId,
                      }
                    : null,
              }
            : null,

        conclusion:
          result.conclusion,

        nextStep:
          result.nextStep,

        integrity: {
          externalSideEffectExecuted:
            false,

          fabricatedCustomer:
            false,

          fabricatedRevenue:
            false,

          fabricatedCost:
            false,

          note:
            "AIOS only produces verified intelligence and an executable founder task. Real outreach, customer response, revenue, and cost must be recorded only after actual external execution.",
        },
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
          "C144_FIRST_CUSTOMER_TASK_ERROR",

        verification:
          "C144.2",

        status:
          "ERROR",

        message:
          error instanceof Error
            ? error.message
            : "C144 first customer task failed.",

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
