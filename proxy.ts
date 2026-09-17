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

// C143.8 Web Intelligence autonomous health
"/api/health/web-intelligence",

/*

* Founder-only Web Intelligence verification.
* This route must reach its own handler so it
* can authenticate with FOUNDER_ACCESS_KEY.
    */
    "/api/founder/web-intelligence/verify",

/*

* C145.2 Founder Commerce Regression.
* These routes perform their own Founder authentication.
* They must not be intercepted by the Alpha access redirect.
    */
    "/founder/commerce-market-regression",
    "/api/founder/commerce/market-regression",

/*

* C145.4 Founder Commerce Candidate Pool Regression.
* These routes perform their own Founder authentication.
* They must not be intercepted by the Alpha access redirect.
    */
    "/founder/commerce-candidate-pool-regression",
    "/api/founder/commerce/candidate-pool-regression",
    ];

function isPublicPath(
pathname: string,
): boolean {
return PUBLIC_PATHS.some(
(path) =>
pathname === path ||
pathname.startsWith(
${path}/,
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
/.(?:png|jpg|jpeg|svg|gif|webp|ico)$/.test(
pathname,
)
);
}

export function proxy(
request: NextRequest,
) {
const pathname =
request.nextUrl.pathname;

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
