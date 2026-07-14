export function storageGet<T>(
  key: string,
  fallback: T
): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(
  key: string,
  value: unknown
) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}

export function storageRemove(
  key: string
) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(key);
}