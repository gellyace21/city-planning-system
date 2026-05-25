import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sql } from "@/lib/db";

type LeadLink = {
  id: number;
  lead_id: number;
  lead_username: string;
  token: string;
  created_by_admin: number;
  created_at: string;
  last_accessed_at?: string;
  lead_department?: string;
  lead_profile_pic?: string;
};

type LeadFile = {
  id: number;
  lead_id: number;
  file_name: string;
  uploaded_at: string;
  row_count: number;
  lead_username?: string;
  lead_department?: string;
  submitted_at?: string | null;
  is_submitted?: boolean;
};

type LeadRecord = {
  id: number;
  username?: string;
  department?: string;
  token?: string;
  password_hash?: string;
  is_active?: boolean;
  created_at?: string;
};

function makeToken() {
  return randomBytes(16).toString("hex");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("/api/lead-links GET session:", session?.user);
    if (
      !session?.user?.id ||
      !["admin", "superadmin"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const links = (await sql`
      SELECT
        gl.id,
        gl.lead_id,
        COALESCE(l.username, '') AS lead_username,
        gl.token,
        gl.created_by_admin,
        gl.created_at,
        COALESCE(l.department, 'General') AS lead_department
      FROM generated_links gl
      LEFT JOIN leads l ON l.id = gl.lead_id
      ORDER BY gl.created_at DESC
    `) as Array<LeadLink>;

    const leadFiles = (await sql`
      SELECT
        lf.id,
        lf.lead_id,
        lf.file_name,
        lf.uploaded_at,
        lf.row_count,
        COALESCE(l.username, '') AS lead_username,
        COALESCE(l.department, 'General') AS lead_department
      FROM lead_files lf
      LEFT JOIN leads l ON l.id = lf.lead_id
      WHERE lf.deleted = false
      ORDER BY lf.uploaded_at DESC
    `) as Array<LeadFile>;

    const allLeads = (await sql`
      SELECT id, COALESCE(username, '') as username, COALESCE(department, '') as department, created_at
      FROM leads
      ORDER BY created_at DESC
    `) as Array<{
      id: number;
      username: string | null;
      department: string | null;
      created_at: string;
    }>;

    const origin = request.nextUrl.origin;

    const result = links.map((link) => {
      return {
        ...link,
        lead_username: link.lead_username || `Lead ${link.lead_id}`,
        lead_department: link.lead_department || "General",
        lead_profile_pic: "",
        url: `${origin}/lead-access/${link.token}`,
      };
    });

    const files = leadFiles.map((file) => ({
      ...file,
      lead_username: file.lead_username || `Lead ${file.lead_id}`,
      lead_department: file.lead_department || "General",
      submitted_at: file.uploaded_at,
      is_submitted: true,
    }));

    return NextResponse.json({
      links: result,
      leadFiles: files,
      leads: allLeads,
    });
  } catch (error) {
    console.error("Failed to get lead links:", error);
    return NextResponse.json(
      { error: "Failed to load links" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("/api/lead-links POST session:", session?.user);
    if (
      !session?.user?.id ||
      !["admin", "superadmin"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("/api/lead-links POST body:", body);
    const department = String(body?.department || "").trim();

    // Support creating a generated link for an existing lead by id.
    const leadIdFromBody = Number(body?.leadId);
    let lead: LeadRecord | null = null;

    if (Number.isFinite(leadIdFromBody) && leadIdFromBody > 0) {
      const rows = (await sql`
        SELECT id, username, department, token
        FROM leads
        WHERE id = ${leadIdFromBody}
        LIMIT 1
      `) as Array<LeadRecord>;
      lead = rows[0] || null;

      if (lead && department) {
        const [updatedLead] = (await sql`
          UPDATE leads
          SET department = ${department}
          WHERE id = ${lead.id}
          RETURNING id, username, department, token
        `) as Array<LeadRecord>;
        lead = updatedLead || lead;
      }
    } else {
      const leadUsername = String(body?.leadUsername || "").trim();
      const hasLeadUsername = Boolean(leadUsername);

      const leadRows = hasLeadUsername
        ? ((await sql`
            SELECT id, username, department, token
            FROM leads
            WHERE LOWER(username) = LOWER(${leadUsername})
            LIMIT 1
          `) as Array<LeadRecord>)
        : [];
      lead = leadRows[0] || null;

      if (!lead) {
        const [createdLead] = (await sql`
          INSERT INTO leads (token, username, password_hash, department, is_active)
          VALUES (${makeToken()}, ${leadUsername || null}, '', ${department || null}, true)
          RETURNING id, username, department, token
        `) as Array<LeadRecord>;
        lead = createdLead;
      } else if (department && !String(lead.department || "").trim()) {
        const [updatedLead] = (await sql`
          UPDATE leads
          SET department = ${department}
          WHERE id = ${lead.id}
          RETURNING id, username, department, token
        `) as Array<LeadRecord>;
        lead = updatedLead || lead;
      }
    }

    const existingLinks = (await sql`
      SELECT id, lead_id, token, created_by_admin, created_at
      FROM generated_links
      WHERE lead_id = ${lead.id}
      LIMIT 1
    `) as Array<LeadLink>;
    const existing = existingLinks[0] || null;
    const origin = request.nextUrl.origin;

    if (existing) {
      return NextResponse.json({
        link: {
          ...existing,
          lead_department: lead?.department || "General",
          lead_profile_pic: "",
          url: `${origin}/lead-access/${existing.token}`,
          reused: true,
        },
      });
    }

    const [newLink] = (await sql`
      INSERT INTO generated_links (lead_id, token, created_by_admin)
      VALUES (${lead.id}, ${makeToken()}, ${Number(session.user.id)})
      RETURNING id, lead_id, token, created_by_admin, created_at
    `) as Array<LeadLink>;

    return NextResponse.json({
      link: {
        ...newLink,
        lead_username: lead.username || `Lead ${lead.id}`,
        lead_department: lead?.department || "General",
        lead_profile_pic: "",
        url: `${origin}/lead-access/${newLink.token}`,
      },
    });
  } catch (error) {
    console.error("Failed to generate lead link:", error);
    return NextResponse.json(
      { error: "Failed to generate link" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("/api/lead-links DELETE session:", session?.user);
    if (
      !session?.user?.id ||
      !["admin", "superadmin"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leadIdParam = request.nextUrl.searchParams.get("leadId");
    const linkIdParam = request.nextUrl.searchParams.get("linkId");
    const leadId = Number(leadIdParam);
    const linkId = Number(linkIdParam);

    if (!Number.isFinite(leadId) && !Number.isFinite(linkId)) {
      return NextResponse.json(
        { error: "Lead id or link id is required." },
        { status: 400 },
      );
    }

    let targetLeadId = Number.isFinite(leadId) ? leadId : null;
    if (!Number.isFinite(leadId) && Number.isFinite(linkId)) {
      const matchRows = (await sql`
        SELECT lead_id
        FROM generated_links
        WHERE id = ${linkId}
        LIMIT 1
      `) as Array<{ lead_id: number }>;
      const match = matchRows[0] || null;
      if (!match) {
        return NextResponse.json(
          { error: "Lead link not found." },
          { status: 404 },
        );
      }
      targetLeadId = match.lead_id;
    }

    if (!Number.isFinite(targetLeadId)) {
      return NextResponse.json(
        { error: "Lead id is required." },
        { status: 400 },
      );
    }

    const leadRows = (await sql`
      SELECT id
      FROM leads
      WHERE id = ${targetLeadId}
      LIMIT 1
    `) as Array<{ id: number }>;

    if (leadRows.length === 0) {
      return NextResponse.json(
        { error: "Lead account not found." },
        { status: 404 },
      );
    }

    await sql`
      DELETE FROM generated_links
      WHERE lead_id = ${targetLeadId}
    `;
    await sql`
      DELETE FROM leads
      WHERE id = ${targetLeadId}
    `;

    return NextResponse.json({ ok: true, deletedLeadId: targetLeadId });
  } catch (error) {
    console.error("Failed to delete lead link:", error);
    return NextResponse.json(
      { error: "Failed to delete lead link" },
      { status: 500 },
    );
  }
}
