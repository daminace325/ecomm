import { NextRequest, NextResponse } from "next/server";

// Pages that require a signed-in user. Add more as you build them.
const PROTECTED_PREFIXES = ["/account", "/cart", "/profile", "/orders", "/checkout"];

// If a signed-in user hits these, send them home instead.
const AUTH_PAGES = ["/signin", "/signup"];

export function proxy(req: NextRequest) {
    const { pathname, search } = req.nextUrl;
    const hasToken = Boolean(req.cookies.get("token")?.value);

    const isProtected = PROTECTED_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    const isAuthPage = AUTH_PAGES.includes(pathname);

    if (isProtected && !hasToken) {
        const url = req.nextUrl.clone();
        url.pathname = "/signin";
        url.search = `?next=${encodeURIComponent(pathname + search)}`;
        return NextResponse.redirect(url);
    }

    if (isAuthPage && hasToken) {
        const nextParam = req.nextUrl.searchParams.get("next");
        const url = req.nextUrl.clone();
        url.pathname = nextParam && nextParam.startsWith("/") ? nextParam : "/";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    // Run on everything except Next internals, API routes, and static files.
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)"],
};
