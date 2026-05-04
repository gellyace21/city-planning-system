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
  searchParams?: Promise<{ view?: string; fileId?: string }>;
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
  const parsedUploadId = Number(params.fileId);
  const initialUploadId = Number.isFinite(parsedUploadId)
    ? parsedUploadId
    : null;

  if (role === "lead" && !showTableEditor) {
    return <LeadWorkspacePortal />;
  }

  const actor =
    session?.user?.id && (role === "admin" || role === "lead")
      ? { id: Number(session.user.id), role: role as "admin" | "lead" }
      : undefined;

  const { aipRows, history } = await getAipPageData(actor);

  return (
    <ProjectTable
      mode="aip"
      initialAipRows={aipRows}
      initialMonitoringRows={[]}
      initialHistory={history}
      initialUploadId={initialUploadId}
    />
  );
};

export default page;
