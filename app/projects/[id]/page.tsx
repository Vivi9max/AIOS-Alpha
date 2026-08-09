import { notFound } from "next/navigation";
import WorkspaceShell from "@/components/layout/WorkspaceShell";
import ProjectDetail from "@/components/projects/ProjectDetail";
import { getProjectById, projects } from "@/lib/project/store";

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) notFound();
  return <WorkspaceShell><ProjectDetail project={project} /></WorkspaceShell>;
}
