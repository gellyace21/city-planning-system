import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

type RegisterBody = {
  email: string;
  password: string;
  department?: string;
  username?: string;
};

type RegisterRequestRecord = {
  id: number;
  token: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  department: string;
  created_at: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody;
    const username = body.username?.trim() || body.email?.trim();
    const password = body.password;
    const department = body.department?.trim() || "General";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const exists =
      (
        await sql`
      SELECT id
      FROM register_requests
      WHERE LOWER(username) = LOWER(${username})
      LIMIT 1
    `
      ).length > 0;

    if (exists) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO register_requests (token, username, password_hash, department, status)
      VALUES (
        ${crypto.randomUUID()},
        ${username},
        ${password_hash},
        ${department},
        'pending'
      )
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 },
    );
  }
}
