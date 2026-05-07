import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

const DB_PATH = path.join(process.cwd(), "db.json");

async function readDb() {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(data: unknown) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function makeToken() {
  return randomBytes(16).toString("hex");
}

function nextId(rows: Array<{ id: number }>): number {
  return rows.length > 0 ? Math.max(...rows.map((row) => row.id)) + 1 : 1;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.id ||
      !["admin", "superadmin"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await readDb();
    const links: LeadLink[] = db.generated_links || [];
    const leadFiles: LeadFile[] = (db.lead_files || []) as LeadFile[];
    const leads: Array<{
      id: number;
      username: string;
      department?: string;
      profile_pic?: string;
    }> = db.leads || [];
    const leadById = new Map(leads.map((lead) => [Number(lead.id), lead]));
    const origin = request.nextUrl.origin;

    const result = links
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((link) => {
        const lead = leadById.get(Number(link.lead_id));
        return {
          ...link,
          lead_username:
            lead?.username || link.lead_username || `Lead ${link.lead_id}`,
          lead_department: lead?.department || "General",
          lead_profile_pic: lead?.profile_pic || "",
          url: `${origin}/lead-access/${link.token}`,
        };
      });

    const files = leadFiles
      .filter((file) => file.is_submitted ?? Boolean(file.submitted_at))
      .slice()
      .sort((a, b) =>
        String(b.uploaded_at).localeCompare(String(a.uploaded_at)),
      )
      .map((file) => {
        const lead = leadById.get(Number(file.lead_id));
        return {
          ...file,
          lead_username: lead?.username || `Lead ${file.lead_id}`,
          lead_department: lead?.department || "General",
        };
      });

    return NextResponse.json({ links: result, leadFiles: files });
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
    if (
      !session?.user?.id ||
      !["admin", "superadmin"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const leadUsername = String(body?.leadUsername || "").trim();
    const hasLeadUsername = Boolean(leadUsername);

    const db = await readDb();
    if (!db.leads) {
      db.leads = [];
    }
    const leads = db.leads || [];
    let lead = hasLeadUsername
      ? leads.find(
          (entry: { username: string; id: number }) =>
            entry.username.toLowerCase() === leadUsername.toLowerCase(),
        )
      : null;

    // Auto-create lead records from the admin link flow.
    // Password is set on first token access.
    if (!lead) {
      lead = {
        id: nextId(leads),
        token: makeToken(),
        username: leadUsername || "",
        password_hash: "",
        is_active: true,
        department: "",
        created_at: new Date().toISOString(),
      };
      db.leads.push(lead);
    }

    if (!db.generated_links) {
      db.generated_links = [];
    }

    const existing = (db.generated_links as LeadLink[]).find(
      (entry) => entry.lead_id === lead.id,
    );

    const origin = request.nextUrl.origin;

    if (existing) {
      return NextResponse.json({
        link: {
          ...existing,
          lead_department: lead?.department || "General",
          lead_profile_pic: lead?.profile_pic || "",
          url: `${origin}/lead-access/${existing.token}`,
          reused: true,
        },
      });
    }

    const nextLinkId = nextId(db.generated_links as LeadLink[]);

    const newLink: LeadLink = {
      id: nextLinkId,
      lead_id: lead.id,
      lead_username: lead.username,
      token: makeToken(),
      created_by_admin: session.user.id,
      created_at: new Date().toISOString(),
    };

    db.generated_links.push(newLink);
    await writeDb(db);

    return NextResponse.json({
      link: {
        ...newLink,
        lead_department: lead?.department || "General",
        lead_profile_pic: lead?.profile_pic || "",
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

    const db = await readDb();
    const links: LeadLink[] = db.generated_links || [];

    let targetLeadId = Number.isFinite(leadId) ? leadId : null;
    if (!Number.isFinite(leadId) && Number.isFinite(linkId)) {
      const match = links.find((entry) => entry.id === linkId) || null;
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

    const leads: Array<{ id: number }> = db.leads || [];
    const leadExists = leads.some((entry) => entry.id === targetLeadId);
    if (!leadExists) {
      return NextResponse.json(
        { error: "Lead account not found." },
        { status: 404 },
      );
    }

    db.leads = leads.filter((entry) => entry.id !== targetLeadId);
    db.generated_links = links.filter(
      (entry) => entry.lead_id !== targetLeadId,
    );

    await writeDb(db);

    return NextResponse.json({ ok: true, deletedLeadId: targetLeadId });
  } catch (error) {
    console.error("Failed to delete lead link:", error);
    return NextResponse.json(
      { error: "Failed to delete lead link" },
      { status: 500 },
    );
  }
}
