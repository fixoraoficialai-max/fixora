import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { logAudit, AuditAction } from "@/lib/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,

  // Use JWT strategy for credentials provider
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    Credentials({
      name: "credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // Validate input shape before any DB call
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            image: true,
            role: true,
          },
        });

        // No user found or OAuth-only user (no password)
        if (!user || !user.password) return null;

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),

    // ── Google OAuth ──────────────────────────────────────────────────────────
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Always show account picker — prevents silent auto-login confusion
      authorization: { params: { prompt: "select_account" } },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Persist user id and role in the JWT on sign-in
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },

    async session({ session, token }) {
      // Expose id and role on the session object
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Auto-provision credits for ALL new users (email/password AND OAuth)
      // Using upsert — safe if the register route already created the record
      await db.userCredits.upsert({
        where:  { userId: user.id! },
        create: { userId: user.id!, balance: 10, lifetime: 10 },
        update: {},
      });

      logAudit(AuditAction.REGISTER_SUCCESS, {
        userId: user.id,
        metadata: { email: user.email, provider: "oauth" },
      });
    },
  },
});
