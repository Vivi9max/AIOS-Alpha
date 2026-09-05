“use client”;

import Link from “next/link”;

import {
useCallback,
useEffect,
useState,
} from “react”;

import WorkspaceShell from “@/components/layout/WorkspaceShell”;

import {
useLanguage,
} from “@/components/i18n/LanguageProvider”;

import {
APP_CONFIG,
} from “@/lib/config/app”;

import CoreVerificationPanel from “./CoreVerificationPanel”;

type RuntimeHealthStatus =
| “online”
|  “degraded”
|  “offline”;

interface RuntimeModule {
enabled?: boolean;
status?: string;
}

interface RuntimeStatus {
success: boolean;

runtime?: string;

versionLabel?: string;

codename?: string;

status?: RuntimeHealthStatus;

provider?: string;

memoryCount?: number;

timestamp?: number;

providerRuntime?: {
success?: boolean;
latencyMs?: number;
fallbackUsed?: boolean;
lastRequestAt?: number | null;
error?: string;
};

health?: {
status?: RuntimeHealthStatus;
reasons?: string[];
};

modules?: Record<
string,
RuntimeModule

;
}

function formatTime(
timestamp:
number | null | undefined,
locale: string,
emptyLabel: string
): string {
if (!timestamp) {
return emptyLabel;
}

return new Date(
timestamp
).toLocaleString(
locale,
{
hour12: false,
}
);
}

export default function RuntimePage() {
const {
locale,
t,
} = useLanguage();

const [
data,
setData,
] =
useState<
RuntimeStatus | null
>(null);

const [
loading,
setLoading,
] =
useState(true);

const [
error,
setError,
] =
useState(””);

const loadStatus =
useCallback(
async () => {
setLoading(true);
setError(””);

    try {
      const response =
        await fetch(
          "/api/runtime/status",
          {
            cache:
              "no-store",
          }
        );
      const result =
        (await response.json()) as
          RuntimeStatus;
      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          t(
            "runtime.loadError"
          )
        );
      }
      setData(result);
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t(
              "runtime.loadError"
            )
      );
    } finally {
      setLoading(false);
    }
  },
  [t]
);

useEffect(() => {
void loadStatus();
}, [loadStatus]);

const modules =
Object.entries(
data?.modules ?? {}
);

const status =
data?.status ??
“offline”;

const statusLabel =
loading
? t(“runtime.checking”)
: status ===
“online”
? t(“runtime.online”)
: status ===
“degraded”
? “Degraded”
: t(“runtime.offline”);

const statusReady =
status === “online”;

