import Link from "next/link";

const menus = [
  {
    href: "/workspace",
    label: "💬 Chat",
  },
  {
    href: "/brain",
    label: "🧠 Brain",
  },
  {
    href: "/projects",
    label: "📂 Projects",
  },
  {
    href: "/memory",
    label: "💾 Memory",
  },
  {
    href: "/settings",
    label: "⚙️ Settings",
  },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 240,
        background: "#0f172a",
        color: "white",
        padding: 24,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2
        style={{
          marginBottom: 32,
          fontSize: 22,
        }}
      >
        Workspace
      </h2>

      {menus.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            display: "block",
            color: "white",
            textDecoration: "none",
            marginBottom: 20,
            fontSize: 18,
            padding: "10px 12px",
            borderRadius: 10,
            background: "transparent",
          }}
        >
          {item.label}
        </Link>
      ))}

      <div
        style={{
          marginTop: "auto",
          fontSize: 12,
          color: "#94a3b8",
          borderTop: "1px solid #334155",
          paddingTop: 20,
        }}
      >
        AIOS Alpha v0.1
      </div>
    </aside>
  );
}