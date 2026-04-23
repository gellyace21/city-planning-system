import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "db.json");

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
  admins?: AdminProfile[];
  leads?: LeadProfile[];
}

async function readDb(): Promise<DbShape> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data) as DbShape;
  } catch (error) {
    console.error("Error reading db.json:", error);
    return { admins: [], leads: [] };
  }
}

async function writeDb(data: DbShape): Promise<void> {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to db.json:", error);
    throw new Error("Failed to save profile");
  }
}

export async function getAdminProfile(adminId: number): Promise<AdminProfile> {
  const db = await readDb();
  const admin = db.admins?.find((a: AdminProfile) => a.id === adminId);

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
}

export async function getLeadProfile(leadId: number): Promise<LeadProfile> {
  const db = await readDb();
  const lead = db.leads?.find((l: LeadProfile) => l.id === leadId);

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
  const db = await readDb();
  const adminIndex = db.admins?.findIndex(
    (a: AdminProfile) => a.id === adminId,
  );

  if (adminIndex === -1 || adminIndex === undefined) {
    throw new Error("Admin not found");
  }

  db.admins[adminIndex] = {
    ...db.admins[adminIndex],
    ...updates,
  };

  await writeDb(db);
  return db.admins[adminIndex];
}

export async function updateLeadProfile(
  leadId: number,
  updates: Partial<LeadProfile>,
): Promise<LeadProfile> {
  const db = await readDb();
  const leadIndex = db.leads?.findIndex((l: LeadProfile) => l.id === leadId);

  if (leadIndex === -1 || leadIndex === undefined) {
    throw new Error("Lead not found");
  }

  db.leads[leadIndex] = {
    ...db.leads[leadIndex],
    ...updates,
  };

  await writeDb(db);
  return db.leads[leadIndex];
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
