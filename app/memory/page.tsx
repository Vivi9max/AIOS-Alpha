"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n";
import { MODULE_ICONS } from "@/lib/ui/module-icons";

interface MemoryRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface MemoryProfile {
  name?: string;
  location?: string;
  goal?: string;
  project?: string;
  preference?: string;
}

interface ProfileResponse {
  success: boolean;
  profile: MemoryProfile;
  completedFields: number;
  timestamp: number;
  error?: string;
}

const EMPTY_PROFILE: MemoryProfile = {
  name: "",
  location: "",
  goal: "",
  project: "",
  preference: "",
};

type ProfileField = keyof MemoryProfile;

interface FieldDefinition {
  key: ProfileField;
  label: string;
  placeholder: string;
  icon: string;
}

const PROFILE_FIELDS: Record<
  Locale,
  FieldDefinition[]
> = {
  en: [
    {
      key: "name",
      label: "Name",
      icon: "👤",
      placeholder: "For example: Vivi",
    },
    {
      key: "location",
      label: "Location",
      icon: "📍",
      placeholder: "For example: China or Japan",
    },
    {
      key: "project",
      label: "Current project",
      icon: "🚀",
      placeholder: "For example: AIOS Alpha",
    },
    {
      key: "goal",
      label: "Long-term goal",
      icon: "🎯",
      placeholder: "For example: Launch AIOS Alpha publicly",
    },
    {
      key: "preference",
      label: "Preferences",
      icon: "✨",
      placeholder: "For example: concise, delivery-first responses",
    },
  ],

  "zh-CN": [
    {
      key: "name",
      label: "姓名",
      icon: "👤",
      placeholder: "例如：Vivi",
    },
    {
      key: "location",
      label: "所在地",
      icon: "📍",
      placeholder: "例如：中国、日本",
    },
    {
      key: "project",
      label: "当前项目",
      icon: "🚀",
      placeholder: "例如：AIOS Alpha",
    },
    {
      key: "goal",
      label: "长期目标",
      icon: "🎯",
      placeholder: "例如：让 AIOS Alpha 正式上线",
    },
    {
      key: "preference",
      label: "用户偏好",
      icon: "✨",
      placeholder: "例如：少废话、直接交付",
    },
  ],

  ja: [
    {
      key: "name",
      label: "名前",
      icon: "👤",
      placeholder: "例：Vivi",
    },
    {
      key: "location",
      label: "所在地",
      icon: "📍",
      placeholder: "例：中国、日本",
    },
    {
      key: "project",
      label: "現在のプロジェクト",
      icon: "🚀",
      placeholder: "例：AIOS Alpha",
    },
    {
      key: "goal",
      label: "長期目標",
      icon: "🎯",
      placeholder: "例：AIOS Alpha を一般公開",
    },
    {
      key: "preference",
      label: "ユーザー設定",
      icon: "✨",
      placeholder: "例：簡潔で成果物を優先",
    },
  ],
};

