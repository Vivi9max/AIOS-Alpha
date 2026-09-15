import "server-only";

import {
  isLiveCommercialExecutionApproved,
  type LiveCommercialExecutionPackage,
} from "@/lib/runtime/live-commercial-execution-package";

export type CommercialExecutionChannel =
  | "social-media"
  | "messaging"
  | "email"
  | "advertising"
  | "landing-page"
  | "community"
  | "marketplace";

export type CommercialExecutionOperation =
  | "send_message"
  | "create_lead"
  | "publish_content"
  | "create_campaign"
  | "update_campaign"
  | "follow_up"
  | "capture_response"
  | "record_result";

export type CommercialExecutionDispatchStatus =
  | "ready"
  | "blocked"
  | "adapter-not-configured"
  | "execution-pending"
  | "executed"
  | "failed";

export interface CommercialExecutionRequest {
  requestId: string;

  objectiveId: string;

  executionTaskId: string | null;

  outcomeId: string | null;

  operation: CommercialExecutionOperation;

  channel: CommercialExecutionChannel;

  instruction: string;

  measurableTarget: string;

  successSignal: string;

  approved: boolean;

  verified: boolean;

  externalSideEffectRequired: boolean;

  externalSideEffectExecuted: boolean;

  payload: Record<string, unknown>;

  createdAt: number;
}

export interface CommercialExecutionAdapterContext {
  request: CommercialExecutionRequest;

  executionPackage: LiveCommercialExecutionPackage;
}

export interface CommercialExecutionAdapterResult {
  success: boolean;

  status:
    | "executed"
    | "pending"
    | "failed";

  externalExecutionId: string | null;

  message: string;

  realResultCaptured: boolean;

  rawResult?: Record<string, unknown>;
}

export interface CommercialExecutionAdapter {
  id: string;

  channel: CommercialExecutionChannel;

  operations: CommercialExecutionOperation[];

  enabled: boolean;

  execute(
    context: CommercialExecutionAdapterContext,
  ): Promise<CommercialExecutionAdapterResult>;
}

export interface CommercialExecutionDispatchResult {
  success: boolean;

  status: CommercialExecutionDispatchStatus;

  requestId: string;

  objectiveId: string;

  executionTaskId: string | null;

  outcomeId: string | null;

  channel: CommercialExecutionChannel;

  operation: CommercialExecutionOperation;

  adapterId: string | null;

  externalExecutionId: string | null;

  externalSideEffectExecuted: boolean;

  realResultCaptured: boolean;

  message: string;

  nextStep: string;

  createdAt: number;
}

