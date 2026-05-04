import React from "react";
import ProjectTable from "../../../components/project-monitoring/ProjectTable";
import { getMonitoringPageData } from "@/lib/services/projectMonitoringService";
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
    redirect("/dashboard");
  }

  const actor =
    session?.user?.id && role === "admin"
      ? { id: Number(session.user.id), role: "admin" as const }
      : undefined;

  const { monitoringRows, history } = await getMonitoringPageData(actor);

  return (
    <div>
      <ProjectTable
        mode="monitoring"
        initialAipRows={[]}
        initialMonitoringRows={monitoringRows}
        initialHistory={history}
      />
    </div>
  );
};

export default page;
