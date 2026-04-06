import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

type RegisterBody = {
  email: string;
  password: string;
  department?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody;
    const email = body.email?.trim();
    const password = body.password;
    const department = body.department?.trim() || "General";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const dbPath = path.join(process.cwd(), "db.json");
    const raw = await readFile(dbPath, "utf-8");
    const db = JSON.parse(raw);

    const exists = db.register_requests.some(
      (u: { email: string }) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (exists) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }

    const password_hash = await bcrypt.hash(password, 10);
    const nextId =
      db.register_requests.length > 0
        ? Math.max(...db.register_requests.map((u: { id: number }) => u.id)) + 1
        : 1;

    db.register_requests.push({
      id: nextId,
      token: crypto.randomUUID(),
      email,
      password_hash,
      is_active: true,
      department,
      created_at: new Date().toISOString(),
    });

    await writeFile(dbPath, JSON.stringify(db, null, 2), "utf-8");

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 },
    );
  }
}