function createRequestId(): string {
  return `commercial-exec-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function blockedResult(
  request: CommercialExecutionRequest,
  message: string,
  status: CommercialExecutionDispatchStatus = "blocked",
): CommercialExecutionDispatchResult {
  return {
    success: false,
    status,
    requestId: request.requestId,
    objectiveId: request.objectiveId,
    executionTaskId: request.executionTaskId,
    outcomeId: request.outcomeId,
    channel: request.channel,
    operation: request.operation,
    adapterId: null,
    externalExecutionId: null,
    externalSideEffectExecuted: false,
    realResultCaptured: false,
    message,
    nextStep:
      "Do not claim external execution. Resolve the execution gate and provide a valid authorized adapter.",
    createdAt: Date.now(),
  };
}

export function buildCommercialExecutionRequest(
  executionPackage: LiveCommercialExecutionPackage,
  operation: CommercialExecutionOperation,
  channel: CommercialExecutionChannel,
  payload: Record<string, unknown> = {},
): CommercialExecutionRequest {
  const approved =
    isLiveCommercialExecutionApproved(
      executionPackage,
    );

  return {
    requestId: createRequestId(),

    objectiveId:
      executionPackage.objectiveId,

    executionTaskId:
      executionPackage.executionTaskId,

    outcomeId:
      executionPackage.outcomeId,

    operation,

    channel,

    instruction:
      executionPackage.executionInstruction,

    measurableTarget:
      executionPackage.measurableTarget,

    successSignal:
      executionPackage.successSignal,

    approved,

    verified:
      executionPackage.verified,

    externalSideEffectRequired:
      executionPackage.externalSideEffectRequired,

    externalSideEffectExecuted:
      executionPackage.externalSideEffectExecuted,

    payload,

    createdAt:
      Date.now(),
  };
}

export function isCommercialExecutionRequestAuthorized(
  request: CommercialExecutionRequest,
): boolean {
  return (
    request.approved === true &&
    request.verified === true &&
    request.externalSideEffectRequired === true &&
    request.externalSideEffectExecuted === false &&
    Boolean(request.objectiveId) &&
    Boolean(request.instruction) &&
    Boolean(request.measurableTarget) &&
    Boolean(request.successSignal)
  );
}

export function canAdapterHandleRequest(
  adapter: CommercialExecutionAdapter,
  request: CommercialExecutionRequest,
): boolean {
  return (
    adapter.enabled === true &&
    adapter.channel === request.channel &&
    adapter.operations.includes(
      request.operation,
    )
  );
}

export function findCommercialExecutionAdapter(
  request: CommercialExecutionRequest,
  adapters: CommercialExecutionAdapter[],
): CommercialExecutionAdapter | null {
  return (
    adapters.find((adapter) =>
      canAdapterHandleRequest(
        adapter,
        request,
      ),
    ) ?? null
  );
}

export async function dispatchCommercialExecution(
  request: CommercialExecutionRequest,
  executionPackage: LiveCommercialExecutionPackage,
  adapters: CommercialExecutionAdapter[],
): Promise<CommercialExecutionDispatchResult> {
  if (
    !isCommercialExecutionRequestAuthorized(
      request,
    )
  ) {
    return blockedResult(
      request,
      "External commercial execution is not authorized. The execution package must be verified, approved, and still unexecuted.",
    );
  }

  if (
    executionPackage.objectiveId !==
    request.objectiveId
  ) {
    return blockedResult(
      request,
      "Execution request does not belong to the supplied commercial objective.",
    );
  }

  if (
    executionPackage.externalSideEffectExecuted
  ) {
    return blockedResult(
      request,
      "External execution is already marked as executed. Duplicate execution is blocked.",
    );
  }

  const adapter =
    findCommercialExecutionAdapter(
      request,
      adapters,
    );

  if (!adapter) {
    return blockedResult(
      request,
      `No authorized execution adapter is configured for channel "${request.channel}" and operation "${request.operation}".`,
      "adapter-not-configured",
    );
  }

  try {
    const result =
      await adapter.execute({
        request,
        executionPackage,
      });

    if (!result.success) {
      return {
        success: false,
        status: "failed",
        requestId: request.requestId,
        objectiveId: request.objectiveId,
        executionTaskId:
          request.executionTaskId,
        outcomeId:
          request.outcomeId,
        channel:
          request.channel,
        operation:
          request.operation,
        adapterId:
          adapter.id,
        externalExecutionId:
          result.externalExecutionId,
        externalSideEffectExecuted:
          false,
        realResultCaptured:
          result.realResultCaptured,
        message:
          result.message,
        nextStep:
          "Review the real adapter failure. Do not fabricate a successful commercial result.",
        createdAt: Date.now(),
      };
    }

    if (result.status === "pending") {
      return {
        success: true,
        status: "execution-pending",
        requestId: request.requestId,
        objectiveId: request.objectiveId,
        executionTaskId:
          request.executionTaskId,
        outcomeId:
          request.outcomeId,
        channel:
          request.channel,
        operation:
          request.operation,
        adapterId:
          adapter.id,
        externalExecutionId:
          result.externalExecutionId,
        externalSideEffectExecuted:
          false,
        realResultCaptured:
          result.realResultCaptured,
        message:
          result.message,
        nextStep:
          "Wait for the external platform result and capture only verified real data.",
        createdAt: Date.now(),
      };
    }

    return {
      success: true,
      status: "executed",
      requestId: request.requestId,
      objectiveId: request.objectiveId,
      executionTaskId:
        request.executionTaskId,
      outcomeId:
        request.outcomeId,
      channel:
        request.channel,
      operation:
        request.operation,
      adapterId:
        adapter.id,
      externalExecutionId:
        result.externalExecutionId,
      externalSideEffectExecuted:
        true,
      realResultCaptured:
        result.realResultCaptured,
      message:
        result.message,
      nextStep:
        result.realResultCaptured
          ? "Record the verified commercial result through the result gate."
          : "Capture the real external result before marking the commercial result complete.",
      createdAt: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      requestId: request.requestId,
      objectiveId: request.objectiveId,
      executionTaskId:
        request.executionTaskId,
      outcomeId:
        request.outcomeId,
      channel:
        request.channel,
      operation:
        request.operation,
      adapterId:
        adapter.id,
      externalExecutionId:
        null,
      externalSideEffectExecuted:
        false,
      realResultCaptured:
        false,
      message:
        error instanceof Error
          ? error.message
          : "Commercial execution adapter failed.",
      nextStep:
        "Inspect the adapter failure and retry only after the external platform state is known.",
      createdAt: Date.now(),
    };
  }
}

export function buildCommercialExecutionCapabilityManifest(): {
  success: true;
  approvalRequired: true;
  externalExecutionRequiresAdapter: true;
  supportedOperations: CommercialExecutionOperation[];
  supportedChannels: CommercialExecutionChannel[];
  guarantees: string[];
} {
  return {
    success: true,

    approvalRequired: true,

    externalExecutionRequiresAdapter:
      true,

    supportedOperations: [
      "send_message",
      "create_lead",
      "publish_content",
      "create_campaign",
      "update_campaign",
      "follow_up",
      "capture_response",
      "record_result",
    ],

    supportedChannels: [
      "social-media",
      "messaging",
      "email",
      "advertising",
      "landing-page",
      "community",
      "marketplace",
    ],

    guarantees: [
      "Unverified commercial intelligence cannot trigger external execution.",
      "Unapproved execution cannot trigger external side effects.",
      "Missing adapters cannot be reported as successful execution.",
      "Duplicate execution is blocked when the package is already executed.",
      "External execution IDs are preserved when provided by the real adapter.",
      "Real commercial results must be captured separately from execution status.",
      "AIOS never fabricates revenue, customers, leads, cost, or campaign results.",
    ],
  };
}
