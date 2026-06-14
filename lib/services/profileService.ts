import "server-only";

import { sql } from "@/lib/db";

export interface AdminProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profile_pic?: string;
  is_superadmin: boolean;
  created_at?: string;
  is_active?: boolean;
}

export interface LeadProfile {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  profile_pic?: string;
  department?: string;
  created_at?: string;
  is_active?: boolean;
}

export interface UserProfileResponse {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  profile_pic?: string;
  department?: string;
}

interface DbShape {
  admins: AdminProfile[];
  leads: LeadProfile[];
}

async function readDb(): Promise<DbShape> {
  const [admins, leads] = await Promise.all([
    sql`
      SELECT id, name, email, phone, profile_pic, is_superadmin, created_at, is_active
      FROM admins
      ORDER BY id ASC
    `,
    sql`
      SELECT id, username, department, created_at, is_active, token, password_hash
      FROM leads
      ORDER BY id ASC
    `,
  ]);

  return {
    admins: admins as AdminProfile[],
    leads: (
      leads as Array<LeadProfile & { token?: string; password_hash?: string }>
    ).map((lead) => ({
      id: lead.id,
      username: lead.username,
      department: lead.department,
      created_at: lead.created_at,
      is_active: lead.is_active,
      email: "",
      phone: "",
      profile_pic: "",
    })),
  };
}

async function writeDb(data: DbShape): Promise<void> {
  void data;
}

export async function getAdminProfile(adminId: number): Promise<AdminProfile> {
  const rows = (await sql`
    SELECT id, name, email, phone, profile_pic, is_superadmin, created_at, is_active
    FROM admins
    WHERE id = ${adminId}
    LIMIT 1
  `) as Array<AdminProfile>;
  const admin = rows[0];

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
}

export async function getLeadProfile(leadId: number): Promise<LeadProfile> {
  const rows = (await sql`
    SELECT id, username, department, created_at, is_active, profile_pic
    FROM leads
    WHERE id = ${leadId}
    LIMIT 1
  `) as Array<LeadProfile>;
  const lead = rows[0];

  if (!lead) {
    throw new Error("Lead not found");
  }

  return lead;
}

export async function getUserProfileByRole(
  id: number,
  role: string,
): Promise<UserProfileResponse> {
  if (role === "lead") {
    const lead = await getLeadProfile(id);
    return {
      id: lead.id,
      name: lead.username,
      email: lead.email || "",
      phone: lead.phone || "",
      profile_pic: lead.profile_pic || "",
      department: lead.department || "",
    };
  }

  const admin = await getAdminProfile(id);
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email || "",
    phone: admin.phone || "",
    profile_pic: admin.profile_pic || "",
  };
}

export async function updateAdminProfile(
  adminId: number,
  updates: Partial<AdminProfile>,
): Promise<AdminProfile> {
  const current = await getAdminProfile(adminId);
  const next = {
    ...current,
    ...updates,
  };

  // If the update only contains profile_pic, update that column only
  const updateKeys = Object.keys(updates);
  if (updateKeys.length === 1 && updateKeys[0] === "profile_pic") {
    await sql`
      UPDATE admins
      SET profile_pic = ${next.profile_pic ?? null}
      WHERE id = ${adminId}
    `;
    return next;
  }

  // For other partial updates, use COALESCE to preserve existing values when
  // the incoming value is undefined/null. For boolean fields, pass null when
  // undefined so COALESCE will keep the current value.
  const isActiveParam =
    typeof next.is_active === "boolean" ? next.is_active : null;
  const isSuperParam =
    typeof next.is_superadmin === "boolean" ? next.is_superadmin : null;

  await sql`
    UPDATE admins
    SET
      name = COALESCE(${next.name}, name),
      email = COALESCE(${next.email}, email),
      phone = COALESCE(${next.phone ?? null}, phone),
      profile_pic = COALESCE(${next.profile_pic ?? null}, profile_pic),
      is_active = COALESCE(${isActiveParam}, is_active),
      is_superadmin = COALESCE(${isSuperParam}, is_superadmin)
    WHERE id = ${adminId}
  `;

  return next;
}

export async function updateLeadProfile(
  leadId: number,
  updates: Partial<LeadProfile>,
): Promise<LeadProfile> {
  const current = await getLeadProfile(leadId);
  const next = {
    ...current,
    ...updates,
  };

  // Update lead fields. Use COALESCE/preserving behavior similar to admins
  await sql`
    UPDATE leads
    SET
      username = COALESCE(${next.username}, username),
      department = COALESCE(${next.department ?? null}, department),
      profile_pic = COALESCE(${next.profile_pic ?? null}, profile_pic),
      is_active = COALESCE(${typeof next.is_active === "boolean" ? next.is_active : null}, is_active)
    WHERE id = ${leadId}
  `;

  return {
    ...current,
    ...next,
  } as LeadProfile;
}

export async function updateUserProfileByRole(
  id: number,
  role: string,
  updates: Partial<UserProfileResponse>,
): Promise<UserProfileResponse> {
  if (role === "lead") {
    const lead = await updateLeadProfile(id, {
      username: updates.name,
      email: updates.email,
      phone: updates.phone,
      profile_pic: updates.profile_pic,
    });

    return {
      id: lead.id,
      name: lead.username,
      email: lead.email || "",
      phone: lead.phone || "",
      profile_pic: lead.profile_pic || "",
      department: lead.department || "",
    };
  }

  const admin = await updateAdminProfile(id, {
    name: updates.name,
    email: updates.email,
    phone: updates.phone,
    profile_pic: updates.profile_pic,
  });

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email || "",
    phone: admin.phone || "",
    profile_pic: admin.profile_pic || "",
  };
}

export async function uploadAdminProfilePhoto(
  adminId: number,
  photoUrl: string,
): Promise<AdminProfile> {
  return updateAdminProfile(adminId, { profile_pic: photoUrl });
}
