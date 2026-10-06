import type {
  MarketProviderCommercialStatus,
} from "./market-types";

export type MarketCommercialAuthorizationSource =
  | "explicit-environment"
  | "manual-review"
  | "provider-contract"
  | "unknown";

export type MarketCommercialAuthorizationDecision =
  | "authorized"
  | "not-authorized"
  | "pending"
  | "restricted"
  | "unknown";

export interface MarketProviderCommercialAuthorization {
  providerId: string;

  status: MarketProviderCommercialStatus;

  decision:
    | MarketCommercialAuthorizationDecision;

  authorized: boolean;

  source:
    | MarketCommercialAuthorizationSource;

  verifiedAt: string | null;

  verifiedBy: string | null;

  contractReference: string | null;

  reason: string;

  automaticApproval: false;
}

export interface MarketProviderCommercialGateResult {
  providerId: string;

  status: MarketProviderCommercialStatus;

  decision:
    | MarketCommercialAuthorizationDecision;

  authorized: boolean;

  source:
    | MarketCommercialAuthorizationSource;

  verifiedAt: string | null;

  verifiedBy: string | null;

  contractReference: string | null;

  reason: string;

  gateOpen: boolean;

  safety: {
    automaticApproval: false;
    technicalAccessDoesNotAuthorize:
      true;
    accountEntitlementDoesNotAuthorize:
      true;
    realtimeVerificationDoesNotAuthorize:
      true;
    tradingExecutionEnabled:
      false;
    brokerConnectionEnabled:
      false;
    orderPlacementEnabled:
      false;
  };
}

function env(
  name: string,
): string {
  return (
    process.env[name]?.trim() ??
    ""
  );
}

function normalizeProviderId(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function parseBoolean(
  value: string,
): boolean | null {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized ===
      "true" ||
    normalized ===
      "1" ||
    normalized ===
      "yes"
  ) {
    return true;
  }

  if (
    normalized ===
      "false" ||
    normalized ===
      "0" ||
    normalized ===
      "no"
  ) {
    return false;
  }

  return null;
}

function parseCommercialStatus(
  value: string,
): MarketProviderCommercialStatus {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized ===
    "eligible"
  ) {
    return "eligible";
  }

  if (
    normalized ===
    "restricted"
  ) {
    return "restricted";
  }

  if (
    normalized ===
    "not_verified"
  ) {
    return "not_verified";
  }

  return "unknown";
}

function getConfiguredProviderId(): string | null {
  const provider =
    env(
      "MARKET_DATA_PROVIDER",
    );

  if (!provider) {
    return null;
  }

  return normalizeProviderId(
    provider,
  );
}

function getCommercialAuthorizationProviderId(): string | null {
  const provider =
    env(
      "MARKET_DATA_COMMERCIAL_PROVIDER",
    );

  if (!provider) {
    return null;
  }

  return normalizeProviderId(
    provider,
  );
}

function getExplicitCommercialStatus(): MarketProviderCommercialStatus {
  return parseCommercialStatus(
    env(
      "MARKET_DATA_COMMERCIAL_STATUS",
    ),
  );
}

function getExplicitCommercialAuthorization(): boolean | null {
  return parseBoolean(
    env(
      "MARKET_DATA_COMMERCIAL_AUTHORIZED",
    ),
  );
}

function getCommercialVerificationSource(): MarketCommercialAuthorizationSource {
  const source =
    env(
      "MARKET_DATA_COMMERCIAL_SOURCE",
    ).toLowerCase();

  if (
    source ===
    "manual-review"
  ) {
    return "manual-review";
  }

  if (
    source ===
    "provider-contract"
  ) {
    return "provider-contract";
  }

  if (
    source ===
    "explicit-environment"
  ) {
    return "explicit-environment";
  }

  return "unknown";
}

function getCommercialVerificationTimestamp(): string | null {
  const value =
    env(
      "MARKET_DATA_COMMERCIAL_VERIFIED_AT",
    );

  return value || null;
}

function getCommercialVerifier(): string | null {
  const value =
    env(
      "MARKET_DATA_COMMERCIAL_VERIFIED_BY",
    );

  return value || null;
}

function getCommercialContractReference(): string | null {
  const value =
    env(
      "MARKET_DATA_COMMERCIAL_CONTRACT",
    );

  return value || null;
}

function buildUnknownAuthorization(
  providerId: string,
): MarketProviderCommercialAuthorization {
  return {
    providerId,

    status:
      "unknown",

    decision:
      "unknown",

    authorized:
      false,

    source:
      "unknown",

    verifiedAt:
      null,

    verifiedBy:
      null,

    contractReference:
      null,

    reason:
      "Commercial authorization has not been explicitly verified.",

    automaticApproval:
      false,
  };
}

