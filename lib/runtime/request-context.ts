import {
  AsyncLocalStorage,
} from "node:async_hooks";

export type RuntimeWorkspaceScope =
  | "user"
  | "founder";

export interface RuntimeUserContext {
  userId: string;
  workspaceScope?: RuntimeWorkspaceScope;
}

const runtimeUserStorage =
  new AsyncLocalStorage<RuntimeUserContext>();

export async function runWithUserContext<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  const cleanUserId =
    userId.trim();

  if (!cleanUserId) {
    throw new Error(
      "Runtime user ID is required."
    );
  }

  return runtimeUserStorage.run(
    {
      userId: cleanUserId,
      workspaceScope: "user",
    },
    operation
  );
}

export async function runWithFounderContext<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  const cleanUserId =
    userId.trim();

  if (!cleanUserId) {
    throw new Error(
      "Runtime user ID is required."
    );
  }

  return runtimeUserStorage.run(
    {
      userId: cleanUserId,
      workspaceScope: "founder",
    },
    operation
  );
}

export function getRuntimeUserId():
  string {
  const context =
    runtimeUserStorage.getStore();

  if (!context?.userId) {
    return "system";
  }

  return context.userId;
}

export function getRuntimeWorkspaceScope():
  RuntimeWorkspaceScope {
  const context =
    runtimeUserStorage.getStore();

  return context?.workspaceScope ===
    "founder"
      ? "founder"
      : "user";
}
