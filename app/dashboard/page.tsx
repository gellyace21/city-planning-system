import Homepage from "@/components/Homepage";
import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role === "superadmin") {
    redirect("/dashboard/superadmin");
  }

  if (role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="w-full">
      <Homepage />
    </div>
  );
};

export default page;
