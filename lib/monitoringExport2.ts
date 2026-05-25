/**
 * lib/monitoringExport.ts
 *
 * Exports Project Monitoring data by injecting data directly into the
 * template's sheet1.xml — bypassing ExcelJS entirely.
 *
 * This preserves ALL original styles, merges, borders, fonts, and
 * Microsoft extension namespaces (x14ac, xr, etc.) that ExcelJS strips.
 *
 * Style indices from template row 7 (data rows):
 *   A, B → s="2"
 *   C     → s="10"
 *   D–H   → s="11"
 *   I–O   → s="12"
 *   P     → s="13" (Remarks)
 *   Q     → s="39" (blank template placeholder)
 *
 * Rows 8–31 use different style indices but the same layout pattern.
 * We write into rows 7–31 (25 data rows max).
 */

import JSZip from "jszip";
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

// Style indices per column for data rows 7–31 (from template inspection)
// Row 7 uses one set, rows 8–31 use a different set (lighter borders).
// We use the row-7 style for all rows since we only fill row 7 onwards
// and the template already has styled empty rows 8–31.
const COL_STYLES: Record<string, string> = {
  A: "2",
  B: "2",
  C: "10",
  D: "11",
  E: "11",
  F: "11",
  G: "11",
  H: "11",
  I: "12",
  J: "12",
  K: "12",
  L: "12",
  M: "12",
  N: "12",
  O: "12",
  P: "13",
  Q: "39",
};

const DATA_START_ROW = 7;
const DATA_END_ROW = 31; // 25 rows capacity
const MAX_ROWS = DATA_END_ROW - DATA_START_ROW + 1;

const escapeXml = (val: string): string =>
  val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const sanitizeText = (value: string): string => {
  let safe = "";
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
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

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildCell = (
  col: string,
  rowNum: number,
  value: string | number | null,
): string => {
  const ref = `${col}${rowNum}`;
  const s = COL_STYLES[col] ?? "2";
  if (value === null || value === undefined || value === "") {
    return `<c r="${ref}" s="${s}"/>`;
  }
  if (typeof value === "number") {
    return `<c r="${ref}" s="${s}"><v>${value}</v></c>`;
  }
  const safe = escapeXml(sanitizeText(value));
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t>${safe}</t></is></c>`;
};

const buildDataRow = (row: MonitoringExportRow, rowNum: number): string => {
  const cells = [
    buildCell("A", rowNum, null),
    buildCell("B", rowNum, null),
    buildCell("C", rowNum, row.project_name || null),
    buildCell("D", rowNum, row.agency || null),
    buildCell("E", rowNum, row.location || null),
    buildCell("F", rowNum, toFiniteNumber(row.approved_budget)),
    buildCell("G", rowNum, toFiniteNumber(row.certified_amount)),
    buildCell("H", rowNum, toFiniteNumber(row.obligation)),
    buildCell("I", rowNum, toFiniteNumber(row.actual_cost)),
    buildCell("J", rowNum, row.funding || null),
    buildCell("K", rowNum, row.certified_date || null),
    buildCell("L", rowNum, row.major_findings || null),
    buildCell("M", rowNum, row.issues || null),
    buildCell("N", rowNum, toFiniteNumber(row.status_percent)),
    buildCell("O", rowNum, row.action_recommendation || null),
    buildCell("P", rowNum, row.remarks || null),
    buildCell("Q", rowNum, null),
  ].join("");
  return `<row r="${rowNum}" spans="1:17" x14ac:dyDescent="0.25">${cells}</row>`;
};

const toArrayBufferFromBase64 = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
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
    const cells = headers.map((h) => {
      const raw = String(row[h] ?? "").replaceAll('"', '""');
      return `"${raw}"`;
    });
    lines.push(cells.join(","));
  }

  downloadBlob(
    new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}

export function downloadMonitoring(
  data: MonitoringExportRow[],
  filename = "Project_Monitoring_Status_Report.xlsx",
  options: { fallbackToCsv?: boolean } = {},
): void {
  void (async () => {
    try {
      // 1. Load template as zip
      const templateBytes = toArrayBufferFromBase64(MONITORING_TEMPLATE_BASE64);
      const zip = await JSZip.loadAsync(templateBytes);

      // 2. Get sheet1.xml
      const sheetFile = zip.file("xl/worksheets/sheet1.xml");
      if (!sheetFile) throw new Error("sheet1.xml not found in template");
      const sheetXml = await sheetFile.async("string");

      // 3. Build replacement rows for data region (rows 7–31)
      const rowsToWrite = data.slice(0, MAX_ROWS);

      // Build new XML for data rows — written rows get data, remaining keep template style
      const newDataRows = rowsToWrite
        .map((row, i) => buildDataRow(row, DATA_START_ROW + i))
        .join("");

      // 4. Replace the existing data rows (7–31) in sheetData
      // Strategy: keep everything outside the data region intact
      const updatedXml = sheetXml.replace(
        /(<sheetData>)([\s\S]*?)(<\/sheetData>)/,
        (_, open, sheetData, close) => {
          // Keep header rows (1–6) and footer rows (32+) exactly as-is
          const headerRows = [
            ...sheetData.matchAll(/<row r="(\d+)"[\s\S]*?<\/row>/g),
          ]
            .filter((m) => parseInt(m[1]) <= 6)
            .map((m) => m[0])
            .join("");
          const footerRows = [
            ...sheetData.matchAll(/<row r="(\d+)"[\s\S]*?<\/row>/g),
          ]
            .filter((m) => parseInt(m[1]) >= 32)
            .map((m) => m[0])
            .join("");

          // For template rows that have no data written, preserve them as-is
          const writtenRowNums = new Set(
            rowsToWrite.map((_, i) => DATA_START_ROW + i),
          );
          const preservedDataRows = [
            ...sheetData.matchAll(/<row r="(\d+)"[\s\S]*?<\/row>/g),
          ]
            .filter((m) => {
              const n = parseInt(m[1]);
              return (
                n >= DATA_START_ROW &&
                n <= DATA_END_ROW &&
                !writtenRowNums.has(n)
              );
            })
            .map((m) => m[0])
            .join("");

          return `${open}${headerRows}${newDataRows}${preservedDataRows}${footerRows}${close}`;
        },
      );

      // 5. Write updated sheet back into zip
      zip.file("xl/worksheets/sheet1.xml", updatedXml);

      // 6. Generate and download
      const outBuffer = await zip.generateAsync({
        type: "arraybuffer",
        compression: "DEFLATE",
      });

      downloadBlob(
        new Blob([outBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename,
      );
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
