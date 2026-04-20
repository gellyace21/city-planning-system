import NextAuth, { DefaultSession, SessionStrategy } from "next-auth";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { readFileSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { Admin, Lead } from "@/types/user";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      role: string;
      profile_pic?: string;
      department?: string;
    } & DefaultSession["user"];
  }
}

const fallbackDevSecret = "city-planning-dev-secret-change-me";

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || fallbackDevSecret,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const dbPath = path.join(process.cwd(), "db.json");
        const db = JSON.parse(readFileSync(dbPath, "utf-8"));

        let superadmin = db.admins.find(
          (u: Admin) =>
            u.email === credentials.email && u.is_superadmin === true,
        );

        if (
          superadmin &&
          bcrypt.compareSync(credentials.password, superadmin.password_hash)
        ) {
          return {
            id: superadmin.id,
            name: superadmin.name,
            email: superadmin.email,
            role: "superadmin",
            profile_pic: superadmin.profile_pic,
          };
        }

        // Try admin by email
        let user = db.admins.find(
          (u: Admin) =>
            u.email === credentials.email && u.is_superadmin !== true,
        );
        if (
          user &&
          bcrypt.compareSync(credentials.password, user.password_hash)
        ) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: "admin",
            profile_pic: user.profile_pic,
          };
        }

        // Try lead by username
        user = db.leads.find((u: Lead) => u.username === credentials.email);
        if (
          user &&
          bcrypt.compareSync(credentials.password, user.password_hash)
        ) {
          return {
            id: user.id,
            name: user.username,
            email: user.username,
            role: "lead",
            department: user.department,
          };
        }

        // Invalid credentials
        return null;
      },
    }),
  ],

  session: { strategy: "jwt" as SessionStrategy },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user.id = token.id as number;
        session.user.role = token.role as string;
        if (token.profile_pic)
          session.user.profile_pic = token.profile_pic as string;
        if (token.department)
          session.user.department = token.department as string;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        if (user.profile_pic) token.profile_pic = user.profile_pic;
        if (user.department) token.department = user.department;
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
