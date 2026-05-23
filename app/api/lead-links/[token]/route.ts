import { NextRequest, NextResponse } from "next/server";
import { readAppState, writeAppState } from "@/lib/appState";

async function readDb() {
  return readAppState<{
    generated_links?: Array<{
      token: string;
      lead_id: number;
      last_accessed_at?: string;
    }>;
    leads?: Array<{
      id: number;
      username: string;
      department?: string;
      is_active?: boolean;
    }>;
  }>();
}

async function writeDb(data: unknown) {
  await writeAppState(data as Record<string, unknown>);
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

    const lead = (db.leads || []).find(
      (entry: { id: number }) => entry.id === found.lead_id,
    );

    if (!lead) {
      return NextResponse.json(
        { valid: false, error: "Lead account not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      valid: true,
      leadUsername: lead.username || "",
      needsUsername: !lead.username,
      needsDepartment: !String(lead.department || "").trim(),
      department: lead.department || "",
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
    const username = String(body?.username || "").trim();
    const department = String(body?.department || "").trim();

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

    if (!lead.username && !username) {
      return NextResponse.json(
        { error: "Lead username is required." },
        { status: 400 },
      );
    }

    if (!String(lead.department || "").trim() && !department) {
      return NextResponse.json(
        { error: "Lead department is required." },
        { status: 400 },
      );
    }

    if (username && !lead.username) {
      const existing = (db.leads || []).find(
        (entry: { username: string; id: number }) =>
          entry.username?.toLowerCase() === username.toLowerCase() &&
          entry.id !== lead.id,
      );
      if (existing) {
        return NextResponse.json(
          { error: "Lead username is already taken." },
          { status: 409 },
        );
      }

      db.leads[leadIndex] = {
        ...lead,
        username,
        is_active: true,
      };
    }

    if (!String(lead.department || "").trim() && department) {
      db.leads[leadIndex] = {
        ...db.leads[leadIndex],
        department,
      };
    }

    db.generated_links[linkIndex] = {
      ...link,
      last_accessed_at: new Date().toISOString(),
    };
    await writeDb(db);

    return NextResponse.json({
      ok: true,
      leadUsername: db.leads[leadIndex]?.username || lead.username,
    });
  } catch (error) {
    console.error("Failed to access lead link:", error);
    return NextResponse.json(
      { error: "Failed to verify link access" },
      { status: 500 },
    );
  }
}
