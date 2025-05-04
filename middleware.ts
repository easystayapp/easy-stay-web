import { withAuth } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost";



export default withAuth(
    async function middleware(request: NextRequest) {
        const url = request.nextUrl.clone();
        const host = request.headers.get("host") ?? "";
        const subdomain = host.split(".")[0];

        // If it's a normal user (no subdomain)
        if (
            host === BASE_DOMAIN || !host.includes(".")
        ) {
            return NextResponse.next();
        }

        const isValid = isValidSlug(subdomain);
        if (!isValid && !url.pathname.endsWith("/not-found")) {
            return NextResponse.redirect(
                new URL(`${url.protocol}//${BASE_DOMAIN}/not-found`, request.url)
            );
        }

        // ✅ Business user specific logic
        if (subdomain === "business") {
            const isAuthenticated = await getToken({ req: request });
            console.log("Business user authenticated:", isAuthenticated);

            const isOnLoginOrRegisterPage = ["/login", "/register"].includes(url.pathname);

            if (!isAuthenticated && !isOnLoginOrRegisterPage) {
                // Redirect unauthenticated business user to login
                return NextResponse.redirect(
                    new URL("/login", request.url)
                );
            }

            // Rewrite for business subdomain
            return NextResponse.rewrite(
                new URL(`/business${url.pathname}`, request.url)
            );
        }
        // ✅ Admin user specific logic
        if (subdomain === "admin") {
            // Check if the user is NOT authenticated AND not on /login
            const isAuthenticated = await getToken({ req: request });
            const isOnLoginOrRegisterPage = ["/login", "/register"].includes(url.pathname);

            if (!isAuthenticated && !isOnLoginOrRegisterPage) {
                // Redirect unauthenticated business user to login
                return NextResponse.redirect(
                    new URL("/login", request.url)
                );
            }

            // Rewrite for business subdomain
            return NextResponse.rewrite(
                new URL(`/admin${url.pathname}`, request.url)
            );
        }

        // Rewrite for other valid subdomains (admin, tenant, etc.)
        return NextResponse.rewrite(
            new URL(`/${subdomain}${url.pathname}`, request.url)
        );
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname, host } = req.nextUrl;
                // const subdomain = host.split(".")[0];

                // Allow auth routes globally
                if (
                    pathname.startsWith("/api/auth") ||
                    pathname === "/login" ||
                    pathname === "/register"
                ) {
                    return true;
                }

                // Normal user public access
                if (
                    host === BASE_DOMAIN &&
                    (pathname === "/" ||
                        pathname.startsWith("/api/property") ||
                        pathname.startsWith("/images"))
                ) {
                    return true;
                }

                // All other routes require login
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|images|public).*)",
    ],
};

function isValidSlug(slug: string | undefined): boolean {
    const allowedSubdomains = ["business", "admin", "tenant"];
    return !!slug && allowedSubdomains.includes(slug);
}
