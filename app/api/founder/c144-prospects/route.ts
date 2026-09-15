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
} from "@/lib/commercial/c144-first-customer";

import {
  discoverC144Prospects,
  isC144ProspectDiscoveryReady,
} from "@/lib/commercial/c144-prospect-discovery";

import {
  buildC144OutreachPackage,
} from "@/lib/commercial/c144-outreach-package";

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
    resolveAlphaIdentity(request);

  try {
    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const customer =
            await executeC144FirstCustomerTask();

          if (
            !customer.success ||
            !customer.opportunity ||
            !customer.project
          ) {
            return {
              success: false,
              customer,
              prospects: null,
              packages: [],
            };
          }

          const prospects =
            discoverC144Prospects(
              customer.opportunity,
            );

          if (
            !isC144ProspectDiscoveryReady(
              prospects,
            )
          ) {
            return {
              success: false,
              customer,
              prospects,
              packages: [],
            };
          }

          const packages =
            prospects.candidates.map(
              (candidate) =>
                buildC144OutreachPackage(
                  prospects.project!,
                  candidate,
                ),
            );

          return {
            success: true,
            customer,
            prospects,
            packages,
          };
        },
      );

    const ready =
      result.success &&
      result.prospects !== null &&
      isC144ProspectDiscoveryReady(
        result.prospects,
      );

    return NextResponse.json(
      {
        success: ready,

        code:
          ready
            ? "C144_PROSPECTS_READY"
            : "C144_PROSPECTS_BLOCKED",

        verification:
          "C144.3",

        status:
          ready
            ? "READY"
            : "BLOCKED",

        latencyMs:
          Date.now() -
          startedAt,

        candidates:
          result.prospects?.candidates ||
          [],

        outreachPackages:
          result.packages || [],

        evidence:
          result.prospects
            ? {
                sourceCount:
                  result.prospects.sourceCount,
                independentHosts:
                  result.prospects.independentHosts,
              }
            : null,

        customerDiscovery:
          result.customer
            ? {
                success:
                  result.customer.success,
                status:
                  result.customer.status,
                taskId:
                  result.customer.taskId,
                nextStep:
                  result.customer.nextStep,
              }
            : null,

        integrity: {
          fabricatedLead:
            false,
          fabricatedContact:
            false,
          contactWasSent:
            false,
          responseWasReceived:
            false,
          fabricatedCustomer:
            false,
          fabricatedRevenue:
            false,
          note:
            "C144.3 generates evidence-backed prospect hypotheses and manual outreach drafts only. No external contact is performed by this endpoint.",
        },

        nextStep:
          ready
            ? "Manually validate candidate #1 and send the appropriate outreach only after validation."
            : "Resolve the verified-evidence or commercial-discovery block before prospect outreach.",
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
        success: false,
        code:
          "C144_PROSPECTS_ERROR",
        verification:
          "C144.3",
        status:
          "ERROR",
        message:
          error instanceof Error
            ? error.message
            : "C144 prospect discovery failed.",
        latencyMs:
          Date.now() -
          startedAt,
      },
      {
        status: 500,
      },
    );
  }
}
