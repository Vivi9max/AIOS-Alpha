"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

interface RuntimeStatus {
  status: "online" | "offline";
  provider: string;
  version: string;
}

const pageTitles: Record<string, string> = {
  "/": "Chat Workspace",
  "/workspace": "Chat Workspace",
  "/dashboard": "Dashboard",
  "/memory": "Memory",
  "/tasks": "Tasks",
  "/settings": "Settings",
};

const initialStatus: RuntimeStatus = {
  status: "offline",
  provider: "unknown",
  version: "0.2",
};

export default function Header() {
  const pathname = usePathname();

  const [runtime, setRuntime] =
    useState<RuntimeStatus>(
      initialStatus
    );

  const pageTitle =
    pageTitles[pathname] ??
    "AIOS Workspace";

  useEffect(() => {
    let active = true;

    async function loadRuntimeStatus() {
      try {
        const response = await fetch(
          "/api/runtime/status",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Runtime unavailable."
          );
        }

        const data =
          await response.json();

        if (!active) {
          return;
        }

        setRuntime({
          status:
            data.status === "online"
              ? "online"
              : "offline",
          provider:
            typeof data.provider ===
            "string"
              ? data.provider
              : "unknown",
          version:
            typeof data.version ===
            "string"
              ? data.version
              : "0.2",
        });
      } catch {
        if (active) {
          setRuntime(
            initialStatus
          );
        }
      }
    }

    loadRuntimeStatus();

    const interval =
      window.setInterval(
        loadRuntimeStatus,
        30000
      );

    return () => {
      active = false;

      window.clearInterval(
        interval
      );
    };
  }, []);

  const isOnline =
    runtime.status === "online";

  return (
    <header
      style={{
        minHeight: 68,
        background: "#111827",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        gap: 16,
        padding: "12px 20px",
        borderBottom:
          "1px solid #1f2937",
      }}
    >
      <div
        style={{
          minWidth: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          {pageTitle}
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginTop: 6,
            color: "#cbd5e1",
            fontSize: 12,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: isOnline
                  ? "#22c55e"
                  : "#ef4444",
              }}
            />

            {isOnline
              ? "Online"
              : "Offline"}
          </span>

          <span>·</span>

          <span
            style={{
              textTransform:
                "capitalize",
            }}
          >
            Provider:{" "}
            {runtime.provider}
          </span>

          <span>·</span>

          <span>
            AIOS Alpha v
            {runtime.version}
          </span>
        </div>
      </div>

      <div
        title="Vivi"
        style={{
          flexShrink: 0,
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "#374151",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          fontWeight: 700,
          fontSize: 17,
          border:
            "1px solid #4b5563",
        }}
      >
        V
      </div>
    </header>
  );
}