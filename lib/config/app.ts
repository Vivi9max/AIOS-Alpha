export const APP_CONFIG = {
  name: "AIOS",

  stage: "Alpha",

  version:
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
    "0.5.1",

  release:
    process.env.NEXT_PUBLIC_APP_RELEASE?.trim() ||
    "C145.8",

  codename:
    "Runtime, Commerce & Multilingual Stabilization",

  runtimeId:
    "aios-alpha",

  defaultProvider:
    "DeepSeek",
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
  `${APP_CONFIG.name} ${APP_CONFIG.stage} v${APP_CONFIG.version}`;

export const APP_BADGE =
  `${APP_CONFIG.stage.toUpperCase()} v${APP_CONFIG.version}`;
