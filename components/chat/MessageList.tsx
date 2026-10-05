"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import {
  getAIOSInputPreviewBatches,
} from "@/lib/runtime/input/aios-input-browser-store";

import MessageBubble from "./MessageBubble";

export interface ChatMessage {
  role:
    | "user"
    | "assistant";

  content: string;

  id?: number;
}

interface Props {
  messages: ChatMessage[];

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

interface MessageCopy {
  delete: string;
  deleting: string;
  deleted: string;
  undo: string;
  restoring: string;
}

const copy: Record<
  "en" | "zh-CN" | "ja",
  MessageCopy
> = {
  en: {
    delete: "Delete",
    deleting: "Deleting...",
    deleted:
      "Message deleted.",
    undo: "Undo",
    restoring:
      "Restoring...",
  },

  "zh-CN": {
    delete: "删除",
    deleting: "删除中...",
    deleted:
      "消息已删除。",
    undo: "撤销",
    restoring:
      "恢复中...",
  },

  ja: {
    delete: "削除",
    deleting: "削除中...",
    deleted:
      "メッセージを削除しました。",
    undo: "元に戻す",
    restoring:
      "復元中...",
  },
};

function isUploadMessage(
  message: ChatMessage,
): boolean {
  return (
    message.role ===
      "user" &&
    (
      /已上传\s+\d+\s+个输入/.test(
        message.content,
      ) ||
      /\d+\s+inputs?\s+uploaded/i.test(
        message.content,
      ) ||
      /\d+\s+件の入力をアップロードしました/.test(
        message.content,
      )
    )
  );
}

function getUploadCount(
  message: ChatMessage,
): number {
  const match =
    message.content.match(
      /\d+/,
    );

  if (!match) {
    return 0;
  }

  const count =
    Number(match[0]);

  return Number.isFinite(
    count,
  )
    ? count
    : 0;
}

function AttachmentPreview({
  file,
}: {
  file: File;
}) {
  const [
    objectUrl,
    setObjectUrl,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    const url =
      URL.createObjectURL(
        file,
      );

    setObjectUrl(
      url,
    );

    return () => {
      URL.revokeObjectURL(
        url,
      );
    };
  }, [
    file,
  ]);

  if (!objectUrl) {
    return (
      <div
        style={{
          width:
            "100%",
          aspectRatio:
            "16 / 10",
          borderRadius:
            12,
          background:
            "#f1f5f9",
        }}
      />
    );
  }

  if (
    file.type.startsWith(
      "video/",
    )
  ) {
    return (
      <video
        src={
          objectUrl
        }
        controls
        playsInline
        preload="metadata"
        style={{
          display:
            "block",
          width:
            "100%",
          maxWidth:
            420,
          maxHeight:
            320,
          borderRadius:
            12,
          background:
            "#020617",
          objectFit:
            "contain",
        }}
      />
    );
  }

  if (
    file.type.startsWith(
      "image/",
    )
  ) {
    return (
      <img
        src={
          objectUrl
        }
        alt={
          file.name ||
          "Uploaded image"
        }
        style={{
          display:
            "block",
          width:
            "100%",
          maxWidth:
            420,
          maxHeight:
            320,
          borderRadius:
            12,
          objectFit:
            "contain",
          background:
            "#f8fafc",
        }}
      />
    );
  }

  return null;
}

