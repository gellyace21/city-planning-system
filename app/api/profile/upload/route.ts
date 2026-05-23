import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateUserProfileByRole } from "@/lib/services/profileService";
import { uploadFile } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `avatars/${session.user.role}-${session.user.id}-${Date.now()}-${file.name}`;
    const url = await uploadFile(key, buffer, file.type);

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const role = String(session.user.role);
    await updateUserProfileByRole(userId, role, { profile_pic: url });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to upload profile photo:", error);
    return NextResponse.json(
      { error: "Failed to upload profile photo" },
      { status: 500 },
    );
  }
}
