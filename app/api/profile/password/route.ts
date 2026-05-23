import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sql } from "@/lib/db";

type PasswordBody = {
  id: number | string;
  currentPassword: string;
  newPassword: string;
};

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PasswordBody;
    const id = Number(body.id);
    const currentPassword = body.currentPassword?.trim();
    const newPassword = body.newPassword?.trim();

    if (!id || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "User ID, current password, and new password are required" },
        { status: 400 },
      );
    }

    const sessionId = Number(session.user.id);
    const role = String(session.user.role);
    if (role !== "admin" && role !== "superadmin" && id !== sessionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const isLead = role === "lead";
    const user = isLead
      ? (
          (await sql`
            SELECT id, password_hash
            FROM leads
            WHERE id = ${id}
            LIMIT 1
          `) as Array<{ id: number; password_hash: string }>
        )[0]
      : (
          (await sql`
            SELECT id, password_hash
            FROM admins
            WHERE id = ${id}
            LIMIT 1
          `) as Array<{ id: number; password_hash: string }>
        )[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    if (isLead) {
      await sql`
        UPDATE leads
        SET password_hash = ${password_hash}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE admins
        SET password_hash = ${password_hash}
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update password",
      },
      { status: 500 },
    );
  }
}
