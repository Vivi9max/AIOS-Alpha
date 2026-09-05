export const APP_CONFIG = {
  name: "AIOS",

  stage: "Alpha",

  version: "0.5",

  codename:
    "Runtime & Multilingual Stabilization",

  runtimeId:
    "aios-alpha",

  defaultProvider:
    "DeepSeek",

  fullTitle:
    "AIOS Alpha v0.5",

  badge:
    "ALPHA v0.5",
} as const;

export const APP_NAME =
  APP_CONFIG.name;

export const APP_STAGE =
  APP_CONFIG.stage;

export const APP_VERSION =
  APP_CONFIG.version;

export const APP_VERSION_LABEL =
  `${APP_CONFIG.stage} v${APP_CONFIG.version}`;

export const APP_TITLE =
  `${APP_CONFIG.name} ${APP_CONFIG.stage}`;

export const APP_FULL_TITLE =
  APP_CONFIG.fullTitle;

export const APP_BADGE =
  APP_CONFIG.badge;
