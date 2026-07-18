import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

import {
  getProjectById,
  getProjectStatusColor,
  projects,
} from "@/lib/project/store";

export function generateStaticParams() {
  return projects.map(
    (project) => ({
      id: project.id,
    })
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } =
    await params;

  const project =
    getProjectById(id);

  if (!project) {
    notFound();
  }

  const statusColor =
    getProjectStatusColor(
      project.status
    );

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
        <Link
          href="/projects"
          style={{
            display: "inline-block",
            marginBottom: 20,
            color: "#475569",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← 返回 Projects
        </Link>

        <section
          style={{
            padding: 22,
            borderRadius: 20,
            background: "#111827",
            color: "#ffffff",
            marginBottom: 20,
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
            <div>
              <div
                style={{
                  fontSize: 34,
                  marginBottom: 12,
                }}
              >
                {project.icon}
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 34,
                }}
              >
                {project.name}
              </h1>

              <p
                style={{
                  margin: "12px 0 0",
                  color: "#cbd5e1",
                  lineHeight: 1.6,
                }}
              >
                {project.description}
              </p>
            </div>

            <span
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background:
                  statusColor.background,
                color:
                  statusColor.color,
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {project.statusLabel}
            </span>
          </div>

          <Link
            href={project.primaryHref}
            style={{
              display: "inline-flex",
              marginTop: 22,
              padding: "12px 16px",
              borderRadius: 12,
              background: "#ffffff",
              color: "#111827",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            进入工作空间 →
          </Link>
        </section>

        <section>
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: 22,
            }}
          >
            Project Modules
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {project.modules.map(
              (module) => (
                <Link
                  key={module.id}
                  href={module.href}
                  style={{
                    display: "block",
                    padding: 18,
                    borderRadius: 16,
                    border:
                      "1px solid #e5e7eb",
                    background: "#ffffff",
                    color: "#111827",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 10,
                    }}
                  >
                    <strong>
                      {module.name}
                    </strong>

                    <span
                      style={{
                        color:
                          module.status ===
                          "active"
                            ? "#16a34a"
                            : module.status ===
                                "ready"
                              ? "#2563eb"
                              : "#9ca3af",
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      {module.status}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "9px 0 0",
                      color: "#6b7280",
                      lineHeight: 1.5,
                      fontSize: 13,
                    }}
                  >
                    {module.description}
                  </p>

                  <div
                    style={{
                      marginTop: 15,
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    打开 →
                  </div>
                </Link>
              )
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}