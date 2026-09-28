"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

import {
  APP_CONFIG,
  APP_FULL_TITLE,
  APP_VERSION_LABEL,
} from "@/lib/config/app";

const STORAGE_KEY = "aios-settings";

interface LocalSettings {
  memoryEnabled: boolean;
  taskEnabled: boolean;
}

interface RuntimeStatus {
  success: boolean;
  runtime: string;
  stage?: string;
  version: string;
  versionLabel?: string;
  status: "online" | "offline";
  provider: string;
  memoryCount: number;
  timestamp: number;
}

interface GitHubStatus {
  success: boolean;
  configured: boolean;
  connected: boolean;
  provider?: string;
  account?: {
    id: string;
    login: string;
  };
  installationCount?: number;
  accessExpiresAt?: string | null;
  code?: string;
  error?: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

interface GitHubRepositoriesResponse {
  success: boolean;
  repositories?: GitHubRepository[];
  code?: string;
  error?: string;
}

const defaultSettings: LocalSettings = {
  memoryEnabled: true,
  taskEnabled: true,
};

const initialRuntime: RuntimeStatus = {
  success: false,
  runtime: APP_CONFIG.runtimeId,
  stage: APP_CONFIG.stage,
  version: APP_CONFIG.version,
  versionLabel: APP_VERSION_LABEL,
  status: "offline",
  provider: "unknown",
  memoryCount: 0,
  timestamp: 0,
};

const initialGitHubStatus: GitHubStatus = {
  success: false,
  configured: false,
  connected: false,
};

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<LocalSettings>(
      defaultSettings,
    );

  const [runtime, setRuntime] =
    useState<RuntimeStatus>(
      initialRuntime,
    );

  const [runtimeLoading, setRuntimeLoading] =
    useState(true);

  const [runtimeError, setRuntimeError] =
    useState("");

  const [saved, setSaved] =
    useState(false);

  const [githubStatus, setGitHubStatus] =
    useState<GitHubStatus>(
      initialGitHubStatus,
    );

  const [githubLoading, setGitHubLoading] =
    useState(true);

  const [githubActionLoading, setGitHubActionLoading] =
    useState(false);

  const [githubError, setGitHubError] =
    useState("");

  const [githubRepositories, setGitHubRepositories] =
    useState<GitHubRepository[]>([]);

  const [githubRepositoriesLoading, setGitHubRepositoriesLoading] =
    useState(false);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(
          STORAGE_KEY,
        );

      if (!stored) {
        return;
      }

      const parsed =
        JSON.parse(
          stored,
        );

