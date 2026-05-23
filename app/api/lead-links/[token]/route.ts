import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

async function readDb() {
  const [links, leads] = await Promise.all([
    sql`
      SELECT id, lead_id, token
      FROM generated_links
    `,
    sql`
      SELECT id, username, department, is_active
      FROM leads
    `,
  ]);

  return {
    generated_links: links as Array<{ token: string; lead_id: number }>,
    leads: leads as Array<{
      id: number;
      username: string;
      department?: string;
      is_active?: boolean;
    }>,
  };
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
    const leads = db.leads || [];
    const leadIndex = leads.findIndex(
      (entry: { id: number }) => entry.id === link.lead_id,
    );
    const lead = leadIndex >= 0 ? leads[leadIndex] : null;

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
      const existing = leads.find(
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

      await sql`
        UPDATE leads
        SET username = ${username}, is_active = true
        WHERE id = ${lead.id}
      `;
    }

    if (!String(lead.department || "").trim() && department) {
      await sql`
        UPDATE leads
        SET department = ${department}
        WHERE id = ${lead.id}
      `;
    }

    return NextResponse.json({
      ok: true,
      leadUsername: username || lead.username,
    });
  } catch (error) {
    console.error("Failed to access lead link:", error);
    return NextResponse.json(
      { error: "Failed to verify link access" },
      { status: 500 },
    );
  }
}
