"use client";

import {
  useEffect,
  useState,
} from "react";

import MessageBubble from "./MessageBubble";

export interface ChatMessage {
  role:
    | "user"
    | "assistant";
  content: string;
  id?: number;
}

interface Props {
  messages:
    ChatMessage[];
}

interface DeletedMemoryRecord {
  id: number;
  role:
    | "user"
    | "assistant";
  content: string;
  timestamp: number;
}

export default function MessageList({
  messages,
}: Props) {
  const [
    deletedIds,
    setDeletedIds,
  ] = useState<
    Set<number>
  >(
    () => new Set()
  );

  const [
    undoRecord,
    setUndoRecord,
  ] =
    useState<
      DeletedMemoryRecord | null
    >(null);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    number | null
  >(null);

  useEffect(() => {
    /*
     * Keep local deletion state valid when ChatPanel restores
     * or replaces the conversation from the server.
     */
    setDeletedIds(
      (current) => {
        const visibleIds =
          new Set(
            messages
              .map(
                (message) =>
                  message.id
              )
              .filter(
                (
                  id
                ): id is number =>
                  typeof id ===
                  "number"
              )
          );

        const next =
          new Set<number>();

        current.forEach(
          (id) => {
            if (
              visibleIds.has(
                id
              )
            ) {
              next.add(id);
            }
          }
        );

        return next;
      }
    );
  }, [messages]);

  async function handleDelete(
    message: ChatMessage
  ) {
    if (
      typeof message.id !==
      "number"
    ) {
      /*
       * Older/temporary messages without a persisted id are not
       * destructive targets. They disappear naturally when the
       * server-backed history is refreshed.
       */
      return;
    }

    if (
      actionLoading !== null
    ) {
      return;
    }

    setActionLoading(
      message.id
    );

    try {
      const response =
        await fetch(
          "/api/memory",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  message.id,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Unable to delete this message."
        );
      }

      const deleted =
        data.deleted as
          | DeletedMemoryRecord
          | undefined;

      setDeletedIds(
        (current) => {
          const next =
            new Set(
              current
            );

          next.add(
            message.id as number
          );

          return next;
        }
      );

      setUndoRecord(
        deleted ??
          {
            id:
              message.id,
            role:
              message.role,
            content:
              message.content,
            timestamp:
              Date.now(),
          }
      );
    } catch (
      error
    ) {
      console.error(
        "[AIOS Chat Delete]",
        error
      );
    } finally {
      setActionLoading(
        null
      );
    }
  }

  async function handleUndo() {
    if (
      !undoRecord ||
      actionLoading !== null
    ) {
      return;
    }

    setActionLoading(
      undoRecord.id
    );

    try {
      const response =
        await fetch(
          "/api/memory",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "undo",

                record:
                  undoRecord,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Unable to undo deletion."
        );
      }

      setDeletedIds(
        (current) => {
          const next =
            new Set(
              current
            );

          next.delete(
            undoRecord.id
          );

          return next;
        }
      );

      setUndoRecord(
        null
      );
    } catch (
      error
    ) {
      console.error(
        "[AIOS Chat Undo]",
        error
      );
    } finally {
      setActionLoading(
        null
      );
    }
  }

  const visibleMessages =
    messages.filter(
      (message) =>
        typeof message.id !==
          "number" ||
        !deletedIds.has(
          message.id
        )
    );

  return (
    <>
      {visibleMessages.map(
        (
          message,
          index
        ) => (
          <div
            key={
              typeof message.id ===
              "number"
                ? message.id
                : `${message.role}-${index}`
            }
            style={{
              position:
                "relative",
            }}
          >
            <MessageBubble
              role={
                message.role
              }
              content={
                message.content
              }
            />

            {typeof message.id ===
              "number" && (
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    message.role ===
                    "user"
                      ? "flex-end"
                      : "flex-start",
                  marginTop:
                    -10,
                  marginBottom:
                    10,
                  padding:
                    "0 48px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    void handleDelete(
                      message
                    )
                  }
                  disabled={
                    actionLoading !==
                    null
                  }
                  aria-label="Delete message"
                  style={{
                    border:
                      "1px solid #e5e7eb",
                    borderRadius:
                      8,
                    background:
                      "#ffffff",
                    color:
                      "#64748b",
                    padding:
                      "5px 9px",
                    fontSize:
                      11,
                    cursor:
                      actionLoading !==
                      null
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      actionLoading ===
                      message.id
                        ? 0.55
                        : 1,
                  }}
                >
                  {actionLoading ===
                  message.id
                    ? "Deleting…"
                    : "Delete"}
                </button>
              </div>
            )}
          </div>
        )
      )}

      {undoRecord && (
        <div
          role="status"
          style={{
            position:
              "sticky",
            bottom: 12,
            zIndex: 5,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 12,
            margin:
              "8px 0 14px",
            padding:
              "10px 12px",
            border:
              "1px solid #cbd5e1",
            borderRadius:
              12,
            background:
              "#ffffff",
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.10)",
          }}
        >
          <span
            style={{
              color:
                "#475569",
              fontSize:
                12,
            }}
          >
            Message deleted.
          </span>

          <button
            type="button"
            onClick={() =>
              void handleUndo()
            }
            disabled={
              actionLoading !==
              null
            }
            style={{
              border:
                "none",
              background:
                "transparent",
              color:
                "#2563eb",
              fontSize:
                12,
              fontWeight:
                800,
              cursor:
                actionLoading !==
                null
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {actionLoading ===
            undoRecord.id
              ? "Restoring…"
              : "Undo"}
          </button>
        </div>
      )}
    </>
  );
}
