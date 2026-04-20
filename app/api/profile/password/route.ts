import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

    const dbPath = path.join(process.cwd(), "db.json");
    const raw = await readFile(dbPath, "utf-8");
    const db = JSON.parse(raw);

    const isLead = role === "lead";
    const targetCollection = isLead ? "leads" : "admins";
    const userIndex = db[targetCollection]?.findIndex(
      (user: { id: number }) => user.id === id,
    );

    if (userIndex === -1 || userIndex === undefined) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = db[targetCollection][userIndex];
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

    db[targetCollection][userIndex] = {
      ...user,
      password_hash,
    };

    await writeFile(dbPath, JSON.stringify(db, null, 2), "utf-8");

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
