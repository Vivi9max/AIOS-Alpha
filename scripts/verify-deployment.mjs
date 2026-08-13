const baseUrl = process.argv[2] || process.env.AIOS_BASE_URL;

if (!baseUrl) {
  console.error(
    "Usage: npm run verify:deployment -- https://your-domain.example"
  );
  process.exit(1);
}

const bypassSecret =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const normalizedBaseUrl =
  baseUrl.replace(/\/$/, "");

const healthUrl =
  `${normalizedBaseUrl}/api/health`;

const headers = {
  Accept: "application/json",
};

if (bypassSecret) {
  headers["x-vercel-protection-bypass"] =
    bypassSecret;

  headers["x-vercel-set-bypass-cookie"] =
    "samesitenone";
}

try {
  const response = await fetch(healthUrl, {
    headers,
    redirect: "manual",
  });

  const body =
    await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      if (!bypassSecret) {
        throw new Error(
          "HTTP 401: Vercel Deployment Protection is enabled and VERCEL_AUTOMATION_BYPASS_SECRET is not available."
        );
      }

      throw new Error(
        "HTTP 401: Vercel rejected the automation bypass secret. Confirm the Vercel Protection Bypass secret and GitHub Actions secret are the same, then retry."
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

  if (
    body?.checks?.application !== "ok"
  ) {
    failures.push(
      "application check failed"
    );
  }

  if (
    body?.checks?.manifest !== "ok"
  ) {
    failures.push(
      "manifest check failed"
    );
  }

  if (failures.length) {
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
    `URL: ${healthUrl}`
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
