import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // Block non-superadmins from /dashboard/admin
    if (req.nextUrl.pathname.startsWith("/dashboard/superadmin")) {
      if (token?.role !== "superadmin") {
        return new Response("Unauthorized", { status: 403 });
      }
    }

    return null;
  },
  {
    pages: { signIn: "/auth/login" },
  },
);

// Optionally, restrict to certain paths:
export const config = {
  matcher: [
    "/dashboard/:path*", // Protect all dashboard routes
    "/profile/:path*",
    // add more protected routes here
  ],
};
