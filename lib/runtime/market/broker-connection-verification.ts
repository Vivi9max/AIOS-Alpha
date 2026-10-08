import type {
  BrokerExecutionAdapterCapabilities,
} from "./broker-execution-adapter";

export type BrokerConnectionVerificationStatus =
  | "not-configured"
  | "pending"
  | "verified"
  | "failed"
  | "restricted";

export type BrokerConnectionVerificationDecision =
  | "not-ready"
  | "review-required"
  | "verified"
  | "blocked";

export type BrokerConnectionVerificationSource =
  | "explicit-environment"
  | "broker-adapter"
  | "manual-review"
  | "provider-contract"
  | "unknown";

export type BrokerConnectionVerificationFailureCode =
  | "BROKER_NOT_CONFIGURED"
  | "BROKER_CONNECTION_NOT_VERIFIED"
  | "BROKER_CREDENTIALS_NOT_VERIFIED"
  | "BROKER_ACCOUNT_NOT_VERIFIED"
  | "BROKER_EXECUTION_NOT_ENABLED"
  | "BROKER_ADAPTER_UNAVAILABLE"
  | "BROKER_ADAPTER_REQUIRES_REVIEW"
  | "BROKER_VERIFICATION_RESTRICTED"
  | "BROKER_VERIFICATION_UNKNOWN";

export interface BrokerConnectionVerification {
  brokerId: string;

  status:
    BrokerConnectionVerificationStatus;

  decision:
    BrokerConnectionVerificationDecision;

  source:
    BrokerConnectionVerificationSource;

  connectionVerified:
    boolean;

  credentialsVerified:
    boolean;

  accountVerified:
    boolean;

  executionEnabled:
    boolean;

  verifiedAt:
    string | null;

  verifiedBy:
    string | null;

  contractReference:
    string | null;

  reason:
    string;

  failureCodes:
    BrokerConnectionVerificationFailureCode[];
}

export interface BrokerConnectionVerificationResult {
  success: boolean;

  broker:
    BrokerConnectionVerification;

  capabilities:
    BrokerExecutionAdapterCapabilities;

  readiness: {
    adapterConfigured:
      boolean;

    adapterAvailable:
      boolean;

    connectionVerified:
      boolean;

    credentialsVerified:
      boolean;

    accountVerified:
      boolean;

    executionEnabled:
      boolean;

    verificationComplete:
      boolean;
  };

  gate: {
    open:
      boolean;

    decision:
      BrokerConnectionVerificationDecision;

    executionEligible:
      false;
  };

  safetyBoundary: {
    founderOnly:
      true;

    explicitVerificationRequired:
      true;

    callerCanSelfVerify:
      false;

    callerCanOverride:
      false;

    callerCanBypass:
      false;

    automaticVerification:
      false;

    automaticExecution:
      false;

    liveExecutionEnabled:
      false;
  };

  generatedAt:
    string;
}

const DEFAULT_BROKER_ID =
  "unconfigured";

function cleanText(
  value:
    | string
    | undefined
    | null,
): string {
  return (
    value?.trim() ?? ""
  );
}

function getConfiguredBrokerId():
  string {
  const value =
    cleanText(
      process.env
        .BROKER_CONNECTION_PROVIDER,
    );

  return value || DEFAULT_BROKER_ID;
}

function getBooleanEnvironment(
  name: string,
): boolean {
  const value =
    cleanText(
      process.env[name],
    ).toLowerCase();

  return (
    value === "true" ||
    value === "1" ||
    value === "yes"
  );
}

function getVerificationSource():
  BrokerConnectionVerificationSource {
  const value =
    cleanText(
      process.env
        .BROKER_CONNECTION_VERIFICATION_SOURCE,
    ).toLowerCase();

  if (
    value ===
    "explicit-environment"
  ) {
    return "explicit-environment";
  }

  if (
    value ===
    "broker-adapter"
  ) {
    return "broker-adapter";
  }

  if (
    value ===
    "manual-review"
  ) {
    return "manual-review";
  }

  if (
    value ===
    "provider-contract"
  ) {
    return "provider-contract";
  }

  return "unknown";
}

function getVerifiedAt():
  string | null {
  const value =
    cleanText(
      process.env
        .BROKER_CONNECTION_VERIFIED_AT,
    );

  return value || null;
}

function getVerifiedBy():
  string | null {
  const value =
    cleanText(
      process.env
        .BROKER_CONNECTION_VERIFIED_BY,
    );

  return value || null;
}

function getContractReference():
  string | null {
  const value =
    cleanText(
      process.env
        .BROKER_CONNECTION_VERIFICATION_CONTRACT,
    );

  return value || null;
}

