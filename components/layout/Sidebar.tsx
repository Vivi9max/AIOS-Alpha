"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { projects } from "@/lib/project/store";

const menus = [
  {
    label: "💬 Chat",
    href: "/workspace",
  },
  {
    label: "🧠 Memory",
    href: "/memory",
  },
  {
    label: "✅ Tasks",
    href: "/tasks",
  },
  {
    label: "⚙️ Settings",
    href: "/settings",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 border-r bg-white flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">
          AIOS
        </h1>

        <p className="text-sm text-gray-500">
          Alpha v0.2
        </p>
      </div>

      <div className="px-4 pt-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          Projects
        </h3>

        {projects.map((project) => (
          <Link
            key={project.id}
            href="/workspace"
            className="block w-full text-left rounded-xl bg-black text-white px-4 py-3 mb-2"
          >
            {project.name}
          </Link>
        ))}
      </div>

      <nav className="flex-1 p-4">
        {menus.map((item) => {
          const active =
            pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block w-full text-left rounded-xl px-4 py-3 transition",
                active
                  ? "bg-gray-200 font-semibold"
                  : "hover:bg-gray-100",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}