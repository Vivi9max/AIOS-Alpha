import {
  NextRequest,
  NextResponse,
} from "next/server";

const ACCESS_COOKIE =
  "aios_alpha_access";

const ACCESS_VALUE =
  "granted_v1";

/**
 * Public routes that must bypass
 * the normal Alpha access gate.
 *
 * Founder routes are intentionally allowed
 * through the routing layer because they
 * perform their own Founder authentication.
 *
 * This does NOT make Founder data public.
 * Founder page/API authentication remains
 * responsible for access control.
 */
const PUBLIC_PATHS = [
  "/alpha",
  "/privacy",

  "/api/alpha/status",
  "/api/alpha/invite",

  "/api/health",
  "/api/evolution/heartbeat",
  "/api/health/web-intelligence",

  "/api/founder/web-intelligence/verify",

  /**
   * Founder Console
   */
  "/founder",

  /**
   * C146.18.3
   *
   * Real media execution verification API.
   *
   * The route itself performs Founder
   * authentication using FOUNDER_ACCESS_KEY.
   */
  "/api/founder/media/chat-regression",

  /**
   * Existing Founder regression pages
   */
  "/founder/commerce-market-regression",
  "/api/founder/commerce/market-regression",

  "/founder/commerce-candidate-pool-regression",
  "/api/founder/commerce/candidate-pool-regression",

  "/founder/commerce-unit-economics",
  "/api/founder/commerce/unit-economics",

  "/founder/commerce-test",
  "/api/founder/commerce/test",

  "/founder/commerce-reality",
  "/api/founder/commerce/reality",

  /**
   * C147.21
   *
   * Public Market Intelligence.
   *
   * These routes intentionally bypass
   * the normal Alpha access cookie gate.
   *
   * The API itself is read-only and does not
   * perform human-review mutation, Planner
   * dispatch or trading execution.
   */
  "/market-intelligence",
  "/api/market/intelligence",

  /**
   * C147.21.1
   *
   * Founder-only regression page/API.
   *
   * The routing layer allows the request through;
   * the API performs Founder authentication itself.
   */
  "/founder/market/public-intelligence-regression",
  "/api/founder/market/public-intelligence-regression",
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

  /**
   * Public / Founder routes bypass
   * the Alpha cookie gate.
   *
   * IMPORTANT:
   *
   * This only allows the request to reach
   * the destination route.
   *
   * Sensitive Founder routes MUST perform
   * their own authentication.
   */
  if (
    isPublicPath(pathname) ||
    isPublicAsset(pathname)
  ) {
    return NextResponse.next();
  }

  /**
   * Normal Alpha access.
   */
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

  /**
   * Protected API requests return JSON
   * instead of redirecting to /alpha.
   */
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
        redirect: "/alpha",
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

  /**
   * Normal user-facing protected routes
   * continue through the Alpha gate.
   */
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
