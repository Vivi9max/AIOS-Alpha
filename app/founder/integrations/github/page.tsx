"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

interface GitHubStatus {
  success: boolean;
  configured: boolean;
  connected: boolean;
  provider?: string;
  account?: {
    id: string;
    login: string;
  };
  installationCount?: number;
  accessExpiresAt?: string | null;
  code?: string;
  error?: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

interface GitHubRepositoriesResponse {
  success: boolean;
  repositories?: GitHubRepository[];
  code?: string;
  error?: string;
}

const initialStatus: GitHubStatus = {
  success: false,
  configured: false,
  connected: false,
};

export default function FounderGitHubPage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [status, setStatus] =
    useState<GitHubStatus>(
      initialStatus,
    );

  const [repositories, setRepositories] =
    useState<GitHubRepository[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadStatus =
    useCallback(
      async (
        key: string,
      ) => {
        const normalizedKey =
          key.trim();

        if (!normalizedKey) {
          setLoading(false);
          setError(
            "Founder Access Key is required.",
          );
          return;
        }

        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/founder/integrations/github/status",
              {
                method: "GET",
                cache: "no-store",
                headers: {
                  Accept:
                    "application/json",
                  Authorization:
                    `Bearer ${normalizedKey}`,
                },
              },
            );

          const data =
            (await response.json()) as GitHubStatus;

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ||
                "Unable to read GitHub status.",
            );
          }

          setStatus(data);

