import ExcelJS from "exceljs";
import { MONITORING_TEMPLATE_BASE64 } from "@/lib/monitoringTemplateBase64";

export interface MonitoringExportRow {
  project_name: string;
  agency: string;
  location: string;
  approved_budget: number;
  certified_amount: number;
  obligation: number;
  actual_cost: number;
  funding: string;
  certified_date: string;
  major_findings: string;
  issues: string;
  status_percent: number;
  action_recommendation: string;
  remarks: string;
}

const COLUMN = {
  project_name: "C",
  agency: "D",
  location: "E",
  approved_budget: "F",
  certified_amount: "G",
  obligation: "H",
  actual_cost: "I",
  funding: "J",
  certified_date: "K",
  major_findings: "L",
  issues: "M",
  status_percent: "N",
  action_recommendation_primary: "O",
  action_recommendation_secondary: "P",
  remarks: "Q",
} as const;

const toArrayBufferFromBase64 = (base64: string): ArrayBuffer => {
  if (typeof globalThis.atob !== "function") {
    throw new Error("Base64 decoding is unavailable in this environment.");
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const getCellString = (value: ExcelJS.CellValue): string => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("result" in value && value.result != null) {
      return String(value.result).trim();
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((item) => item.text ?? "")
        .join("")
        .trim();
    }
  }
  return String(value).trim();
};

const writeCell = (
  ws: ExcelJS.Worksheet,
  col: string,
  row: number,
  value: string | number | null,
): void => {
  const cell = ws.getCell(`${col}${row}`);
  if (value === null || value === undefined || value === "") {
    cell.value = null;
    return;
  }
  cell.value = value;
};

const detectDataStartRow = (ws: ExcelJS.Worksheet): number => {
  for (let row = 1; row <= 50; row += 1) {
    const name = getCellString(
      ws.getCell(`${COLUMN.project_name}${row}`).value,
    );
    if (name.toLowerCase().includes("name of project")) {
      return row + 2;
    }
  }
  return 7;
};

const detectFooterStartRow = (ws: ExcelJS.Worksheet): number => {
  for (let row = 1; row <= 80; row += 1) {
    const submittedBy = getCellString(ws.getCell(`B${row}`).value);
    if (submittedBy.toLowerCase().includes("submitted by")) {
      return row;
    }
  }
  return 32;
};

