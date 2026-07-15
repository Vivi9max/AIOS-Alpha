import { storage } from "@/lib/server-storage";

import type {
  MemoryProfile,
} from "./index";

type ProfileGlobal =
  typeof globalThis & {
    __aiosManualProfile?: MemoryProfile;
    __aiosManualProfileHydrated?: boolean;
    __aiosManualProfileHydrationPromise?: Promise<void>;
  };

const globalProfile =
  globalThis as ProfileGlobal;

const STORAGE_KEY =
  "aios:default:manual-profile";

const manualProfile:
  MemoryProfile =
  globalProfile.__aiosManualProfile ??
  (globalProfile.__aiosManualProfile = {});

const PROFILE_FIELDS: Array<
  keyof MemoryProfile
> = [
  "name",
  "location",
  "project",
  "goal",
  "preference",
];

function cleanValue(
  value: unknown
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(
    0,
    200
  );
}

function normalizeProfile(
  value: unknown
): MemoryProfile {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return {};
  }

  const source =
    value as Partial<MemoryProfile>;

  const result:
    MemoryProfile = {};

  for (
    const field
    of PROFILE_FIELDS
  ) {
    const cleaned =
      cleanValue(
        source[field]
      );

    if (cleaned) {
      result[field] =
        cleaned;
    }
  }

  return result;
}

async function persistManualProfile():
  Promise<void> {
  await storage.set(
    STORAGE_KEY,
    {
      ...manualProfile,
    }
  );
}

export async function hydrateManualProfile():
  Promise<void> {
  if (
    globalProfile
      .__aiosManualProfileHydrated
  ) {
    return;
  }

  if (
    globalProfile
      .__aiosManualProfileHydrationPromise
  ) {
    return globalProfile
      .__aiosManualProfileHydrationPromise;
  }

  const hydrationPromise =
    (async () => {
      try {
        const stored =
          await storage.get<
            MemoryProfile
          >(STORAGE_KEY);

        const restored =
          normalizeProfile(
            stored
          );

        for (
          const field
          of PROFILE_FIELDS
        ) {
          delete manualProfile[
            field
          ];
        }

        Object.assign(
          manualProfile,
          restored
        );
      } catch (error) {
        console.error(
          "[AIOS Manual Profile Hydration]",
          error
        );
      } finally {
        globalProfile
          .__aiosManualProfileHydrated =
          true;

        globalProfile
          .__aiosManualProfileHydrationPromise =
          undefined;
      }
    })();

  globalProfile
    .__aiosManualProfileHydrationPromise =
    hydrationPromise;

  return hydrationPromise;
}

export function getManualProfile():
  MemoryProfile {
  return {
    ...manualProfile,
  };
}

export async function getPersistentManualProfile():
  Promise<MemoryProfile> {
  await hydrateManualProfile();

  return getManualProfile();
}

export function updateManualProfile(
  updates: Partial<MemoryProfile>
): MemoryProfile {
  for (
    const field
    of PROFILE_FIELDS
  ) {
    if (
      !(field in updates)
    ) {
      continue;
    }

    const value =
      cleanValue(
        updates[field]
      );

    if (value) {
      manualProfile[field] =
        value;
    } else {
      delete manualProfile[
        field
      ];
    }
  }

  return {
    ...manualProfile,
  };
}

export async function updateAndSaveManualProfile(
  updates: Partial<MemoryProfile>
): Promise<MemoryProfile> {
  await hydrateManualProfile();

  const next =
    updateManualProfile(
      updates
    );

  await persistManualProfile();

  return next;
}

export function clearManualProfile():
  void {
  for (
    const field
    of PROFILE_FIELDS
  ) {
    delete manualProfile[
      field
    ];
  }
}

export async function clearPersistentManualProfile():
  Promise<void> {
  clearManualProfile();

  globalProfile
    .__aiosManualProfileHydrated =
    true;

  await storage.delete(
    STORAGE_KEY
  );
}

export function getManualProfileStorageKey():
  string {
  return STORAGE_KEY;
}