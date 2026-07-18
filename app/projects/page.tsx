import Link from "next/link";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

import {
  getProjectStatusColor,
  projects,
} from "@/lib/project/store";

export default function ProjectsPage() {
  return (
    <WorkspaceShell>
      <div
        style={{
          width: "100%",
          maxWidth: 820,
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
            AIOS Project Center
          </p>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 38,
              lineHeight: 1.1,
            }}
          >
            📂 Projects
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            选择项目，进入对应工作空间和系统模块。
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          {projects.map((project) => {
            const statusColor =
              getProjectStatusColor(
                project.status
              );

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                style={{
                  display: "block",
                  padding: 20,
                  borderRadius: 18,
                  border:
                    "1px solid #e5e7eb",
                  background: "#ffffff",
                  color: "#111827",
                  textDecoration: "none",
                  boxShadow:
                    "0 8px 24px rgba(15, 23, 42, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent:
                      "space-between",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 15,
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "center",
                        background: "#f3f4f6",
                        fontSize: 25,
                        flexShrink: 0,
                      }}
                    >
                      {project.icon}
                    </div>

                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 22,
                        }}
                      >
                        {project.name}
                      </h2>

                      <p
                        style={{
                          margin:
                            "7px 0 0",
                          color: "#6b7280",
                          lineHeight: 1.55,
                          fontSize: 14,
                        }}
                      >
                        {project.description}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      flexShrink: 0,
                      padding: "7px 11px",
                      borderRadius: 999,
                      background:
                        statusColor.background,
                      color:
                        statusColor.color,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {project.statusLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    marginTop: 18,
                    paddingTop: 15,
                    borderTop:
                      "1px solid #f3f4f6",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <span>
                    {project.modules.length} 个模块
                  </span>

                  <span>
                    打开项目 →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </WorkspaceShell>
  );
}