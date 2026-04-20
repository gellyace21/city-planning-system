import { getSession } from "next-auth/react";
import { NextRequest, NextResponse } from "next/server";
import {
  getAdminProfile,
  updateAdminProfile,
} from "@/lib/services/profileService";

export async function GET(request: NextRequest) {
  try {
    const adminId = request.nextUrl.searchParams.get("id");

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 },
      );
    }

    const profile = await getAdminProfile(parseInt(adminId));
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch profile",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, email, phone, profile_pic } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 },
      );
    }

    const updatedProfile = await updateAdminProfile(parseInt(id), {
      name,
      email,
      phone,
      profile_pic,
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      },
      { status: 500 },
    );
  }
}
