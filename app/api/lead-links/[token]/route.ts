import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "db.json");

async function readDb() {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(data: unknown) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const db = await readDb();
    const links = db.generated_links || [];
    const found = links.find(
      (entry: { token: string }) => entry.token === token,
    );

    if (!found) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired link" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      valid: true,
      leadUsername: found.lead_username,
    });
  } catch (error) {
    console.error("Failed to validate token:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate link" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const password = String(body?.password || "");

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const db = await readDb();
    const links = db.generated_links || [];
    const linkIndex = links.findIndex(
      (entry: { token: string }) => entry.token === token,
    );

    if (linkIndex === -1) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 },
      );
    }

    const link = links[linkIndex];
    const leadIndex = (db.leads || []).findIndex(
      (entry: { id: number }) => entry.id === link.lead_id,
    );
    const lead = leadIndex >= 0 ? db.leads[leadIndex] : null;

    if (!lead) {
      return NextResponse.json(
        { error: "Lead account not found" },
        { status: 404 },
      );
    }

    const hasExistingPassword =
      typeof lead.password_hash === "string" &&
      lead.password_hash.startsWith("$2");

    if (!hasExistingPassword) {
      db.leads[leadIndex] = {
        ...lead,
        password_hash: await bcrypt.hash(password, 10),
        is_active: true,
      };
    } else {
      const isMatch = await bcrypt.compare(password, lead.password_hash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 401 },
        );
      }
    }

    db.generated_links[linkIndex] = {
      ...link,
      last_accessed_at: new Date().toISOString(),
    };
    await writeDb(db);

    return NextResponse.json({
      ok: true,
      leadUsername: lead.username,
    });
  } catch (error) {
    console.error("Failed to access lead link:", error);
    return NextResponse.json(
      { error: "Failed to verify link access" },
      { status: 500 },
    );
  }
}
