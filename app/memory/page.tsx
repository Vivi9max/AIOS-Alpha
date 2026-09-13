"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { MODULE_ICONS } from "@/lib/ui/module-icons";

import {
  memoryPageCopy,
  memoryProfileFields,
  type MemoryProfileField,
} from "@/lib/i18n/memory";

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

function formatDate(
  timestamp: number,
  locale: "en" | "zh-CN" | "ja"
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

  const copy = memoryPageCopy[locale];
  const fields = memoryProfileFields[locale];

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
  }, [
    completedFields,
    fields.length,
  ]);

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
    field: MemoryProfileField,
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
          await response
            .json()
            .catch(() => null);

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
              clearConversationMemory
            }
            disabled={
              loading ||
              items.length === 0
            }
            style={{
              padding: "10px 14px",
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
              background: "#ffffff",
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
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
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
                      color: "#6b7280",
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
                    color: "#6b7280",
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
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background:
                        "#111827",
                      borderRadius: 99,
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
                        key={field.key}
                        style={{
                          padding: 14,
                          border:
                            "1px solid #e5e7eb",
                          borderRadius: 14,
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
                            marginBottom: 8,
                            fontWeight: 700,
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
                            value={value}
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
                              borderRadius: 9,
                              background:
                                "#ffffff",
                              outline:
                                "none",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              color: value
                                ? "#111827"
                                : "#9ca3af",
                              lineHeight:
                                1.5,
                              minHeight: 24,
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
                    display: "flex",
                    flexWrap: "wrap",
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
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: saving
                        ? "default"
                        : "pointer",
                      opacity: saving
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
                      color: "#b91c1c",
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
                background: "#ffffff",
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
                    margin: "6px 0 0",
                    color: "#6b7280",
                  }}
                >
                  {
                    copy.conversationDescription
                  }
                </p>
              </div>

              {items.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    border:
                      "1px dashed #d1d5db",
                    borderRadius: 14,
                    color: "#6b7280",
                    textAlign:
                      "center",
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
                  {items.map(
                    (item) => (
                      <article
                        key={item.id}
                        style={{
                          padding: 14,
                          border:
                            "1px solid #e5e7eb",
                          borderRadius: 14,
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
                            marginBottom: 7,
                            fontSize: 12,
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
                            lineHeight: 1.6,
                            color:
                              "#111827",
                          }}
                        >
                          {item.content}
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
