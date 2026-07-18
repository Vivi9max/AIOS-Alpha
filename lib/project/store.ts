import type {
  Project,
  ProjectStatus,
} from "./types";

export const projects: Project[] = [
  {
    id: "aios-alpha",
    name: "AIOS Alpha",
    shortName: "AIOS",
    icon: "🚀",
    description:
      "AIOS Alpha Runtime、Memory、Tasks、Planner 与工作空间。",
    status: "running",
    statusLabel: "Running",
    primaryHref: "/workspace",
    createdAt: "2026-07-08T00:00:00.000Z",
    modules: [
      {
        id: "workspace",
        name: "Workspace",
        description: "进入 AIOS 主工作空间",
        href: "/workspace",
        status: "active",
      },
      {
        id: "dashboard",
        name: "Dashboard",
        description: "查看 Runtime 与数据状态",
        href: "/dashboard",
        status: "ready",
      },
      {
        id: "memory",
        name: "Memory",
        description: "管理长期记忆与用户资料",
        href: "/memory",
        status: "ready",
      },
      {
        id: "tasks",
        name: "Tasks",
        description: "查看和推进执行任务",
        href: "/tasks",
        status: "ready",
      },
      {
        id: "settings",
        name: "Settings",
        description: "查看系统和 Provider 状态",
        href: "/settings",
        status: "ready",
      },
    ],
  },
  {
    id: "content-os",
    name: "Content OS",
    shortName: "A1",
    icon: "✍️",
    description:
      "内容研究、生产、发布和增长验证系统。",
    status: "planning",
    statusLabel: "Planning",
    primaryHref: "/workspace?project=content-os",
    createdAt: "2026-06-28T00:00:00.000Z",
    modules: [
      {
        id: "content-workspace",
        name: "A1 Workspace",
        description: "启动内容生产工作流",
        href: "/workspace?project=content-os",
        status: "planned",
      },
      {
        id: "content-tasks",
        name: "Content Tasks",
        description: "查看内容相关任务",
        href: "/tasks",
        status: "ready",
      },
    ],
  },
  {
    id: "brain-engine",
    name: "Brain Engine",
    shortName: "Brain",
    icon: "🧠",
    description:
      "目标理解、规划、能力调度和 Runtime 执行核心。",
    status: "building",
    statusLabel: "Building",
    primaryHref: "/brain",
    createdAt: "2026-07-01T00:00:00.000Z",
    modules: [
      {
        id: "brain",
        name: "Brain",
        description: "查看 AIOS Brain",
        href: "/brain",
        status: "active",
      },
      {
        id: "runtime-status",
        name: "Runtime Status",
        description: "查看 Runtime 服务状态",
        href: "/api/runtime/status",
        status: "ready",
      },
      {
        id: "runtime-trace",
        name: "Execution Trace",
        description: "查看最近一次能力调用记录",
        href: "/api/runtime/trace",
        status: "planned",
      },
    ],
  },
  {
    id: "film-studio",
    name: "Film Studio",
    shortName: "A2",
    icon: "🎬",
    description:
      "AI 原生短剧、镜头、素材和生产队列。",
    status: "waiting",
    statusLabel: "Waiting",
    primaryHref: "/workspace?project=film-studio",
    createdAt: "2026-07-02T00:00:00.000Z",
    modules: [
      {
        id: "film-workspace",
        name: "A2 Workspace",
        description: "启动 AI Film Studio",
        href: "/workspace?project=film-studio",
        status: "planned",
      },
    ],
  },
];

export function getProjectById(
  projectId: string
): Project | undefined {
  return projects.find(
    (project) =>
      project.id === projectId
  );
}

export function getProjectStatusColor(
  status: ProjectStatus
): {
  background: string;
  color: string;
} {
  switch (status) {
    case "running":
      return {
        background: "#dcfce7",
        color: "#15803d",
      };

    case "planning":
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };

    case "building":
      return {
        background: "#fef3c7",
        color: "#b45309",
      };

    case "waiting":
      return {
        background: "#f3f4f6",
        color: "#6b7280",
      };
  }
}