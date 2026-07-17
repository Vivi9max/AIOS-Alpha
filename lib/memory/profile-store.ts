import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
  getUserStorageScope,
} from "@/lib/storage/data-scope";

import type {
  MemoryProfile,
} from "./index";

interface UserProfileState {
  profile: MemoryProfile;
  hydrated: boolean;
  hydrationPromise?: Promise<void>;
}

type ProfileGlobal =
  typeof globalThis & {
    __aiosUserProfileStates?: Map<
      string,
      UserProfileState
    >;
  };

const globalProfile =
  globalThis as ProfileGlobal;

const userProfileStates =
  globalProfile
    .__aiosUserProfileStates ??
  (globalProfile
    .__aiosUserProfileStates =
    new Map());

const PROFILE_FIELDS:
  Array<
    keyof MemoryProfile
  > = [
    "name",
    "location",
    "project",
    "goal",
    "preference",
  ];

function getStorageKey():
  string {
  return createUserStorageKey(
    "manual-profile"
  );
}

function getProfileState():
  UserProfileState {
  const scope =
    getUserStorageScope();

  const existing =
    userProfileStates.get(
      scope
    );

  if (existing) {
    return existing;
  }

  const created:
    UserProfileState = {
    profile: {},
    hydrated: false,
  };

  userProfileStates.set(
    scope,
    created
  );

  return created;
}

function cleanValue(
  value: unknown
): string | undefined {
  if (
    typeof value !==
    "string"
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
    typeof value !==
      "object"
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
  const state =
    getProfileState();

  await storage.set(
    getStorageKey(),
    {
      ...state.profile,
    }
  );
}

export async function hydrateManualProfile():
  Promise<void> {
  const state =
    getProfileState();

  if (
    state.hydrated
  ) {
    return;
  }

  if (
    state.hydrationPromise
  ) {
    return state
      .hydrationPromise;
  }

  const storageKey =
    getStorageKey();

  const hydrationPromise =
    (async () => {
      try {
        const stored =
          await storage.get<
            MemoryProfile
          >(
            storageKey
          );

        state.profile =
          normalizeProfile(
            stored
          );
      } catch (error) {
        console.error(
          "[AIOS Manual Profile Hydration]",
          error
        );
      } finally {
        state.hydrated =
          true;

        state.hydrationPromise =
          undefined;
      }
    })();

  state.hydrationPromise =
    hydrationPromise;

  return hydrationPromise;
}

export function getManualProfile():
  MemoryProfile {
  return {
    ...getProfileState()
      .profile,
  };
}

export async function getPersistentManualProfile():
  Promise<MemoryProfile> {
  await hydrateManualProfile();

  return getManualProfile();
}

export function updateManualProfile(
  updates:
    Partial<MemoryProfile>
): MemoryProfile {
  const state =
    getProfileState();

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
      state.profile[field] =
        value;
    } else {
      delete state
        .profile[field];
    }
  }

  return {
    ...state.profile,
  };
}

export async function updateAndSaveManualProfile(
  updates:
    Partial<MemoryProfile>
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
  const state =
    getProfileState();

  for (
    const field
    of PROFILE_FIELDS
  ) {
    delete state
      .profile[field];
  }
}

export async function clearPersistentManualProfile():
  Promise<void> {
  const state =
    getProfileState();

  clearManualProfile();

  state.hydrated =
    true;

  await storage.delete(
    getStorageKey()
  );
}

export function getManualProfileStorageKey():
  string {
  return getStorageKey();
}