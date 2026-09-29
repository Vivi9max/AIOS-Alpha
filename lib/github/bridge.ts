import "server-only";

import type { NextRequest } from "next/server";

import {
  ensureUserGitHubConnection,
  readUserGitHubConnection,
} from "@/lib/integrations/github/user-github";

export interface GitHubBridgeConfig {
  token?: string;
  apiBaseUrl: string;
  defaultRepo: string;
  defaultBranch: string;
  authMode: "oauth" | "token";
}

export interface GitHubBridgeResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface GitHubReadFileSuccess {
  success: true;
  data: {
    repo: string;
    ref: string;
    path: string;
    sha: string;
    size: number;
    content: string;
    htmlUrl?: string;
  };
}

export interface GitHubReadFileFailure {
  success: false;
  error: string;
  status?: number;
}

export type GitHubReadFileResult =
  | GitHubReadFileSuccess
  | GitHubReadFileFailure;

export interface GitHubBridgeAuthContext {
  accessToken?: string;
  authMode: "oauth" | "token";
  account?: {
    id: number;
    login: string;
  };
}

const DEFAULT_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const DEFAULT_BRANCH =
  "main";

const DEFAULT_API_URL =
  "https://api.github.com";

const GITHUB_API_VERSION =
  "2022-11-28";

function getStaticConfig(): Omit<
  GitHubBridgeConfig,
  "authMode"
> {
  return {
    token:
      process.env.GITHUB_TOKEN?.trim() ||
      undefined,

    apiBaseUrl:
      process.env.GITHUB_API_URL?.trim() ||
      DEFAULT_API_URL,

    defaultRepo:
      process.env.GITHUB_REPOSITORY?.trim() ||
      DEFAULT_REPOSITORY,

    defaultBranch:
      process.env.GITHUB_DEFAULT_BRANCH?.trim() ||
      DEFAULT_BRANCH,
  };
}

function getConfig(): GitHubBridgeConfig {
  const config =
    getStaticConfig();

  if (!config.token) {
    throw new Error(
      "GitHub authentication is not configured.",
    );
  }

  return {
    ...config,
    authMode: "token",
  };
}

export function getGitHubBridgeConfig(): GitHubBridgeConfig {
  const config =
    getStaticConfig();

  return {
    ...config,
    authMode:
      config.token
        ? "token"
        : "oauth",
  };
}

export async function resolveGitHubBridgeAuth(
  request?: NextRequest,
): Promise<GitHubBridgeAuthContext> {
  if (request) {
    const connection =
      readUserGitHubConnection(
        request,
      );

    if (connection) {
      if (
        connection.accessExpiresAt >
        Date.now() + 60_000
      ) {
        return {
          accessToken:
            connection.accessToken,

          authMode:
            "oauth",

          account: {
            id:
              connection.githubUserId,
            login:
              connection.login,
          },
        };
      }

      const response =
        new Response();

      const refreshed =
        await ensureUserGitHubConnection(
          request,
          response,
        );

      if (refreshed) {
        return {
          accessToken:
            refreshed.accessToken,

          authMode:
            "oauth",

          account: {
            id:
              refreshed.githubUserId,
            login:
              refreshed.login,
          },
        };
      }
    }
  }

  const staticConfig =
    getStaticConfig();

  if (staticConfig.token) {
    return {
      accessToken:
        staticConfig.token,
      authMode:
        "token",
    };
  }

  return {
    authMode:
      "oauth",
  };
}

async function githubFetch<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<
  GitHubBridgeResult<T>
