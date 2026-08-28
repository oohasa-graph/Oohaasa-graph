import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getAuthEnv, verifyCredentials } from "@/auth/credentials";

export function createAuthOptions(env = getAuthEnv()): NextAuthOptions {
  return {
    secret: env.NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers: [
      CredentialsProvider({
        name: "Private access",
        credentials: {
          username: { label: "Username", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          return verifyCredentials(credentials?.username, credentials?.password, env);
        },
      }),
    ],
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Private access",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return verifyCredentials(credentials?.username, credentials?.password);
      },
    }),
  ],
};