      setSettings({
        ...defaultSettings,
        ...parsed,
      });
    } catch {
      setSettings(
        defaultSettings,
      );
    }
  }, []);

  const loadRuntime =
    useCallback(
      async () => {
        setRuntimeLoading(true);
        setRuntimeError("");

        try {
          const response =
            await fetch(
              "/api/runtime/status",
              {
                cache: "no-store",
                credentials: "same-origin",
              },
            );

          if (!response.ok) {
            throw new Error(
              "Runtime unavailable.",
            );
          }

          const data =
            (await response.json()) as RuntimeStatus;

          setRuntime(data);
        } catch {
          setRuntime(initialRuntime);
          setRuntimeError(
            "无法读取 Runtime 状态。",
          );
        } finally {
          setRuntimeLoading(false);
        }
      },
      [],
    );

  const loadGitHubStatus =
    useCallback(
      async () => {
        setGitHubLoading(true);
        setGitHubError("");

        try {
          const response =
            await fetch(
              "/api/integrations/github/status",
              {
                cache: "no-store",
                credentials: "same-origin",
              },
            );

          const data =
            (await response.json()) as GitHubStatus;

          if (!response.ok) {
            throw new Error(
              data.error ||
                "GitHub status unavailable.",
            );
          }

          setGitHubStatus(data);

          if (
            !data.connected
          ) {
            setGitHubRepositories([]);
          }
        } catch (
          error
        ) {
          setGitHubStatus(
            initialGitHubStatus,
          );

          setGitHubError(
            error instanceof Error
              ? error.message
              : "无法读取 GitHub 状态。",
          );
        } finally {
          setGitHubLoading(false);
        }
      },
      [],
    );

  const loadGitHubRepositories =
    useCallback(
      async () => {
        if (
          !githubStatus.connected
        ) {
          setGitHubRepositories([]);
          return;
        }

        setGitHubRepositoriesLoading(true);
        setGitHubError("");

        try {
          const response =
            await fetch(
              "/api/integrations/github/repositories",
              {
                cache: "no-store",
                credentials: "same-origin",
              },
            );

          const data =
            (await response.json()) as GitHubRepositoriesResponse;

          if (!response.ok) {
            throw new Error(
              data.error ||
                "GitHub repositories unavailable.",
            );
          }

          setGitHubRepositories(
            data.repositories || [],
          );
        } catch (
          error
        ) {
          setGitHubRepositories([]);

          setGitHubError(
            error instanceof Error
              ? error.message
              : "无法读取 GitHub repositories。",
          );
        } finally {
          setGitHubRepositoriesLoading(false);
        }
      },
      [githubStatus.connected],
    );

  useEffect(() => {
    loadRuntime();
    loadGitHubStatus();
  }, [
    loadRuntime,
    loadGitHubStatus,
  ]);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const githubResult =
      params.get("github");

    if (
      githubResult ===
      "connected"
    ) {
      loadGitHubStatus();

      params.delete(
        "github",
      );

      const nextQuery =
        params.toString();

      window.history.replaceState(
        {},
        "",
        nextQuery
          ? `${window.location.pathname}?${nextQuery}`
          : window.location.pathname,
      );
    }

    if (
      githubResult ===
      "error"
    ) {
      const error =
        params.get(
          "message",
        );

      setGitHubError(
        error ||
          "GitHub connection failed.",
      );

      params.delete(
        "github",
      );

      params.delete(
        "message",
      );

      const nextQuery =
        params.toString();

      window.history.replaceState(
        {},
        "",
        nextQuery
          ? `${window.location.pathname}?${nextQuery}`
          : window.location.pathname,
      );
    }
  }, [
    loadGitHubStatus,
  ]);

  useEffect(() => {
    if (
      githubStatus.connected
    ) {
      loadGitHubRepositories();
    }
  }, [
    githubStatus.connected,
    loadGitHubRepositories,
  ]);

  function updateSettings(
    updates: Partial<LocalSettings>,
  ) {
    setSaved(false);

    setSettings(
      (
        current,
      ) => ({
        ...current,
        ...updates,
      }),
    );
  }

  function handleSave() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        settings,
      ),
    );

    setSaved(true);

    window.setTimeout(
      () => {
        setSaved(false);
      },
      1800,
    );
  }

  function handleGitHubConnect() {
    window.location.assign(
      "/api/integrations/github/connect",
    );
  }

  async function handleGitHubDisconnect() {
    setGitHubActionLoading(true);
    setGitHubError("");

    try {
      const response =
        await fetch(
          "/api/integrations/github/disconnect",
          {
            method: "POST",
            credentials: "same-origin",
          },
        );

      const data =
        (await response.json()) as GitHubStatus;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "GitHub disconnect failed.",
        );
      }

      setGitHubStatus({
        success: true,
        configured:
          githubStatus.configured,
        connected: false,
      });

      setGitHubRepositories([]);
    } catch (
      error
    ) {
      setGitHubError(
        error instanceof Error
          ? error.message
          : "GitHub disconnect failed.",
      );
    } finally {
      setGitHubActionLoading(false);
    }
  }

  const isOnline =
    runtime.status ===
    "online";

  const versionLabel =
    runtime.versionLabel ||
    `${runtime.stage ?? APP_CONFIG.stage} v${runtime.version}`;

  const githubConfigured =
    githubStatus.configured;

  const githubConnected =
    githubStatus.connected;

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
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {APP_FULL_TITLE}
          </p>

          <h1
            style={{
              margin: "7px 0 0",
              fontSize: 30,
            }}
          >
            ⚙️ Settings
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            管理 Runtime、GitHub Integration
            和当前设备设置。
          </p>
        </header>

        {runtimeError && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              border: "1px solid #fecaca",
              borderRadius: 12,
              background: "#fff7f7",
              color: "#b91c1c",
            }}
          >
            {runtimeError}
          </div>
        )}

        {githubError && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              border: "1px solid #fecaca",
              borderRadius: 12,
              background: "#fff7f7",
              color: "#b91c1c",
            }}
          >
            {githubError}
          </div>
        )}

        <section
          style={{
            padding: 18,
            marginBottom: 16,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                ACTIVE PROVIDER
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: 7,
                  fontSize: 25,
                  textTransform: "capitalize",
                }}
              >
                {runtimeLoading
                  ? "读取中…"
                  : runtime.provider}
              </strong>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 11px",
                borderRadius: 999,
                background:
                  isOnline
                    ? "#ecfdf5"
                    : "#fef2f2",
                color:
                  isOnline
                    ? "#047857"
                    : "#b91c1c",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    isOnline
                      ? "#22c55e"
                      : "#ef4444",
                }}
              />

              {isOnline
                ? "Online"
                : "Offline"}
            </span>
          </div>

          <p
            style={{
              margin: "14px 0 0",
              color: "#6b7280",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            Provider 由服务端 AI_CONFIG 和
            Provider Router 控制。当前页面不再显示无法生效的本地模型切换。
          </p>
        </section>

        <section
          style={{
            padding: 18,
            marginBottom: 16,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                DEVELOPER INTEGRATION
              </p>

              <h2
                style={{
                  margin: "7px 0 0",
                  fontSize: 20,
                }}
              >
                GitHub
              </h2>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 10px",
                borderRadius: 999,
                background:
                  githubConnected
                    ? "#ecfdf5"
                    : githubConfigured
                      ? "#f3f4f6"
                      : "#fef2f2",
                color:
                  githubConnected
                    ? "#047857"
                    : githubConfigured
                      ? "#4b5563"
                      : "#b91c1c",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background:
                    githubConnected
                      ? "#22c55e"
                      : githubConfigured
                        ? "#9ca3af"
                        : "#ef4444",
                }}
              />

              {githubLoading
                ? "检查中"
                : githubConnected
                  ? "Connected"
                  : githubConfigured
                    ? "Not connected"
                    : "Not configured"}
            </span>
          </div>

          {!githubConfigured ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "#f9fafb",
                color: "#6b7280",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              GitHub App 尚未完成服务端配置。
            </div>
          ) : githubConnected ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <InfoCard
                  label="Account"
                  value={
                    githubStatus.account?.login ||
                    "Unknown"
                  }
                />

                <InfoCard
                  label="Installations"
                  value={String(
                    githubStatus.installationCount ??
                      0,
                  )}
                />

                <InfoCard
                  label="Access"
                  value="Active"
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 9,
                  marginBottom: 14,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    loadGitHubStatus();
                    loadGitHubRepositories();
                  }}
                  disabled={
                    githubLoading ||
                    githubRepositoriesLoading
                  }
                  style={{
                    padding: "9px 12px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 9,
                    background: "#ffffff",
                    color: "#111827",
                    fontWeight: 700,
                    opacity:
                      githubLoading ||
                      githubRepositoriesLoading
                        ? 0.6
                        : 1,
                  }}
                >
                  {githubRepositoriesLoading
                    ? "刷新中…"
                    : "刷新 GitHub"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleGitHubDisconnect
                  }
                  disabled={
                    githubActionLoading
                  }
                  style={{
                    padding: "9px 12px",
                    border:
                      "1px solid #fecaca",
                    borderRadius: 9,
                    background: "#fff7f7",
                    color: "#b91c1c",
                    fontWeight: 700,
                    opacity:
                      githubActionLoading
                        ? 0.6
                        : 1,
                  }}
                >
                  {githubActionLoading
                    ? "处理中…"
                    : "Disconnect"}
                </button>
              </div>

              <div
                style={{
                  borderTop:
                    "1px solid #f3f4f6",
                  paddingTop: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <strong>
                    Repositories
                  </strong>

                  <span
                    style={{
                      color: "#6b7280",
                      fontSize: 12,
                    }}
                  >
                    {githubRepositories.length}
                  </span>
                </div>

                {githubRepositoriesLoading ? (
                  <div
                    style={{
                      padding: "14px 0",
                      color: "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    正在读取 GitHub repositories…
                  </div>
                ) : githubRepositories.length ===
                  0 ? (
                  <div
                    style={{
                      padding: "14px 0",
                      color: "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    当前 GitHub App 没有返回可访问的 repository。
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    {githubRepositories.map(
                      (
                        repository,
                      ) => (
                        <div
                          key={
                            repository.id
                          }
                          style={{
                            padding:
                              "11px 12px",
                            border:
                              "1px solid #f3f4f6",
                            borderRadius: 10,
                            background:
                              "#fafafa",
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
                              alignItems:
                                "center",
                              gap: 8,
                            }}
                          >
                            <strong
                              style={{
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {
                                repository.fullName
                              }
                            </strong>

                            <span
                              style={{
                                padding:
                                  "4px 7px",
                                borderRadius:
                                  999,
                                background:
                                  repository.private
                                    ? "#f3f4f6"
                                    : "#ecfdf5",
                                color:
                                  repository.private
                                    ? "#4b5563"
                                    : "#047857",
                                fontSize:
                                  11,
                                fontWeight:
                                  800,
                              }}
                            >
                              {repository.private
                                ? "Private"
                                : "Public"}
                            </span>
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              flexWrap:
                                "wrap",
                              gap: 8,
                              marginTop:
                                7,
                              color:
                                "#6b7280",
                              fontSize:
                                12,
                            }}
                          >
                            <span>
                              Branch:{" "}
                              {
                                repository.defaultBranch
                              }
                            </span>

                            <span>
                              Access:{" "}
                              {repository.permissions?.push
                                ? "Read / Write"
                                : repository.permissions?.pull
                                  ? "Read"
                                  : "Unknown"}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <p
                style={{
                  margin: "0 0 14px",
                  color: "#6b7280",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                将 GitHub 账号连接到 AIOS，用于后续 repository、代码工作流和开发者能力集成。
              </p>

              <button
                type="button"
                onClick={
                  handleGitHubConnect
                }
                disabled={
                  githubLoading ||
                  githubActionLoading
                }
                style={{
                  width: "100%",
                  padding:
                    "12px 16px",
                  border: 0,
                  borderRadius: 10,
                  background: "#111827",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  opacity:
                    githubLoading
                      ? 0.6
                      : 1,
                }}
              >
                Connect GitHub
              </button>
            </div>
          )}
        </section>

        <section
          style={{
            padding: 18,
            marginBottom: 16,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: 18,
            }}
          >
            Runtime Modules
          </h2>

          <SettingSwitch
            label="Memory"
            description="在当前设备中启用记忆相关界面设置"
            checked={
              settings.memoryEnabled
            }
            onChange={(
              checked,
            ) =>
              updateSettings({
                memoryEnabled:
                  checked,
              })
            }
          />

          <SettingSwitch
            label="Tasks"
            description="在当前设备中启用任务管理界面设置"
            checked={
              settings.taskEnabled
            }
            onChange={(
              checked,
            ) =>
              updateSettings({
                taskEnabled:
                  checked,
              })
            }
          />

          <p
            style={{
              margin: "13px 0 0",
              color: "#9ca3af",
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            当前开关保存于本机浏览器，暂不改变服务端 Runtime。
          </p>
        </section>

        <section
          style={{
            padding: 18,
            marginBottom: 18,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 18,
              }}
            >
              System Status
            </h2>

            <button
              type="button"
              onClick={
                loadRuntime
              }
              disabled={
                runtimeLoading
              }
              style={{
                padding:
                  "8px 11px",
                border:
                  "1px solid #d1d5db",
                borderRadius: 9,
                background:
                  "#ffffff",
                color:
                  "#111827",
                fontWeight:
                  700,
                opacity:
                  runtimeLoading
                    ? 0.6
                    : 1,
              }}
            >
              {runtimeLoading
                ? "刷新中…"
                : "刷新"}
            </button>
          </div>

          <StatusRow
            label="Runtime"
            value={
              runtime.runtime
            }
          />

          <StatusRow
            label="Status"
            value={
              runtime.status
            }
          />

          <StatusRow
            label="Version"
            value={
              versionLabel
            }
          />

          <StatusRow
            label="Provider"
            value={
              runtime.provider
            }
          />

          <StatusRow
            label="Memory Records"
            value={String(
              runtime.memoryCount,
            )}
          />

          <StatusRow
            label="Last Check"
            value={
              runtime.timestamp
                ? new Date(
                    runtime.timestamp,
                  ).toLocaleString()
                : "—"
            }
          />
        </section>

        <button
          type="button"
          onClick={
            handleSave
          }
          style={{
            width: "100%",
            padding:
              "13px 16px",
            border: 0,
            borderRadius: 10,
            background:
              "#111827",
            color:
              "#ffffff",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {saved
            ? "本机设置已保存 ✓"
            : "保存本机设置"}
        </button>
      </div>
    </WorkspaceShell>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "11px 12px",
        border:
          "1px solid #f3f4f6",
        borderRadius: 10,
        background: "#fafafa",
      }}
    >
      <div
        style={{
          color: "#9ca3af",
          fontSize: 11,
          fontWeight: 800,
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          color: "#111827",
          fontSize: 14,
          fontWeight: 700,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SettingSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        gap: 16,
        padding:
          "13px 0",
        borderTop:
          "1px solid #f3f4f6",
      }}
    >
      <span>
        <strong
          style={{
            display:
              "block",
          }}
        >
          {label}
        </strong>

        <span
          style={{
            display:
              "block",
            marginTop: 4,
            color:
              "#6b7280",
            fontSize: 13,
          }}
        >
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
          accentColor:
            "#2563eb",
        }}
      />
    </label>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems:
          "center",
        gap: 18,
        padding:
          "11px 0",
        borderTop:
          "1px solid #f3f4f6",
      }}
    >
      <span
        style={{
          color:
            "#6b7280",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color:
            "#111827",
          fontSize: 14,
          textAlign:
            "right",
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}
