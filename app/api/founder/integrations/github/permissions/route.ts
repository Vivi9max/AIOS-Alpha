import { NextRequest, NextResponse } from "next/server";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  ensureUserGitHubConnection,
} from "@/lib/integrations/github/user-github";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

const TARGET_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const GITHUB_API =
  "https://api.github.com";

const GITHUB_API_VERSION =
  "2022-11-28";

interface GitHubInstallation {
  id: number;
  app_id: number;
  app_slug?: string;
  repository_selection?: string;
  permissions?: Record<string, string>;
  account?: {
    login?: string;
    type?: string;
  };
}

interface GitHubRepository {
  id: number;
  full_name: string;
  name: string;
  default_branch?: string;
  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
    triage?: boolean;
    pull?: boolean;
  };
}

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function githubFetch<T>(
  path: string,
  accessToken: string,
): Promise<{
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
}> {
  try {
    const response =
      await fetch(
        `${GITHUB_API}${path}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept:
              "application/vnd.github+json",
            Authorization:
              `Bearer ${accessToken}`,
            "X-GitHub-Api-Version":
              GITHUB_API_VERSION,
          },
        },
      );

    const text =
      await response.text();

    let data:
      | T
      | {
          message?: string;
        }
      | undefined;

    if (text) {
      try {
        data =
          JSON.parse(text) as T;
      } catch {
        data = undefined;
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status:
          response.status,
        message:
          typeof data ===
            "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message ===
            "string"
            ? data.message
            : `GitHub API request failed with HTTP ${response.status}.`,
      };
    }

    return {
      ok: true,
      status:
        response.status,
      data:
        data as T,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message:
        error instanceof Error
          ? error.message
          : "GitHub API request failed.",
    };
  }
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderConfigured()
  ) {
    return json(
      {
        success: false,
        code:
          "FOUNDER_NOT_CONFIGURED",
        error:
          "Founder access is not configured.",
      },
      503,
    );
  }

  if (
    !isFounderRequest(request)
  ) {
    return json(
      {
        success: false,
        code:
          "FOUNDER_UNAUTHORIZED",
        error:
          "Founder authorization failed.",
      },
      401,
    );
  }

  const response =
    NextResponse.next();

  const connection =
    await ensureUserGitHubConnection(
      request,
      response,
    );

  if (!connection) {
    return json(
      {
        success: false,
        code:
          "GITHUB_NOT_CONNECTED",
        error:
          "Founder GitHub connection is not available.",
      },
      401,
    );
  }

  try {
    const installationsResult =
      await githubFetch<{
        installations?: GitHubInstallation[];
      }>(
        "/user/installations?per_page=100",
        connection.accessToken,
      );

    if (
      !installationsResult.ok
    ) {
      return json(
        {
          success: false,
          code:
            "GITHUB_INSTALLATIONS_READ_FAILED",
          error:
            installationsResult.message ||
            "Unable to read GitHub App installations.",
          status:
            installationsResult.status,
        },
        502,
      );
    }

    const installations =
      installationsResult.data
        ?.installations ||
      [];

    const matchedInstallations =
      installations.filter(
        (installation) =>
          connection.installationIds.includes(
            installation.id,
          ),
      );

    if (
      matchedInstallations.length ===
      0
    ) {
      return json(
        {
          success: false,
          code:
            "GITHUB_INSTALLATION_NOT_FOUND",
          error:
            "The connected GitHub App installation could not be found in the current user authorization.",
          installationIds:
            connection.installationIds,
        },
        502,
      );
    }

    const installation =
      matchedInstallations[0];

    const contentsPermission =
      installation.permissions
        ?.contents ||
      "missing";

    const metadataPermission =
      installation.permissions
        ?.metadata ||
      "missing";

    const repositorySelection =
      installation.repository_selection ||
      "unknown";

    const repositoryResult =
      await githubFetch<{
        repositories?: GitHubRepository[];
      }>(
        `/user/installations/${installation.id}/repositories?per_page=100`,
        connection.accessToken,
      );

    if (
      !repositoryResult.ok
    ) {
      return json(
        {
          success: false,
          code:
            "GITHUB_INSTALLATION_REPOSITORIES_READ_FAILED",
          error:
            repositoryResult.message ||
            "Unable to read repositories available to the GitHub App installation.",
          status:
            repositoryResult.status,
          installation: {
            id:
              installation.id,
            repositorySelection,
            permissions:
              installation.permissions ||
              {},
          },
        },
        502,
      );
    }

    const targetRepository =
      (
        repositoryResult.data
          ?.repositories ||
        []
      ).find(
        (repository) =>
          repository.full_name.toLowerCase() ===
          TARGET_REPOSITORY.toLowerCase(),
      );

    const repositoryPush =
      Boolean(
        targetRepository
          ?.permissions?.push,
      );

    const repositoryAdmin =
      Boolean(
        targetRepository
          ?.permissions?.admin,
      );

    const writeReady =
      contentsPermission ===
        "write" &&
      repositoryPush;

    const diagnosis =
      writeReady
        ? "GITHUB_INSTALLATION_WRITE_READY"
        : contentsPermission !==
            "write"
          ? "GITHUB_APP_CONTENTS_WRITE_NOT_GRANTED"
          : "GITHUB_REPOSITORY_WRITE_NOT_AVAILABLE";

    const result =
      json({
        success: true,
        diagnosis,
        targetRepository:
          TARGET_REPOSITORY,
        account: {
          login:
            installation.account
              ?.login ||
            connection.login,
          type:
            installation.account
              ?.type ||
            "User",
        },
        installation: {
          id:
            installation.id,
          appId:
            installation.app_id,
          appSlug:
            installation.app_slug ||
            "unknown",
          repositorySelection,
          permissions:
            installation.permissions ||
            {},
        },
        effectivePermissions: {
          metadata:
            metadataPermission,
          contents:
            contentsPermission,
        },
        targetRepositoryAccess: {
          found:
            Boolean(
              targetRepository,
            ),
          defaultBranch:
            targetRepository
              ?.default_branch ||
            null,
          pull:
            Boolean(
              targetRepository
                ?.permissions
                ?.pull,
            ),
          push:
            repositoryPush,
          maintain:
            Boolean(
              targetRepository
                ?.permissions
                ?.maintain,
            ),
          admin:
            repositoryAdmin,
        },
        writeReady,
        legacyTokenFallbackConfigured:
          Boolean(
            process.env.GITHUB_TOKEN?.trim(),
          ),
      });

    for (
      const cookie of
      response.cookies.getAll()
    ) {
      result.cookies.set(
        cookie,
      );
    }

    return result;
  } catch (error) {
    return json(
      {
        success: false,
        code:
          "GITHUB_PERMISSION_DIAGNOSTIC_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "GitHub permission diagnostic failed.",
      },
      500,
    );
  }
}
