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
  status:
    | "online"
    | "offline";
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
  runtime:
    APP_CONFIG.runtimeId,
  stage:
    APP_CONFIG.stage,
  version:
    APP_CONFIG.version,
  versionLabel:
    APP_VERSION_LABEL,
  status: "offline",
  provider: "unknown",
  memoryCount: 0,
  timestamp: 0,
};

export default function SettingsPage() {
  const [
    settings,
    setSettings,
  ] = useState<LocalSettings>(
    defaultSettings,
  );

  const [
    runtime,
    setRuntime,
  ] = useState<RuntimeStatus>(
    initialRuntime,
  );

  const [
    runtimeLoading,
    setRuntimeLoading,
  ] = useState(true);

  const [
    runtimeError,
    setRuntimeError,
  ] = useState("");

  const [
    saved,
    setSaved,
  ] = useState(false);

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
        setRuntimeLoading(
          true,
        );

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
            "Unable to read Runtime status.",
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
      <main
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
          padding:
            "22px 12px 42px",
          boxSizing:
            "border-box",
          color: "#111827",
        }}
      >
        <header
          style={{
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: 12,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color:
                    "#6b7280",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing:
                    "0.10em",
                  textTransform:
                    "uppercase",
                }}
              >
                AIOS Workspace
              </p>

              <h1
                style={{
                  margin:
                    "6px 0 0",
                  fontSize:
                    "clamp(26px, 6vw, 34px)",
                  lineHeight: 1.1,
                  letterSpacing:
                    "-0.03em",
                }}
              >
                Settings
              </h1>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "#6b7280",
                  fontSize: 13,
                  lineHeight: 1.55,
                  maxWidth: 620,
                }}
              >
                Configure your AIOS
                workspace without
                exposing Founder
                engineering controls.
              </p>
            </div>

            <div
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 7,
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
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius:
                    "50%",
                  background:
                    isOnline
                      ? "#22c55e"
                      : "#ef4444",
                }}
              />

              {runtimeLoading
                ? "Checking"
                : isOnline
                  ? "Runtime Online"
                  : "Runtime Offline"}
            </div>
          </div>
        </header>

        {runtimeError && (
          <div
            style={{
              marginBottom: 14,
              padding:
                "11px 13px",
              border:
                "1px solid #fecaca",
              borderRadius: 12,
              background:
                "#fff7f7",
              color:
                "#b91c1c",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {runtimeError}
          </div>
        )}

        <section
          style={{
            padding: 17,
            marginBottom: 14,
            border:
              "1px solid #e5e7eb",
            borderRadius: 17,
            background:
              "#ffffff",
            boxShadow:
              "0 8px 28px rgba(15,23,42,0.05)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap: 14,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#6b7280",
                  fontSize: 10,
                  fontWeight: 850,
                  letterSpacing:
                    "0.10em",
                }}
              >
                ACTIVE RUNTIME
              </div>

              <strong
                style={{
                  display:
                    "block",
                  marginTop: 6,
                  fontSize: 23,
                  textTransform:
                    "capitalize",
                }}
              >
                {runtimeLoading
                  ? "Loading"
                  : runtime.provider}
              </strong>

              <div
                style={{
                  marginTop: 4,
                  color:
                    "#6b7280",
                  fontSize: 12,
                }}
              >
                {APP_FULL_TITLE}
              </div>
            </div>

            <div
              style={{
                padding:
                  "8px 11px",
                borderRadius: 10,
                background:
                  "#f8fafc",
                color:
                  "#475569",
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              {versionLabel}
            </div>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 9,
              marginTop: 16,
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
                "13px 0 0",
              color:
                "#9ca3af",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            Runtime provider,
            service status and
            Founder engineering
            controls remain
            server-side.
          </p>
        </section>

        <section
          style={{
            padding: 17,
            marginBottom: 14,
            border:
              "1px solid #e5e7eb",
            borderRadius: 17,
            background:
              "#ffffff",
            boxShadow:
              "0 8px 28px rgba(15,23,42,0.05)",
          }}
        >
          <div
            style={{
              marginBottom: 8,
            }}
          >
            <div
              style={{
                color:
                  "#6b7280",
                fontSize: 10,
                fontWeight: 850,
                letterSpacing:
                  "0.10em",
              }}
            >
              WORKSPACE MODULES
            </div>

            <h2
              style={{
                margin:
                  "6px 0 0",
                fontSize: 19,
              }}
            >
              Workspace Settings
            </h2>

            <p
              style={{
                margin:
                  "6px 0 0",
                color:
                  "#6b7280",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Control which local
              workspace modules are
              enabled for this browser.
            </p>
          </div>

          <SettingRow
            label="Memory"
            description="Allow this workspace to use its local Memory module."
            enabled={
              settings.memoryEnabled
            }
            onChange={(
              enabled,
            ) =>
              updateSettings({
                memoryEnabled:
                  enabled,
              })
            }
          />

          <div
            style={{
              height: 1,
              background:
                "#eef2f7",
            }}
          />

          <SettingRow
            label="Tasks"
            description="Allow this workspace to use Tasks and execution state modules."
            enabled={
              settings.taskEnabled
            }
            onChange={(
              enabled,
            ) =>
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
              alignItems:
                "center",
              justifyContent:
                "flex-end",
              gap: 10,
              marginTop: 16,
              flexWrap:
                "wrap",
            }}
          >
            {saved && (
              <span
                style={{
                  color:
                    "#047857",
                  fontSize: 12,
                  fontWeight: 750,
                }}
              >
                Saved
              </span>
            )}

            <button
              type="button"
              onClick={
                handleSave
              }
              style={{
                minHeight: 40,
                padding:
                  "0 15px",
                border: 0,
                borderRadius: 10,
                background:
                  "#111827",
                color:
                  "#ffffff",
                fontSize: 13,
                fontWeight: 800,
                cursor:
                  "pointer",
              }}
            >
              Save Settings
            </button>
          </div>

          <p
            style={{
              margin:
                "12px 0 0",
              color:
                "#9ca3af",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            These switches are
            stored in this browser.
            They do not change
            server-side Runtime
            configuration.
          </p>
        </section>

        <section
          style={{
            padding:
              "13px 15px",
            border:
              "1px solid #e5e7eb",
            borderRadius: 14,
            background:
              "#f8fafc",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              gap: 10,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 7,
                height: 7,
                marginTop: 5,
                borderRadius:
                  "50%",
                background:
                  "#22c55e",
              }}
            />

            <p
              style={{
                margin: 0,
                color:
                  "#64748b",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              AIOS normal-user
              Settings intentionally
              excludes Founder
              GitHub, deployment,
              repository and
              autonomous-development
              controls.
            </p>
          </div>
        </section>
      </main>
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
        minWidth: 0,
        padding: 12,
        border:
          "1px solid #e5e7eb",
        borderRadius: 12,
        background:
          "#f9fafb",
      }}
    >
      <div
        style={{
          color:
            "#6b7280",
          fontSize: 10,
          fontWeight: 850,
          letterSpacing:
            "0.06em",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          color:
            "#111827",
          fontSize: 13,
          fontWeight: 800,
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
        gap: 16,
        padding:
          "14px 0",
      }}
    >
      <div
        style={{
          minWidth: 0,
        }}
      >
        <strong
          style={{
            display:
              "block",
            color:
              "#111827",
            fontSize: 14,
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
            fontSize: 12,
            lineHeight: 1.5,
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
        aria-label={
          `${label} ${enabled ? "enabled" : "disabled"}`
        }
        onClick={() =>
          onChange(
            !enabled,
          )
        }
        style={{
          width: 50,
          height: 30,
          flex:
            "0 0 auto",
          padding: 3,
          border: 0,
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
            width: 24,
            height: 24,
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
