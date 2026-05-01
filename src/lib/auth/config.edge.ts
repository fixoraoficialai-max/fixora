import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config — NO Node.js dependencies.
 * Used only in middleware (Edge Runtime, 1 MB limit).
 *
 * Rules:
 *  - No imports from bcrypt, Prisma, or any Node.js-only package.
 *  - No providers (they import Node.js deps) — providers live in config.ts.
 *  - Only defines pages, callbacks, and session strategy.
 */
export const authConfigEdge: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,

  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },

  // No adapter, no providers — those require Node.js and live in config.ts
  providers: [],
};
