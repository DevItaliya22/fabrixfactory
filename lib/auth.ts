import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;

        if (
          email &&
          password &&
          email === process.env.ADMIN_EMAIL &&
          password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "admin", email, name: "Admin" };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getSession() {
  return getServerSession(authOptions);
}

export const PUBLIC_PATHS = ["/login"] as const;

export const PUBLIC_API_PREFIX = "/api/auth";

export function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number]) ||
    pathname.startsWith(PUBLIC_API_PREFIX)
  );
}
