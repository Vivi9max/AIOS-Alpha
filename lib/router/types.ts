import type {
  MemoryProfile,
} from "@/lib/memory";

export type WorkspaceAction =
  | {
      type: "task.create";
      title: string;
      description?: string;
    }
  | {
      type: "task.list";
    }
  | {
      type: "profile.update";
      updates: Partial<MemoryProfile>;
    }
  | {
      type: "none";
    };

export interface ActionExecutionResult {
  handled: boolean;
  content?: string;
}