import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login", // Redirect unauthenticated users here
  },
});

// Optionally, restrict to certain paths:
export const config = {
  matcher: [
    "/dashboard/:path*", // Protect all dashboard routes
    "/profile/:path*",
    // add more protected routes here
  ],
};
