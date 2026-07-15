export interface StorageAdapter {
  mode: "redis" | "memory";

  get<T>(
    key: string
  ): Promise<T | null>;

  set<T>(
    key: string,
    value: T
  ): Promise<void>;

  delete(
    key: string
  ): Promise<void>;

  health(): Promise<{
    success: boolean;
    mode: "redis" | "memory";
    error?: string;
  }>;
}