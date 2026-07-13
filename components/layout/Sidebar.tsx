"use client";

import { projects } from "@/lib/project/store";

const menus = [
  "💬 Chat",
  "🧠 Memory",
  "✅ Tasks",
  "⚙️ Settings",
];

export default function Sidebar() {
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
          <button
            key={project.id}
            className="w-full text-left rounded-xl bg-black text-white px-4 py-3 mb-2"
          >
            {project.name}
          </button>
        ))}

      </div>

      <nav className="flex-1 p-4">

        {menus.map((item) => (
          <button
            key={item}
            className="w-full text-left rounded-xl px-4 py-3 hover:bg-gray-100 transition"
          >
            {item}
          </button>
        ))}

      </nav>

    </aside>
  );
}