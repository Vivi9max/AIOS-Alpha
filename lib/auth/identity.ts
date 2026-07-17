import type {
  NextRequest,
} from "next/server";

export const AIOS_USER_COOKIE =
  "aios_alpha_user";

export interface AlphaIdentity {
  userId: string;
  isNew: boolean;
}

function sanitizeUserId(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9_-]/g,
      ""
    )
    .slice(0, 80);
}

function createUserId(): string {
  return [
    "alpha",
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2, 12),
  ].join("_");
}

export function resolveAlphaIdentity(
  request: NextRequest
): AlphaIdentity {
  const cookieValue =
    request.cookies.get(
      AIOS_USER_COOKIE
    )?.value;

  const headerValue =
    request.headers.get(
      "x-aios-user-id"
    );

  const existing =
    sanitizeUserId(
      cookieValue ??
        headerValue ??
        ""
    );

  if (existing) {
    return {
      userId: existing,
      isNew: false,
    };
  }

  return {
    userId:
      createUserId(),
    isNew: true,
  };
}