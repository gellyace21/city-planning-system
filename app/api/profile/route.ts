import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  getUserProfileByRole,
  updateUserProfileByRole,
} from "@/lib/services/profileService";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestedId = Number(request.nextUrl.searchParams.get("id"));
    const sessionId = Number(session.user.id);
    const role = String(session.user.role);

    const profileId =
      Number.isFinite(requestedId) && requestedId > 0 ? requestedId : sessionId;

    if (role !== "admin" && role !== "superadmin" && profileId !== sessionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await getUserProfileByRole(profileId, role);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, email, phone, profile_pic } = body;
    const profileId = Number(id);

    if (!Number.isFinite(profileId) || profileId <= 0) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const sessionId = Number(session.user.id);
    const role = String(session.user.role);

    if (role !== "admin" && role !== "superadmin" && profileId !== sessionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedProfile = await updateUserProfileByRole(profileId, role, {
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
