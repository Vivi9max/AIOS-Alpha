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

interface GitHubDiagnostic {
  success: boolean;
  diagnosis?: string;
  configuration?: {
    appId: string;
    clientId: string;
    clientIdNumeric: boolean;
    clientIdMatchesAppId: boolean;
    appSlug: string;
    callbackUrl: string;
    authorizationEndpoint: string;
  };
  githubProbe?: {
    attempted: boolean;
    status: number;
    statusText: string;
    accepted: boolean;
    locationHost: string | null;
  };
  authorizationRequest?: {
    clientIdIncluded: boolean;
    redirectUriIncluded: boolean;
    stateIncluded: boolean;
    pkceIncluded: boolean;
  };
  security?: {
    clientSecretExposed: boolean;
    stateExposed: boolean;
    codeChallengeExposed: boolean;
  };
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
    useState<GitHubRepository[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [diagnosticLoading, setDiagnosticLoading] =
    useState(false);

  const [diagnostic, setDiagnostic] =
    useState<GitHubDiagnostic | null>(
      null,
    );

  const [error, setError] =
    useState("");

  const loadStatus = useCallback(
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

        return data;
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

        return null;
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
            data.repositories ||
              [],
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

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const callbackError =
      params.get("reason");

    if (
      params.get("github") ===
        "error" &&
      callbackError
    ) {
      setError(
        `GitHub OAuth failed: ${callbackError}`,
      );
    }

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
    if (
      !accessKey.trim()
    ) {
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

  async function runDiagnostic() {
    if (
      !accessKey.trim()
    ) {
      setError(
        "Founder Access Key is required.",
      );
      return;
    }

    setDiagnosticLoading(
      true,
    );

    setError("");

    try {
      const response =
        await fetch(
          "/api/founder/integrations/github/diagnostic",
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
        (await response.json()) as GitHubDiagnostic;

      setDiagnostic(
        data,
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "GitHub OAuth diagnostic failed.",
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "GitHub OAuth diagnostic failed.",
      );
    } finally {
      setDiagnosticLoading(
        false,
      );
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
          data.configured ??
          true,
        connected: false,
      });

      setRepositories([]);
      setDiagnostic(null);
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "GitHub disconnect failed.",
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  function refresh() {
    if (
      !accessKey.trim()
    ) {
      return;
    }

    setError("");

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
          maxWidth:
            960,
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              14,
            marginBottom:
              18,
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
              PRIVATE FOUNDER ACCESS
            </div>

            <h1
              style={{
                margin:
                  "7px 0 0",
                fontSize:
                  28,
              }}
            >
              GitHub Integration
            </h1>

            <p
              style={{
                margin:
                  "7px 0 0",
                color:
                  "#64748b",
                lineHeight:
                  1.55,
              }}
            >
              Founder-only engineering integration
              for AIOS Alpha.
            </p>
          </div>

          <Link
            href="/founder"
            style={{
              textDecoration:
                "none",
              color:
                "#334155",
              fontWeight:
                800,
            }}
          >
            Founder Console
          </Link>
        </div>

        <section
          style={cardStyle}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap:
                16,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={eyebrowStyle}
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
              loading={
                loading
              }
              connected={
                status.connected
              }
              configured={
                status.configured
              }
            />
          </div>

          <div
            style={gridStyle}
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

          {error ? (
            <div
              style={errorStyle}
            >
              {error}
            </div>
          ) : null}

          <div
            style={buttonRowStyle}
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
                  ? "Opening GitHub..."
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
                    ? "Disconnecting..."
                    : "Disconnect"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={
                runDiagnostic
              }
              disabled={
                diagnosticLoading ||
                loading
              }
              style={
                diagnosticButtonStyle
              }
            >
              {diagnosticLoading
                ? "Testing OAuth..."
                : "OAuth Diagnostics"}
            </button>
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop:
              16,
          }}
        >
          <div
            style={eyebrowStyle}
          >
            OAUTH DIAGNOSTICS
          </div>

          <h2
            style={{
              margin:
                "7px 0 0",
              fontSize:
                21,
            }}
          >
            GitHub OAuth Runtime Verification
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
            This Founder-only test checks the actual
            Vercel runtime configuration and probes the
            GitHub authorization endpoint. Secrets,
            OAuth state, and PKCE values are never shown.
          </p>

          {!diagnostic ? (
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
              }}
            >
              Run OAuth Diagnostics before attempting
              another GitHub connection.
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
              <DiagnosticRow
                label="Diagnosis"
                value={
                  diagnostic.diagnosis ||
                  diagnostic.error ||
                  "Unknown"
                }
                emphasis
              />

              <DiagnosticRow
                label="App ID"
                value={
                  diagnostic.configuration?.appId ||
                  "Unavailable"
                }
              />

              <DiagnosticRow
                label="Client ID"
                value={
                  diagnostic.configuration?.clientId ||
                  "Unavailable"
                }
              />

              <DiagnosticRow
                label="Client ID numeric"
                value={
                  diagnostic.configuration
                    ? diagnostic.configuration.clientIdNumeric
                      ? "YES"
                      : "NO"
                    : "Unavailable"
                }
              />

              <DiagnosticRow
                label="Client ID equals App ID"
                value={
                  diagnostic.configuration
                    ? diagnostic.configuration.clientIdMatchesAppId
                      ? "YES"
                      : "NO"
                    : "Unavailable"
                }
              />

              <DiagnosticRow
                label="App Slug"
                value={
                  diagnostic.configuration?.appSlug ||
                  "Unavailable"
                }
              />

              <DiagnosticRow
                label="Callback URL"
                value={
                  diagnostic.configuration?.callbackUrl ||
                  "Unavailable"
                }
              />

              <DiagnosticRow
                label="Authorize Endpoint"
                value={
                  diagnostic.configuration
                    ?.authorizationEndpoint ||
                  "Unavailable"
                }
              />

              <DiagnosticRow
                label="GitHub HTTP"
                value={
                  diagnostic.githubProbe
                    ? `${diagnostic.githubProbe.status} ${diagnostic.githubProbe.statusText}`
                    : "Unavailable"
                }
              />

              <DiagnosticRow
                label="GitHub endpoint accepted"
                value={
                  diagnostic.githubProbe
                    ? diagnostic.githubProbe.accepted
                      ? "YES"
                      : "NO"
                    : "Unavailable"
                }
              />

              <DiagnosticRow
                label="client_id included"
                value={
                  diagnostic.authorizationRequest
                    ?.clientIdIncluded
                    ? "YES"
                    : "NO"
                }
              />

              <DiagnosticRow
                label="redirect_uri included"
                value={
                  diagnostic.authorizationRequest
                    ?.redirectUriIncluded
                    ? "YES"
                    : "NO"
                }
              />

              <DiagnosticRow
                label="state included"
                value={
                  diagnostic.authorizationRequest
                    ?.stateIncluded
                    ? "YES"
                    : "NO"
                }
              />

              <DiagnosticRow
                label="PKCE S256 included"
                value={
                  diagnostic.authorizationRequest
                    ?.pkceIncluded
                    ? "YES"
                    : "NO"
                }
              />

              <DiagnosticRow
                label="Secret exposed"
                value="NO"
              />
            </div>
          )}
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop:
              16,
          }}
        >
          <div>
            <div
              style={eyebrowStyle}
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
              Only repositories granted to the
              AIOS Alpha GitHub App installation
              are shown here.
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
              Connect GitHub to verify
              repository access.
            </div>
          ) : repositories.length ===
            0 ? (
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
              No repositories are currently
              available through this GitHub App
              installation.
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
                    <strong>
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
            GitHub is a Founder-only engineering
            integration. Repository access is
            controlled by the GitHub App installation
            and Founder authentication.
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

function DiagnosticRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        display:
          "grid",
        gridTemplateColumns:
          "190px minmax(0, 1fr)",
        gap:
          12,
        padding:
          "11px 13px",
        border:
          "1px solid #e2e8f0",
        borderRadius:
          12,
        background:
          emphasis
            ? "#f8fafc"
            : "#ffffff",
      }}
    >
      <strong
        style={{
          color:
            "#475569",
          fontSize:
            12,
        }}
      >
        {label}
      </strong>

      <span
        style={{
          color:
            emphasis
              ? "#0f172a"
              : "#334155",
          fontWeight:
            emphasis
              ? 900
              : 650,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const cardStyle = {
  padding:
    20,
  border:
    "1px solid #dbe3f0",
  borderRadius:
    20,
  background:
    "#ffffff",
} as const;

const eyebrowStyle = {
  color:
    "#64748b",
  fontSize:
    12,
  fontWeight:
    900,
  letterSpacing:
    "0.08em",
} as const;

const gridStyle = {
  display:
    "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap:
    10,
  marginTop:
    18,
} as const;

const buttonRowStyle = {
  display:
    "flex",
  flexWrap:
    "wrap",
  gap:
    10,
  marginTop:
    18,
} as const;

const errorStyle = {
  marginTop:
    16,
  padding:
    13,
  border:
    "1px solid #fecaca",
  borderRadius:
    12,
  background:
    "#fff7f7",
  color:
    "#991b1b",
  fontSize:
    13,
  lineHeight:
    1.55,
  overflowWrap:
    "anywhere",
} as const;

const primaryButtonStyle = {
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

const secondaryButtonStyle = {
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

const diagnosticButtonStyle = {
  height:
    44,
  padding:
    "0 16px",
  border:
    "1px solid #94a3b8",
  borderRadius:
    12,
  background:
    "#f8fafc",
  color:
    "#0f172a",
  fontWeight:
    900,
  cursor:
    "pointer",
} as const;

const dangerButtonStyle = {
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
