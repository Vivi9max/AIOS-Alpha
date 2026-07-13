"use client";

import { createContext, useContext, useState } from "react";
import type { WorkspaceView } from "./types";

interface WorkspaceContextValue {
  view: WorkspaceView;
  setView: (view: WorkspaceView) => void;
}

const WorkspaceContext =
  createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [view, setView] =
    useState<WorkspaceView>("chat");

  return (
    <WorkspaceContext.Provider
      value={{
        view,
        setView,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "WorkspaceProvider is missing."
    );
  }

  return context;
}