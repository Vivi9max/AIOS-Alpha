"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Chat Workspace",
  "/workspace": "Chat Workspace",
  "/dashboard": "Dashboard",
  "/memory": "Memory",
  "/tasks": "Tasks",
  "/settings": "Settings",
};

export default function Header() {
  const pathname = usePathname();

  const pageTitle =
    pageTitles[pathname] ??
    "AIOS Workspace";

  return (
    <header
      style={{
        minHeight: 68,
        background: "#111827",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 20px",
        borderBottom: "1px solid #1f2937",
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
                background: "#22c55e",
              }}
            />

            Online
          </span>

          <span>·</span>

          <span>Provider: Mock</span>

          <span>·</span>

          <span>AIOS Alpha v0.2</span>
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
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 17,
          border: "1px solid #4b5563",
        }}
      >
        V
      </div>
    </header>
  );
}