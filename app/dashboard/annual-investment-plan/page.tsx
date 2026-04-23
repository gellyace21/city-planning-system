import React from "react";
import ProjectTable from "../../../components/project-monitoring/ProjectTable";
import LeadWorkspacePortal from "@/components/LeadWorkspacePortal";
import { getAipPageData } from "@/lib/services/projectMonitoringService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

const page = async ({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) => {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role === "superadmin") {
    redirect("/dashboard/superadmin");
  }

  if (role !== "admin" && role !== "lead") {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const showTableEditor = params.view === "table";

  if (role === "lead" && !showTableEditor) {
    return <LeadWorkspacePortal />;
  }

  const { aipRows, history } = await getAipPageData();

  return (
    <ProjectTable
      mode="aip"
      initialAipRows={aipRows}
      initialMonitoringRows={[]}
      initialHistory={history}
    />
  );
};

export default page;
