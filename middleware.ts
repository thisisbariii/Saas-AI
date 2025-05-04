import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/about", "/contact", "/api/webhook", "/dashboard"], // ✅ Added "/dashboard"
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", // Middleware for all non-static routes
    "/(api|trpc)(.*)",        // Include API routes
    "/",                      // Include root
  ],
};
