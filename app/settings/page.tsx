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
  memoryEnabled:
    boolean;

  taskEnabled:
    boolean;
}

interface RuntimeStatus {
  success:
    boolean;

  runtime:
    string;

  stage?:
    string;

  version:
    string;

  versionLabel?:
    string;

  status:
    | "online"
    | "offline";

  provider:
    string;

  memoryCount:
    number;

  timestamp:
    number;
}

const defaultSettings:
  LocalSettings = {
    memoryEnabled:
      true,

    taskEnabled:
      true,
  };

const initialRuntime:
  RuntimeStatus = {
    success:
      false,

    runtime:
      APP_CONFIG.runtimeId,

    stage:
      APP_CONFIG.stage,

    version:
      APP_CONFIG.version,

    versionLabel:
      APP_VERSION_LABEL,

    status:
      "offline",

    provider:
      "unknown",

    memoryCount:
      0,

    timestamp:
      0,
  };

export default function SettingsPage() {
  const [
    settings,
    setSettings,
  ] =
    useState<LocalSettings>(
      defaultSettings
    );

  const [
    runtime,
    setRuntime,
  ] =
    useState<RuntimeStatus>(
      initialRuntime
    );

  const [
    runtimeLoading,
    setRuntimeLoading,
  ] =
    useState(
      true
    );

  const [
    runtimeError,
    setRuntimeError,
  ] =
    useState(
      ""
    );

  const [
    saved,
    setSaved,
  ] =
    useState(
      false
    );

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!stored) {
        return;
      }

      const parsed =
        JSON.parse(
          stored
        );

      setSettings({
        ...defaultSettings,
        ...parsed,
      });
    } catch {
      setSettings(
        defaultSettings
      );
    }
  }, []);

  const loadRuntime =
    useCallback(
      async () => {
        setRuntimeLoading(
          true
        );

        setRuntimeError(
          ""
        );

        try {
          const response =
            await fetch(
              "/api/runtime/status",
              {
                cache:
                  "no-store",

                credentials:
                  "same-origin",
              }
            );

          if (
            !response.ok
          ) {
            throw new Error(
              "Runtime unavailable."
            );
          }

          const data =
            (await response.json()) as RuntimeStatus;

          setRuntime(
            data
          );
        } catch {
          setRuntime(
            initialRuntime
          );

          setRuntimeError(
            "无法读取 Runtime 状态。"
          );
        } finally {
          setRuntimeLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadRuntime();
  }, [loadRuntime]);

  function updateSettings(
    updates:
      Partial<LocalSettings>
  ) {
    setSaved(
      false
    );

    setSettings(
      (
        current
      ) => ({
        ...current,
        ...updates,
      })
    );
  }

  function handleSave() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        settings
      )
    );

    setSaved(
      true
    );

    window.setTimeout(
      () => {
        setSaved(
          false
        );
      },
      1800
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
            760,

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
            管理 Runtime 模块并查看真实系统状态。
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
                ACTIVE PROVIDER
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
            Provider 由服务端 AI_CONFIG 和 Provider Router
            控制。当前页面不再显示无法生效的本地模型切换。
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
          <h2
            style={{
              margin:
                "0 0 14px",

              fontSize:
                18,
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
              checked
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
              checked
            ) =>
              updateSettings({
                taskEnabled:
                  checked,
              })
            }
          />

          <p
            style={{
              margin:
                "13px 0 0",

              color:
                "#9ca3af",

              fontSize:
                12,

              lineHeight:
                1.55,
            }}
          >
            当前开关保存于本机浏览器，暂不改变服务端
            Runtime。服务端模块控制将在后续接入。
          </p>
        </section>

        <section
          style={{
            padding:
              18,

            marginBottom:
              18,

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

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap:
                12,

              marginBottom:
                12,
            }}
          >
            <h2
              style={{
                margin:
                  0,

                fontSize:
                  18,
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

                borderRadius:
                  9,

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
            value={
              String(
                runtime.memoryCount
              )
            }
          />

          <StatusRow
            label="Last Check"
            value={
              runtime.timestamp
                ? new Date(
                    runtime.timestamp
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
            width:
              "100%",

            padding:
              "13px 16px",

            border:
              0,

            borderRadius:
              10,

            background:
              "#111827",

            color:
              "#ffffff",

            fontSize:
              15,

            fontWeight:
              700,
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

function SettingSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label:
    string;

  description:
    string;

  checked:
    boolean;

  onChange:
    (
      checked:
        boolean
    ) => void;
}) {
  return (
    <label
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

            marginTop:
              4,

            color:
              "#6b7280",

            fontSize:
              13,
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
          event
        ) =>
          onChange(
            event.target.checked
          )
        }
        style={{
          width:
            22,

          height:
            22,

          flexShrink:
            0,

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
  label:
    string;

  value:
    string;
}) {
  return (
    <div
      style={{
        display:
          "flex",

        justifyContent:
          "space-between",

        alignItems:
          "center",

        gap:
          18,

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

          fontSize:
            14,

          fontWeight:
            700,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color:
            "#111827",

          fontSize:
            14,

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