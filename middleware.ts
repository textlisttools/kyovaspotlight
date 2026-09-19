import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/api/push/(.*)",
  "/api/admin/(.*)",
  "/api/reserve(.*)",
]);

// /reserve itself (browsing available slots) stays public — only actually
// claiming one (POST /api/reserve) requires sign-in. The Stripe webhook
// is deliberately never in this list: Stripe calls it directly, with no
// Clerk session, and its own signature check is what authenticates it.

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth().protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