const COPY = {
  en: {
    title: "Memory",
    description:
      "Manage structured long-term information and conversation memory.",

    clear: "Clear conversations",
    clearConfirm:
      "Clear all conversation memory? Your manually saved profile will remain.",

    profileTitle: "Memory Profile",
    profileDescription:
      "Structured information retained for future conversations.",
    edit: "Edit profile",
    save: "Save profile",
    saving: "Saving…",
    cancel: "Cancel",
    reset: "Reset manual profile",
    resetConfirm:
      "Reset manually entered profile information? Information automatically extracted from conversations will remain.",

    saved: "Memory Profile saved.",
    resetDone: "Manual profile information reset.",
    cleared: "Conversation memory cleared.",

    conversationTitle: "Conversation memory",
    conversationDescription:
      "Context retained from previous conversations.",
    empty: "No conversation memory yet.",

    loading: "Loading memory…",
    missing: "Not recorded",

    loadError: "Memory could not be loaded.",
    saveError: "Memory Profile could not be saved.",
    resetError: "Memory Profile could not be reset.",
    clearError: "Conversation memory could not be cleared.",

    progress: "Profile completeness",
    fields: "fields",
    user: "You",
    assistant: "AIOS",
  },

  "zh-CN": {
    title: "记忆",
    description: "管理结构化长期资料和对话记忆。",

    clear: "清空对话",
    clearConfirm:
      "确定清空全部对话记忆吗？手动保存的 Profile 会继续保留。",

    profileTitle: "Memory Profile",
    profileDescription:
      "为后续对话保留的结构化长期资料。",
    edit: "编辑 Profile",
    save: "保存资料",
    saving: "保存中…",
    cancel: "取消",
    reset: "重置手动资料",
    resetConfirm:
      "确定重置手动填写的资料吗？从对话中自动提取的资料仍会保留。",

    saved: "Memory Profile 已保存。",
    resetDone: "手动资料已重置。",
    cleared: "对话记忆已清空。",

    conversationTitle: "对话记忆",
    conversationDescription:
      "从历史对话中保留的上下文。",
    empty: "还没有对话记忆。",

    loading: "正在读取记忆……",
    missing: "尚未记录",

    loadError: "记忆读取失败。",
    saveError: "Memory Profile 保存失败。",
    resetError: "Memory Profile 重置失败。",
    clearError: "清空对话记忆失败。",

    progress: "Profile 完整度",
    fields: "项",
    user: "你",
    assistant: "AIOS",
  },

  ja: {
    title: "メモリー",
    description:
      "構造化された長期情報と会話メモリーを管理します。",

    clear: "会話を消去",
    clearConfirm:
      "すべての会話メモリーを消去しますか？手動で保存したプロフィールは残ります。",

    profileTitle: "メモリープロフィール",
    profileDescription:
      "今後の会話で使用する構造化された長期情報です。",
    edit: "プロフィールを編集",
    save: "プロフィールを保存",
    saving: "保存中…",
    cancel: "キャンセル",
    reset: "手動情報をリセット",
    resetConfirm:
      "手動で入力したプロフィール情報をリセットしますか？会話から自動抽出された情報は残ります。",

    saved: "プロフィールを保存しました。",
    resetDone: "手動情報をリセットしました。",
    cleared: "会話メモリーを消去しました。",

    conversationTitle: "会話メモリー",
    conversationDescription:
      "過去の会話から保持されたコンテキスト。",
    empty: "会話メモリーはまだありません。",

    loading: "メモリーを読み込み中…",
    missing: "未登録",

    loadError: "メモリーを読み込めませんでした。",
    saveError:
      "プロフィールを保存できませんでした。",
    resetError:
      "プロフィールをリセットできませんでした。",
    clearError:
      "会話メモリーを消去できませんでした。",

    progress: "プロフィール完成度",
    fields: "項目",
    user: "あなた",
    assistant: "AIOS",
  },
} as const;

