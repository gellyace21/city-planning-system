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
  const target = cell.isMerged ? cell.master : cell;
  if (value === null || value === undefined || value === "") {
    target.value = null;
    return;
  }
  target.value = value;
};

const sanitizeText = (value: string): string => {
  let safe = "";
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    // XML 1.0 valid character ranges
    const isValid =
      code === 0x9 ||
      code === 0xa ||
      code === 0xd ||
      (code >= 0x20 && code <= 0xd7ff) ||
      (code >= 0xe000 && code <= 0xfffd) ||
      (code >= 0x10000 && code <= 0x10ffff);
    if (isValid) safe += char;
  }
  return safe;
};

const sanitizeCellValue = (value: ExcelJS.CellValue): ExcelJS.CellValue => {
  if (typeof value === "string") return sanitizeText(value);
  if (value && typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return {
        ...value,
        richText: value.richText.map((item) => ({
          ...item,
          text: sanitizeText(item.text ?? ""),
        })),
      };
    }
    if ("text" in value && typeof value.text === "string") {
      return {
        ...value,
        text: sanitizeText(value.text),
      };
    }
  }
  return value;
};

const sanitizeWorksheetStrings = (ws: ExcelJS.Worksheet): void => {
  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (
        cell.isMerged &&
        cell.master &&
        cell.address !== cell.master.address
      ) {
        return;
      }
      const nextValue = sanitizeCellValue(cell.value);
      if (nextValue !== cell.value) {
        cell.value = nextValue;
      }
    });
  });
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

const loadMonitoringTemplate = (): ArrayBuffer => {
  return toArrayBufferFromBase64(MONITORING_TEMPLATE_BASE64);
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

type MonitoringExportOptions = {
  fallbackToCsv?: boolean;
  debugValidate?: boolean;
};

const validateWorkbook = async (workbook: ExcelJS.Workbook): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer({
    useSharedStrings: true,
    useStyles: true,
  });
  const check = new ExcelJS.Workbook();
  await check.xlsx.load(buffer);
};

export function downloadMonitoring(
  data: MonitoringExportRow[],
  filename = "Project_Monitoring_Status_Report.xlsx",
  options: MonitoringExportOptions = {},
): void {
  void (async () => {
    try {
      if (options.debugValidate) {
        console.log("Monitoring export debug enabled", {
          rows: data.length,
        });
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await loadMonitoringTemplate());
      const ws = resolveTemplateWorksheet(workbook);
      if (!ws) {
        throw new Error("Template worksheet not found.");
      }

      if (options.debugValidate) {
        console.log("Monitoring export template loaded", {
          sheetName: ws.name,
        });
      }

      const dataStartRow = detectDataStartRow(ws);
      const footerStartRow = detectFooterStartRow(ws);
      const dataEndRow = footerStartRow - 1;
      const capacity = dataEndRow - dataStartRow + 1;
      if (data.length > capacity) {
        // Avoid inserting rows into a template that may have complex merges/tables.
        // Keep the export valid and warn about truncation instead.
        console.warn(
          `Monitoring export truncated: ${data.length} rows > capacity ${capacity}.`,
        );
      }

      const rowsToWrite = data.slice(0, Math.max(0, capacity));

      for (let index = 0; index < rowsToWrite.length; index += 1) {
        const row = rowsToWrite[index];
        const targetRow = dataStartRow + index;

        writeCell(
          ws,
          COLUMN.project_name,
          targetRow,
          row.project_name ? sanitizeText(row.project_name) : null,
        );
        writeCell(
          ws,
          COLUMN.agency,
          targetRow,
          row.agency ? sanitizeText(row.agency) : null,
        );
        writeCell(
          ws,
          COLUMN.location,
          targetRow,
          row.location ? sanitizeText(row.location) : null,
        );
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
        writeCell(
          ws,
          COLUMN.funding,
          targetRow,
          row.funding ? sanitizeText(row.funding) : null,
        );
        writeCell(
          ws,
          COLUMN.certified_date,
          targetRow,
          row.certified_date ? sanitizeText(row.certified_date) : null,
        );
        writeCell(
          ws,
          COLUMN.major_findings,
          targetRow,
          row.major_findings ? sanitizeText(row.major_findings) : null,
        );
        writeCell(
          ws,
          COLUMN.issues,
          targetRow,
          row.issues ? sanitizeText(row.issues) : null,
        );
        writeCell(
          ws,
          COLUMN.status_percent,
          targetRow,
          toFiniteNumber(row.status_percent),
        );
        const actionText = row.action_recommendation
          ? sanitizeText(row.action_recommendation)
          : null;
        writeCell(
          ws,
          COLUMN.action_recommendation_primary,
          targetRow,
          actionText,
        );
        const secondaryCell = ws.getCell(
          `${COLUMN.action_recommendation_secondary}${targetRow}`,
        );
        if (!secondaryCell.isMerged) {
          writeCell(
            ws,
            COLUMN.action_recommendation_secondary,
            targetRow,
            actionText,
          );
        }
        writeCell(
          ws,
          COLUMN.remarks,
          targetRow,
          row.remarks ? sanitizeText(row.remarks) : null,
        );
        if (options.debugValidate) {
          try {
            await validateWorkbook(workbook);
          } catch (error) {
            console.error("Monitoring export row failed", {
              index,
              targetRow,
              row,
            });
            throw error;
          }
        }
      }

      sanitizeWorksheetStrings(ws);

      const buffer = await workbook.xlsx.writeBuffer({
        useSharedStrings: true,
        useStyles: true,
      });
      if (options.debugValidate) {
        console.log("Monitoring export final write succeeded", {
          rowsWritten: rowsToWrite.length,
        });
      }
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(blob, filename);
    } catch (error) {
      console.error("Monitoring export failed", error);
      if (options.fallbackToCsv) {
        downloadMonitoringCsv(data, "project_monitoring_export.csv");
        return;
      }
      throw error;
    }
  })();
}
