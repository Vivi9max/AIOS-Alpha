export const MODULE_ICONS = {
  ai:
    "✨",

  brain:
    "🧠",

  memory:
    "🗃️",

  tasks:
    "✅",

  projects:
    "📂",

  dashboard:
    "📊",

  runtime:
    "⚡",

  planner:
    "🎯",

  feedback:
    "💬",

  settings:
    "⚙️",

  chat:
    "💬",

  storage:
    "🗄️",

  deploy:
    "🚀",

  founder:
    "🔐",
} as const;

export type ModuleIconName =
  keyof typeof MODULE_ICONS;

export function getModuleIcon(
  name:
    ModuleIconName
): string {
  return MODULE_ICONS[
    name
  ];
}