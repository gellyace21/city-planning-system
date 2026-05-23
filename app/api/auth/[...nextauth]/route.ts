import NextAuth, { DefaultSession, SessionStrategy } from "next-auth";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Admin, Lead } from "@/types/user";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { readAppState } from "@/lib/appState";

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
        const db = await readAppState<{
          admins?: Admin[];
          leads?: Lead[];
          generated_links?: Array<{ token: string; lead_id: number }>;
        }>();

        const token = String(credentials.token || "").trim();
        if (token) {
          const link = (db.generated_links || []).find(
            (entry: { token: string }) => entry.token === token,
          );
          if (link) {
            const lead = (db.leads || []).find(
              (u: Lead) => u.id === link.lead_id,
            );
            if (lead) {
              return {
                id: String(lead.id),
                name: lead.username || `Lead ${lead.id}`,
                email: lead.username || `lead-${lead.id}`,
                role: "lead",
                department: lead.department,
                profile_pic: lead.profile_pic,
              };
            }
          }
          return null;
        }

        const superadmin = (db.admins ?? []).find(
          (u: Admin) =>
            u.email === credentials.email && u.is_superadmin === true,
        );

        if (
          superadmin &&
          bcrypt.compareSync(credentials.password, superadmin.password_hash)
        ) {
          return {
            id: String(superadmin.id),
            name: superadmin.name,
            email: superadmin.email,
            role: "superadmin",
            profile_pic: superadmin.profile_pic,
          };
        }

        // Try admin by email
        const user = (db.admins ?? []).find(
          (u: Admin) =>
            u.email === credentials.email && u.is_superadmin !== true,
        );
        if (
          user &&
          bcrypt.compareSync(credentials.password, user.password_hash)
        ) {
          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: "admin",
            profile_pic: user.profile_pic,
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
        session.user.id = String(token.id);
        session.user.role = token.role as string;
        if (token.profile_pic)
          session.user.profile_pic = token.profile_pic as string;
        if (token.department)
          session.user.department = token.department as string;
      }
      return session;
    },
    async jwt({ token, user }) {
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
