import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";

import type {
  NextRequest,
  NextResponse,
} from "next/server";

const CONNECTION_COOKIE =
  "aios_github_connection";

const STATE_COOKIE =
  "aios_github_oauth_state";

const GITHUB_API =
  "https://api.github.com";

const GITHUB_API_VERSION =
  "2022-11-28";

const OAUTH_STATE_MAX_AGE =
  10 * 60;

const DEFAULT_ACCESS_TOKEN_TTL =
  8 * 60 * 60;

export interface UserGitHubConnection {
  userId: string;
  githubUserId: number;
  login: string;
  accessToken: string;
  refreshToken?: string;
  accessExpiresAt: number;
  refreshExpiresAt?: number;
  installationIds: number[];
}

interface OAuthState {
  state: string;
  userId: string;
  codeVerifier: string;
}

interface GitHubAppConfig {
  clientId: string;
  clientSecret: string;
  appId: string;
  appSlug: string;
  sessionSecret: string;
}

interface GitHubTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

function getConfig():
  | GitHubAppConfig
  | null {
  const clientId =
    process.env.GITHUB_APP_CLIENT_ID?.trim();

  const clientSecret =
    process.env.GITHUB_APP_CLIENT_SECRET?.trim();

  const appId =
    process.env.GITHUB_APP_ID?.trim();

  const appSlug =
    process.env.GITHUB_APP_SLUG?.trim();

  const sessionSecret =
    process.env.AIOS_GITHUB_SESSION_SECRET?.trim();

  if (
    !clientId ||
    !clientSecret ||
    !appId ||
    !appSlug ||
    !sessionSecret
  ) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    appId,
    appSlug,
    sessionSecret,
  };
}

function getEncryptionKey(
  secret: string,
): Buffer {
  return createHash("sha256")
    .update(secret)
    .digest();
}

function seal(
  value: unknown,
  secret: string,
): string {
  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      getEncryptionKey(secret),
      iv,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        JSON.stringify(value),
        "utf8",
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return Buffer.concat([
    iv,
    authTag,
    encrypted,
  ]).toString("base64url");
}

function unseal<T>(
  value: string,
  secret: string,
): T | null {
  try {
    const raw =
      Buffer.from(
        value,
        "base64url",
      );

    if (
      raw.length < 28
    ) {
      return null;
    }

    const iv =
      raw.subarray(
        0,
        12,
      );

    const authTag =
      raw.subarray(
        12,
        28,
      );

    const encrypted =
      raw.subarray(28);

    const decipher =
      createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(secret),
        iv,
      );

    decipher.setAuthTag(
      authTag,
    );

    const plaintext =
      Buffer.concat([
        decipher.update(
          encrypted,
        ),
        decipher.final(),
      ]).toString("utf8");

    return JSON.parse(
      plaintext,
    ) as T;
  } catch {
    return null;
  }
}

function cookieOptions(
  maxAge: number,
) {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite:
      "lax" as const,
    path: "/",
    maxAge,
  };
}

function githubHeaders(
  token?: string,
): HeadersInit {
  return {
    Accept:
      "application/vnd.github+json",

    "X-GitHub-Api-Version":
      GITHUB_API_VERSION,

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),
  };
}

