export type ProjectStatus =
  | "running"
  | "planning"
  | "building"
  | "waiting";

export interface ProjectModule {
  id: string;
  name: string;
  description: string;
  href: string;
  status: "ready" | "active" | "planned";
}

export interface Project {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  status: ProjectStatus;
  statusLabel: string;
  primaryHref: string;
  createdAt: string;
  modules: ProjectModule[];
}