function getBrokerStatus():
  BrokerConnectionVerificationStatus {
  const value =
    cleanText(
      process.env
        .BROKER_CONNECTION_VERIFICATION_STATUS,
    ).toLowerCase();

  if (
    value ===
      "verified" ||
    value ===
      "pending" ||
    value ===
      "failed" ||
    value ===
      "restricted" ||
    value ===
      "not-configured"
  ) {
    return value;
  }

  const brokerId =
    getConfiguredBrokerId();

  if (
    brokerId ===
    DEFAULT_BROKER_ID
  ) {
    return "not-configured";
  }

  return "pending";
}

function getConfiguredVerificationFlags() {
  const status =
    getBrokerStatus();

  const explicitConnection =
    getBooleanEnvironment(
      "BROKER_CONNECTION_VERIFIED",
    );

  const explicitCredentials =
    getBooleanEnvironment(
      "BROKER_CREDENTIALS_VERIFIED",
    );

  const explicitAccount =
    getBooleanEnvironment(
      "BROKER_ACCOUNT_VERIFIED",
    );

  const explicitExecution =
    getBooleanEnvironment(
      "BROKER_EXECUTION_ENABLED",
    );

  /*
   * Environment values are treated as
   * configuration evidence only.
   *
   * They never cause live execution to
   * become enabled automatically.
   */
  return {
    status,

    connectionVerified:
      status === "verified" &&
      explicitConnection,

    credentialsVerified:
      status === "verified" &&
      explicitCredentials,

    accountVerified:
      status === "verified" &&
      explicitAccount,

    executionEnabled:
      false,

    configuredExecutionFlag:
      explicitExecution,
  };
}

function getReason(
  status:
    BrokerConnectionVerificationStatus,
  connectionVerified:
    boolean,
  credentialsVerified:
    boolean,
  accountVerified:
    boolean,
): string {
  if (
    status ===
    "not-configured"
  ) {
    return (
      "No broker connection provider is configured."
    );
  }

  if (
    status ===
    "restricted"
  ) {
    return (
      "Broker verification is explicitly restricted."
    );
  }

  if (
    status ===
    "failed"
  ) {
    return (
      "Broker verification has failed and must be reviewed before any execution path can continue."
    );
  }

  if (
    !connectionVerified
  ) {
    return (
      "Broker connection has not been independently verified."
    );
  }

  if (
    !credentialsVerified
  ) {
    return (
      "Broker credentials have not been independently verified."
    );
  }

  if (
    !accountVerified
  ) {
    return (
      "Broker account verification has not been completed."
    );
  }

  return (
    "Broker connection, credentials and account verification evidence are present, but live execution remains disabled."
  );
}

function buildFailureCodes(
  status:
    BrokerConnectionVerificationStatus,
  connectionVerified:
    boolean,
  credentialsVerified:
    boolean,
  accountVerified:
    boolean,
  capabilities:
    BrokerExecutionAdapterCapabilities,
): BrokerConnectionVerificationFailureCode[] {
  const failures:
    BrokerConnectionVerificationFailureCode[] =
    [];

  if (
    status ===
    "not-configured"
  ) {
    failures.push(
      "BROKER_NOT_CONFIGURED",
    );
  }

  if (
    status ===
    "restricted"
  ) {
    failures.push(
      "BROKER_VERIFICATION_RESTRICTED",
    );
  }

  if (
    status ===
    "failed"
  ) {
    failures.push(
      "BROKER_CONNECTION_NOT_VERIFIED",
    );
  }

  if (
    !capabilities.available
  ) {
    failures.push(
      "BROKER_ADAPTER_UNAVAILABLE",
    );
  }

  if (
    capabilities.available &&
    !connectionVerified
  ) {
    failures.push(
      "BROKER_CONNECTION_NOT_VERIFIED",
    );
  }

  if (
    capabilities.available &&
    !credentialsVerified
  ) {
    failures.push(
      "BROKER_CREDENTIALS_NOT_VERIFIED",
    );
  }

  if (
    capabilities.available &&
    !accountVerified
  ) {
    failures.push(
      "BROKER_ACCOUNT_NOT_VERIFIED",
    );
  }

  if (
    !capabilities.executionEnabled
  ) {
    failures.push(
      "BROKER_EXECUTION_NOT_ENABLED",
    );
  }

  if (
    status !== "verified" &&
    status !== "not-configured" &&
    status !== "failed" &&
    status !== "restricted"
  ) {
    failures.push(
      "BROKER_ADAPTER_REQUIRES_REVIEW",
    );
  }

  if (
    status ===
      "pending" &&
    failures.length === 0
  ) {
    failures.push(
      "BROKER_VERIFICATION_UNKNOWN",
    );
  }

  return Array.from(
    new Set(
      failures,
    ),
  );
}

