import {
  NextRequest,
  NextResponse,
} from "next/server";

const ACCESS_COOKIE =
  "aios_alpha_access";

const ACCESS_VALUE =
  "granted_v1";

const PUBLIC_PATHS = [
  "/alpha",
  "/privacy",
  "/api/alpha/status",
  "/api/alpha/invite",
  "/api/health",

  // Vercel Cron / Evolution Runtime
  "/api/evolution/heartbeat",

  /*
   * Founder-only Web Intelligence verification.
   *
   * This route must reach its own handler so it
   * can authenticate with FOUNDER_ACCESS_KEY.
   *
   * It does NOT grant ordinary users access because
   * authentication is enforced inside the route.
   */
  "/api/founder/web-intelligence/verify",
];

function isPublicPath(
  pathname: string,
): boolean {
  return PUBLIC_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(
        `${path}/`,
      ),
  );
}

function isPublicAsset(
  pathname: string,
): boolean {
  return (
    pathname.startsWith(
      "/_next/",
    ) ||
    pathname ===
      "/favicon.ico" ||
    pathname ===
      "/apple-touch-icon.png" ||
    pathname ===
      "/apple-touch-icon-precomposed.png" ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/.test(
      pathname,
    )
  );
}

export function proxy(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  /*
   * Public routes and explicitly protected
   * system routes are allowed to reach their
   * own route handlers.
   *
   * Authentication for protected system routes
   * must be handled by the route itself.
   */
  if (
    isPublicPath(pathname) ||
    isPublicAsset(pathname)
  ) {
    return NextResponse.next();
  }

  const access =
    request.cookies.get(
      ACCESS_COOKIE,
    )?.value;

  if (
    access ===
    ACCESS_VALUE
  ) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith(
      "/api/",
    )
  ) {
    return NextResponse.json(
      {
        success: false,

        content:
          "Alpha access required.",

        error:
          "Unauthorized alpha access.",

        redirect:
          "/alpha",

        timestamp:
          Date.now(),
      },
      {
        status: 401,

        headers: {
          "Cache-Control":
            "no-store",

          "Content-Type":
            "application/json; charset=utf-8",
        },
      },
    );
  }

  const alphaUrl =
    request.nextUrl.clone();

  alphaUrl.pathname =
    "/alpha";

  alphaUrl.searchParams.set(
    "from",
    pathname,
  );

  return NextResponse.redirect(
    alphaUrl,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image).*)",
  ],
};
