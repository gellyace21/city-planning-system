import React from "react";
import ProjectTable from "../../../components/project-monitoring/ProjectTable";
import { getMonitoringPageData } from "@/lib/services/projectMonitoringService";

const page = async () => {
  const { monitoringRows, history } = await getMonitoringPageData();

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
