import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

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

const requireSuperAdmin = async (): Promise<NextResponse | null> => {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
};

export async function GET() {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  const rows = (await sql`
    SELECT id, name, email, password_hash, created_at, is_active, profile_pic, is_superadmin, phone
    FROM admins
    ORDER BY id ASC
  `) as DbAdmin[];

  const admins = rows.map((admin) => ({
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

  const existing = (await sql`
    SELECT id
    FROM admins
    WHERE email = ${email}
    LIMIT 1
  `) as Array<{ id: number }>;

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const password_hash = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO admins (name, email, password_hash, profile_pic, is_superadmin, is_active)
    VALUES (
      ${name},
      ${email},
      ${password_hash},
      ${body.profile_pic?.trim() || null},
      ${Boolean(body.is_superadmin)},
      true
    )
  `;

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
    return NextResponse.json(
      { error: "Admin id is required." },
      { status: 400 },
    );
  }

  const existing = (await sql`
    SELECT id, name, email, is_active, profile_pic, is_superadmin, created_at
    FROM admins
    WHERE id = ${Number(body.id)}
    LIMIT 1
  `) as Array<DbAdmin>;

  const current = existing[0];

  if (!current) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }

  const nextEmail = body.email?.trim().toLowerCase();
  if (
    nextEmail &&
    (
      await sql`
      SELECT id
      FROM admins
      WHERE email = ${nextEmail} AND id <> ${current.id}
      LIMIT 1
    `
    ).length > 0
  ) {
    return NextResponse.json(
      { error: "Another admin already uses this email." },
      { status: 409 },
    );
  }

  await sql`
    UPDATE admins
    SET
      name = ${body.name?.trim() || current.name},
      email = ${nextEmail || current.email},
      is_active = ${typeof body.is_active === "boolean" ? body.is_active : current.is_active},
      profile_pic = ${body.profile_pic !== undefined ? body.profile_pic.trim() : current.profile_pic},
      is_superadmin = ${typeof body.is_superadmin === "boolean" ? body.is_superadmin : current.is_superadmin}
    WHERE id = ${current.id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  const idParam = req.nextUrl.searchParams.get("id");
  const targetId = Number(idParam);
  if (!Number.isFinite(targetId)) {
    return NextResponse.json(
      { error: "Admin id is required." },
      { status: 400 },
    );
  }

  const rows = (await sql`
    SELECT id, is_superadmin
    FROM admins
    WHERE id = ${targetId}
    LIMIT 1
  `) as Array<{ id: number; is_superadmin: boolean }>;
  const target = rows[0];
  if (!target) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }
  if (target.is_superadmin) {
    return NextResponse.json(
      { error: "Super admin accounts cannot be deleted." },
      { status: 400 },
    );
  }

  await sql`
    DELETE FROM admins
    WHERE id = ${targetId}
  `;
  return NextResponse.json({ ok: true });
}
