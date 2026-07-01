import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        console.log("===== LOGIN START =====");
        console.log("Input:", credentials);

        // console.log("HASIL ENKRIPSI 123456 COPIED:", encrypt("123456"));

        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("Email atau password kosong");
            return null;
          }

          console.log("Before Query");

          const result = await db.query(
            `
            SELECT
              u.user_id,
              u.user_email,
              u.user_name,
              u.password,
              r.role_name AS master_role,
              sp.role_name AS sales_role,
              sp.industry,
              sp.branch
            FROM public.users u
            JOIN public.role r
              ON u.role_id = r.role_id
            LEFT JOIN public.sales_person sp
              ON u.user_id = sp.user_id
            WHERE LOWER(u.user_email) = LOWER($1)
            LIMIT 1
            `,
            [credentials.email]
          );

          console.log("After Query");

          if (result.rows.length === 0) {
            console.log("User tidak ditemukan");
            return null;
          }

          const user = result.rows[0];

          const dbPassword = String(user.password || "");

          const decryptedPassword = dbPassword.includes(":")
            ? decrypt(dbPassword)
            : dbPassword;

          const isValidPassword = decryptedPassword === credentials.password;

          console.log("DB password encrypted:", dbPassword.includes(":"));
          console.log("Password Match:", isValidPassword);

          if (!isValidPassword) {
            console.log("Password salah!");
            return null;
          }

          const finalRoleName = user.sales_role || user.master_role;

          return {
            id: user.user_id,
            email: user.user_email,
            name: user.user_name,
            user_id: user.user_id,
            user_name: user.user_name,
            role_name: finalRoleName,
            industry: user.industry,
            branch: user.branch,
          };
        } catch (error) {
          console.error("NEXTAUTH AUTHORIZE ERROR:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user_id = (user as any).user_id;
        token.user_name = (user as any).user_name;
        token.role_name = (user as any).role_name;
        token.industry = (user as any).industry;
        token.branch = (user as any).branch;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).user_id = token.user_id;
        (session.user as any).user_name = token.user_name;
        (session.user as any).role_name = token.role_name;
        (session.user as any).industry = token.industry;
        (session.user as any).branch = token.branch;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };