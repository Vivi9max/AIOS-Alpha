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
  getLatestC1441688ProductDiscovery,
  isC1441688ProductDiscoveryReady,
  runC1441688ProductDiscovery,
} from "@/lib/commercial/c144-1688-product-discovery";

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
          runC1441688ProductDiscovery(),
      );

    const ready =
      isC1441688ProductDiscoveryReady(
        result,
      );

    return NextResponse.json(
      {
        success:
          ready,

        code:
          ready
            ? "C144_4_1688_DISCOVERY_READY"
            : "C144_4_1688_DISCOVERY_BLOCKED",

        verification:
          "C144.4.1",

        status:
          result.status,

        latencyMs:
          Date.now() -
          startedAt,

        operation: {
          id:
            result.operationId,

          version:
            result.version,
        },

        commercial: {
          objectiveId:
            result.objectiveId,

          taskId:
            result.taskId,
        },

        discovery: {
          searchQueryCount:
            result.searchQueryCount,

          successfulSearchCount:
            result.successfulSearchCount,

          sourceCount:
            result.sourceCount,

          independentHosts:
            result.independentHosts,

          candidateCount:
            result.candidates.length,

          discardedCandidateCount:
            result.discardedCandidateCount,
        },

        candidates:
          result.candidates,

        evidence:
          result.evidence,

        conclusion:
          result.conclusion,

        nextStep:
          result.nextStep,

        error:
          result.error ??
          null,

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
        success: false,
        code:
          "C144_4_1688_DISCOVERY_ERROR",
        verification:
          "C144.4.1",
        status:
          "error",
        message:
          error instanceof Error
            ? error.message
            : "C144.4 1688 product discovery failed.",
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

export async function POST(
  request: NextRequest,
) {
  return GET(request);
}