          window.sessionStorage.setItem(
            STORAGE_KEY,
            normalizedKey,
          );
        } catch (
          requestError
        ) {
          setStatus(
            initialStatus,
          );

          setRepositories([]);

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Founder GitHub access failed.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  const loadRepositories =
    useCallback(
      async (
        key: string,
      ) => {
        const normalizedKey =
          key.trim();

        if (!normalizedKey) {
          return;
        }

        try {
          const response =
            await fetch(
              "/api/founder/integrations/github/repositories",
              {
                method: "GET",
                cache: "no-store",
                headers: {
                  Accept:
                    "application/json",
                  Authorization:
                    `Bearer ${normalizedKey}`,
                },
              },
            );

          const data =
            (await response.json()) as GitHubRepositoriesResponse;

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ||
                "Unable to read GitHub repositories.",
            );
          }

          setRepositories(
            data.repositories || [],
          );
        } catch (
          requestError
        ) {
          setRepositories([]);

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to read GitHub repositories.",
          );
        }
      },
      [],
    );

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (!storedKey) {
      setLoading(false);
      setError(
        "Founder Access Key is required.",
      );
      return;
    }

    setAccessKey(
      storedKey,
    );

    void loadStatus(
      storedKey,
    );
  }, [
    loadStatus,
  ]);

  useEffect(() => {
    if (
      status.connected &&
      accessKey
    ) {
      void loadRepositories(
        accessKey,
      );
    }
  }, [
    status.connected,
    accessKey,
    loadRepositories,
  ]);

  async function connectGitHub() {
    if (!accessKey.trim()) {
      setError(
        "Founder Access Key is required.",
      );
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/founder/integrations/github/connect",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${accessKey.trim()}`,
            },
          },
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          authorizationUrl?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success ||
        !data.authorizationUrl
      ) {
        throw new Error(
          data.error ||
            "GitHub authorization could not start.",
        );
      }

      window.location.assign(
        data.authorizationUrl,
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "GitHub authorization could not start.",
      );
      setActionLoading(false);
    }
  }

  async function disconnectGitHub() {
    setActionLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/founder/integrations/github/disconnect",
          {
            method: "POST",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${accessKey.trim()}`,
            },
          },
        );

      const data =
        (await response.json()) as GitHubStatus;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "GitHub disconnect failed.",
        );
      }

      setStatus({
        success: true,
        configured:
          data.configured ?? true,
        connected: false,
      });

      setRepositories([]);
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "GitHub disconnect failed.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function refresh() {
    if (!accessKey.trim()) {
      return;
    }

    void loadStatus(
      accessKey,
    );
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",
        padding:
          "24px 18px 60px",
        boxSizing:
          "border-box",
        background:
          "#f4f6fb",
        color:
          "#0f172a",
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            980,
          margin:
            "0 auto",
        }}
      >
        <Link
          href="/founder"
          style={{
            display:
              "inline-flex",
            alignItems:
              "center",
            gap: 6,
            color:
              "#2563eb",
            fontSize:
              13,
            fontWeight:
              800,
            textDecoration:
              "none",
          }}
        >
          ← Founder Console
        </Link>

        <header
          style={{
            marginTop:
              22,
            marginBottom:
              22,
          }}
        >
          <div
            style={{
              color:
                "#2563eb",
              fontSize:
                12,
              fontWeight:
                950,
              letterSpacing:
                "0.14em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                "8px 0 0",
              fontSize:
                30,
            }}
          >
            GitHub Integration
          </h1>

          <p
            style={{
              margin:
                "10px 0 0",
              maxWidth:
                720,
              color:
                "#64748b",
              lineHeight:
                1.65,
            }}
          >
            Founder-only engineering integration for
            AIOS Alpha. This integration is not exposed
            in the normal user workspace.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom:
                16,
              padding:
                "12px 14px",
              border:
                "1px solid #fecaca",
              borderRadius:
                12,
              background:
                "#fff7f7",
              color:
                "#b91c1c",
              lineHeight:
                1.55,
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            padding:
              20,
            border:
              "1px solid #dbe3f0",
            borderRadius:
              20,
            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap:
                16,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    12,
                  fontWeight:
                    900,
                  letterSpacing:
                    "0.08em",
                }}
              >
                GITHUB APP
              </div>

              <h2
                style={{
                  margin:
                    "7px 0 0",
                  fontSize:
                    22,
                }}
              >
                AIOS Alpha
              </h2>
            </div>

            <StatusBadge
              loading={loading}
              connected={
                status.connected
              }
              configured={
                status.configured
              }
            />
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap:
                10,
              marginTop:
                18,
            }}
          >
            <InfoCard
              label="Scope"
              value="Founder-only"
            />

            <InfoCard
              label="Provider"
              value={
                status.provider ||
                "github-app"
              }
            />

            <InfoCard
              label="Account"
              value={
                status.account?.login ||
                "Not connected"
              }
            />

            <InfoCard
              label="Installations"
              value={String(
                status.installationCount ??
                  0,
              )}
            />
          </div>

          <div
            style={{
              display:
                "flex",
              flexWrap:
                "wrap",
              gap:
                10,
              marginTop:
                18,
            }}
          >
            {!status.connected ? (
              <button
                type="button"
                onClick={
                  connectGitHub
                }
                disabled={
                  actionLoading ||
                  loading
                }
                style={
                  primaryButtonStyle
                }
              >
                {actionLoading
                  ? "Opening GitHub…"
                  : "Connect GitHub"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={
                    refresh
                  }
                  disabled={
                    actionLoading ||
                    loading
                  }
                  style={
                    secondaryButtonStyle
                  }
                >
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={
                    disconnectGitHub
                  }
                  disabled={
                    actionLoading
                  }
                  style={
                    dangerButtonStyle
                  }
                >
                  {actionLoading
                    ? "Disconnecting…"
                    : "Disconnect"}
                </button>
              </>
            )}
          </div>
        </section>

        <section
          style={{
            marginTop:
              16,
            padding:
              20,
            border:
              "1px solid #dbe3f0",
            borderRadius:
              20,
            background:
              "#ffffff",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#64748b",
                fontSize:
                  12,
                fontWeight:
                  900,
                letterSpacing:
                  "0.08em",
              }}
            >
              REPOSITORY ACCESS
            </div>

            <h2
              style={{
                margin:
                  "7px 0 0",
                fontSize:
                  21,
              }}
            >
              Founder GitHub repositories
            </h2>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#64748b",
                lineHeight:
                  1.6,
              }}
            >
              Only repositories granted to the AIOS Alpha
              GitHub App installation are shown here.
            </p>
          </div>

          {!status.connected ? (
            <div
              style={{
                marginTop:
                  16,
                padding:
                  16,
                border:
                  "1px dashed #cbd5e1",
                borderRadius:
                  14,
                color:
                  "#64748b",
                textAlign:
                  "center",
              }}
            >
              Connect GitHub to verify repository access.
            </div>
          ) : repositories.length === 0 ? (
            <div
              style={{
                marginTop:
                  16,
                padding:
                  16,
                border:
                  "1px dashed #cbd5e1",
                borderRadius:
                  14,
                color:
                  "#64748b",
                textAlign:
                  "center",
              }}
            >
              No repositories are currently available
              through this GitHub App installation.
            </div>
          ) : (
            <div
              style={{
                display:
                  "grid",
                gap:
                  10,
                marginTop:
                  16,
              }}
            >
              {repositories.map(
                (
                  repository,
                ) => (
                  <article
                    key={
                      repository.id
                    }
                    style={{
                      padding:
                        15,
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        15,
                      background:
                        "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "flex-start",
                        justifyContent:
                          "space-between",
                        gap:
                          12,
                      }}
                    >
                      <div
                        style={{
                          minWidth:
                            0,
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {
                            repository.fullName
                          }
                        </strong>

                        <div
                          style={{
                            marginTop:
                              5,
                            color:
                              "#64748b",
                            fontSize:
                              12,
                          }}
                        >
                          Default branch:{" "}
                          {
                            repository.defaultBranch
                          }
                        </div>
                      </div>

                      <span
                        style={{
                          flex:
                            "0 0 auto",
                          padding:
                            "5px 9px",
                          borderRadius:
                            999,
                          background:
                            repository.private
                              ? "#eef2ff"
                              : "#ecfdf5",
                          color:
                            repository.private
                              ? "#4338ca"
                              : "#047857",
                          fontSize:
                            11,
                          fontWeight:
                            900,
                        }}
                      >
                        {repository.private
                          ? "Private"
                          : "Public"}
                      </span>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        flexWrap:
                          "wrap",
                        gap:
                          7,
                        marginTop:
                          12,
                      }}
                    >
                      <PermissionTag
                        label="Pull"
                        active={
                          repository.permissions?.pull
                        }
                      />

                      <PermissionTag
                        label="Push"
                        active={
                          repository.permissions?.push
                        }
                      />

                      <PermissionTag
                        label="Maintain"
                        active={
                          repository.permissions?.maintain
                        }
                      />

                      <PermissionTag
                        label="Admin"
                        active={
                          repository.permissions?.admin
                        }
                      />
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        <section
          style={{
            marginTop:
              16,
            padding:
              18,
            border:
              "1px solid #dbe3f0",
            borderRadius:
              18,
            background:
              "#0f172a",
            color:
              "#ffffff",
          }}
        >
          <div
            style={{
              fontSize:
                12,
              color:
                "#94a3b8",
              fontWeight:
                900,
              letterSpacing:
                "0.08em",
            }}
          >
            SECURITY BOUNDARY
          </div>

          <p
            style={{
              margin:
                "9px 0 0",
              color:
                "#cbd5e1",
              lineHeight:
                1.65,
            }}
          >
            GitHub is currently treated as a Founder
            engineering integration. It is intentionally
            absent from the normal user Settings page.
            Repository access is controlled by the GitHub
            App installation and Founder authentication.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({
  loading,
  connected,
  configured,
}: {
  loading: boolean;
  connected: boolean;
  configured: boolean;
}) {
  const background =
    connected
      ? "#ecfdf5"
      : configured
        ? "#f3f4f6"
        : "#fef2f2";

  const color =
    connected
      ? "#047857"
      : configured
        ? "#4b5563"
        : "#b91c1c";

  const label =
    loading
      ? "Checking"
      : connected
        ? "Connected"
        : configured
          ? "Not connected"
          : "Not configured";

  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        gap:
          7,
        padding:
          "7px 10px",
        borderRadius:
          999,
        background,
        color,
        fontSize:
          12,
        fontWeight:
          900,
      }}
    >
      <span
        style={{
          width:
            7,
          height:
            7,
          borderRadius:
            "50%",
          background:
            color,
        }}
      />

      {label}
    </span>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          13,
        border:
          "1px solid #e2e8f0",
        borderRadius:
          13,
        background:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            11,
          fontWeight:
            900,
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            6,
          fontWeight:
            850,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PermissionTag({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span
      style={{
        padding:
          "5px 9px",
        borderRadius:
          999,
        border:
          active
            ? "1px solid #bbf7d0"
            : "1px solid #e2e8f0",
        background:
          active
            ? "#f0fdf4"
            : "#ffffff",
        color:
          active
            ? "#166534"
            : "#94a3b8",
        fontSize:
          11,
        fontWeight:
          800,
      }}
    >
      {label}:{" "}
      {active
        ? "Yes"
        : "No"}
    </span>
  );
}

const primaryButtonStyle =
  {
    height:
      44,
    padding:
      "0 17px",
    border:
      0,
    borderRadius:
      12,
    background:
      "#0f172a",
    color:
      "#ffffff",
    fontWeight:
      900,
    cursor:
      "pointer",
  } as const;

const secondaryButtonStyle =
  {
    height:
      44,
    padding:
      "0 16px",
    border:
      "1px solid #cbd5e1",
    borderRadius:
      12,
    background:
      "#ffffff",
    color:
      "#334155",
    fontWeight:
      900,
    cursor:
      "pointer",
  } as const;

const dangerButtonStyle =
  {
    height:
      44,
    padding:
      "0 16px",
    border:
      "1px solid #fecaca",
    borderRadius:
      12,
    background:
      "#fff7f7",
    color:
      "#b91c1c",
    fontWeight:
      900,
    cursor:
      "pointer",
  } as const;
