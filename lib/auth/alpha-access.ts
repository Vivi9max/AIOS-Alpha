import {
  APP_CONFIG,
} from "@/lib/config/app";

export const ALPHA_STAGE =
  APP_CONFIG.stage;

export const ALPHA_VERSION =
  APP_CONFIG.version;

export interface AlphaAccessStatus {
  stage: string;
  version: string;
  runtime: "online";
  access: "anonymous";
  inviteRequired: boolean;
}

export function getAlphaAccessStatus(): AlphaAccessStatus {
  return {
    stage:
      ALPHA_STAGE,

    version:
      ALPHA_VERSION,

    runtime:
      "online",

    access:
      "anonymous",

    inviteRequired:
      false,
  };
}
