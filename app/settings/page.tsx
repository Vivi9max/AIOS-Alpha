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

const STORAGE_KEY =
  "aios-settings";

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
        ) as Partial<LocalSettings>;

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
                cache:
                  "no-store",
                credentials:
                  "same-origin",
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
          setRuntime(
            initialRuntime,
          );

          setRuntimeError(
            "无法读取 Runtime 状态。",
          );
        } finally {
          setRuntimeLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void loadRuntime();
  }, [
    loadRuntime,
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

  const isOnline =
    runtime.status ===
    "online";

  const versionLabel =
    runtime.versionLabel ||
    `${runtime.stage ?? APP_CONFIG.stage} v${runtime.version}`;

  return (
    <WorkspaceShell>
      <div
        style={{
          width:
            "100%",
          maxWidth:
            820,
          margin:
            "0 auto",
          color:
            "#111827",
        }}
      >
        <header
          style={{
            marginBottom:
              24,
          }}
        >
          <p
            style={{
              margin:
                0,
              color:
                "#6b7280",
              fontSize:
                14,
              fontWeight:
                700,
            }}
          >
            {APP_FULL_TITLE}
          </p>

          <h1
            style={{
              margin:
                "7px 0 0",
              fontSize:
                30,
            }}
          >
            ⚙️ Settings
          </h1>

          <p
            style={{
              margin:
                "10px 0 0",
              color:
                "#6b7280",
              lineHeight:
                1.6,
            }}
          >
            管理当前 AIOS Workspace 的 Runtime
            和本机设置。
          </p>
        </header>

        {runtimeError && (
          <div
            style={{
              marginBottom:
                16,
              padding:
                "12px 14px",
              border:
                "1px solid #fecaca",
              borderRadius:
                12,
              background:
                "#fff7f7",
              color:
                "#b91c1c",
              lineHeight:
                1.5,
            }}
          >
            {runtimeError}
          </div>
        )}

        <section
          style={{
            padding:
              18,
            marginBottom:
              16,
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              16,
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
              gap:
                12,
            }}
          >
            <div>
              <p
                style={{
                  margin:
                    0,
                  color:
                    "#6b7280",
                  fontSize:
                    13,
                  fontWeight:
                    700,
                }}
              >
                ACTIVE RUNTIME
              </p>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    7,
                  fontSize:
                    25,
                  textTransform:
                    "capitalize",
                }}
              >
                {runtimeLoading
                  ? "读取中…"
                  : runtime.provider}
              </strong>
            </div>

            <span
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap:
                  7,
                padding:
                  "8px 11px",
                borderRadius:
                  999,
                background:
                  isOnline
                    ? "#ecfdf5"
                    : "#fef2f2",
                color:
                  isOnline
                    ? "#047857"
                    : "#b91c1c",
                fontSize:
                  13,
                fontWeight:
                  800,
              }}
            >
              <span
                style={{
                  width:
                    8,
                  height:
                    8,
                  borderRadius:
                    "50%",
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

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap:
                10,
              marginTop:
                18,
            }}
          >
            <InfoCard
              label="Runtime"
              value={
                runtime.runtime ||
                APP_CONFIG.runtimeId
              }
            />

            <InfoCard
              label="Version"
              value={
                versionLabel
              }
            />

            <InfoCard
              label="Memory Records"
              value={String(
                runtime.memoryCount ??
                  0,
              )}
            />
          </div>

          <p
            style={{
              margin:
                "14px 0 0",
              color:
                "#6b7280",
              fontSize:
                13,
              lineHeight:
                1.55,
            }}
          >
            Provider 和 Runtime 状态由服务端控制。
            普通用户 Settings 不包含 Founder 工程集成。
          </p>
        </section>

        <section
          style={{
            padding:
              18,
            marginBottom:
              16,
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              16,
          }}
        >
          <div
            style={{
              marginBottom:
                16,
            }}
          >
            <p
              style={{
                margin:
                  0,
                color:
                  "#6b7280",
                fontSize:
                  13,
                fontWeight:
                  700,
              }}
            >
              RUNTIME MODULES
            </p>

            <h2
              style={{
                margin:
                  "7px 0 0",
                fontSize:
                  20,
              }}
            >
              Workspace Settings
            </h2>
          </div>

          <SettingRow
            label="Memory"
            description="允许当前 Workspace 使用本机设置中的 Memory 模块。"
            enabled={
              settings.memoryEnabled
            }
            onChange={(enabled) =>
              updateSettings({
                memoryEnabled:
                  enabled,
              })
            }
          />

          <div
            style={{
              height:
                1,
              background:
                "#eef2f7",
            }}
          />

          <SettingRow
            label="Tasks"
            description="允许当前 Workspace 使用任务与执行状态模块。"
            enabled={
              settings.taskEnabled
            }
            onChange={(enabled) =>
              updateSettings({
                taskEnabled:
                  enabled,
              })
            }
          />

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "flex-end",
              alignItems:
                "center",
              gap:
                10,
              marginTop:
                18,
              flexWrap:
                "wrap",
            }}
          >
            {saved && (
              <span
                style={{
                  color:
                    "#047857",
                  fontSize:
                    13,
                  fontWeight:
                    700,
                }}
              >
                已保存
              </span>
            )}

            <button
              type="button"
              onClick={
                handleSave
              }
              style={{
                minHeight:
                  42,
                padding:
                  "0 15px",
                border:
                  0,
                borderRadius:
                  11,
                background:
                  "#111827",
                color:
                  "#ffffff",
                fontWeight:
                  800,
                cursor:
                  "pointer",
              }}
            >
              保存设置
            </button>
          </div>

          <p
            style={{
              margin:
                "14px 0 0",
              color:
                "#9ca3af",
              fontSize:
                12,
              lineHeight:
                1.5,
            }}
          >
            当前开关保存于本机浏览器，不改变服务端 Runtime
            配置。
          </p>
        </section>
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
        padding:
          13,
        border:
          "1px solid #e5e7eb",
        borderRadius:
          13,
        background:
          "#f9fafb",
      }}
    >
      <div
        style={{
          color:
            "#6b7280",
          fontSize:
            11,
          fontWeight:
            800,
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            6,
          fontWeight:
            850,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (
    enabled: boolean,
  ) => void;
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap:
          16,
        padding:
          "14px 0",
      }}
    >
      <div
        style={{
          minWidth:
            0,
        }}
      >
        <strong
          style={{
            display:
              "block",
            fontSize:
              15,
          }}
        >
          {label}
        </strong>

        <p
          style={{
            margin:
              "5px 0 0",
            color:
              "#6b7280",
            fontSize:
              12,
            lineHeight:
              1.5,
          }}
        >
          {description}
        </p>
      </div>

      <button
        type="button"
        aria-pressed={
          enabled
        }
        onClick={() =>
          onChange(
            !enabled,
          )
        }
        style={{
          width:
            50,
          height:
            30,
          flex:
            "0 0 auto",
          padding:
            3,
          border:
            0,
          borderRadius:
            999,
          background:
            enabled
              ? "#111827"
              : "#d1d5db",
          cursor:
            "pointer",
        }}
      >
        <span
          style={{
            display:
              "block",
            width:
              24,
            height:
              24,
            borderRadius:
              "50%",
            background:
              "#ffffff",
            transform:
              enabled
                ? "translateX(20px)"
                : "translateX(0)",
            transition:
              "transform 120ms ease",
          }}
        />
      </button>
    </div>
  );
}
