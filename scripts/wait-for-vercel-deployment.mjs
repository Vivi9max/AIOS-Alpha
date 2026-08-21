const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
const outputFile = process.env.GITHUB_OUTPUT;

if (!token || !repository || !sha) {
  console.error(
    "GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_SHA are required."
  );
  process.exit(1);
}

const apiBase = `https://api.github.com/repos/${repository}`;

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
};

async function github(path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status}: ${
        body?.message || response.statusText
      }`
    );
  }

  return body;
}

async function findDeployment() {
  const deployments = await github(
    `/deployments?sha=${encodeURIComponent(sha)}&per_page=20`
  );

  for (const deployment of deployments) {
    if (deployment.environment !== "Preview") {
      continue;
    }

    const statuses = await github(
      `/deployments/${deployment.id}/statuses?per_page=20`
    );

    const status = statuses[0];

    if (!status) {
      continue;
    }

    if (["error", "failure"].includes(status.state)) {
      throw new Error(
        `Vercel deployment ${deployment.id} failed with state: ${status.state}`
      );
    }

    if (status.state === "success" && status.environment_url) {
      return status.environment_url;
    }
  }

  return null;
}

const timeoutMs = 10 * 60 * 1000;
const intervalMs = 10 * 1000;
const deadline = Date.now() + timeoutMs;

console.log(
  `Waiting for Vercel Preview deployment for commit ${sha}...`
);

while (Date.now() < deadline) {
  try {
    const url = await findDeployment();

    if (url) {
      console.log(
        `Vercel Preview deployment is ready: ${url}`
      );

      if (outputFile) {
        const { appendFile } = await import("node:fs/promises");

        await appendFile(
          outputFile,
          `base_url=${url}\n`
        );
      }

      process.exit(0);
    }

    console.log(
      "Vercel deployment is not ready yet; waiting 10 seconds..."
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : String(error)
    );

    process.exit(1);
  }

  await sleep(intervalMs);
}

console.error(
  "Timed out waiting for a successful Vercel Preview deployment."
);

process.exit(1);
