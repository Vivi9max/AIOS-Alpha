import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  clearUserGitHubConnection,
} from "@/lib/integrations/github/user-github";

export async function POST(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        error:
          "Founder authorization is required.",
      },
      {
        status: 401,
      },
    );
  }

  const response =
    NextResponse.json({
      success: true,
      configured: true,
      connected: false,
    });

  clearUserGitHubConnection(
    response,
  );

  return response;
}
