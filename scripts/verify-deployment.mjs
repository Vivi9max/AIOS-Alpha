
const baseUrl = process.argv[2] || process.env.AIOS_BASE_URL;

if (!baseUrl) {
  console.error(
    "Usage: npm run verify:deployment -- https://your-domain.example"
  );
  process.exit(1);
}

const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
const healthUrl = `${normalizedBaseUrl}/api/health`;

const trustedOidcToken =
  process.env.VERCEL_TRUSTED_OIDC_TOKEN;

const bypassSecret =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

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

function logSafeUrl(label, value, base) {
  const parts = getSafeUrlParts(value, base);

  console.log(`${label} host: ${parts.host}`);
  console.log(`${label} path: ${parts.path}`);
}

console.log(
  `Deployment verification authentication mode: ${authenticationMode}`
);

logSafeUrl("Health endpoint", healthUrl);

try {
  const response = await fetch(healthUrl, {
    method: "GET",
    headers,
    redirect: "manual",
  });

  const vercelRequestId =
    response.headers.get("x-vercel-id");

  const vercelRequestIdFallback =
    response.headers.get("x-vercel-request-id");

  console.log(
    `HTTP status: ${response.status}`
  );

  console.log(
    `HTTP status text: ${response.statusText || "<none>"}`
  );

  console.log(
    `Vercel request ID: ${vercelRequestId || vercelRequestIdFallback || "<not provided>"}`
  );

  if (response.status >= 300 && response.status < 400) {
    const redirectLocation =
      response.headers.get("location");

    if (redirectLocation) {
      logSafeUrl(
        "Redirect target",
        redirectLocation,
        healthUrl
      );
    } else {
      console.log(
        "Redirect target: <Location header missing>"
      );
    }
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status >= 300 && response.status < 400) {
      throw new Error(
        `HTTP ${response.status}: redirect received; redirects are not accepted as deployment verification success.`
      );
    }

    if (response.status === 401) {
      if (authenticationMode === "trusted-oidc") {
        throw new Error(
          "HTTP 401: Vercel rejected the GitHub Actions OIDC token. Check the Trusted Source account, repository, workflow, branch, audience, and environment mapping."
        );
      }

      if (authenticationMode === "automation-bypass") {
        throw new Error(
          "HTTP 401: Vercel rejected the automation bypass secret."
        );
      }

      throw new Error(
        "HTTP 401: no Vercel deployment authentication was provided."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "HTTP 403: Vercel rejected the deployment access policy. Check Trusted Sources environment mapping."
      );
    }

    throw new Error(
      `HTTP ${response.status}`
    );
  }

  const failures = [];

  if (body?.ok !== true) {
    failures.push(
      "health.ok must be true"
    );
  }

  if (body?.service !== "AIOS Alpha") {
    failures.push(
      "health.service mismatch"
    );
  }

  if (!body?.release) {
    failures.push(
      "health.release is missing"
    );
  }

  if (body?.checks?.application !== "ok") {
    failures.push(
      "application check failed"
    );
  }

  if (body?.checks?.manifest !== "ok") {
    failures.push(
      "manifest check failed"
    );
  }

  if (failures.length > 0) {
    console.error(
      "Deployment verification failed."
    );

    failures.forEach((failure) => {
      console.error(`- ${failure}`);
    });

    process.exit(1);
  }

  console.log(
    "AIOS Alpha deployment verification passed."
  );

  console.log(
    `Authentication: ${authenticationMode}`
  );

  console.log(
    `Release: ${body.release}`
  );

  console.log(
    `Timestamp: ${body.timestamp}`
  );
} catch (error) {
  console.error(
    "AIOS Alpha deployment verification failed."
  );

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exit(1);
}
