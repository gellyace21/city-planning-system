import React from "react";
import ProjectTable from "../../../components/project-monitoring/ProjectTable";
import { getAipPageData } from "@/lib/services/projectMonitoringService";

const page = async () => {
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
