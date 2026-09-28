import {
  NextResponse,
} from "next/server";

import {
  clearUserGitHubConnection,
} from "@/lib/integrations/github/user-github";

export async function POST() {
  const response =
    NextResponse.json(
      {
        success: true,
        connected: false,
      },
    );

  clearUserGitHubConnection(
    response,
  );

  return response;
}
