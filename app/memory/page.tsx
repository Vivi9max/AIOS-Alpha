"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n";

import {
  MODULE_ICONS,
} from "@/lib/ui/module-icons";

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
}

const emptyProfile: MemoryProfile = {
  name: "",
  location: "",
  goal: "",
  project: "",
  preference: "",
};

function getProfileFields(locale: Locale) {
 const fields = {
  en: [
   { key: "name", label: "Name", icon: "👤", placeholder: "For example: Vivi" }, { key: "location", label: "Location", icon: "📍", placeholder: "For example: China or Japan" }, { key: "project", label: "Current project", icon: "🚀", placeholder: "For example: AIOS Alpha" }, { key: "goal", label: "Long-term goal", icon: "🎯", placeholder: "For example: Publicly launch AIOS Alpha" }, { key: "preference", label: "Preferences", icon: "✨", placeholder: "For example: concise, delivery-first responses" },
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
   { key: "name", label: "名前", icon: "👤", placeholder: "例：Vivi" }, { key: "location", label: "所在地", icon: "📍", placeholder: "例：中国、日本" }, { key: "project", label: "現在のプロジェクト", icon: "🚀", placeholder: "例：AIOS Alpha" }, { key: "goal", label: "長期目標", icon: "🎯", placeholder: "例：AIOS Alpha を一般公開" }, { key: "preference", label: "ユーザー設定", icon: "✨", placeholder: "例：簡潔で成果物を優先" },
  ],
 } as const;
 return fields[locale];
}