function formatDate(
  timestamp: number,
  locale: Locale
): string {
  if (!timestamp) {
    return "";
  }

  return new Intl.DateTimeFormat(
    locale === "zh-CN"
      ? "zh-CN"
      : locale === "ja"
        ? "ja-JP"
        : "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(timestamp));
}

function normalizeProfile(
  profile?: MemoryProfile
): MemoryProfile {
  return {
    ...EMPTY_PROFILE,
    ...(profile ?? {}),
  };
}

export default function MemoryPage() {
  const { locale } = useLanguage();
  const copy = COPY[locale];
  const fields = PROFILE_FIELDS[locale];

  const [items, setItems] = useState<
    MemoryRecord[]
  >([]);

  const [profile, setProfile] =
    useState<MemoryProfile>(
      EMPTY_PROFILE
    );

  const [draftProfile, setDraftProfile] =
    useState<MemoryProfile>(
      EMPTY_PROFILE
    );

  const [
    completedFields,
    setCompletedFields,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const loadMemory =
    useCallback(async () => {
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const [
          memoryResponse,
          profileResponse,
        ] = await Promise.all([
          fetch("/api/memory", {
            cache: "no-store",
          }),
          fetch("/api/memory/profile", {
            cache: "no-store",
          }),
        ]);

        const memoryData =
          await memoryResponse.json();

        const profileData =
          (await profileResponse.json()) as ProfileResponse;

        if (!memoryResponse.ok) {
          throw new Error(
            profileData.error ??
              copy.loadError
          );
        }

        if (!profileResponse.ok) {
          throw new Error(
            profileData.error ??
              copy.loadError
          );
        }

        const nextProfile =
          normalizeProfile(
            profileData.profile
          );

        setItems(
          Array.isArray(
            memoryData.items
          )
            ? memoryData.items
            : []
        );

        setProfile(nextProfile);
        setDraftProfile(nextProfile);

        setCompletedFields(
          Number.isFinite(
            profileData.completedFields
          )
            ? profileData.completedFields
            : 0
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : copy.loadError
        );
      } finally {
        setLoading(false);
      }
    }, [copy.loadError]);

  useEffect(() => {
    void loadMemory();
  }, [loadMemory]);

  const progress = useMemo(() => {
    const total = fields.length;

    if (total === 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (completedFields / total) * 100
        )
      )
    );
  }, [completedFields, fields.length]);

  function startEditing() {
    setDraftProfile({
      ...EMPTY_PROFILE,
      ...profile,
    });

    setEditing(true);
    setError("");
    setNotice("");
  }

  function cancelEditing() {
    setDraftProfile({
      ...EMPTY_PROFILE,
      ...profile,
    });

    setEditing(false);
    setError("");
    setNotice("");
  }

  function updateDraft(
    field: ProfileField,
    value: string
  ) {
    setDraftProfile(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    setError("");
    setNotice("");
  }

  async function saveProfile() {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/memory/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            draftProfile
          ),
        }
      );

      const data =
        (await response.json()) as ProfileResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            copy.saveError
        );
      }

      const nextProfile =
        normalizeProfile(
          data.profile
        );

      setProfile(nextProfile);
      setDraftProfile(nextProfile);

      setCompletedFields(
        Number.isFinite(
          data.completedFields
        )
          ? data.completedFields
          : 0
      );

      setEditing(false);
      setNotice(copy.saved);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : copy.saveError
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetManualProfile() {
    if (
      !window.confirm(
        copy.resetConfirm
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/memory/profile",
        {
          method: "DELETE",
        }
      );

      const data =
        (await response.json()) as ProfileResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            copy.resetError
        );
      }

      const nextProfile =
        normalizeProfile(
          data.profile
        );

      setProfile(nextProfile);
      setDraftProfile(nextProfile);

      setCompletedFields(
        Number.isFinite(
          data.completedFields
        )
          ? data.completedFields
          : 0
      );

      setEditing(false);
      setNotice(copy.resetDone);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : copy.resetError
      );
    } finally {
      setSaving(false);
    }
  }

  async function clearConversationMemory() {
    if (
      !window.confirm(
        copy.clearConfirm
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/memory",
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data =
          await response.json().catch(
            () => null
          );

        throw new Error(
          data?.error ??
            copy.clearError
        );
      }

      setItems([]);

      setNotice(copy.cleared);
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : copy.clearError
      );
    }
  }

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 860,
          margin: "0 auto",
          color: "#111827",
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.2,
              }}
            >
              {MODULE_ICONS.memory}{" "}
              {copy.title}
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#6b7280",
                lineHeight: 1.55,
              }}
            >
              {copy.description}
            </p>
          </div>

          <button
            type="button"
            onClick={
              clearConversationMemory
            }
            disabled={
              loading ||
              items.length === 0
            }
            style={{
              padding:
                "10px 14px",
              border:
                "1px solid #fecaca",
              borderRadius: 10,
              background:
                items.length > 0
                  ? "#fff7f7"
                  : "#f3f4f6",
              color:
                items.length > 0
                  ? "#b91c1c"
                  : "#9ca3af",
              fontWeight: 700,
              cursor:
                items.length > 0
                  ? "pointer"
                  : "default",
            }}
          >
            {copy.clear}
          </button>
        </header>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              border:
                "1px solid #fecaca",
              borderRadius: 12,
              background: "#fff7f7",
              color: "#b91c1c",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              border:
                "1px solid #bbf7d0",
              borderRadius: 12,
              background: "#f0fdf4",
              color: "#047857",
              lineHeight: 1.5,
            }}
          >
            {notice}
          </div>
        )}

        {loading ? (
          <section
            style={{
              padding: 24,
              border:
                "1px solid #e5e7eb",
              borderRadius: 18,
              background:
                "#ffffff",
            }}
          >
            {copy.loading}
          </section>
        ) : (
          <>
            <section
              style={{
                marginBottom: 24,
                padding: 20,
                border:
                  "1px solid #e5e7eb",
                borderRadius: 18,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap:
                    "wrap",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                    }}
                  >
                    {copy.profileTitle}
                  </h2>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                      color:
                        "#6b7280",
                    }}
                  >
                    {
                      copy.profileDescription
                    }
                  </p>
                </div>

                {!editing && (
                  <button
                    type="button"
                    onClick={
                      startEditing
                    }
                    style={{
                      padding:
                        "9px 13px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: 10,
                      background:
                        "#ffffff",
                      fontWeight: 700,
                      cursor:
                        "pointer",
                    }}
                  >
                    {copy.edit}
                  </button>
                )}
              </div>

              <div
                style={{
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: 7,
                    fontSize: 13,
                    color:
                      "#6b7280",
                  }}
                >
                  <span>
                    {copy.progress}
                  </span>

                  <span>
                    {completedFields}/
                    {fields.length}{" "}
                    {copy.fields} ·{" "}
                    {progress}%
                  </span>
                </div>

                <div
                  style={{
                    height: 7,
                    borderRadius: 99,
                    background:
                      "#e5e7eb",
                    overflow:
                      "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background:
                        "#111827",
                      borderRadius:
                        99,
                      transition:
                        "width 180ms ease",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                {fields.map(
                  (field) => {
                    const value =
                      editing
                        ? draftProfile[
                            field.key
                          ] ?? ""
                        : profile[
                            field.key
                          ] ?? "";

                    return (
                      <div
                        key={
                          field.key
                        }
                        style={{
                          padding: 14,
                          border:
                            "1px solid #e5e7eb",
                          borderRadius:
                            14,
                          background:
                            "#fafafa",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 8,
                            marginBottom:
                              8,
                            fontWeight:
                              700,
                          }}
                        >
                          <span>
                            {
                              field.icon
                            }
                          </span>

                          <span>
                            {
                              field.label
                            }
                          </span>
                        </div>

                        {editing ? (
                          <input
                            value={
                              value
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                field.key,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder={
                              field.placeholder
                            }
                            style={{
                              width:
                                "100%",
                              boxSizing:
                                "border-box",
                              padding:
                                "10px 11px",
                              border:
                                "1px solid #d1d5db",
                              borderRadius:
                                9,
                              background:
                                "#ffffff",
                              outline:
                                "none",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              color:
                                value
                                  ? "#111827"
                                  : "#9ca3af",
                              lineHeight:
                                1.5,
                              minHeight:
                                24,
                            }}
                          >
                            {value ||
                              copy.missing}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {editing && (
                <div
                  style={{
                    display:
                      "flex",
                    flexWrap:
                      "wrap",
                    gap: 10,
                    marginTop: 18,
                  }}
                >
                  <button
                    type="button"
                    onClick={
                      saveProfile
                    }
                    disabled={saving}
                    style={{
                      padding:
                        "10px 14px",
                      border: 0,
                      borderRadius: 10,
                      background:
                        "#111827",
                      color:
                        "#ffffff",
                      fontWeight: 700,
                      cursor:
                        saving
                          ? "default"
                          : "pointer",
                      opacity:
                        saving
                          ? 0.65
                          : 1,
                    }}
                  >
                    {saving
                      ? copy.saving
                      : copy.save}
                  </button>

                  <button
                    type="button"
                    onClick={
                      cancelEditing
                    }
                    disabled={saving}
                    style={{
                      padding:
                        "10px 14px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: 10,
                      background:
                        "#ffffff",
                      fontWeight: 700,
                    }}
                  >
                    {copy.cancel}
                  </button>

                  <button
                    type="button"
                    onClick={
                      resetManualProfile
                    }
                    disabled={saving}
                    style={{
                      padding:
                        "10px 14px",
                      border:
                        "1px solid #fecaca",
                      borderRadius: 10,
                      background:
                        "#fff7f7",
                      color:
                        "#b91c1c",
                      fontWeight: 700,
                    }}
                  >
                    {copy.reset}
                  </button>
                </div>
              )}
            </section>

            <section
              style={{
                padding: 20,
                border:
                  "1px solid #e5e7eb",
                borderRadius: 18,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                  }}
                >
                  {
                    copy.conversationTitle
                  }
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color:
                      "#6b7280",
                  }}
                >
                  {
                    copy.conversationDescription
                  }
                </p>
              </div>

              {items.length ===
              0 ? (
                <div
                  style={{
                    padding: 24,
                    border:
                      "1px dashed #d1d5db",
                    borderRadius: 14,
                    color:
                      "#6b7280",
                    textAlign:
                      "center",
                  }}
                >
                  {copy.empty}
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "grid",
                    gap: 12,
                  }}
                >
                  {items.map(
                    (item) => (
                      <article
                        key={
                          item.id
                        }
                        style={{
                          padding:
                            14,
                          border:
                            "1px solid #e5e7eb",
                          borderRadius:
                            14,
                          background:
                            item.role ===
                            "user"
                              ? "#fafafa"
                              : "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap: 12,
                            marginBottom:
                              7,
                            fontSize:
                              12,
                            color:
                              "#6b7280",
                          }}
                        >
                          <strong
                            style={{
                              color:
                                "#374151",
                            }}
                          >
                            {item.role ===
                            "user"
                              ? copy.user
                              : copy.assistant}
                          </strong>

                          <span>
                            {formatDate(
                              item.timestamp,
                              locale
                            )}
                          </span>
                        </div>

                        <div
                          style={{
                            whiteSpace:
                              "pre-wrap",
                            lineHeight:
                              1.6,
                            color:
                              "#111827",
                          }}
                        >
                          {
                            item.content
                          }
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </WorkspaceShell>
  );
}