export function getMarketProviderCommercialAuthorization(
  providerId: string,
): MarketProviderCommercialAuthorization {
  const normalizedProviderId =
    normalizeProviderId(
      providerId,
    );

  const configuredProviderId =
    getConfiguredProviderId();

  const authorizationProviderId =
    getCommercialAuthorizationProviderId();

  if (
    configuredProviderId &&
    configuredProviderId !==
      normalizedProviderId
  ) {
    return {
      ...buildUnknownAuthorization(
        normalizedProviderId,
      ),

      decision:
        "not-authorized",

      reason:
        "The provider is not the configured market data provider.",
    };
  }

  if (
    authorizationProviderId &&
    authorizationProviderId !==
      normalizedProviderId
  ) {
    return {
      ...buildUnknownAuthorization(
        normalizedProviderId,
      ),

      decision:
        "not-authorized",

      reason:
        "Commercial authorization is explicitly assigned to a different provider.",
    };
  }

  const status =
    getExplicitCommercialStatus();

  const explicitAuthorization =
    getExplicitCommercialAuthorization();

  const source =
    getCommercialVerificationSource();

  const verifiedAt =
    getCommercialVerificationTimestamp();

  const verifiedBy =
    getCommercialVerifier();

  const contractReference =
    getCommercialContractReference();

  if (
    status ===
      "eligible" &&
    explicitAuthorization ===
      true &&
    source !==
      "unknown"
  ) {
    return {
      providerId:
        normalizedProviderId,

      status:
        "eligible",

      decision:
        "authorized",

      authorized:
        true,

      source,

      verifiedAt,

      verifiedBy,

      contractReference,

      reason:
        "Commercial authorization has been explicitly verified and enabled for this provider.",

      automaticApproval:
        false,
    };
  }

  if (
    status ===
      "restricted"
  ) {
    return {
      providerId:
        normalizedProviderId,

      status:
        "restricted",

      decision:
        "restricted",

      authorized:
        false,

      source,

      verifiedAt,

      verifiedBy,

      contractReference,

      reason:
        "The provider is explicitly restricted from commercial product use.",

      automaticApproval:
        false,
    };
  }

  if (
    explicitAuthorization ===
      false ||
    status ===
      "not_verified"
  ) {
    return {
      providerId:
        normalizedProviderId,

      status:
        "not_verified",

      decision:
        "not-authorized",

      authorized:
        false,

      source,

      verifiedAt,

      verifiedBy,

      contractReference,

      reason:
        "Commercial authorization has not been granted for this provider.",

      automaticApproval:
        false,
    };
  }

  if (
    status ===
      "eligible" &&
    explicitAuthorization !==
      true
  ) {
    return {
      providerId:
        normalizedProviderId,

      status:
        "eligible",

      decision:
        "pending",

      authorized:
        false,

      source,

      verifiedAt,

      verifiedBy,

      contractReference,

      reason:
        "Provider commercial eligibility is declared, but explicit authorization is still required before production use.",

      automaticApproval:
        false,
    };
  }

  return buildUnknownAuthorization(
    normalizedProviderId,
  );
}

export function evaluateMarketProviderCommercialGate(
  providerId: string,
): MarketProviderCommercialGateResult {
  const authorization =
    getMarketProviderCommercialAuthorization(
      providerId,
    );

  const gateOpen =
    authorization.authorized &&
    authorization.status ===
      "eligible" &&
    authorization.decision ===
      "authorized";

  return {
    providerId:
      authorization.providerId,

    status:
      authorization.status,

    decision:
      authorization.decision,

    authorized:
      authorization.authorized,

    source:
      authorization.source,

    verifiedAt:
      authorization.verifiedAt,

    verifiedBy:
      authorization.verifiedBy,

    contractReference:
      authorization.contractReference,

    reason:
      authorization.reason,

    gateOpen,

    safety: {
      automaticApproval:
        false,

      technicalAccessDoesNotAuthorize:
        true,

      accountEntitlementDoesNotAuthorize:
        true,

      realtimeVerificationDoesNotAuthorize:
        true,

      tradingExecutionEnabled:
        false,

      brokerConnectionEnabled:
        false,

      orderPlacementEnabled:
        false,
    },
  };
}

export function isMarketProviderCommerciallyAuthorized(
  providerId: string,
): boolean {
  return evaluateMarketProviderCommercialGate(
    providerId,
  ).gateOpen;
}

export function getMarketProviderCommercialStatus(
  providerId: string,
): MarketProviderCommercialStatus {
  return evaluateMarketProviderCommercialGate(
    providerId,
  ).status;
}
