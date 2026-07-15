"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

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

const profileFields = [
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
] as const;

export default function MemoryPage() {
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
              🧠 Memory
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#6b7280",
                lineHeight: 1.55,
              }}
            >
              管理结构化长期资料和对话记忆。
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
            清空对话
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
            正在读取记忆……
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
                    Memory Profile
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
                    自动提取，也可以手动修正。
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
                  {profileFields.length} 项
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
                        ? "保存中…"
                        : "保存资料"}
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
                      取消
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
                              {value ||
                                "尚未记录"}
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
                      编辑 Profile
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
                      重置手动资料
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
                    Conversation Memory
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
                    原始用户消息与 AI 回复。
                  </p>
                </div>

                <strong
                  style={{
                    color:
                      "#6b7280",
                    fontSize: 13,
                  }}
                >
                  {items.length} 条
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
                  还没有对话记忆。先在 Chat
                  中进行一轮对话。
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