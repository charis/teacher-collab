// Library imports
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

/**
 * withAuth wrapper:
 * - The `authorized` callback decides whether the incoming request is authorized.
 * - It receives `token` (JWT | null) and `req` (NextRequest).
 *
 * Logic:
 * - Allow anything under /auth (signin, oauth callbacks).
 * - Consider the request authorized if the token contains a common identifier:
 *   sub (subject), id, or email. Adjust fields to match what you store on sign-in.
 */
export default withAuth(
    // middleware function: you can perform side-effects here if needed (logging, headers, etc.)
    (_req: NextRequest) => {
        // No-op: authorization is handled by the callback below.
    },
    {
        callbacks: {
            async authorized({ token, req }: { token: JWT | null; req: NextRequest }) {
                const pathname = req.nextUrl.pathname;
                
                // Always allow the sign-in page and related auth routes
                if (pathname.startsWith("/auth")) {
                    return true;
                }
                
                // Allow next internals & static assets (if your matcher includes them, otherwise safe-guard)
                if (
                    pathname.startsWith("/_next") ||
                    pathname.startsWith("/api") ||
                    pathname === "/favicon.ico"
                ) {
                    return true;
                }
                
                // Consider the user authenticated if the JWT contains a recognizable identifier.
                // `sub` is the standard JWT subject; some flows add `id` or `email`.
                return Boolean(
                    token && (
                        typeof token.sub === "string"                                        ||
                        typeof (token as unknown as Record<string, unknown>).id === "string" ||
                        typeof (token as unknown as Record<string, unknown>).email === "string"
                    )
                );
            },
        },
    }
);

/**
 * Matcher controls which paths this middleware applies to.
 * The regex here protects all top-level routes except API, _next static, images,
 * and favicon.
 */
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