/**
 * C167.5.31
 *
 * Independent broker connection verification
 * contract.
 *
 * This module does not connect to a broker.
 * It does not test credentials against an
 * external service.
 * It does not place paper or live orders.
 *
 * Its purpose is to establish a strict server-side
 * verification boundary that future real broker
 * adapters can satisfy.
 */
export function evaluateBrokerConnectionVerification(
  capabilities:
    BrokerExecutionAdapterCapabilities,
): BrokerConnectionVerificationResult {
  const brokerId =
    getConfiguredBrokerId();

  const configuredFlags =
    getConfiguredVerificationFlags();

  const source =
    getVerificationSource();

  const verifiedAt =
    getVerifiedAt();

  const verifiedBy =
    getVerifiedBy();

  const contractReference =
    getContractReference();

  const connectionVerified =
    capabilities.connectionVerified ||
    configuredFlags.connectionVerified;

  const credentialsVerified =
    capabilities.credentialsVerified ||
    configuredFlags.credentialsVerified;

  const accountVerified =
    capabilities.accountVerified ||
    configuredFlags.accountVerified;

  /*
   * The adapter itself is still the authoritative
   * runtime capability boundary.
   *
   * Configuration cannot manufacture adapter
   * availability or execution capability.
   */
  const adapterAvailable =
    capabilities.available;

  const executionEnabled =
    false;

  const verificationComplete =
    adapterAvailable &&
    connectionVerified &&
    credentialsVerified &&
    accountVerified &&
    !capabilities.executionEnabled &&
    executionEnabled === false;

  let decision:
    BrokerConnectionVerificationDecision =
    "not-ready";

  let gateOpen =
    false;

  if (
    configuredFlags.status ===
    "restricted"
  ) {
    decision =
      "blocked";
  } else if (
    configuredFlags.status ===
    "failed"
  ) {
    decision =
      "blocked";
  } else if (
    verificationComplete
  ) {
    decision =
      "verified";
    gateOpen =
      true;
  } else if (
    configuredFlags.status ===
      "pending" ||
    brokerId !==
      DEFAULT_BROKER_ID
  ) {
    decision =
      "review-required";
  }

  /*
   * Even a verified connection never becomes
   * an execution authorization.
   */
  const finalGateOpen =
    gateOpen &&
    executionEnabled ===
      false
      ? false
      : false;

  const failureCodes =
    buildFailureCodes(
      configuredFlags.status,
      connectionVerified,
      credentialsVerified,
      accountVerified,
      capabilities,
    );

  const status =
    configuredFlags.status;

  return {
    success:
      true,

    broker: {
      brokerId,

      status,

      decision,

      source,

      connectionVerified,

      credentialsVerified,

      accountVerified,

      executionEnabled,

      verifiedAt,

      verifiedBy,

      contractReference,

      reason:
        getReason(
          status,
          connectionVerified,
          credentialsVerified,
          accountVerified,
        ),

      failureCodes,
    },

    capabilities,

    readiness: {
      adapterConfigured:
        brokerId !==
        DEFAULT_BROKER_ID,

      adapterAvailable,

      connectionVerified,

      credentialsVerified,

      accountVerified,

      executionEnabled,

      verificationComplete,
    },

    gate: {
      open:
        finalGateOpen,

      decision,

      executionEligible:
        false,
    },

    safetyBoundary: {
      founderOnly:
        true,

      explicitVerificationRequired:
        true,

      callerCanSelfVerify:
        false,

      callerCanOverride:
        false,

      callerCanBypass:
        false,

      automaticVerification:
        false,

      automaticExecution:
        false,

      liveExecutionEnabled:
        false,
    },

    generatedAt:
      new Date().toISOString(),
  };
}

export function getBrokerConnectionVerificationPolicy() {
  return {
    stage:
      "C167.5.31",

    verificationRequired:
      true,

    connectionVerificationRequired:
      true,

    credentialsVerificationRequired:
      true,

    accountVerificationRequired:
      true,

    executionAuthorization:
      false,

    callerCanSelfVerify:
      false,

    callerCanOverride:
      false,

    callerCanBypass:
      false,

    automaticVerification:
      false,

    automaticExecution:
      false,

    liveExecutionEnabled:
      false,
  } as const;
}

export function isBrokerConnectionVerified(
  capabilities:
    BrokerExecutionAdapterCapabilities,
): boolean {
  const result =
    evaluateBrokerConnectionVerification(
      capabilities,
    );

  return (
    result.broker.decision ===
      "verified" &&
    result.gate.open ===
      false
  );
}
