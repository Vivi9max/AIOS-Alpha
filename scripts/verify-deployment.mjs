import { pathToFileURL } from "node:url";

function getSafeUrlParts(value, base) {
  try {
    const parsed = base ? new URL(value, base) : new URL(value);
    return {
      host: parsed.host || "<unknown>",
      path: parsed.pathname || "/",
    };
  } catch {
    return { host: "<unavailable>", path: "<unavailable>" };
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

    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) continue;
    if (!value || /[\r\n;]/.test(value)) continue;

    cookies.push(`${name}=${value}`);
  }

  return [...new Set(cookies)].join("; ");
}

function validateRedirectTarget(location, healthUrl) {
  let target;

  try {
    target = new URL(location, healthUrl);
  } catch {
    throw new Error("Vercel redirect supplied an invalid Location header.");
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
      "Vercel bypass redirect rejected: target must remain HTTPS on the exact original host and health path."
    );
  }

  return target;
}

async function readHealthResponse(response) {
  return response.json().catch(() => null);
}

export async function verifyDeployment({
  baseUrl,
  env = process.env,
  fetchImpl = fetch,
  log = console,
}) {
  if (!baseUrl) {
    throw new Error(
      "Usage: npm run verify:deployment -- https://your-domain.example"
    );
  }

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const healthUrl = `${normalizedBaseUrl}/api/health`;
  const trustedOidcToken = env.VERCEL_TRUSTED_OIDC_TOKEN;
  const bypassSecret = env.VERCEL_AUTOMATION_BYPASS_SECRET;

  const headers = { Accept: "application/json" };
  let authenticationMode = "none";

  if (trustedOidcToken) {
    headers["x-vercel-trusted-oidc-idp-token"] = trustedOidcToken;
    authenticationMode = "trusted-oidc";
  } else if (bypassSecret) {
    headers["x-vercel-protection-bypass"] = bypassSecret;
    headers["x-vercel-set-bypass-cookie"] = "samesitenone";
    authenticationMode = "automation-bypass";
  }

  log.log(
    `Deployment verification authentication mode: ${authenticationMode}`
  );
  logSafeUrl(log, "Health endpoint", healthUrl);

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
      }`
    );

    if (response.status >= 300 && response.status < 400) {
      if (authenticationMode !== "automation-bypass") {
        throw new Error(
          `HTTP ${response.status}: redirect received without automation-bypass authentication.`
        );
      }

      const location = response.headers.get("location");
      if (!location) {
        throw new Error(
          `HTTP ${response.status}: redirect response is missing Location.`
        );
      }

      const redirectTarget = validateRedirectTarget(location, healthUrl);
      logSafeUrl(log, "Validated bypass redirect", redirectTarget.href);

      const cookieHeader = buildCookieHeader(
        getSetCookieValues(response.headers)
      );

      if (!cookieHeader) {
        throw new Error(
          "Vercel bypass redirect did not provide a usable Set-Cookie value; refusing to retry."
        );
      }

      log.log(
        "Vercel bypass cookie received; retrying the original health endpoint once."
      );

      const retryHeaders = {
        ...headers,
        Cookie: cookieHeader,
      };

      response = await fetchImpl(healthUrl, {
        method: "GET",
        headers: retryHeaders,
        redirect: "manual",
      });

      log.log(`Retry HTTP status: ${response.status}`);
      log.log(
        `Retry Vercel request ID: ${
          response.headers.get("x-vercel-id") ||
          response.headers.get("x-vercel-request-id") ||
          "<not provided>"
        }`
      );

      if (response.status >= 300 && response.status < 400) {
        const retryLocation = response.headers.get("location");
        if (retryLocation) {
          logSafeUrl(
            log,
            "Retry redirect target",
            retryLocation,
            healthUrl
          );
        }

        throw new Error(
          `HTTP ${response.status}: Vercel bypass cookie retry still redirected; verification failed.`
        );
      }
    }

    const body = await readHealthResponse(response);

    if (!response.ok) {
      if (response.status === 401) {
        if (authenticationMode === "trusted-oidc") {
          throw new Error(
            "HTTP 401: Vercel rejected the GitHub Actions OIDC token. Check the Trusted Source account, repository, workflow, branch, audience, and environment mapping."
          );
        }

        if (authenticationMode === "automation-bypass") {
          throw new Error(
            "HTTP 401: Vercel rejected the automation bypass secret or bypass cookie."
          );
        }

        throw new Error(
          "HTTP 401: no Vercel deployment authentication was provided."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "HTTP 403: Vercel rejected the deployment access policy. Check Trusted Sources environment mapping and bypass configuration."
        );
      }

      throw new Error(`HTTP ${response.status}`);
    }

    const failures = [];

    if (body?.ok !== true) failures.push("health.ok must be true");
    if (body?.service !== "AIOS Alpha") {
      failures.push("health.service mismatch");
    }
    if (!body?.release) failures.push("health.release is missing");
    if (body?.checks?.application !== "ok") {
      failures.push("application check failed");
    }
    if (body?.checks?.manifest !== "ok") {
      failures.push("manifest check failed");
    }

    if (failures.length > 0) {
      throw new Error(
        `Deployment health payload validation failed: ${failures.join("; ")}`
      );
    }

    log.log("AIOS Alpha deployment verification passed.");
    log.log(`Authentication: ${authenticationMode}`);
    log.log(`Release: ${body.release}`);
    log.log(`Timestamp: ${body.timestamp || "<not provided>"}`);

    return {
      ok: true,
      authenticationMode,
      release: body.release,
    };
  } catch (error) {
    log.error("AIOS Alpha deployment verification failed.");
    log.error(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const baseUrl = process.argv[2] || process.env.AIOS_BASE_URL;

  verifyDeployment({ baseUrl }).catch(() => {
    process.exitCode = 1;
  });
}
