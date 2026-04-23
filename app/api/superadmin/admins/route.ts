import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";

type DbAdmin = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  is_active: boolean;
  profile_pic?: string;
  is_superadmin?: boolean;
};

type DbShape = {
  admins?: DbAdmin[];
  [key: string]: unknown;
};

const DB_PATH = path.join(process.cwd(), "db.json");

const requireSuperAdmin = async (): Promise<NextResponse | null> => {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
};

const readDb = async (): Promise<DbShape> => {
  const raw = await readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as DbShape;
};

const writeDb = async (db: DbShape): Promise<void> => {
  await writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf-8");
};

export async function GET() {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  const db = await readDb();
  const admins = (db.admins ?? []).map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    is_active: Boolean(admin.is_active),
    profile_pic: admin.profile_pic || "",
    is_superadmin: Boolean(admin.is_superadmin),
    created_at: admin.created_at,
  }));

  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    profile_pic?: string;
    is_superadmin?: boolean;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email, and password (8+ chars) are required." },
      { status: 400 },
    );
  }

  const db = await readDb();
  const admins = db.admins ?? [];

  if (admins.some((admin) => admin.email.toLowerCase() === email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const nextId = admins.reduce((max, admin) => Math.max(max, admin.id), 0) + 1;
  const password_hash = await bcrypt.hash(password, 10);

  admins.push({
    id: nextId,
    name,
    email,
    password_hash,
    created_at: new Date().toISOString(),
    is_active: true,
    profile_pic: body.profile_pic?.trim() || "",
    is_superadmin: Boolean(body.is_superadmin),
  });

  db.admins = admins;
  await writeDb(db);

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  const body = (await req.json()) as {
    id?: number;
    name?: string;
    email?: string;
    is_active?: boolean;
    profile_pic?: string;
    is_superadmin?: boolean;
  };

  if (!Number.isFinite(body.id)) {
    return NextResponse.json({ error: "Admin id is required." }, { status: 400 });
  }

  const db = await readDb();
  const admins = db.admins ?? [];
  const index = admins.findIndex((admin) => admin.id === Number(body.id));

  if (index < 0) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }

  const current = admins[index];
  const nextEmail = body.email?.trim().toLowerCase();
  if (
    nextEmail &&
    admins.some(
      (admin) => admin.id !== current.id && admin.email.toLowerCase() === nextEmail,
    )
  ) {
    return NextResponse.json(
      { error: "Another admin already uses this email." },
      { status: 409 },
    );
  }

  admins[index] = {
    ...current,
    name: body.name?.trim() || current.name,
    email: nextEmail || current.email,
    is_active:
      typeof body.is_active === "boolean" ? body.is_active : current.is_active,
    profile_pic:
      body.profile_pic !== undefined ? body.profile_pic.trim() : current.profile_pic,
    is_superadmin:
      typeof body.is_superadmin === "boolean"
        ? body.is_superadmin
        : current.is_superadmin,
  };

  db.admins = admins;
  await writeDb(db);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  const idParam = req.nextUrl.searchParams.get("id");
  const targetId = Number(idParam);
  if (!Number.isFinite(targetId)) {
    return NextResponse.json({ error: "Admin id is required." }, { status: 400 });
  }

  const db = await readDb();
  const admins = db.admins ?? [];
  const target = admins.find((admin) => admin.id === targetId);
  if (!target) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }
  if (target.is_superadmin) {
    return NextResponse.json(
      { error: "Super admin accounts cannot be deleted." },
      { status: 400 },
    );
  }

  db.admins = admins.filter((admin) => admin.id !== targetId);
  await writeDb(db);
  return NextResponse.json({ ok: true });
}
