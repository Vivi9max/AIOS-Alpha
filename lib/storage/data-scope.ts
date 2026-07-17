import {
  getRuntimeUserId,
} from "@/lib/runtime/request-context";

function sanitizeScope(
  value: string
): string {
  const cleanValue =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]/g,
        ""
      )
      .slice(0, 80);

  return (
    cleanValue ||
    "system"
  );
}

export function getUserStorageScope():
  string {
  return sanitizeScope(
    getRuntimeUserId()
  );
}

export function createUserStorageKey(
  resource: string
): string {
  const cleanResource =
    resource
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9:_-]/g,
        "-"
      );

  return [
    "aios",
    getUserStorageScope(),
    cleanResource,
  ].join(":");
}