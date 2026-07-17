export const ALPHA_STAGE = "Alpha";
export const ALPHA_VERSION = "0.4";

export interface AlphaAccessStatus {
  stage: string;
  version: string;
  runtime: "online";
  access: "anonymous";
  inviteRequired: boolean;
}

export function getAlphaAccessStatus(): AlphaAccessStatus {
  return {
    stage: ALPHA_STAGE,
    version: ALPHA_VERSION,
    runtime: "online",
    access: "anonymous",
    inviteRequired: false,
  };
}