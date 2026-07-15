"use client";

import Link from "next/link";

export default function DashboardPage() {
  const cards = [
    {
      title: "💬 Chat",
      desc: "与 AI 对话",
      href: "/workspace",
    },
    {
      title: "🧠 Memory",
      desc: "长期记忆",
      href: "/memory",
    },
    {
      title: "✅ Tasks",
      desc: "任务管理",
      href: "/tasks",
    },
    {
      title: "⚙️ Settings",
      desc: "系统设置",
      href: "/settings",
    },
  ];

  return (
    <main
      style={{
        padding: 32,
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: 40,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        AIOS Dashboard
      </h1>

      <p
        style={{
          color: "#666",
          marginBottom: 30,
        }}
      >
        Alpha Runtime
      </p>

      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns:
            "repeat(auto-fill,minmax(220px,1fr))",
        }}
      >
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 16,
                padding: 24,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <h2>{card.title}</h2>

              <p>{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}