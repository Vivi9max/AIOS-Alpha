import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function getSafeUrlParts(value, base) {
  try {
    const parsed = base
      ? new URL(value, base)
      : new URL(value);

    return {
      host: parsed.host || "<unknown>",
      path: parsed.pathname || "/",
    };
  } catch {
    return {
      host: "<unavailable>",
      path: "<unavailable>",
    };
  }
}

function logSafeUrl(log, label, value, base) {
  const parts = getSafeUrlParts(value, base);
  log.log(`${label} host: ${parts.host}`);
  log.log(`${label} path: ${parts.path}`);
}

function getSetCookieValues(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function buildCookieHeader(setCookieValues) {
  const cookies = [];

  for (const setCookie of setCookieValues) {
    if (typeof setCookie !== "string") continue;

    const firstPart = setCookie.split(";", 1)[0].trim();
    const separator = firstPart.indexOf("=");

    if (separator <= 0) continue;

    const name = firstPart.slice(0, separator).trim();
    const value = firstPart.slice(separator + 1).trim();

    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) {
      continue;
    }

    if (!value || /[\r\n;]/.test(value)) {
      continue;
    }

    cookies.push(`${name}=${value}`);
  }

  return [...new Set(cookies)].join("; ");
}

function validateBaseUrl(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Deployment URL is invalid.");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new Error(
      "Deployment URL rejected: HTTPS without credentials or fragment is required.",
    );
  }

  return parsed.origin + parsed.pathname.replace(/\/+$/, "");
}

function validateRedirectTarget(location, healthUrl) {
  let target;

  try {
    target = new URL(location, healthUrl);
  } catch {
    throw new Error(
      "Vercel redirect supplied an invalid Location header.",
    );
  }

  const original = new URL(healthUrl);

  if (
    target.protocol !== "https:" ||
    target.origin !== original.origin ||
    target.pathname !== original.pathname ||
    target.username ||
    target.password ||
    target.hash
  ) {
    throw new Error(
      "Vercel bypass redirect rejected: target must remain HTTPS on the exact original host and health path.",
    );
  }

  return target;
}

function validateExpectedCommitSha(value) {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{40}$/i.test(value.trim())
  ) {
    throw new Error(
      "EXPECTED_COMMIT_SHA must be a full 40-character Git commit SHA.",
    );
  }

  return value.trim().toLowerCase();
}

function writeVerificationReceipt(receipt, outputPath, summaryPath) {
  if (outputPath) {
    const resolved = path.resolve(outputPath);

    fs.writeFileSync(
      resolved,
      `${JSON.stringify(receipt, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      },
    );
  }

  if (summaryPath) {
    fs.appendFileSync(
      summaryPath,
      [
        "## AIOS Production Verification",
        "",
        `- Status: ${receipt.status}`,
        `- Expected Commit SHA: \`${receipt.expectedCommitSha}\``,
        `- Observed Commit SHA: \`${receipt.observedCommitSha}\``,
        `- Release: ${receipt.release}`,
        `- Authentication: ${receipt.authenticationMode}`,
        `- Verified At: ${receipt.verifiedAt}`,
        "",
      ].join("\n"),
    );
  }
}

