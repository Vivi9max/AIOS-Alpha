"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { projectCopy, type MessageKey } from "@/lib/i18n";
import { getProjectStatusColor } from "@/lib/project/store";
import type { Project } from "@/lib/project/types";

export default function ProjectDetail({ project }: { project: Project }) {
  const { locale, t } = useLanguage();
  const copy = projectCopy(locale, project);
  const statusColor = getProjectStatusColor(project.status);

  return (
    <div style={{ width: "100%", maxWidth: 820, margin: "0 auto", color: "#111827" }}>
      <Link href="/projects" style={{ display: "inline-block", marginBottom: 20, color: "#475569", textDecoration: "none", fontWeight: 700 }}>← {t("projects.back")}</Link>
      <section style={{ padding: 22, borderRadius: 20, background: "#111827", color: "#ffffff", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 34, marginBottom: 12 }}>{project.icon}</div>
            <h1 style={{ margin: 0, fontSize: 34 }}>{copy.name}</h1>
            <p style={{ margin: "12px 0 0", color: "#cbd5e1", lineHeight: 1.6 }}>{copy.description}</p>
          </div>
          <span style={{ padding: "8px 12px", borderRadius: 999, background: statusColor.background, color: statusColor.color, fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{t(`projects.status.${project.status}` as MessageKey)}</span>
        </div>
        <Link href={project.primaryHref} style={{ display: "inline-flex", marginTop: 22, padding: "12px 16px", borderRadius: 12, background: "#ffffff", color: "#111827", textDecoration: "none", fontWeight: 800 }}>{t("projects.enterWorkspace")} →</Link>
      </section>

      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 21 }}>{t("projects.projectModules")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {project.modules.map((module, index) => (
            <Link key={module.id} href={module.href} style={{ display: "block", padding: 17, borderRadius: 16, border: "1px solid #e5e7eb", background: "#ffffff", color: "#111827", textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{copy.modules[index]?.name ?? module.name}</strong>
                <span style={{ color: module.status === "active" ? "#16a34a" : module.status === "ready" ? "#2563eb" : "#9ca3af", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{t(`projects.moduleStatus.${module.status}` as MessageKey)}</span>
              </div>
              <p style={{ margin: "9px 0 0", color: "#6b7280", lineHeight: 1.5, fontSize: 13 }}>{copy.modules[index]?.description ?? module.description}</p>
              <div style={{ marginTop: 15, fontSize: 13, fontWeight: 800, color: "#475569" }}>{t("projects.openModule")} →</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
