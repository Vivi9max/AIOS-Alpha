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

  onMessageDeleted?: (
    id: number,
  ) => void;

  onConversationChanged?: () => void;
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
  onMessageDeleted,
  onConversationChanged,
}: Props) {
  const [
    deletedIds,
    setDeletedIds,
  ] = useState<
    Set<number>
  >(
    () => new Set(),
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
    setDeletedIds(
      (current) => {
        const visibleIds =
          new Set(
            messages
              .map(
                (message) =>
                  message.id,
              )
              .filter(
                (
                  id,
                ): id is number =>
                  typeof id ===
                  "number",
              ),
          );

        const next =
          new Set<number>();

        current.forEach(
          (id) => {
            if (
              visibleIds.has(
                id,
              )
            ) {
              next.add(id);
            }
          },
        );

        return next;
      },
    );
  }, [messages]);

  async function handleDelete(
    message: ChatMessage,
  ) {
    if (
      typeof message.id !==
      "number"
    ) {
      return;
    }

    if (
      actionLoading !== null
    ) {
      return;
    }

    const id =
      message.id;

    const deletedRecord:
      DeletedMemoryRecord = {
      id,
      role:
        message.role,
      content:
        message.content,
      timestamp:
        Date.now(),
    };

    /*
     * Optimistic UI:
     * remove the message before the
     * network request completes.
     */
    setDeletedIds(
      (current) => {
        const next =
          new Set(
            current,
          );

        next.add(id);

        return next;
      },
    );

    setUndoRecord(
      deletedRecord,
    );

    setActionLoading(id);

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
            credentials:
              "same-origin",
            body:
              JSON.stringify({
                id,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Unable to delete this message.",
        );
      }

      onMessageDeleted?.(
        id,
      );

      window.requestAnimationFrame(
        () => {
          onConversationChanged?.();
        },
      );
    } catch (error) {
      console.error(
        "[AIOS Chat Delete]",
        error,
      );

      /*
       * Roll back the optimistic
       * deletion if persistence fails.
       */
      setDeletedIds(
        (current) => {
          const next =
            new Set(
              current,
            );

          next.delete(id);

          return next;
        },
      );

      setUndoRecord(
        null,
      );
    } finally {
      setActionLoading(
        null,
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

    const record =
      undoRecord;

    /*
     * Optimistic restore.
     */
    setDeletedIds(
      (current) => {
        const next =
          new Set(
            current,
          );

        next.delete(
          record.id,
        );

        return next;
      },
    );

    setUndoRecord(
      null,
    );

    setActionLoading(
      record.id,
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
            credentials:
              "same-origin",
            body:
              JSON.stringify({
                action:
                  "undo",
                record,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ??
            "Unable to undo deletion.",
        );
      }

      onConversationChanged?.();
    } catch (error) {
      console.error(
        "[AIOS Chat Undo]",
        error,
      );

      setDeletedIds(
        (current) => {
          const next =
            new Set(
              current,
            );

          next.add(
            record.id,
          );

          return next;
        },
      );

      setUndoRecord(
        record,
      );
    } finally {
      setActionLoading(
        null,
      );
    }
  }

  const visibleMessages =
    messages.filter(
      (message) =>
        typeof message.id !==
          "number" ||
        !deletedIds.has(
          message.id,
        ),
    );

  return (
    <>
      {visibleMessages.map(
        (
          message,
          index,
        ) => (
          <div
            key={
              typeof message.id ===
              "number"
                ? message.id
                : `${message.role}-${index}-${message.content.slice(0, 24)}`
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
                    -7,
                  marginBottom:
                    12,
                  padding:
                    "0 8px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    void handleDelete(
                      message,
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
                      7,
                    background:
                      "#ffffff",
                    color:
                      "#94a3b8",
                    padding:
                      "4px 8px",
                    fontSize:
                      10,
                    cursor:
                      actionLoading !==
                      null
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      actionLoading ===
                      message.id
                        ? 0.5
                        : 0.9,
                  }}
                >
                  {actionLoading ===
                  message.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            )}
          </div>
        ),
      )}

      {undoRecord && (
        <div
          role="status"
          style={{
            position:
              "sticky",
            bottom: 10,
            zIndex: 5,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 12,
            margin:
              "8px 0 12px",
            padding:
              "9px 11px",
            border:
              "1px solid #e2e8f0",
            borderRadius:
              10,
            background:
              "#ffffff",
            boxShadow:
              "0 6px 18px rgba(15, 23, 42, 0.08)",
          }}
        >
          <span
            style={{
              color:
                "#64748b",
              fontSize:
                11,
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
                11,
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
              ? "Restoring..."
              : "Undo"}
          </button>
        </div>
      )}
    </>
  );
}