async function githubFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<{
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
}> {
  const response =
    await fetch(
      `${GITHUB_API}${path}`,
      {
        ...init,
        cache: "no-store",
        headers: {
          ...githubHeaders(token),
          ...(init.headers || {}),
        },
      },
    );

  const text =
    await response.text();

  let data:
    | unknown
    | undefined;

  if (text) {
    try {
      data =
        JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (
        data as {
          message?: unknown;
        }
      ).message === "string"
        ? (
            data as {
              message: string;
            }
          ).message
        : `GitHub request failed with ${response.status}.`;

    return {
      ok: false,
      status:
        response.status,
      message,
    };
  }

  return {
    ok: true,
    status:
      response.status,
    data:
      data as T,
  };
}

function getCallbackUrl(
  request: NextRequest,
): string {
  const configured =
    process.env.GITHUB_APP_CALLBACK_URL?.trim();

  if (configured) {
    return configured;
  }

  return new URL(
    "/api/integrations/github/callback",
    request.url,
  ).toString();
}

function createCodeVerifier(): string {
  return randomBytes(32)
    .toString("base64url");
}

function createCodeChallenge(
  codeVerifier: string,
): string {
  return createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
}

export function isUserGitHubConfigured():
  boolean {
  return (
    getConfig() !== null
  );
}

export interface GitHubConnectStart {
  authorizationUrl: string;
  stateCookieValue: string;
}

export function beginUserGitHubConnect(
  request: NextRequest,
  userId: string,
): GitHubConnectStart {
  const config =
    getConfig();

  if (!config) {
    throw new Error(
      "GitHub App is not configured.",
    );
  }

  const state =
    randomUUID();

  const codeVerifier =
    createCodeVerifier();

  const statePayload:
    OAuthState = {
    state,
    userId,
    codeVerifier,
  };

  const stateCookieValue =
    seal(
      statePayload,
      config.sessionSecret,
    );

  const callbackUrl =
    getCallbackUrl(
      request,
    );

  const url =
    new URL(
      "https://github.com/login/oauth/authorize",
    );

  url.searchParams.set(
    "client_id",
    config.clientId,
  );

  url.searchParams.set(
    "redirect_uri",
    callbackUrl,
  );

  url.searchParams.set(
    "state",
    state,
  );

  url.searchParams.set(
    "code_challenge",
    createCodeChallenge(
      codeVerifier,
    ),
  );

  url.searchParams.set(
    "code_challenge_method",
    "S256",
  );

  return {
    authorizationUrl:
      url.toString(),
    stateCookieValue,
  };
}

export function setGitHubOAuthStateCookie(
  response: NextResponse,
  stateCookieValue: string,
): void {
  response.cookies.set(
    STATE_COOKIE,
    stateCookieValue,
    cookieOptions(
      OAUTH_STATE_MAX_AGE,
    ),
  );
}

export function readUserGitHubConnection(
  request: NextRequest,
):
  | UserGitHubConnection
  | null {
  const config =
    getConfig();

  if (!config) {
    return null;
  }

  const value =
    request.cookies.get(
      CONNECTION_COOKIE,
    )?.value;

  if (!value) {
    return null;
  }

  const connection =
    unseal<UserGitHubConnection>(
      value,
      config.sessionSecret,
    );

  if (
    !connection ||
    connection.userId !==
      "founder:aios-alpha" ||
    !connection.githubUserId ||
    !connection.login ||
    !connection.accessToken
  ) {
    return null;
  }

  if (
    !Array.isArray(
      connection.installationIds,
    )
  ) {
    return null;
  }

  return connection;
}

export function persistUserGitHubConnection(
  response: NextResponse,
  connection: UserGitHubConnection,
): void {
  const config =
    getConfig();

  if (!config) {
    return;
  }

  const maxAge =
    connection.refreshExpiresAt
      ? Math.max(
          60,
          Math.floor(
            (
              connection.refreshExpiresAt -
              Date.now()
            ) / 1000,
          ),
        )
      : 60 * 60 * 24 * 30;

  response.cookies.set(
    CONNECTION_COOKIE,
    seal(
      connection,
      config.sessionSecret,
    ),
    cookieOptions(maxAge),
  );
}

export function clearUserGitHubConnection(
  response: NextResponse,
): void {
  response.cookies.set(
    CONNECTION_COOKIE,
    "",
    cookieOptions(0),
  );

  response.cookies.set(
    STATE_COOKIE,
    "",
    cookieOptions(0),
  );
}

export async function completeUserGitHubConnect(
  request: NextRequest,
  response: NextResponse,
  code: string,
  state: string,
  expectedUserId?: string,
):
  Promise<
    | {
        success: true;
        connection: UserGitHubConnection;
      }
    | {
        success: false;
        error: string;
      }
  > {
  const config =
    getConfig();

  if (!config) {
    return {
      success: false,
      error:
        "GitHub App is not configured.",
    };
  }

  const stateCookie =
    request.cookies.get(
      STATE_COOKIE,
    )?.value;

  if (!stateCookie) {
    return {
      success: false,
      error:
        "GitHub OAuth state cookie is missing.",
    };
  }

  const statePayload =
    unseal<OAuthState>(
      stateCookie,
      config.sessionSecret,
    );

  if (
    !statePayload
  ) {
    return {
      success: false,
      error:
        "GitHub OAuth state cookie could not be decrypted.",
    };
  }

  if (
    statePayload.state !== state
  ) {
    return {
      success: false,
      error:
        "GitHub OAuth state does not match.",
    };
  }

  if (
    !statePayload.codeVerifier
  ) {
    return {
      success: false,
      error:
        "GitHub OAuth PKCE verifier is missing.",
    };
  }

  if (
    expectedUserId &&
    statePayload.userId !==
      expectedUserId
  ) {
    return {
      success: false,
      error:
        "GitHub authorization user context is invalid.",
    };
  }

  const callbackUrl =
    getCallbackUrl(
      request,
    );

  const body =
    new URLSearchParams({
      client_id:
        config.clientId,
      client_secret:
        config.clientSecret,
      code,
      redirect_uri:
        callbackUrl,
      code_verifier:
        statePayload.codeVerifier,
    });

  const tokenResult =
    await githubFetch<GitHubTokenResponse>(
      "/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          body.toString(),
      },
    );

  if (
    !tokenResult.ok ||
    !tokenResult.data?.access_token
  ) {
    return {
      success: false,
      error:
        tokenResult.message ||
        "GitHub authorization failed.",
    };
  }

  const accessToken =
    tokenResult.data.access_token;

  const userResult =
    await githubFetch<{
      id: number;
      login: string;
    }>(
      "/user",
      {},
      accessToken,
    );

  if (
    !userResult.ok ||
    !userResult.data
  ) {
    return {
      success: false,
      error:
        userResult.message ||
        "GitHub user verification failed.",
    };
  }

  const installationsResult =
    await githubFetch<{
      installations?: Array<{
        id: number;
        app_id: number;
      }>;
    }>(
      "/user/installations?per_page=100",
      {},
      accessToken,
    );

  if (
    !installationsResult.ok
  ) {
    return {
      success: false,
      error:
        installationsResult.message ||
        "GitHub App installation verification failed.",
    };
  }

  const installationIds =
    (
      installationsResult.data
        ?.installations ||
      []
    )
      .filter(
        (installation) =>
          String(
            installation.app_id,
          ) ===
          String(config.appId),
      )
      .map(
        (installation) =>
          installation.id,
      );

  const connection:
    UserGitHubConnection = {
    userId:
      statePayload.userId,

    githubUserId:
      userResult.data.id,

    login:
      userResult.data.login,

    accessToken,

    refreshToken:
      tokenResult.data.refresh_token,

    accessExpiresAt:
      Date.now() +
      (
        tokenResult.data
          .expires_in ||
        DEFAULT_ACCESS_TOKEN_TTL
      ) *
        1000,

    refreshExpiresAt:
      tokenResult.data
        .refresh_token_expires_in
        ? Date.now() +
          tokenResult.data
            .refresh_token_expires_in *
          1000
        : undefined,

    installationIds,
  };

  persistUserGitHubConnection(
    response,
    connection,
  );

  response.cookies.set(
    STATE_COOKIE,
    "",
    cookieOptions(0),
  );

  return {
    success: true,
    connection,
  };
}

