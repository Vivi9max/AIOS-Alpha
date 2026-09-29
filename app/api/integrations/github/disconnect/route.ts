import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

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
          "FOUNDER_ONLY",
        error:
          "GitHub integration is available only in the Founder Console.",
      },
      {
        status: 403,
      },
    );
  }

  return NextResponse.json(
    {
      success: false,
      code:
        "LEGACY_GITHUB_ROUTE",
      error:
        "Use the Founder GitHub disconnect route.",
    },
    {
      status: 410,
    },
  );
}