export default function MemoryPage() {
  const { locale } = useLanguage();
  const copy = {
    en: { title: "Memory", description: "Manage structured long-term information and conversation memory.", clear: "Clear conversations", loading: "Loading memory…", profile: "Memory Profile", profileDescription: "Automatically extracted and manually editable.", items: "fields", saving: "Saving…", save: "Save profile", cancel: "Cancel", missing: "Not recorded", edit: "Edit profile", reset: "Reset manual profile", conversationTitle: "Conversation memory", conversationDescription: "Context retained from earlier conversations.", empty: "No conversation memory yet." },
    "zh-CN": { title: "记忆", description: "管理结构化长期资料和对话记忆。", clear: "清空对话", loading: "正在读取记忆……", profile: "Memory Profile", profileDescription: "自动提取，也可以手动修正。", items: "项", saving: "保存中…", save: "保存资料", cancel: "取消", missing: "尚未记录", edit: "编辑 Profile", reset: "重置手动资料", conversationTitle: "对话记忆", conversationDescription: "从历史对话中保留的上下文。", empty: "还没有对话记忆。" },
    ja: { title: "メモリー", description: "構造化された長期情報と会話メモリーを管理します。", clear: "会話を消去", loading: "メモリーを読み込み中…", profile: "メモリープロフィール", profileDescription: "自動抽出された内容を手動で修正できます。", items: "項目", saving: "保存中…", save: "プロフィールを保存", cancel: "キャンセル", missing: "未登録", edit: "プロフィールを編集", reset: "手動情報をリセット", conversationTitle: "会話メモリー", conversationDescription: "過去の会話から保持されたコンテキスト。", empty: "会話メモリーはまだありません。" },
  }[locale];
  const profileFields = getProfileFields(locale);
  const [items, setItems] =
    useState<MemoryRecord[]>([]);

  const [profile, setProfile] =
    useState<MemoryProfile>(
      emptyProfile
    );

  const [draftProfile, setDraftProfile] =
    useState<MemoryProfile>(
      emptyProfile
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

  const loadMemory = useCallback(
    async () => {
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
          fetch(
            "/api/memory/profile",
            {
              cache: "no-store",
            }
          ),
        ]);

        if (!memoryResponse.ok) {
          throw new Error(
            "Failed to load memory."
          );
        }

        if (!profileResponse.ok) {
          throw new Error(
            "Failed to load profile."
          );
        }

        const memoryData =
          await memoryResponse.json();

        const profileData =
          (await profileResponse.json()) as ProfileResponse;

        const nextProfile = {
          ...emptyProfile,
          ...(profileData.profile ?? {}),
        };

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
      } catch {
        setError("记忆读取失败。");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  function updateDraft(
    field: keyof MemoryProfile,
    value: string
  ) {
    setNotice("");

    setDraftProfile(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function startEditing() {
    setDraftProfile({
      ...emptyProfile,
      ...profile,
    });

    setEditing(true);
    setError("");
    setNotice("");
  }

  function cancelEditing() {
    setDraftProfile({
      ...emptyProfile,
      ...profile,
    });

    setEditing(false);
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

      if (!response.ok) {
        throw new Error(
          "Failed to save profile."
        );
      }

      const data =
        (await response.json()) as ProfileResponse;

      const nextProfile = {
        ...emptyProfile,
        ...(data.profile ?? {}),
      };

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
      setNotice(
        "Memory Profile 已保存。"
      );
    } catch {
      setError(
        "Memory Profile 保存失败。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetManualProfile() {
    const confirmed = window.confirm(
      "确定清除手动填写的资料吗？从对话中自动提取的资料仍会保留。"
    );

    if (!confirmed) {
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

      if (!response.ok) {
        throw new Error(
          "Failed to reset profile."
        );
      }

      const data =
        (await response.json()) as ProfileResponse;

      const nextProfile = {
        ...emptyProfile,
        ...(data.profile ?? {}),
      };

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
      setNotice(
        "手动资料已重置。"
      );
    } catch {
      setError(
        "Memory Profile 重置失败。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleClearMemory() {
    const confirmed = window.confirm(
      "确定清空全部对话记忆吗？手动填写的 Profile 将继续保留。"
    );

    if (!confirmed) {
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
        throw new Error(
          "Failed to clear memory."
        );
      }

      setItems([]);

      const profileResponse =
        await fetch(
          "/api/memory/profile",
          {
            cache: "no-store",
          }
        );

      if (
        profileResponse.ok
      ) {
        const data =
          (await profileResponse.json()) as ProfileResponse;

        const nextProfile = {
          ...emptyProfile,
          ...(data.profile ?? {}),
        };

        setProfile(nextProfile);
        setDraftProfile(
          nextProfile
        );

        setCompletedFields(
          data.completedFields ?? 0
        );
      }

      setNotice(
        "对话记忆已清空。"
      );
    } catch {
      setError(
        "清空对话记忆失败。"
      );
    }
  }

  return (
    <WorkspaceShell>
      <div
        style={{
          width: "100%",
          maxWidth: 820,
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
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
              }}
            >
              {MODULE_ICONS.memory} {copy.title}
            </h1>

            <p
              style={{
                margin: "8px 0 0",
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
              handleClearMemory
            }
            disabled={
              items.length === 0
            }
            style={{
              padding: "10px 13px",
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
            }}
          >
            {notice}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: 24,
              border:
                "1px solid #e5e7eb",
              borderRadius: 16,
              background: "#ffffff",
            }}
          >
            {copy.loading}
          </div>
        ) : (
          <>
            <section
              style={{
                marginBottom: 26,
                padding: 18,
                border:
                  "1px solid #e5e7eb",
                borderRadius: 18,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 21,
                    }}
                  >
                    {copy.profile}
                  </h2>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                      color:
                        "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    {copy.profileDescription}
                  </p>
                </div>

                <span
                  style={{
                    padding:
                      "7px 10px",
                    borderRadius: 999,
                    background:
                      "#eef2ff",
                    color:
                      "#4338ca",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {completedFields}/
                  {profileFields.length} {copy.items}
                </span>
              </div>

              {editing ? (
                <div
                  style={{
                    display: "grid",
                    gap: 13,
                  }}
                >
                  {profileFields.map(
                    (field) => (
                      <label
                        key={
                          field.key
                        }
                        style={{
                          display:
                            "grid",
                          gap: 7,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13,
                          }}
                        >
                          {field.icon}{" "}
                          {field.label}
                        </strong>

                        <textarea
                          value={
                            draftProfile[
                              field.key
                            ] ?? ""
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
                          rows={
                            field.key ===
                              "goal" ||
                            field.key ===
                              "preference"
                              ? 3
                              : 2
                          }
                          style={{
                            width:
                              "100%",
                            boxSizing:
                              "border-box",
                            resize:
                              "vertical",
                            padding:
                              "12px 13px",
                            border:
                              "1px solid #d1d5db",
                            borderRadius: 11,
                            font:
                              "inherit",
                            lineHeight:
                              1.5,
                            color:
                              "#111827",
                            background:
                              "#ffffff",
                          }}
                        />
                      </label>
                    )
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexWrap:
                        "wrap",
                      gap: 10,
                      marginTop: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={
                        saveProfile
                      }
                      disabled={saving}
                      style={{
                        flex: "1 1 150px",
                        padding:
                          "12px 15px",
                        border: 0,
                        borderRadius: 10,
                        background:
                          "#111827",
                        color:
                          "#ffffff",
                        fontWeight: 800,
                        opacity: saving
                          ? 0.6
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
                        flex: "1 1 110px",
                        padding:
                          "12px 15px",
                        border:
                          "1px solid #d1d5db",
                        borderRadius: 10,
                        background:
                          "#ffffff",
                        color:
                          "#111827",
                        fontWeight: 700,
                      }}
                    >
                      {copy.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {profileFields.map(
                      (field) => {
                        const value =
                          profile[
                            field.key
                          ];

                        return (
                          <article
                            key={
                              field.key
                            }
                            style={{
                              minWidth: 0,
                              padding: 14,
                              border:
                                "1px solid #e5e7eb",
                              borderRadius: 14,
                              background:
                                value
                                  ? "#ffffff"
                                  : "#f8fafc",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                color:
                                  "#6b7280",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {field.icon}{" "}
                              {field.label}
                            </p>

                            <strong
                              style={{
                                display:
                                  "block",
                                marginTop: 8,
                                lineHeight:
                                  1.45,
                                whiteSpace:
                                  "pre-wrap",
                                overflowWrap:
                                  "anywhere",
                                color: value
                                  ? "#111827"
                                  : "#9ca3af",
                              }}
                            >
                              {value || copy.missing}
                            </strong>
                          </article>
                        );
                      }
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap:
                        "wrap",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <button
                      type="button"
                      onClick={
                        startEditing
                      }
                      style={{
                        flex: "1 1 150px",
                        padding:
                          "11px 14px",
                        border: 0,
                        borderRadius: 10,
                        background:
                          "#111827",
                        color:
                          "#ffffff",
                        fontWeight: 800,
                      }}
                    >
                      {copy.edit}
                    </button>

                    <button
                      type="button"
                      onClick={
                        resetManualProfile
                      }
                      disabled={saving}
                      style={{
                        flex: "1 1 150px",
                        padding:
                          "11px 14px",
                        border:
                          "1px solid #d1d5db",
                        borderRadius: 10,
                        background:
                          "#ffffff",
                        color:
                          "#4b5563",
                        fontWeight: 700,
                      }}
                    >
                      {copy.reset}
                    </button>
                  </div>
                </>
              )}
            </section>

            <section>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 13,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 21,
                    }}
                  >
                    {copy.conversationTitle}
                  </h2>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      color:
                        "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    {copy.conversationDescription}
                  </p>
                </div>

                <strong
                  style={{
                    color:
                      "#6b7280",
                    fontSize: 13,
                  }}
                >
                  {items.length} {copy.items}
                </strong>
              </div>

              {items.length === 0 ? (
                <div
                  style={{
                    padding:
                      "38px 18px",
                    background:
                      "#ffffff",
                    border:
                      "1px dashed #cbd5e1",
                    borderRadius: 16,
                    textAlign:
                      "center",
                    color:
                      "#64748b",
                    lineHeight: 1.7,
                  }}
                >
                  {copy.empty}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {[...items]
                    .reverse()
                    .map((item) => (
                      <article
                        key={
                          item.id
                        }
                        style={{
                          minWidth: 0,
                          padding: 16,
                          background:
                            "#ffffff",
                          border:
                            "1px solid #e5e7eb",
                          borderRadius: 14,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            justifyContent:
                              "space-between",
                            gap: 8,
                            marginBottom: 9,
                          }}
                        >
                          <strong>
                            {item.role ===
                            "user"
                              ? "U · User"
                              : "AI · Assistant"}
                          </strong>

                          <time
                            style={{
                              color:
                                "#9ca3af",
                              fontSize: 12,
                            }}
                          >
                            {new Date(
                              item.timestamp
                            ).toLocaleString()}
                          </time>
                        </div>

                        <p
                          style={{
                            margin: 0,
                            lineHeight: 1.65,
                            whiteSpace:
                              "pre-wrap",
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {item.content}
                        </p>
                      </article>
                    ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
