"use client";

import {
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

const STORAGE_KEY =
  "aios-cn-settings";

interface CNSettings {
  showRuntimeStatus:
    boolean;
  preserveConversation:
    boolean;
}

const defaultSettings:
  CNSettings = {
  showRuntimeStatus:
    true,
  preserveConversation:
    true,
};

export default function CNSettingsPage() {
  const [
    settings,
    setSettings,
  ] =
    useState<CNSettings>(
      defaultSettings,
    );

  const [
    saved,
    setSaved,
  ] =
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
        ) as Partial<CNSettings>;

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

  function updateSettings(
    updates:
      Partial<CNSettings>,
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

  function saveSettings() {
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

  return (
    <WorkspaceShell>
      <main
        style={{
          width:
            "100%",
          maxWidth:
            760,
          margin:
            "0 auto",
          padding:
            "8px 8px 32px",
          boxSizing:
            "border-box",
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
                "#b91c1c",
              fontSize:
                12,
              fontWeight:
                800,
              letterSpacing:
                "0.08em",
            }}
          >
            AIOS CN
          </p>

          <h1
            style={{
              margin:
                "7px 0 8px",
              fontSize:
                30,
                fontWeight:
                850,
            }}
          >
            CN Settings
          </h1>

          <p
            style={{
              margin:
                0,
              color:
                "#64748b",
              lineHeight:
                1.6,
            }}
          >
            管理 AIOS CN 的本地产品偏好。CN Runtime Provider 由服务端配置控制。
          </p>
        </header>

        <section
          style={{
            padding:
              18,
            marginBottom:
              16,
            background:
              "#ffffff",
            border:
              "1px solid #fecaca",
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
            CN Product
          </h2>

          <InfoRow
            label="Product"
            value="AIOS CN"
          />

          <InfoRow
            label="Runtime"
            value="aios-cn"
          />

          <InfoRow
            label="Provider"
            value="DeepSeek / configured fallback"
          />

          <InfoRow
            label="Execution"
            value="CN Runtime only"
          />
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
          <h2
            style={{
              margin:
                "0 0 14px",
              fontSize:
                18,
            }}
          >
            Local Preferences
          </h2>

          <SettingSwitch
            label="Runtime Status"
            description="在 AIOS CN Chat 顶部显示当前 CN Runtime Provider 状态。"
            checked={
              settings.showRuntimeStatus
            }
            onChange={(
              checked,
            ) =>
              updateSettings({
                showRuntimeStatus:
                  checked,
              })
            }
          />

          <SettingSwitch
            label="Conversation History"
            description="保留当前 AIOS CN 会话历史显示。"
            checked={
              settings.preserveConversation
            }
            onChange={(
              checked,
            ) =>
              updateSettings({
                preserveConversation:
                  checked,
              })
            }
          />
        </section>

        <section
          style={{
            padding:
              16,
            marginBottom:
              18,
            background:
              "#fff7f7",
            border:
              "1px solid #fecaca",
            borderRadius:
              14,
            color:
              "#7f1d1d",
            fontSize:
              13,
            lineHeight:
              1.6,
          }}
        >
          AIOS CN 的 Provider、模型、Fallback 和 Runtime 能力由服务端配置控制。
          本页面的本地设置不会修改服务端 Provider，也不会改变 Global Runtime。
        </section>

        <button
          type="button"
          onClick={
            saveSettings
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
              "#b91c1c",
            color:
              "#ffffff",
            fontSize:
              15,
            fontWeight:
              700,
          }}
        >
          {saved
            ? "CN 设置已保存 ✓"
            : "保存 CN 设置"}
        </button>
      </main>
    </WorkspaceShell>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
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
          16,
        padding:
          "11px 0",
        borderTop:
          "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          color:
            "#64748b",
          fontSize:
            13,
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
            13,
          textAlign:
            "right",
        }}
      >
        {value}
      </strong>
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
  onChange:
    (
      checked:
        boolean,
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
          "1px solid #f1f5f9",
      }}
    >
      <span>
        <strong
          style={{
            display:
              "block",
            color:
              "#111827",
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
              "#64748b",
            fontSize:
              13,
            lineHeight:
              1.5,
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
            event.target.checked,
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
            "#b91c1c",
        }}
      />
    </label>
  );
}
