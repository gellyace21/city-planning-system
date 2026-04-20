import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readFile, writeFile } from "fs/promises";
import path from "path";

type PasswordBody = {
  id: number | string;
  currentPassword: string;
  newPassword: string;
};

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as PasswordBody;
    const id = Number(body.id);
    const currentPassword = body.currentPassword?.trim();
    const newPassword = body.newPassword?.trim();

    if (!id || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Admin ID, current password, and new password are required" },
        { status: 400 },
      );
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

    const adminIndex = db.admins?.findIndex(
      (admin: { id: number }) => admin.id === id,
    );

    if (adminIndex === -1 || adminIndex === undefined) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const admin = db.admins[adminIndex];
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      admin.password_hash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    db.admins[adminIndex] = {
      ...admin,
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
