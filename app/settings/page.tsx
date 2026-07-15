"use client";

import { useEffect, useState } from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

type ProviderName =
  | "mock"
  | "qwen"
  | "deepseek";

const STORAGE_KEY = "aios-settings";

interface AIOSSettings {
  provider: ProviderName;
  memoryEnabled: boolean;
  taskEnabled: boolean;
}

const defaultSettings: AIOSSettings = {
  provider: "mock",
  memoryEnabled: true,
  taskEnabled: true,
};

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<AIOSSettings>(
      defaultSettings
    );

  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    try {
      const value =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!value) {
        return;
      }

      const parsed =
        JSON.parse(value);

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

  function updateSettings(
    updates: Partial<AIOSSettings>
  ) {
    setSaved(false);

    setSettings(
      (current) => ({
        ...current,
        ...updates,
      })
    );
  }

  function handleSave() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  }

  return (
    <WorkspaceShell>
      <div
        style={{
          width: "100%",
          maxWidth: 760,
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
            AIOS Alpha
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
            管理 AI Provider 和系统能力。
          </p>
        </header>

        <section
          style={{
            padding: 18,
            marginBottom: 16,
            background: "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          <label
            htmlFor="provider"
            style={{
              display: "block",
              marginBottom: 9,
              fontWeight: 700,
            }}
          >
            AI Provider
          </label>

          <select
            id="provider"
            value={
              settings.provider
            }
            onChange={(event) =>
              updateSettings({
                provider:
                  event.target
                    .value as ProviderName,
              })
            }
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "12px 13px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              background:
                "#ffffff",
              fontSize: 15,
            }}
          >
            <option value="mock">
              Mock
            </option>

            <option
              value="qwen"
              disabled
            >
              Qwen（待接入）
            </option>

            <option
              value="deepseek"
              disabled
            >
              DeepSeek（待接入）
            </option>
          </select>

          <p
            style={{
              margin: "9px 0 0",
              color: "#6b7280",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            当前正式可用的是 Mock
            Provider。真实模型接入后会在此开放。
          </p>
        </section>

        <section
          style={{
            padding: 18,
            marginBottom: 16,
            background: "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          <h2
            style={{
              margin:
                "0 0 14px",
              fontSize: 18,
            }}
          >
            Runtime Modules
          </h2>

          <SettingSwitch
            label="Memory"
            description="保存并调用对话记忆"
            checked={
              settings.memoryEnabled
            }
            onChange={(checked) =>
              updateSettings({
                memoryEnabled:
                  checked,
              })
            }
          />

          <SettingSwitch
            label="Tasks"
            description="启用任务管理能力"
            checked={
              settings.taskEnabled
            }
            onChange={(checked) =>
              updateSettings({
                taskEnabled:
                  checked,
              })
            }
          />
        </section>

        <section
          style={{
            padding: 18,
            marginBottom: 18,
            background: "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius: 16,
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: 18,
            }}
          >
            System Status
          </h2>

          <StatusRow
            label="Runtime"
            value="Online"
          />

          <StatusRow
            label="Version"
            value="Alpha v0.2"
          />

          <StatusRow
            label="Provider"
            value={
              settings.provider
            }
          />

          <StatusRow
            label="Storage"
            value="Local"
          />
        </section>

        <button
          type="button"
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "13px 16px",
            border: 0,
            borderRadius: 10,
            background: "#111827",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {saved
            ? "已保存 ✓"
            : "保存设置"}
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
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    checked: boolean
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
        padding: "13px 0",
        borderTop:
          "1px solid #f3f4f6",
      }}
    >
      <span>
        <strong
          style={{
            display: "block",
          }}
        >
          {label}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 4,
            color: "#6b7280",
            fontSize: 13,
          }}
        >
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
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
        gap: 16,
        padding: "10px 0",
        borderTop:
          "1px solid #f3f4f6",
      }}
    >
      <span
        style={{
          color: "#6b7280",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          textTransform:
            "capitalize",
        }}
      >
        {value}
      </strong>
    </div>
  );
}