export async function verifyDeployment({
  baseUrl,
  env = process.env,
  fetchImpl = fetch,
  log = console,
}) {
  if (!baseUrl) {
    throw new Error(
      "Deployment URL is required.",
    );
  }

  const expectedCommitSha = validateExpectedCommitSha(
    env.EXPECTED_COMMIT_SHA,
  );

  const normalizedBaseUrl = validateBaseUrl(baseUrl);
  const healthUrl = `${normalizedBaseUrl}/api/health`;

  const trustedOidcToken = env.VERCEL_TRUSTED_OIDC_TOKEN;
  const bypassSecret = env.VERCEL_AUTOMATION_BYPASS_SECRET;

  const headers = {
    Accept: "application/json",
  };

  let authenticationMode = "none";

  if (trustedOidcToken) {
    headers["x-vercel-trusted-oidc-idp-token"] =
      trustedOidcToken;
    authenticationMode = "trusted-oidc";
  } else if (bypassSecret) {
    headers["x-vercel-protection-bypass"] =
      bypassSecret;
    headers["x-vercel-set-bypass-cookie"] =
      "samesitenone";
    authenticationMode = "automation-bypass";
  }

  log.log(
    `Deployment verification authentication mode: ${authenticationMode}`,
  );

  logSafeUrl(
    log,
    "Health endpoint",
    healthUrl,
  );

  let response;

  try {
    response = await fetchImpl(healthUrl, {
      method: "GET",
      headers,
      redirect: "manual",
    });

    log.log(`Initial HTTP status: ${response.status}`);

    log.log(
      `Initial Vercel request ID: ${
        response.headers.get("x-vercel-id") ||
        response.headers.get("x-vercel-request-id") ||
        "<not provided>"
      }`,
    );

    if (response.status >= 300 && response.status < 400) {
      if (authenticationMode !== "automation-bypass") {
        throw new Error(
          `HTTP ${response.status}: redirect received without automation-bypass authentication.`,
        );
      }

      const location = response.headers.get("location");

      if (!location) {
        throw new Error(
          `HTTP ${response.status}: redirect response is missing Location.`,
        );
      }

      const redirectTarget = validateRedirectTarget(
        location,
        healthUrl,
      );

      logSafeUrl(
        log,
        "Validated bypass redirect",
        redirectTarget.href,
      );

      const cookieHeader = buildCookieHeader(
        getSetCookieValues(response.headers),
      );

      if (!cookieHeader) {
        throw new Error(
          "Vercel bypass redirect did not provide a usable Set-Cookie value; refusing to retry.",
        );
      }

      log.log(
        "Vercel bypass cookie received; retrying the original health endpoint once.",
      );

      response = await fetchImpl(healthUrl, {
        method: "GET",
        headers: {
          ...headers,
          Cookie: cookieHeader,
        },
        redirect: "manual",
      });

      log.log(`Retry HTTP status: ${response.status}`);

      log.log(
        `Retry Vercel request ID: ${
          response.headers.get("x-vercel-id") ||
          response.headers.get("x-vercel-request-id") ||
          "<not provided>"
        }`,
      );

      if (response.status >= 300 && response.status < 400) {
        const retryLocation = response.headers.get("location");

        if (retryLocation) {
          logSafeUrl(
            log,
            "Retry redirect target",
            retryLocation,
            healthUrl,
          );
        }

        throw new Error(
          `HTTP ${response.status}: Vercel bypass cookie retry still redirected; verification failed.`,
        );
      }
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        if (authenticationMode === "trusted-oidc") {
          throw new Error(
            "HTTP 401: Vercel rejected the GitHub Actions OIDC token.",
          );
        }

        if (authenticationMode === "automation-bypass") {
          throw new Error(
            "HTTP 401: Vercel rejected the automation bypass secret or bypass cookie.",
          );
        }

        throw new Error(
          "HTTP 401: no Vercel deployment authentication was provided.",
        );
      }

      if (response.status === 403) {
        throw new Error(
          "HTTP 403: Vercel rejected the deployment access policy.",
        );
      }

      throw new Error(`HTTP ${response.status}`);
    }

    const failures = [];

    if (body?.ok !== true) {
      failures.push("health.ok must be true");
    }

    if (body?.service !== "AIOS Alpha") {
      failures.push("health.service mismatch");
    }

    if (!body?.release) {
      failures.push("health.release is missing");
    }

    if (body?.checks?.application !== "ok") {
      failures.push("application check failed");
    }

    if (body?.checks?.manifest !== "ok") {
      failures.push("manifest check failed");
    }

    const observedCommitSha =
      typeof body?.commitSha === "string"
        ? body.commitSha.trim().toLowerCase()
        : "";

    if (!/^[a-f0-9]{40}$/.test(observedCommitSha)) {
      failures.push(
        "health.commitSha is missing or invalid",
      );
    } else if (observedCommitSha !== expectedCommitSha) {
      failures.push(
        "Production Commit SHA does not match the expected GitHub main SHA",
      );
    }

    if (failures.length > 0) {
      throw new Error(
        `Deployment health payload validation failed: ${failures.join("; ")}`,
      );
    }

    const receipt = {
      schemaVersion: 1,
      status: "PRODUCTION_VERIFIED",
      repository: "Vivi9max/AIOS-Alpha",
      expectedCommitSha,
      observedCommitSha,
      release: body.release,
      service: body.service,
      authenticationMode,
      deploymentUrl: normalizedBaseUrl,
      requestId:
        response.headers.get("x-vercel-id") ||
        response.headers.get("x-vercel-request-id") ||
        null,
      verifiedAt: new Date().toISOString(),
    };

    writeVerificationReceipt(
      receipt,
      env.AIOS_PRODUCTION_VERIFICATION_OUTPUT,
      env.GITHUB_STEP_SUMMARY,
    );

    log.log("AIOS Alpha Production verification passed.");
    log.log(`Expected Commit: ${expectedCommitSha}`);
    log.log(`Observed Commit: ${observedCommitSha}`);
    log.log(`Release: ${body.release}`);

    return {
      ok: true,
      ...receipt,
    };
  } catch (error) {
    log.error("AIOS Alpha Production verification failed.");
    log.error(
      error instanceof Error
        ? error.message
        : String(error),
    );

    throw error;
  }
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const baseUrl =
    process.argv[2] ||
    process.env.AIOS_BASE_URL;

  verifyDeployment({ baseUrl }).catch(() => {
    process.exitCode = 1;
  });
}
