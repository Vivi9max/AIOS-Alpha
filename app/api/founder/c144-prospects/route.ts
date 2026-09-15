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
  verifyC144Prospects,
  isC144ProspectVerificationReady,
} from "@/lib/commercial/c144-prospect-verification";
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
    resolveAlphaIdentity(
      request,
    );
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
              verification: [],
              verifiedCandidates: [],
              packages: [],
            };
          }
          const prospects =
            await discoverC144Prospects(
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
              verification: [],
              verifiedCandidates: [],
              packages: [],
            };
          }
          const verification =
            await verifyC144Prospects(
              prospects.candidates,
            );
          const verifiedCandidates =
            prospects.candidates.filter(
              (candidate) => {
                const item =
                  verification.find(
                    (entry) =>
                      entry.candidateId ===
                      candidate.id,
                  );
                return Boolean(
                  item &&
                  item.success &&
                  item.qualificationStatus ===
                    "verified-prospect" &&
                  item.verifiedBusinessIdentity &&
                  item.verifiedChinaBusiness &&
                  item.verifiedCommercialSignal &&
                  item.verifiedJapanOrCrossBorderSignal &&
                  item.independentHosts >= 2 &&
                  item.sourceCount >= 2,
                );
              },
            );
          const verificationReady =
            isC144ProspectVerificationReady(
              verification,
            );
          const packages =
            verifiedCandidates.map(
              (candidate) =>
                buildC144OutreachPackage(
                  prospects.project!,
                  candidate,
                ),
            );
          return {
            success:
              verificationReady &&
              verifiedCandidates.length > 0,
            customer,
            prospects,
            verification,
            verifiedCandidates,
            packages,
          };
        },
      );
    const verificationReady =
      result.verification.length > 0 &&
      isC144ProspectVerificationReady(
        result.verification,
      );
    const ready =
      result.success &&
      result.prospects !== null &&
      isC144ProspectDiscoveryReady(
        result.prospects,
      ) &&
      verificationReady &&
      result.verifiedCandidates.length > 0;
    return NextResponse.json(
      {
        success:
          ready,
        code:
          ready
            ? "C144_PROSPECTS_VERIFIED_READY"
            : "C144_PROSPECTS_VERIFICATION_BLOCKED",
        verification:
          "C144.3.2",
        status:
          ready
            ? "READY"
            : "BLOCKED",
        latencyMs:
          Date.now() -
          startedAt,
        discovery:
          result.prospects
            ? {
                success:
                  result.prospects.success,
                status:
                  result.prospects.status,
                candidateCount:
                  result.prospects
                    .candidates.length,
                sourceCount:
                  result.prospects
                    .sourceCount,
                independentHosts:
                  result.prospects
                    .independentHosts,
              }
            : null,
        candidates:
          result.prospects
            ?.candidates ||
          [],
        verificationResults:
          result.verification,
        verifiedCandidates:
          result.verifiedCandidates,
        verifiedCandidateCount:
          result.verifiedCandidates.length,
        outreachPackages:
          result.packages,
        evidence:
          result.prospects
            ? {
                sourceCount:
                  result.prospects
                    .sourceCount,
                independentHosts:
                  result.prospects
                    .independentHosts,
              }
            : null,
        customerDiscovery:
          result.customer
            ? {
                success:
                  result.customer
                    .success,
                status:
                  result.customer
                    .status,
                taskId:
                  result.customer
                    .taskId,
                nextStep:
                  result.customer
                    .nextStep,
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
            "C144.3.2 verifies real mainland-China enterprise prospects using independent current web evidence. Verification does not mean contacted, interested, paying, or converted.",
        },
        qualificationPolicy: {
          businessIdentityRequired:
            true,
          chinaBusinessRequired:
            true,
          commercialSignalRequired:
            true,
          japanOrCrossBorderSignalRequired:
            true,
          minimumIndependentHosts:
            2,
          minimumSources:
            2,
          outreachAllowedOnlyFor:
            "verified-prospect",
          paymentCurrency:
            "CNY",
          externalContactAutomaticallySent:
            false,
          customerAutomaticallyCreated:
            false,
          revenueAutomaticallyRecorded:
            false,
        },
        conclusion:
          ready
            ? "C144.3.2 has verified at least one real enterprise prospect against the required business, China, commercial, and Japan/cross-border evidence gates."
            : "C144.3.2 did not verify enough enterprise prospects to safely proceed to outreach.",
        nextStep:
          ready
            ? "Manually validate the verified prospect identity, current need, decision-maker/contact channel, and CNY payment capability before sending any outreach."
            : "Improve or rerun prospect discovery until real enterprise candidates pass all C144.3.2 verification gates. Do not contact blocked candidates.",
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
          "C144_PROSPECTS_ERROR",
        verification:
          "C144.3.2",
        status:
          "ERROR",
        message:
          error instanceof Error
            ? error.message
            : "C144.3.2 prospect verification failed.",
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
