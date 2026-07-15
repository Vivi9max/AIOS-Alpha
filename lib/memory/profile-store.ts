import type { MemoryProfile } from "./index";

type ProfileGlobal = typeof globalThis & {
  __aiosManualProfile?: MemoryProfile;
};

const globalProfile =
  globalThis as ProfileGlobal;

function cleanValue(
  value: unknown
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(0, 200);
}

export function getManualProfile(): MemoryProfile {
  return {
    ...(globalProfile.__aiosManualProfile ?? {}),
  };
}

export function updateManualProfile(
  updates: Partial<MemoryProfile>
): MemoryProfile {
  const current =
    globalProfile.__aiosManualProfile ?? {};

  const next: MemoryProfile = {
    ...current,
  };

  const fields: Array<
    keyof MemoryProfile
  > = [
    "name",
    "location",
    "project",
    "goal",
    "preference",
  ];

  for (const field of fields) {
    if (!(field in updates)) {
      continue;
    }

    const value = cleanValue(
      updates[field]
    );

    if (value) {
      next[field] = value;
    } else {
      delete next[field];
    }
  }

  globalProfile.__aiosManualProfile =
    next;

  return {
    ...next,
  };
}

export function clearManualProfile() {
  globalProfile.__aiosManualProfile = {};
}