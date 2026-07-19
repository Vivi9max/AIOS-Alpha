import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

import {
  calculateExecutionMetrics,
  createExecutionSession,
  isExecutionFinished,
  type CreateExecutionSessionInput,
  type ExecutionSession,
  type UpdateExecutionSessionInput,
  updateExecutionSession,
} from "./execution";

const MAX_EXECUTION_SESSIONS =
  50;

const EXECUTION_STORAGE_NAME =
  "runtime:execution-sessions";

function getExecutionStorageKey():
  string {
  return createUserStorageKey(
    EXECUTION_STORAGE_NAME
  );
}

function isExecutionSession(
  value: unknown
): value is ExecutionSession {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const session =
    value as Partial<ExecutionSession>;

  return (
    typeof session.id ===
      "string" &&
    typeof session.goal ===
      "string" &&
    typeof session.status ===
      "string" &&
    typeof session.progress ===
      "number" &&
    typeof session.startedAt ===
      "number" &&
    typeof session.updatedAt ===
      "number" &&
    Array.isArray(
      session.steps
    ) &&
    Array.isArray(
      session.events
    )
  );
}

function normalizeSessions(
  value: unknown
): ExecutionSession[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      isExecutionSession
    )
    .slice(
      -MAX_EXECUTION_SESSIONS
    );
}

async function readSessions():
  Promise<ExecutionSession[]> {
  const stored =
    await storage.get<
      ExecutionSession[]
    >(
      getExecutionStorageKey()
    );

  return normalizeSessions(
    stored
  );
}

async function writeSessions(
  sessions: ExecutionSession[]
): Promise<void> {
  await storage.set(
    getExecutionStorageKey(),
    sessions.slice(
      -MAX_EXECUTION_SESSIONS
    )
  );
}

export async function listExecutionSessions(
  options?: {
    limit?: number;
    status?: ExecutionSession["status"];
  }
): Promise<ExecutionSession[]> {
  const sessions =
    await readSessions();

  const filtered =
    options?.status
      ? sessions.filter(
          (session) =>
            session.status ===
            options.status
        )
      : sessions;

  const sorted =
    filtered.sort(
      (a, b) =>
        b.startedAt -
        a.startedAt
    );

  const limit =
    normalizeLimit(
      options?.limit,
      MAX_EXECUTION_SESSIONS
    );

  return sorted.slice(
    0,
    limit
  );
}

export async function getExecutionSession(
  sessionId: string
): Promise<ExecutionSession | null> {
  const cleanId =
    sessionId.trim();

  if (!cleanId) {
    return null;
  }

  const sessions =
    await readSessions();

  return (
    sessions.find(
      (session) =>
        session.id ===
        cleanId
    ) ?? null
  );
}

export async function getLatestExecutionSession():
  Promise<ExecutionSession | null> {
  const sessions =
    await listExecutionSessions({
      limit: 1,
    });

  return (
    sessions[0] ??
    null
  );
}

export async function getActiveExecutionSession():
  Promise<ExecutionSession | null> {
  const sessions =
    await readSessions();

  const active =
    sessions
      .filter(
        (session) =>
          !isExecutionFinished(
            session
          )
      )
      .sort(
        (a, b) =>
          b.updatedAt -
          a.updatedAt
      );

  return (
    active[0] ??
    null
  );
}

export async function createPersistentExecutionSession(
  input: CreateExecutionSessionInput
): Promise<ExecutionSession> {
  const session =
    createExecutionSession(
      input
    );

  const sessions =
    await readSessions();

  sessions.push(
    session
  );

  await writeSessions(
    sessions
  );

  return session;
}

export async function saveExecutionSession(
  session: ExecutionSession
): Promise<ExecutionSession> {
  const sessions =
    await readSessions();

  const normalizedSession: ExecutionSession =
    {
      ...session,

      progress:
        normalizeProgress(
          session.progress
        ),

      metrics:
        calculateExecutionMetrics(
          session
        ),

      updatedAt:
        Date.now(),
    };

  const index =
    sessions.findIndex(
      (item) =>
        item.id ===
        normalizedSession.id
    );

  if (
    index === -1
  ) {
    sessions.push(
      normalizedSession
    );
  } else {
    sessions[index] =
      normalizedSession;
  }

  await writeSessions(
    sessions
  );

  return normalizedSession;
}

