import type {
  MemoryProfile,
} from "@/lib/memory/index";

export type WorkspaceAction =
  | {
      type: "task.create";
      title: string;
      description?: string;
    }
  | {
      type: "task.list";
      filter?: "all" | "active" | "completed";
    }
  | {
      type: "task.complete";
      query: string;
    }
  | {
      type: "task.reopen";
      query: string;
    }
  | {
      type: "task.delete";
      query: string;
    }
  | {
      type: "profile.update";
      updates: Partial<MemoryProfile>;
    }
  | {
      type: "profile.read";
      field?: keyof MemoryProfile;
    }
  | {
      type: "none";
    };

export interface ActionExecutionResult {
  handled: boolean;
  content?: string;
}