> {
  const config =
    getStaticConfig();

  const token =
    accessToken ||
    config.token;

  if (!token) {
    return {
      success: false,
      error:
        "GitHub authentication is not configured.",
      status: 503,
    };
  }

  const response =
    await fetch(
      `${config.apiBaseUrl}${path}`,
      {
        ...init,

        cache:
          "no-store",

        headers: {
          Accept:
            "application/vnd.github+json",

          Authorization:
            `Bearer ${token}`,

          "X-GitHub-Api-Version":
            GITHUB_API_VERSION,

          ...(init.body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),

          ...(init.headers ||
            {}),
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
      typeof data ===
        "object" &&
      data !== null &&
      "message" in data &&
      typeof (
        data as {
          message?: unknown;
        }
      ).message ===
        "string"
        ? (
            data as {
              message: string;
            }
          ).message
        : `GitHub API request failed with ${response.status}.`;

    return {
      success: false,
      error:
        message,
      status:
        response.status,
    };
  }

  return {
    success: true,
    data:
      data as T,
    status:
      response.status,
  };
}

function encodePath(
  path: string,
): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(
      (
        segment,
      ) =>
        encodeURIComponent(
          segment,
        ),
    )
    .join("/");
}

function encodeRepo(
  repo: string,
): string {
  return repo
    .trim()
    .replace(
      /^\/+|\/+$/g,
      "",
    );
}

export async function githubBridgeStatus(
  request?: NextRequest,
) {
  const config =
    getStaticConfig();

  const auth =
    await resolveGitHubBridgeAuth(
      request,
    );

  if (!auth.accessToken) {
    return {
      success: false,
      tokenConfigured:
        Boolean(
          config.token,
        ),
      oauthConnected:
        false,
      authenticated:
        false,
      authMode:
        auth.authMode,
      repository:
        config.defaultRepo,
      branch:
        config.defaultBranch,
      error:
        "GitHub authentication is not configured or connected.",
      status:
        503,
    };
  }

  const identity =
    await githubFetch<{
      login: string;
      id: number;
      type: string;
    }>(
      "/user",
      {},
      auth.accessToken,
    );

  if (
    !identity.success ||
    !identity.data
  ) {
    return {
      success: false,
      tokenConfigured:
        Boolean(
          config.token,
        ),
      oauthConnected:
        auth.authMode ===
        "oauth",
      authenticated:
        false,
      authMode:
        auth.authMode,
      repository:
        config.defaultRepo,
      branch:
        config.defaultBranch,
      error:
        identity.error ||
        "GitHub authentication failed.",
      status:
        identity.status,
    };
  }

  return {
    success: true,
    tokenConfigured:
      Boolean(
        config.token,
      ),
    oauthConnected:
      auth.authMode ===
      "oauth",
    authenticated:
      true,
    authMode:
      auth.authMode,
    account: {
      login:
        identity.data.login,
      id:
        identity.data.id,
      type:
        identity.data.type,
    },
    repository:
      config.defaultRepo,
    branch:
      config.defaultBranch,
  };
}

export async function readGitHubFile(
  options: {
    repo?: string;
    path: string;
    ref?: string;
    accessToken?: string;
  },
): Promise<
  GitHubReadFileResult
> {
  const config =
    getStaticConfig();

  const repo =
    encodeRepo(
      options.repo ||
        config.defaultRepo,
    );

  const ref =
    encodeURIComponent(
      options.ref ||
        config.defaultBranch,
    );

  const path =
    encodePath(
      options.path,
    );

  const result =
    await githubFetch<{
      type: string;
      name: string;
      path: string;
      sha: string;
      size: number;
      encoding?: string;
      content?: string;
      html_url?: string;
    }>(
      `/repos/${repo}/contents/${path}?ref=${ref}`,
      {},
      options.accessToken,
    );

  if (!result.success) {
    return {
      success: false,
      error:
        result.error ||
        "GitHub file read failed.",
      status:
        result.status,
    };
  }

  if (!result.data) {
    return {
      success: false,
      error:
        "GitHub returned no file data.",
      status:
        result.status,
    };
  }

  let content =
    result.data.content ||
    "";

  if (
    result.data.encoding ===
    "base64"
  ) {
    content =
      Buffer.from(
        content.replace(
          /\s/g,
          "",
        ),
        "base64",
      ).toString(
        "utf8",
      );
  }

  return {
    success: true,
    data: {
      repo,
      ref:
        options.ref ||
        config.defaultBranch,
      path:
        result.data.path,
      sha:
        result.data.sha,
      size:
        result.data.size,
      content,
      htmlUrl:
        result.data.html_url,
    },
  };
}

export async function writeGitHubFile(
  options: {
    repo?: string;
    path: string;
    content: string;
    message: string;
    branch?: string;
    sha?: string;
    accessToken?: string;
  },
) {
  const config =
    getStaticConfig();

  const repo =
    encodeRepo(
      options.repo ||
        config.defaultRepo,
    );

  const branch =
    options.branch ||
    config.defaultBranch;

  const path =
    encodePath(
      options.path,
    );

  if (
    !options.message.trim()
  ) {
    return {
      success: false,
      error:
        "Commit message is required.",
      status: 400,
    };
  }

  const body:
    Record<string, string> =
    {
      message:
        options.message.trim(),

      content:
        Buffer.from(
          options.content,
          "utf8",
        ).toString(
          "base64",
        ),

      branch,
    };

  if (options.sha) {
    body.sha =
      options.sha;
  }

  return githubFetch<{
    commit: {
      sha: string;
      html_url?: string;
    };
    content?: {
      path: string;
      sha: string;
      html_url?: string;
    };
  }>(
    `/repos/${repo}/contents/${path}`,
    {
      method:
        "PUT",

      body:
        JSON.stringify(
          body,
        ),
    },
    options.accessToken,
  );
}

export async function listGitHubPath(
  options: {
    repo?: string;
    path?: string;
    ref?: string;
    accessToken?: string;
  },
) {
  const config =
    getStaticConfig();

  const repo =
    encodeRepo(
      options.repo ||
        config.defaultRepo,
    );

  const ref =
    encodeURIComponent(
      options.ref ||
        config.defaultBranch,
    );

  const path =
    options.path
      ? `/${encodePath(
          options.path,
        )}`
      : "";

  return githubFetch<
    Array<{
      type: string;
      name: string;
      path: string;
      sha: string;
      size: number;
      html_url?: string;
    }>
  >(
    `/repos/${repo}/contents${path}?ref=${ref}`,
    {},
    options.accessToken,
  );
}

export async function getGitHubRepository(
  options?: {
    repo?: string;
    accessToken?: string;
  },
) {
  const config =
    getStaticConfig();

  const repo =
    encodeRepo(
      options?.repo ||
        config.defaultRepo,
    );

  return githubFetch<{
    full_name: string;
    private: boolean;
    default_branch: string;
    html_url: string;
    permissions?: {
      admin?: boolean;
      push?: boolean;
      pull?: boolean;
    };
  }>(
    `/repos/${repo}`,
    {},
    options?.accessToken,
  );
}