export async function updatePersistentExecutionSession(
  sessionId: string,
  updates: UpdateExecutionSessionInput
): Promise<ExecutionSession | null> {
  const sessions =
    await readSessions();

  const index =
    sessions.findIndex(
      (session) =>
        session.id ===
        sessionId
    );

  if (
    index === -1
  ) {
    return null;
  }

  const updated =
    updateExecutionSession(
      sessions[index],
      updates
    );

  const normalized: ExecutionSession =
    {
      ...updated,

      metrics:
        calculateExecutionMetrics(
          updated
        ),
    };

  sessions[index] =
    normalized;

  await writeSessions(
    sessions
  );

  return normalized;
}

export async function mutateExecutionSession(
  sessionId: string,
  mutator: (
    session: ExecutionSession
  ) => ExecutionSession
): Promise<ExecutionSession | null> {
  const sessions =
    await readSessions();

  const index =
    sessions.findIndex(
      (session) =>
        session.id ===
        sessionId
    );

  if (
    index === -1
  ) {
    return null;
  }

  const nextSession =
    mutator(
      sessions[index]
    );

  const normalized: ExecutionSession =
    {
      ...nextSession,

      progress:
        normalizeProgress(
          nextSession.progress
        ),

      metrics:
        calculateExecutionMetrics(
          nextSession
        ),

      updatedAt:
        Date.now(),
    };

  sessions[index] =
    normalized;

  await writeSessions(
    sessions
  );

  return normalized;
}

export async function deleteExecutionSession(
  sessionId: string
): Promise<boolean> {
  const sessions =
    await readSessions();

  const nextSessions =
    sessions.filter(
      (session) =>
        session.id !==
        sessionId
    );

  if (
    nextSessions.length ===
    sessions.length
  ) {
    return false;
  }

  await writeSessions(
    nextSessions
  );

  return true;
}

export async function clearExecutionSessions():
  Promise<void> {
  await storage.delete(
    getExecutionStorageKey()
  );
}

export async function pruneExecutionSessions(
  limit =
    MAX_EXECUTION_SESSIONS
): Promise<number> {
  const sessions =
    await readSessions();

  const normalizedLimit =
    normalizeLimit(
      limit,
      MAX_EXECUTION_SESSIONS
    );

  if (
    sessions.length <=
    normalizedLimit
  ) {
    return 0;
  }

  const sorted =
    sessions.sort(
      (a, b) =>
        b.updatedAt -
        a.updatedAt
    );

  const remaining =
    sorted.slice(
      0,
      normalizedLimit
    );

  const removedCount =
    sessions.length -
    remaining.length;

  await writeSessions(
    remaining
  );

  return removedCount;
}

export async function getExecutionSessionSummary():
  Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    cancelled: number;
    latest:
      | ExecutionSession
      | null;
  }> {
  const sessions =
    await readSessions();

  const sorted =
    sessions.sort(
      (a, b) =>
        b.updatedAt -
        a.updatedAt
    );

  return {
    total:
      sessions.length,

    active:
      sessions.filter(
        (session) =>
          !isExecutionFinished(
            session
          )
      ).length,

    completed:
      sessions.filter(
        (session) =>
          session.status ===
          "completed"
      ).length,

    failed:
      sessions.filter(
        (session) =>
          session.status ===
          "failed"
      ).length,

    cancelled:
      sessions.filter(
        (session) =>
          session.status ===
          "cancelled"
      ).length,

    latest:
      sorted[0] ??
      null,
  };
}

export function getExecutionSessionStorageKey():
  string {
  return getExecutionStorageKey();
}

function normalizeLimit(
  value: number | undefined,
  fallback: number
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(value),
      MAX_EXECUTION_SESSIONS
    )
  );
}

function normalizeProgress(
  value: number
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}