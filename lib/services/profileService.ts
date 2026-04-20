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

async function readDb(): Promise<any> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading db.json:", error);
    return { admins: [] };
  }
}

async function writeDb(data: any): Promise<void> {
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

export async function uploadAdminProfilePhoto(
  adminId: number,
  photoUrl: string,
): Promise<AdminProfile> {
  return updateAdminProfile(adminId, { profile_pic: photoUrl });
}
