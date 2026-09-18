const APP_VERSION_VALUE =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  "0.5.1";

const APP_RELEASE_VALUE =
  process.env.NEXT_PUBLIC_APP_RELEASE?.trim() ||
  "C145.8";

export const APP_CONFIG = {
  name: "AIOS",

  stage: "Alpha",

  version:
    APP_VERSION_VALUE,

  release:
    APP_RELEASE_VALUE,

  codename:
    "Runtime, Commerce & Multilingual Stabilization",

  runtimeId:
    "aios-alpha",

  defaultProvider:
    "DeepSeek",

  fullTitle:
    `AIOS Alpha v${APP_VERSION_VALUE}`,
} as const;

export const APP_NAME =
  APP_CONFIG.name;

export const APP_STAGE =
  APP_CONFIG.stage;

export const APP_VERSION =
  APP_CONFIG.version;

export const APP_RELEASE =
  APP_CONFIG.release;

export const APP_VERSION_LABEL =
  `${APP_CONFIG.stage} v${APP_CONFIG.version}`;

export const APP_TITLE =
  `${APP_CONFIG.name} ${APP_CONFIG.stage}`;

export const APP_FULL_TITLE =
  APP_CONFIG.fullTitle;

export const APP_BADGE =
  `${APP_CONFIG.stage.toUpperCase()} v${APP_CONFIG.version}`;

export const APP_CONFIG_FULL_TITLE =
  APP_CONFIG.fullTitle;

export const APP_CONFIG_VERSION_LABEL =
  APP_VERSION_LABEL;