return (
<main
style={{
width: “100%”,
maxWidth: 840,
margin: “0 auto”,
color: “#111827”,
paddingBottom: 40,
}}
>
<header
style={{
marginBottom: 22,
}}
>
<p
style={{
margin: 0,
color: “#64748b”,
fontSize: 14,
fontWeight: 800,
}}
>
AIOS System
      <h1
        style={{
          margin:
            "8px 0 0",
          fontSize: 37,
          lineHeight: 1.15,
        }}
      >
        ⚡ {t("runtime.title")}
      </h1>
      <p
        style={{
          margin:
            "12px 0 0",
          color: "#64748b",
          lineHeight: 1.65,
        }}
      >
        {t(
          "runtime.description"
        )}
      </p>
    </header>
    <section
      style={{
        padding: 21,
        borderRadius: 22,
        background: "#111827",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 16,
          alignItems:
            "flex-start",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#93c5fd",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing:
                "0.08em",
            }}
          >
            RUNTIME STATUS
          </p>
          <h2
            style={{
              margin:
                "8px 0 0",
              fontSize: 34,
            }}
          >
            {statusLabel}
          </h2>
          <p
            style={{
              margin:
                "8px 0 0",
              color: "#cbd5e1",
            }}
          >
            {data?.runtime ??
              APP_CONFIG.runtimeId}
            {" "}
            ·{" "}
            {data?.versionLabel ??
              APP_CONFIG.fullTitle}
          </p>
          {data?.codename && (
            <p
              style={{
                margin:
                  "5px 0 0",
                color: "#94a3b8",
                fontSize: 12,
              }}
            >
              {data.codename}
            </p>
          )}
        </div>
        <span
          style={{
            padding:
              "8px 12px",
            borderRadius: 999,
            background:
              loading
                ? "#e2e8f0"
                : statusReady
                  ? "#dcfce7"
                  : status ===
                      "degraded"
                    ? "#fef3c7"
                    : "#fee2e2",
            color:
              loading
                ? "#475569"
                : statusReady
                  ? "#15803d"
                  : status ===
                      "degraded"
                    ? "#b45309"
                    : "#b91c1c",
            fontWeight: 900,
          }}
        >
          {loading
            ? "CHECK"
            : statusReady
              ? "READY"
              : status ===
                  "degraded"
                ? "DEGRADED"
                : "OFFLINE"}
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          void loadStatus()
        }
        disabled={loading}
        style={{
          marginTop: 18,
          minHeight: 46,
          padding:
            "0 18px",
          border: 0,
          borderRadius: 13,
          background:
            loading
              ? "#cbd5e1"
              : "#ffffff",
          color: "#111827",
          fontWeight: 900,
          cursor:
            loading
              ? "wait"
              : "pointer",
        }}
      >
        {loading
          ? t(
              "runtime.checking"
            )
          : t(
              "runtime.refresh"
            )}
      </button>
    </section>
    {error && (
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          background:
            "#fff1f2",
          color: "#be123c",
          fontWeight: 800,
        }}
      >
        {error}
      </div>
    )}
    {data?.health?.reasons &&
      data.health.reasons.length >
        0 && (
        <section
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 18,
            background:
              "#fffbeb",
            border:
              "1px solid #fde68a",
          }}
        >
          <strong>
            Runtime Health
          </strong>
          <ul
            style={{
              margin:
                "10px 0 0",
              paddingLeft: 20,
              color:
                "#92400e",
            }}
          >
            {data.health.reasons.map(
              (reason) => (
                <li
                  key={reason}
                  style={{
                    marginBottom: 6,
                  }}
                >
                  {reason}
                </li>
              )
            )}
          </ul>
        </section>
      )}
    <section
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(2, minmax(0, 1fr))",
        gap: 12,
        marginTop: 18,
      }}
    >
      <StatusCard
        label="Provider"
        value={
          data?.provider ??
          "—"
        }
        note={t(
          "runtime.modelNote"
        )}
      />
      <StatusCard
        label="Memory"
        value={String(
          data?.memoryCount ??
            0
        )}
        note={t(
          "runtime.memoryNote"
        )}
      />
      <StatusCard
        label="Latency"
        value={`${data
          ?.providerRuntime
          ?.latencyMs ?? 0} ms`}
        note={t(
          "runtime.latencyNote"
        )}
      />
      <StatusCard
        label="Last Run"
        value={
          data
            ?.providerRuntime
            ?.success
            ? t(
                "runtime.success"
              )
            : t(
                "runtime.none"
              )
        }
        note={formatTime(
          data
            ?.providerRuntime
            ?.lastRequestAt,
          locale,
          t(
            "runtime.noRuns"
          )
        )}
      />
    </section>
    <section
      style={{
        marginTop: 18,
        padding: 20,
        borderRadius: 20,
        border:
          "1px solid #e5e7eb",
        background:
          "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          gap: 12,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing:
                "0.08em",
            }}
          >
            RUNTIME MODULES
          </p>
          <h2
            style={{
              margin:
                "6px 0 0",
            }}
          >
            Runtime Modules
          </h2>
        </div>
        <span
          style={{
            padding:
              "6px 10px",
            borderRadius: 999,
            background:
              "#f1f5f9",
            color:
              "#475569",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {modules.length}
        </span>
      </div>
      <div
        style={{
          marginTop: 12,
        }}
      >
        {modules.length ===
        0 ? (
          <p
            style={{
              color:
                "#64748b",
            }}
          >
            {t(
              "runtime.loadingModules"
            )}
          </p>
        ) : (
          modules.map(
            ([
              name,
              module,
            ]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  padding:
                    "13px 0",
                  borderBottom:
                    "1px solid #f1f5f9",
                }}
              >
                <strong
                  style={{
                    textTransform:
                      "capitalize",
                  }}
                >
                  {name}
                </strong>
                <span
                  style={{
                    color:
                      module.enabled
                        ? "#15803d"
                        : "#b91c1c",
                    fontWeight: 800,
                  }}
                >
                  {module.enabled
                    ? module.status ??
                      "ready"
                    : "disabled"}
                </span>
              </div>
            )
          )
        )}
      </div>
    </section>
    <CoreVerificationPanel />
    <section
      style={{
        display: "grid",
        gap: 10,
        marginTop: 18,
      }}
    >
      <RuntimeLink
        href="/planner"
        label={`🧭 ${t(
          "runtime.openPlanner"
        )}`}
        description={t(
          "runtime.openPlannerDescription"
        )}
      />
      <RuntimeLink
        href="/brain"
        label={`🧠 ${t(
          "runtime.openConsole"
        )}`}
        description={t(
          "runtime.openConsoleDescription"
        )}
      />
      <RuntimeLink
        href="/runtime/trace"
        label={`📍 ${t(
          "runtime.openTrace"
        )}`}
        description={t(
          "runtime.openTraceDescription"
        )}
      />
    </section>
  </main>
</WorkspaceShell>

);
}

function StatusCard({
label,
value,
note,
}: {
label: string;
value: string;
note: string;
}) {
return (
<div
style={{
minWidth: 0,
padding: 17,
borderRadius: 18,
border:
“1px solid #e5e7eb”,
background:
“#ffffff”,
}}
>
<p
style={{
margin: 0,
color: “#64748b”,
fontSize: 12,
fontWeight: 900,
}}
>
{label.toUpperCase()}
  <p
    style={{
      margin:
        "8px 0 0",
      fontSize: 25,
      fontWeight: 900,
      overflowWrap:
        "anywhere",
    }}
  >
    {value}
  </p>
  <p
    style={{
      margin:
        "6px 0 0",
      color: "#94a3b8",
      fontSize: 12,
      lineHeight: 1.45,
    }}
  >
    {note}
  </p>
</div>

);
}

function RuntimeLink({
href,
label,
description,
}: {
href: string;
label: string;
description: string;
}) {
return (
<Link
href={href}
style={{
display: “block”,
padding:
“16px 18px”,
borderRadius: 15,
border:
“1px solid #e5e7eb”,
background:
“#ffffff”,
color: “#111827”,
textDecoration:
“none”,
}}
>
{label}
  <p
    style={{
      margin:
        "5px 0 0",
      color: "#64748b",
      fontSize: 13,
      lineHeight: 1.5,
    }}
  >
    {description}
  </p>
</Link>

);
}
