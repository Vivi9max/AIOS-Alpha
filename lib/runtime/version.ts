export const AIOS_RUNTIME_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  "0.5.1";

export const AIOS_RELEASE =
  process.env.NEXT_PUBLIC_APP_RELEASE?.trim() ||
  "C145.8";

export const AIOS_RUNTIME_NAME =
  "aios-alpha";

export interface AiosRuntimeIdentity {
  name: string;
  version: string;
  release: string;
}

export const AIOS_IDENTITY: AiosRuntimeIdentity = {
  name: AIOS_RUNTIME_NAME,
  version: AIOS_RUNTIME_VERSION,
  release: AIOS_RELEASE,
};
