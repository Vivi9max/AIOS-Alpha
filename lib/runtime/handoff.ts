import manifest from "@/aios-alpha.manifest.json";

export interface HandoffSnapshot {
  schemaVersion: number;
  project: string;
  release: string;
  updatedAt: string;
  mission: string;
  status: string;
  defaultLocale: string;
  locales: string[];
  runtime: typeof manifest.runtime;
  commands: typeof manifest.commands;
  capabilities: string[];
  continuity: typeof manifest.continuity;
}

export function getHandoffSnapshot(): HandoffSnapshot {
  return {
    ...manifest,
    locales: [...manifest.locales],
    capabilities: [...manifest.capabilities],
    continuity: {
      ...manifest.continuity,
      readFirst: [...manifest.continuity.readFirst],
      rules: [...manifest.continuity.rules],
    },
  };
}

