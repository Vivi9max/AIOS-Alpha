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
 * Founder routes are intentionally public
 * at the routing layer because they perform
 * their own Founder authentication.
 *
 * This does NOT make Founder data public.
 * Founder API/page authentication remains
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
   *
   * These routes must reach their own
   * Founder authentication layer instead
   * of being redirected to /alpha.
   */
  "/founder",

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
   * Founder routes intentionally bypass
   * the Alpha cookie gate.
   *
   * IMPORTANT:
   * This only allows the request to reach
   * the Founder page/API.
   *
   * Actual Founder authorization remains
   * enforced by:
   *
   * - Founder page/API auth
   * - FOUNDER_ACCESS_KEY
   * - Authorization: Bearer ...
   * - x-aios-founder-key
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

  /**
   * API requests return JSON instead
   * of redirecting.
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
   * Normal user-facing protected
   * routes still go through Alpha.
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
