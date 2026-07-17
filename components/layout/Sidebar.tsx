"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  APP_NAME,
  APP_VERSION_LABEL,
} from "@/lib/config/app";

import {
  projects,
} from "@/lib/project/store";

const menus = [
  {
    label:
      "💬 Chat",

    href:
      "/workspace",
  },

  {
    label:
      "🧠 Memory",

    href:
      "/memory",
  },

  {
    label:
      "✅ Tasks",

    href:
      "/tasks",
  },

  {
    label:
      "📂 Projects",

    href:
      "/projects",
  },

  {
    label:
      "📊 Dashboard",

    href:
      "/dashboard",
  },

  {
    label:
      "⚙️ Settings",

    href:
      "/settings",
  },
];

export default function Sidebar() {
  const pathname =
    usePathname();

  return (
    <aside
      style={{
        width:
          250,

        minHeight:
          "100%",

        boxSizing:
          "border-box",

        display:
          "flex",

        flexDirection:
          "column",

        background:
          "#ffffff",

        borderRight:
          "1px solid #e5e7eb",

        color:
          "#111827",
      }}
    >
      <div
        style={{
          padding:
            "22px 18px",

          borderBottom:
            "1px solid #e5e7eb",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display:
              "inline-block",

            color:
              "#111827",

            textDecoration:
              "none",

            fontSize:
              25,

            fontWeight:
              800,
          }}
        >
          {APP_NAME}
        </Link>

        <p
          style={{
            margin:
              "5px 0 0",

            color:
              "#6b7280",

            fontSize:
              13,
          }}
        >
          {APP_VERSION_LABEL}
        </p>
      </div>

      <div
        style={{
          padding:
            "18px 14px 8px",
        }}
      >
        <p
          style={{
            margin:
              "0 4px 9px",

            color:
              "#9ca3af",

            fontSize:
              11,

            fontWeight:
              800,

            letterSpacing:
              "0.08em",

            textTransform:
              "uppercase",
          }}
        >
          Projects
        </p>

        {projects.map(
          (
            project
          ) => (
            <Link
              key={
                project.id
              }
              href="/dashboard"
              style={{
                display:
                  "block",

                padding:
                  "11px 12px",

                borderRadius:
                  10,

                background:
                  "#111827",

                color:
                  "#ffffff",

                textDecoration:
                  "none",

                fontSize:
                  14,

                fontWeight:
                  700,
              }}
            >
              {project.name}
            </Link>
          )
        )}
      </div>

      <nav
        style={{
          display:
            "grid",

          gap:
            5,

          padding:
            "10px 14px 18px",
        }}
      >
        {menus.map(
          (
            item
          ) => {
            const active =
              pathname ===
                item.href ||
              (
                item.href ===
                  "/workspace" &&
                pathname ===
                  "/"
              );

            return (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                style={{
                  display:
                    "block",

                  padding:
                    "11px 12px",

                  borderRadius:
                    10,

                  background:
                    active
                      ? "#eef2ff"
                      : "transparent",

                  color:
                    active
                      ? "#3730a3"
                      : "#374151",

                  textDecoration:
                    "none",

                  fontSize:
                    14,

                  fontWeight:
                    active
                      ? 800
                      : 600,
                }}
              >
                {item.label}
              </Link>
            );
          }
        )}
      </nav>

      <div
        style={{
          marginTop:
            "auto",

          padding:
            16,

          borderTop:
            "1px solid #e5e7eb",

          color:
            "#9ca3af",

          fontSize:
            12,
        }}
      >
        {APP_NAME} Runtime Online
      </div>
    </aside>
  );
}