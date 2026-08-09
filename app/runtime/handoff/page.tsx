"use client";

import { useEffect, useState } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface HandoffData {
  release: string;
  updatedAt: string;
  mission: string;
  capabilities: string[];
  commands: Record<string, string>;
  continuity: {
    readFirst: string[];
    rules: string[];
    nextPriority: string;
  };
}

export default function HandoffPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<HandoffData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/runtime/handoff", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("handoff unavailable");
        return response.json();
      })
      .then((result) => {
        if (active) setData(result.handoff as HandoffData);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <WorkspaceShell>
      <main style={{ width: "100%", maxWidth: 900, margin: "0 auto", color: "#111827" }}>
        <header style={{ marginBottom: 22 }}>
          <p style={{ margin: 0, color: "#4f46e5", fontSize: 13, fontWeight: 900 }}>
            {t("handoff.eyebrow")}
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 36, lineHeight: 1.15 }}>
            {t("handoff.title")}
          </h1>
          <p style={{ margin: "12px 0 0", color: "#64748b", lineHeight: 1.65 }}>
            {t("handoff.description")}
          </p>
        </header>

        {failed ? (
          <section style={{ padding: 18, borderRadius: 16, background: "#fef2f2", color: "#991b1b" }}>
            {t("handoff.error")}
          </section>
        ) : !data ? (
          <section style={{ padding: 18, borderRadius: 16, background: "#f8fafc" }}>
            {t("handoff.loading")}
          </section>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <section style={{ padding: 22, borderRadius: 22, background: "#111827", color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, color: "#a5b4fc", fontSize: 12, fontWeight: 900 }}>
                    {t("handoff.checkpoint")}
                  </p>
                  <h2 style={{ margin: "8px 0 0", fontSize: 34 }}>{data.release}</h2>
                </div>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: 13 }}>{data.updatedAt}</p>
              </div>
              <p style={{ margin: "18px 0 0", color: "#e2e8f0", lineHeight: 1.7 }}>{data.mission}</p>
            </section>

            <section style={{ padding: 20, border: "1px solid #e2e8f0", borderRadius: 20, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{t("handoff.next")}</h2>
              <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.65 }}>{data.continuity.nextPriority}</p>
            </section>

            <section style={{ padding: 20, border: "1px solid #e2e8f0", borderRadius: 20, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{t("handoff.readFirst")}</h2>
              <ol style={{ margin: "12px 0 0", paddingLeft: 22, color: "#334155", lineHeight: 1.9 }}>
                {data.continuity.readFirst.map((path) => <li key={path}><code>{path}</code></li>)}
              </ol>
            </section>

            <section style={{ padding: 20, border: "1px solid #e2e8f0", borderRadius: 20, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{t("handoff.verify")}</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {Object.entries(data.commands).map(([name, command]) => (
                  <div key={name} style={{ padding: 12, borderRadius: 12, background: "#f8fafc" }}>
                    <strong style={{ display: "block", color: "#64748b", fontSize: 12 }}>{name}</strong>
                    <code style={{ display: "block", marginTop: 5, overflowWrap: "anywhere" }}>{command}</code>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: 20, border: "1px solid #e2e8f0", borderRadius: 20, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{t("handoff.capabilities")}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {data.capabilities.map((item) => (
                  <span key={item} style={{ padding: "7px 10px", borderRadius: 999, background: "#eef2ff", color: "#3730a3", fontSize: 12, fontWeight: 800 }}>
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </WorkspaceShell>
  );
}

