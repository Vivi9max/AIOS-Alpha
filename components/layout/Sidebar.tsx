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
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n";

const menus = [
  {
    icon: "💬", label: "nav.chat" as MessageKey,

    href:
      "/workspace",
  },

  {
    icon: "🗃️", label: "nav.memory" as MessageKey,

    href:
      "/memory",
  },

  {
    icon: "✅", label: "nav.tasks" as MessageKey,

    href:
      "/tasks",
  },

  {
    icon: "📂", label: "nav.projects" as MessageKey,

    href:
      "/projects",
  },

  {
    icon: "📊", label: "nav.dashboard" as MessageKey,

    href:
      "/dashboard",
  },

  {
    icon: "⚙️", label: "nav.settings" as MessageKey,

    href:
      "/settings",
  },
];

function isProjectActive(
  pathname:
    string,

  projectId:
    string
): boolean {
  return (
    pathname ===
      `/projects/${projectId}` ||
    pathname.startsWith(
      `/projects/${projectId}/`
    )
  );
}

export default function Sidebar() {
  const { t } = useLanguage();
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
          prefetch={
            false
          }
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
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            margin:
              "0 4px 10px",
          }}
        >
          <p
            style={{
              margin:
                0,

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
            {t("nav.projects")}
          </p>

          <Link
            href="/projects"
            prefetch={
              false
            }
            style={{
              color:
                "#64748b",

              fontSize:
                11,

              fontWeight:
                800,

              textDecoration:
                "none",
            }}
          >
            {t("nav.allProjects")}
          </Link>
        </div>

        <div
          style={{
            display:
              "grid",

            gap:
              7,
          }}
        >
          {projects.map(
            (
              project
            ) => {
              const active =
                isProjectActive(
                  pathname,
                  project.id
                );

              return (
                <Link
                  key={
                    project.id
                  }
                  href={`/projects/${project.id}`}
                  prefetch={
                    false
                  }
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap:
                      8,

                    padding:
                      "11px 12px",

                    borderRadius:
                      11,

                    background:
                      active
                        ? "#312e81"
                        : "#111827",

                    color:
                      "#ffffff",

                    textDecoration:
                      "none",

                    fontSize:
                      14,

                    fontWeight:
                      700,

                    boxShadow:
                      active
                        ? "0 7px 18px rgba(49, 46, 129, 0.24)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap:
                        8,

                      minWidth:
                        0,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize:
                          15,

                        flexShrink:
                          0,
                      }}
                    >
                      {project.icon}
                    </span>

                    <span
                      style={{
                        overflow:
                          "hidden",

                        textOverflow:
                          "ellipsis",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {project.name}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      opacity:
                        active
                          ? 1
                          : 0.55,

                      fontSize:
                        12,

                      flexShrink:
                        0,
                    }}
                  >
                    →
                  </span>
                </Link>
              );
            }
          )}
        </div>
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
              pathname.startsWith(
                `${item.href}/`
              ) ||
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
                prefetch={
                  false
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
                {item.icon} {t(item.label)}
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
        {APP_NAME} · {t("runtime.online")}
      </div>
    </aside>
  );
}
