import {
  AsyncLocalStorage,
} from "node:async_hooks";

export interface RuntimeUserContext {
  userId: string;
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
      userId:
        cleanUserId,
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