const resolveTemplateWorksheet = (
  workbook: ExcelJS.Workbook,
): ExcelJS.Worksheet | undefined => {
  for (const ws of workbook.worksheets) {
    for (let row = 1; row <= 50; row += 1) {
      const name = getCellString(
        ws.getCell(`${COLUMN.project_name}${row}`).value,
      );
      if (name.toLowerCase().includes("name of project")) {
        return ws;
      }
    }
  }
  return workbook.worksheets[0];
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export function downloadMonitoringCsv(
  data: MonitoringExportRow[],
  filename = "project_monitoring_export.csv",
): void {
  const headers = [
    "project_name",
    "agency",
    "location",
    "approved_budget",
    "certified_amount",
    "obligation",
    "actual_cost",
    "funding",
    "certified_date",
    "major_findings",
    "issues",
    "status_percent",
    "action_recommendation",
    "remarks",
  ] as const;

  const lines = [headers.join(",")];
  for (const row of data) {
    const cells = headers.map((header) => {
      const raw = String(row[header] ?? "").replaceAll('"', '""');
      return `"${raw}"`;
    });
    lines.push(cells.join(","));
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(blob, filename);
}

// Old export function
export function downloadMonitoringTemplateMapped(
  data: MonitoringExportRow[],
  filename = "Project_Monitoring_Status_Report.xlsx",
  options: { fallbackToCsv?: boolean } = {},
): void {
  void (async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(
        toArrayBufferFromBase64(MONITORING_TEMPLATE_BASE64),
      );
      const ws = resolveTemplateWorksheet(workbook);
      if (!ws) {
        throw new Error("Template worksheet not found.");
      }

      const dataStartRow = detectDataStartRow(ws);
      const footerStartRow = detectFooterStartRow(ws);
      const dataEndRow = footerStartRow - 1;
      const capacity = dataEndRow - dataStartRow + 1;

      if (data.length > capacity) {
        const extraRows = data.length - capacity;
        const blankRows = Array.from({ length: extraRows }, () => []);
        ws.spliceRows(footerStartRow, 0, ...blankRows);
      }

      data.forEach((row, index) => {
        const targetRow = dataStartRow + index;

        writeCell(ws, COLUMN.project_name, targetRow, row.project_name || null);
        writeCell(ws, COLUMN.agency, targetRow, row.agency || null);
        writeCell(ws, COLUMN.location, targetRow, row.location || null);
        writeCell(
          ws,
          COLUMN.approved_budget,
          targetRow,
          toFiniteNumber(row.approved_budget),
        );
        writeCell(
          ws,
          COLUMN.certified_amount,
          targetRow,
          toFiniteNumber(row.certified_amount),
        );
        writeCell(
          ws,
          COLUMN.obligation,
          targetRow,
          toFiniteNumber(row.obligation),
        );
        writeCell(
          ws,
          COLUMN.actual_cost,
          targetRow,
          toFiniteNumber(row.actual_cost),
        );
        writeCell(ws, COLUMN.funding, targetRow, row.funding || null);
        writeCell(
          ws,
          COLUMN.certified_date,
          targetRow,
          row.certified_date || null,
        );
        writeCell(
          ws,
          COLUMN.major_findings,
          targetRow,
          row.major_findings || null,
        );
        writeCell(ws, COLUMN.issues, targetRow, row.issues || null);
        writeCell(
          ws,
          COLUMN.status_percent,
          targetRow,
          toFiniteNumber(row.status_percent),
        );
        writeCell(
          ws,
          COLUMN.action_recommendation_primary,
          targetRow,
          row.action_recommendation || null,
        );
        writeCell(
          ws,
          COLUMN.action_recommendation_secondary,
          targetRow,
          row.action_recommendation || null,
        );
        writeCell(ws, COLUMN.remarks, targetRow, row.remarks || null);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(blob, filename);
    } catch (error) {
      if (options.fallbackToCsv) {
        downloadMonitoringCsv(data, "project_monitoring_export.csv");
        return;
      }
      throw error;
    }
  })();
}

// From claude
// export function downloadMonitoringTemplateMapped(
//   data: MonitoringExportRow[],
//   filename = "Project_Monitoring_Status_Report.xlsx",
//   options: { fallbackToCsv?: boolean } = {},
// ): void {
//   void (async () => {
//     try {
//       const workbook = new ExcelJS.Workbook();
//       await workbook.xlsx.load(
//         toArrayBufferFromBase64(MONITORING_TEMPLATE_BASE64),
//       );

//       const ws = workbook.worksheets[0]; // direct index — sheet is "Non-Infrastructure Projects"
//       if (!ws) throw new Error("Template worksheet not found.");

//       const DATA_START_ROW = 7;

//       data.forEach((row, index) => {
//         const targetRow = DATA_START_ROW + index;

//         writeCell(ws, COLUMN.project_name, targetRow, row.project_name || null);
//         writeCell(ws, COLUMN.agency, targetRow, row.agency || null);
//         writeCell(ws, COLUMN.location, targetRow, row.location || null);
//         writeCell(ws, COLUMN.approved_budget, targetRow, toFiniteNumber(row.approved_budget));
//         writeCell(ws, COLUMN.certified_amount, targetRow, toFiniteNumber(row.certified_amount));
//         writeCell(ws, COLUMN.obligation, targetRow, toFiniteNumber(row.obligation));
//         writeCell(ws, COLUMN.actual_cost, targetRow, toFiniteNumber(row.actual_cost));
//         writeCell(ws, COLUMN.funding, targetRow, row.funding || null);
//         writeCell(ws, COLUMN.certified_date, targetRow, row.certified_date || null);
//         writeCell(ws, COLUMN.major_findings, targetRow, row.major_findings || null);
//         writeCell(ws, COLUMN.issues, targetRow, row.issues || null);
//         writeCell(ws, COLUMN.status_percent, targetRow, toFiniteNumber(row.status_percent));
//         writeCell(ws, COLUMN.action_recommendation_primary, targetRow, row.action_recommendation || null);
//         writeCell(ws, COLUMN.action_recommendation_secondary, targetRow, row.action_recommendation || null);
//         writeCell(ws, COLUMN.remarks, targetRow, row.remarks || null);
//       });

//       const buffer = await workbook.xlsx.writeBuffer();
//       const blob = new Blob([buffer], {
//         type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//       });
//       downloadBlob(blob, filename);
//     } catch (error) {
//       if (options.fallbackToCsv) {
//         downloadMonitoringCsv(data, "project_monitoring_export.csv");
//         return;
//       }
//       throw error;
//     }
//   })();
// }
