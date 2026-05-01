import { handlers } from "@/lib/auth/config";

// Export Next.js route handlers for GET and POST
// NextAuth v5 handles all auth routes under /api/auth/*
export const { GET, POST } = handlers;
