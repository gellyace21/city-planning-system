import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SuperadminAdminManager from "@/components/SuperadminAdminManager";

const page = async () => {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin") {
    redirect("/dashboard");
  }

  return <SuperadminAdminManager />;
};

export default page;
