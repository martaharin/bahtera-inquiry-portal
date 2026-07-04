import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      user_id: string;
      user_name: string;
      role_name: string;
      industry?: string;
      branch?: string;
    } & DefaultSession["user"];
  }

  interface User {
    user_id: string;
    user_name: string;
    role_name: string;
    industry?: string;
    branch?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user_id: string;
    user_name: string;
    role_name: string;
    industry?: string;
    branch?: string;
  }
}