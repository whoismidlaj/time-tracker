import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

// User-facing routes that admins should not access
const USER_ROUTES = ["/", "/history", "/reports", "/help"];

// Admin routes that need admin role
const ADMIN_ROUTES = ["/admin"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const role = token?.role;

  // --- Protect user routes from admins ---
  const isUserRoute = USER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isUserRoute && role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // --- Protect admin routes: non-admins get bounced to login ---
  const isAdminRoute =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // --- Redirect logged-in non-admins away from admin login ---
  if (pathname === "/admin/login" && token && role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all non-API, non-static routes
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)",
  ],
};
