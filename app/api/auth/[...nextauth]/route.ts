import NextAuth, { DefaultSession, SessionStrategy } from "next-auth";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Admin, Lead } from "@/types/user";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { sql } from "@/lib/db";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    profile_pic?: string;
    department?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      profile_pic?: string;
      department?: string;
    } & DefaultSession["user"];
  }
}

const fallbackDevSecret = "city-planning-dev-secret-change-me";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || fallbackDevSecret,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const token = String(credentials.token || "").trim();
        if (token) {
          const rows = (await sql`
            SELECT
              l.id,
              l.username,
              l.department
            FROM generated_links gl
            INNER JOIN leads l ON l.id = gl.lead_id
            WHERE gl.token = ${token}
            LIMIT 1
          `) as Array<{
            id: number;
            username: string | null;
            department: string | null;
          }>;

          const lead = rows[0];
          if (lead) {
            return {
              id: String(lead.id),
              name: lead.username || `Lead ${lead.id}`,
              email: lead.username || `lead-${lead.id}`,
              role: "lead",
              department: lead.department || undefined,
            };
          }
          return null;
        }

        const superadminRows = (await sql`
          SELECT id, name, email, password_hash, profile_pic, is_superadmin
          FROM admins
          WHERE email = ${credentials.email} AND is_superadmin = true
          LIMIT 1
        `) as Array<
          Admin & { password_hash: string; profile_pic?: string | null }
        >;
        const superadmin = superadminRows[0];

        if (
          superadmin &&
          bcrypt.compareSync(credentials.password, superadmin.password_hash)
        ) {
          return {
            id: String(superadmin.id),
            name: superadmin.name,
            email: superadmin.email,
            role: "superadmin",
            profile_pic: superadmin.profile_pic || undefined,
          };
        }

        const adminRows = (await sql`
          SELECT id, name, email, password_hash, profile_pic, is_superadmin
          FROM admins
          WHERE email = ${credentials.email} AND is_superadmin <> true
          LIMIT 1
        `) as Array<
          Admin & { password_hash: string; profile_pic?: string | null }
        >;
        const user = adminRows[0];
        if (
          user &&
          bcrypt.compareSync(credentials.password, user.password_hash)
        ) {
          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: "admin",
            profile_pic: user.profile_pic || undefined,
          };
        }

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
        session.user.id = String(token.id);
        session.user.role = token.role as string;
        if (token.profile_pic)
          session.user.profile_pic = token.profile_pic as string;
        if (token.department)
          session.user.department = token.department as string;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        if (user.profile_pic) token.profile_pic = user.profile_pic;
        if (user.department) token.department = user.department;
      }

      if (trigger === "update" && session) {
        if (typeof session.profile_pic === "string") {
          token.profile_pic = session.profile_pic;
        }
        if (typeof session.department === "string") {
          token.department = session.department;
        }
        if (typeof session.name === "string") {
          token.name = session.name;
        }
        if (typeof session.email === "string") {
          token.email = session.email;
        }
      }

      return token;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
