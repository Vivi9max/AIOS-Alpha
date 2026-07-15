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

const emptyProfile: MemoryProfile = {};

const profileFields = [
  {
    key: "name",
    label: "姓名",
    icon: "👤",
  },
  {
    key: "location",
    label: "所在地",
    icon: "📍",
  },
  {
    key: "project",
    label: "当前项目",
    icon: "🚀",
  },
  {
    key: "goal",
    label: "长期目标",
    icon: "🎯",
  },
  {
    key: "preference",
    label: "用户偏好",
    icon: "✨",
  },
] as const;

export default function MemoryPage() {
  const [items, setItems] =
    useState<MemoryRecord[]>([]);

  const [profile, setProfile] =
    useState<MemoryProfile>(
      emptyProfile
    );

  const [completedFields, setCompletedFields] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadMemory = useCallback(
    async () => {
      setLoading(true);
      setError("");

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

        setItems(
          Array.isArray(
            memoryData.items
          )
            ? memoryData.items
            : []
        );

        setProfile(
          profileData.profile ??
            emptyProfile
        );

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

  async function handleClearMemory() {
    const confirmed = window.confirm(
      "确定清空全部对话记忆和结构化资料吗？"
    );

    if (!confirmed) {
      return;
    }

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
      setProfile(emptyProfile);
      setCompletedFields(0);
      setError("");
    } catch {
      setError("清空记忆失败。");
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
          <div
            style={{
              minWidth: 0,
            }}
          >
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
              AIOS 保存的结构化资料和对话记忆。
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearMemory}
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
              cursor:
                items.length > 0
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            清空记忆
          </button>
        </header>

        {loading && (
          <div
            style={{
              padding: 24,
              background: "#ffffff",
              border:
                "1px solid #e5e7eb",
              borderRadius: 16,
            }}
          >
            正在读取记忆……
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: 16,
              marginBottom: 16,
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

        {!loading && !error && (
          <>
            <section
              style={{
                marginBottom: 26,
                padding: 18,
                border:
                  "1px solid #e5e7eb",
                borderRadius: 18,
                background: "#ffffff",
                boxShadow:
                  "0 10px 28px rgba(15, 23, 42, 0.04)",
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
                    从用户对话中自动提取的长期资料。
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
                            overflowWrap:
                              "anywhere",
                            color: value
                              ? "#111827"
                              : "#9ca3af",
                          }}
                        >
                          {value ??
                            "尚未记录"}
                        </strong>
                      </article>
                    );
                  }
                )}
              </div>
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

                <span
                  style={{
                    color:
                      "#6b7280",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {items.length} 条
                </span>
              </div>

              {items.length === 0 ? (
                <div
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
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
                  还没有记忆。先在
                  Chat 中进行一轮对话。
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
                    .map(
                      (
                        item
                      ) => (
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
                            {
                              item.content
                            }
                          </p>
                        </article>
                      )
                    )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}