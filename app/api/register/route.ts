import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readAppState, writeAppState } from "@/lib/appState";

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

    const db = await readAppState<{
      register_requests?: Array<{ id: number; email: string }>;
    }>();
    const registerRequests = db.register_requests ?? [];

    const exists = registerRequests.some(
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
      registerRequests.length > 0
        ? Math.max(...registerRequests.map((u: { id: number }) => u.id)) + 1
        : 1;

    registerRequests.push({
      id: nextId,
      token: crypto.randomUUID(),
      email,
      password_hash,
      is_active: true,
      department,
      created_at: new Date().toISOString(),
    });

    await writeAppState({
      ...db,
      register_requests: registerRequests,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 },
    );
  }
}