export async function refreshUserGitHubConnection(
  connection: UserGitHubConnection,
):
  Promise<
    UserGitHubConnection | null
  > {
  const config =
    getConfig();

  if (
    !config ||
    !connection.refreshToken
  ) {
    return null;
  }

  if (
    connection.refreshExpiresAt &&
    connection.refreshExpiresAt <=
      Date.now()
  ) {
    return null;
  }

  const body =
    new URLSearchParams({
      client_id:
        config.clientId,
      client_secret:
        config.clientSecret,
      grant_type:
        "refresh_token",
      refresh_token:
        connection.refreshToken,
    });

  const result =
    await githubFetch<GitHubTokenResponse>(
      "/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          body.toString(),
      },
    );

  if (
    !result.ok ||
    !result.data?.access_token
  ) {
    return null;
  }

  return {
    ...connection,

    accessToken:
      result.data.access_token,

    refreshToken:
      result.data.refresh_token ||
      connection.refreshToken,

    accessExpiresAt:
      Date.now() +
      (
        result.data
          .expires_in ||
        DEFAULT_ACCESS_TOKEN_TTL
      ) *
        1000,

    refreshExpiresAt:
      result.data
        .refresh_token_expires_in
        ? Date.now() +
          result.data
            .refresh_token_expires_in *
          1000
        : connection.refreshExpiresAt,
  };
}