function MessageAttachments({
  files,
}: {
  files: File[];
}) {
  if (
    files.length ===
    0
  ) {
    return null;
  }

  return (
    <div
      style={{
        display:
          "grid",
        gridTemplateColumns:
          files.length ===
          1
            ? "minmax(0, 420px)"
            : "repeat(2, minmax(0, 1fr))",
        gap: 8,
        width:
          "min(100%, 520px)",
        marginBottom:
          8,
      }}
    >
      {files.map(
        (
          file,
          index,
        ) => (
          <div
            key={[
              file.name,
              file.size,
              file.lastModified,
              index,
            ].join("-")}
            style={{
              minWidth:
                0,
              overflow:
                "hidden",
              borderRadius:
                12,
            }}
          >
            <AttachmentPreview
              file={
                file
              }
            />

            <div
              style={{
                marginTop:
                  4,
                padding:
                  "0 4px",
                color:
                  "#64748b",
                fontSize:
                  10,
                overflow:
                  "hidden",
                textOverflow:
                  "ellipsis",
                whiteSpace:
                  "nowrap",
              }}
            >
              {file.name}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export default function MessageList({
  messages,
  onMessageDeleted,
  onConversationChanged,
}: Props) {
  const {
    locale,
  } = useLanguage();

  const text =
    copy[locale];

  const [
    deletedIds,
    setDeletedIds,
  ] = useState<Set<number>>(
    () =>
      new Set(),
  );

  const [
    undoRecord,
    setUndoRecord,
  ] =
    useState<DeletedMemoryRecord | null>(
      null,
    );

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<number | null>(
      null,
    );

  const [
    previewVersion,
    setPreviewVersion,
  ] = useState(0);

  useEffect(() => {
    setDeletedIds(
      (current) => {
        const visibleIds =
          new Set(
            messages
              .map(
                (
                  message,
                ) =>
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
              next.add(
                id,
              );
            }
          },
        );

        return next;
      },
    );
  }, [
    messages,
  ]);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setPreviewVersion(
            (
              value,
            ) =>
              value + 1,
          );
        },
        1_000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, []);

  const attachmentBatches =
    useMemo(
      () =>
        getAIOSInputPreviewBatches(),
      [
        previewVersion,
      ],
    );

  const uploadMessages =
    useMemo(
      () =>
        messages.filter(
          isUploadMessage,
        ),
      [
        messages,
      ],
    );

  const attachmentMap =
    useMemo(() => {
      const map =
        new Map<
          number,
          File[]
        >();

      if (
        attachmentBatches.length ===
        0 ||
        uploadMessages.length ===
        0
      ) {
        return map;
      }

      /*
       * Attach the newest preview batches
       * to the newest upload messages.
       *
       * This keeps current-session attachments
       * correctly associated without changing
       * the persisted Memory schema.
       */
      const messageIndexes =
        uploadMessages.map(
          (
            message,
          ) =>
            messages.indexOf(
              message,
            ),
        );

      const batchIndexes =
        attachmentBatches
          .map(
            (
              _,
              index,
            ) =>
              index,
          )
          .slice(
            -messageIndexes.length,
          );

      for (
        let i = 0;
        i <
        batchIndexes.length;
        i += 1
      ) {
        const messageIndex =
          messageIndexes[
            messageIndexes.length -
              batchIndexes.length +
              i
          ];

        const batchIndex =
          batchIndexes[i];

        if (
          messageIndex ===
            undefined ||
          batchIndex ===
            undefined
        ) {
          continue;
        }

        const message =
          messages[
            messageIndex
          ];

        const expectedCount =
          getUploadCount(
            message,
          );

        const batch =
          attachmentBatches[
            batchIndex
          ];

        if (
          !batch ||
          expectedCount <=
            0
        ) {
          continue;
        }

        map.set(
          messageIndex,
          batch
            .slice(
              0,
              expectedCount,
            )
            .map(
              (
                item,
              ) =>
                item.file,
            ),
        );
      }

      return map;
    }, [
      attachmentBatches,
      messages,
    ]);

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
      actionLoading !==
      null
    ) {
      return;
    }

    const id =
      message.id;

    const deletedRecord:
      DeletedMemoryRecord =
      {
        id,
        role:
          message.role,
        content:
          message.content,
        timestamp:
          Date.now(),
      };

    setDeletedIds(
      (
        current,
      ) => {
        const next =
          new Set(
            current,
          );

        next.add(
          id,
        );

        return next;
      },
    );

    setUndoRecord(
      deletedRecord,
    );

    setActionLoading(
      id,
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
    } catch (
      error
    ) {
      console.error(
        "[AIOS Chat Delete]",
        error,
      );

      setDeletedIds(
        (
          current,
        ) => {
          const next =
            new Set(
              current,
            );

          next.delete(
            id,
          );

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
      actionLoading !==
        null
    ) {
      return;
    }

    const record =
      undoRecord;

    setDeletedIds(
      (
        current,
      ) => {
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
    } catch (
      error
    ) {
      console.error(
        "[AIOS Chat Undo]",
        error,
      );

      setDeletedIds(
        (
          current,
        ) => {
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
      (
        message,
      ) =>
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
        ) => {
          const originalIndex =
            messages.indexOf(
              message,
            );

          const attachments =
            attachmentMap.get(
              originalIndex,
            ) ?? [];

          return (
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
              {message.role ===
                "user" &&
                attachments.length >
                  0 && (
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "flex-end",
                    }}
                  >
                    <MessageAttachments
                      files={
                        attachments
                      }
                    />
                  </div>
                )}

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
                    aria-label={
                      text.delete
                    }
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
                      ? text.deleting
                      : text.delete}
                  </button>
                </div>
              )}
            </div>
          );
        },
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
            {text.deleted}
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
              ? text.restoring
              : text.undo}
          </button>
        </div>
      )}
    </>
  );
}