export async function ensureUserGitHubConnection(
  request: NextRequest,
  response: NextResponse,
):
  Promise<
    UserGitHubConnection | null
  > {
  const connection =
    readUserGitHubConnection(
      request,
    );

  if (!connection) {
    return null;
  }

  if (
    connection.accessExpiresAt >
    Date.now() + 60_000
  ) {
    return connection;
  }

  const refreshed =
    await refreshUserGitHubConnection(
      connection,
    );

  if (!refreshed) {
    clearUserGitHubConnection(
      response,
    );

    return null;
  }

  persistUserGitHubConnection(
    response,
    refreshed,
  );

  return refreshed;
}

export async function listUserGitHubRepositories(
  connection: UserGitHubConnection,
):
  Promise<
    | {
        success: true;
        repositories: Array<{
          id: number;
          fullName: string;
          name: string;
          owner: string;
          private: boolean;
          defaultBranch: string;
          permissions: {
            admin?: boolean;
            maintain?: boolean;
            push?: boolean;
            pull?: boolean;
          };
          installationId: number;
        }>;
      }
    | {
        success: false;
        error: string;
      }
  > {
  if (
    !connection.installationIds.length
  ) {
    return {
      success: true,
      repositories: [],
    };
  }

  const repositories:
    Array<{
      id: number;
      fullName: string;
      name: string;
      owner: string;
      private: boolean;
      defaultBranch: string;
      permissions: {
        admin?: boolean;
        maintain?: boolean;
        push?: boolean;
        pull?: boolean;
      };
      installationId: number;
    }> = [];

  for (
    const installationId of
    connection.installationIds
  ) {
    const result =
      await githubFetch<{
        repositories?: Array<{
          id: number;
          name: string;
          full_name: string;
          private: boolean;
          default_branch: string;
          owner: {
            login: string;
          };
          permissions?: {
            admin?: boolean;
            maintain?: boolean;
            push?: boolean;
            pull?: boolean;
          };
        }>;
      }>(
        `/user/installations/${installationId}/repositories?per_page=100`,
        {},
        connection.accessToken,
      );

    if (!result.ok) {
      return {
        success: false,
        error:
          result.message ||
          "GitHub repository access failed.",
      };
    }

    for (
      const repository of
      result.data
        ?.repositories ||
      []
    ) {
      repositories.push({
        id:
          repository.id,
        fullName:
          repository.full_name,
        name:
          repository.name,
        owner:
          repository.owner.login,
        private:
          repository.private,
        defaultBranch:
          repository.default_branch,
        permissions:
          repository.permissions ||
          {},
        installationId,
      });
    }
  }

  const unique =
    new Map(
      repositories.map(
        (repository) => [
          repository.id,
          repository,
        ],
      ),
    );

  return {
    success: true,
    repositories:
      Array.from(
        unique.values(),
      ).sort(
        (a, b) =>
          a.fullName.localeCompare(
            b.fullName,
          ),
      ),
  };
}
