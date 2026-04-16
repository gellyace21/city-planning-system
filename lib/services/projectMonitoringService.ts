import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  AIPRow,
  EditHistoryEntry,
  MonitoringRow,
} from "@/components/project-monitoring/types";

const DB_PATH = path.join(process.cwd(), "db.json");

interface DbShape {
  aip_rows?: RawAIPRow[];
  monitoring_rows?: RawMonitoringRow[];
  edit_history?: RawEditHistoryEntry[];
  [key: string]: unknown;
}

interface RawAIPRow extends AIPRow {
  project_id?: number;
  upload_id?: number;
  row_number?: number;
  year?: number;
  created_at?: string;
}

interface RawMonitoringRow extends MonitoringRow {
  project_id?: number;
  upload_id?: number;
  row_number?: number;
  created_at?: string;
}

interface RawEditHistoryEntry {
  id: number;
  project_id: number;
  entity_name: "aip_rows" | "monitoring_rows";
  row_id: number;
  column_name: string;
  old_value: string | number | null;
  new_value: string | number | null;
  edited_by_admin: number;
  edited_at: string;
  action_type?: "edit" | "add" | "delete";
  row_snapshot?: string | null;
}

const DEFAULT_PROJECT_ID = 1;
const DEFAULT_ADMIN_ID = 1;

const AIP_NUMERIC_FIELDS = new Set<keyof AIPRow>([
  "ps",
  "mooe",
  "fe",
  "co",
  "total",
  "ccAdaptation",
  "ccMitigation",
]);

const MONITORING_NUMERIC_FIELDS = new Set<keyof MonitoringRow>([
  "approved_budget",
  "certified_amount",
  "obligation",
  "actual_cost",
  "status_percent",
]);

const toNumber = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toStringSafe = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

const toAipRow = (raw: RawAIPRow): AIPRow => ({
  id: toNumber(raw.id),
  sector: toStringSafe(raw.sector),
  aipCode: toStringSafe(raw.aipCode),
  description: toStringSafe(raw.description),
  department: toStringSafe(raw.department),
  startDate: toStringSafe(raw.startDate),
  endDate: toStringSafe(raw.endDate),
  outputs: toStringSafe(raw.outputs),
  funding: toStringSafe(raw.funding),
  ps: toNumber(raw.ps),
  mooe: toNumber(raw.mooe),
  fe: toNumber(raw.fe),
  co: toNumber(raw.co),
  total: toNumber(raw.total),
  ccAdaptation: toNumber(raw.ccAdaptation),
  ccMitigation: toNumber(raw.ccMitigation),
  ccCode: toStringSafe(raw.ccCode),
});

const toMonitoringRow = (raw: RawMonitoringRow): MonitoringRow => ({
  id: toNumber(raw.id),
  project_name: toStringSafe(raw.project_name),
  agency: toStringSafe(raw.agency),
  location: toStringSafe(raw.location),
  approved_budget: toNumber(raw.approved_budget),
  certified_amount: toNumber(raw.certified_amount),
  obligation: toNumber(raw.obligation),
  actual_cost: toNumber(raw.actual_cost),
  funding: toStringSafe(raw.funding),
  certified_date: toStringSafe(raw.certified_date),
  major_findings: toStringSafe(raw.major_findings),
  issues: toStringSafe(raw.issues),
  status_percent: toNumber(raw.status_percent),
  action_recommendation: toStringSafe(raw.action_recommendation),
  remarks: toStringSafe(raw.remarks),
});

const toEditHistory = (raw: RawEditHistoryEntry): EditHistoryEntry => ({
  id: toNumber(raw.id),
  project_id: toNumber(raw.project_id) || DEFAULT_PROJECT_ID,
  entity_name:
    raw.entity_name === "monitoring_rows" ? "monitoring_rows" : "aip_rows",
  row_id: toNumber(raw.row_id),
  column_name: toStringSafe(raw.column_name),
  old_value:
    typeof raw.old_value === "string" ||
    typeof raw.old_value === "number" ||
    raw.old_value === null
      ? raw.old_value
      : String(raw.old_value ?? ""),
  new_value:
    typeof raw.new_value === "string" ||
    typeof raw.new_value === "number" ||
    raw.new_value === null
      ? raw.new_value
      : String(raw.new_value ?? ""),
  edited_by_admin: toNumber(raw.edited_by_admin) || DEFAULT_ADMIN_ID,
  edited_at: toStringSafe(raw.edited_at),
  action_type: raw.action_type ?? "edit",
  row_snapshot: typeof raw.row_snapshot === "string" ? raw.row_snapshot : null,
});

const readDb = async (): Promise<DbShape> => {
  const file = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(file) as DbShape;
};

const writeDb = async (db: DbShape): Promise<void> => {
  await fs.writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf-8");
};

const nextId = (rows: { id: number }[]): number => {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
};

const appendHistory = (
  db: DbShape,
  entry: Omit<EditHistoryEntry, "id" | "edited_at">,
): EditHistoryEntry => {
  const history = db.edit_history ?? [];
  const created: EditHistoryEntry = {
    id: nextId(history),
    edited_at: new Date().toISOString(),
    ...entry,
  };
  history.push(created);
  db.edit_history = history;
  return created;
};

const summarizeAipRow = (row: RawAIPRow): string => {
  return row.aipCode || row.description || `AIP row ${row.id}`;
};

const summarizeMonitoringRow = (row: RawMonitoringRow): string => {
  return row.project_name || row.agency || `Monitoring row ${row.id}`;
};

const snapshotRow = (row: RawAIPRow | RawMonitoringRow): string => {
  return JSON.stringify(row);
};

const compareHistoryEntries = (
  left: EditHistoryEntry,
  right: EditHistoryEntry,
): number => {
  const timeCmp = left.edited_at.localeCompare(right.edited_at);
  return timeCmp !== 0 ? timeCmp : left.id - right.id;
};

const getHistoryForRow = (
  db: DbShape,
  target: EditHistoryEntry,
): EditHistoryEntry[] => {
  return (db.edit_history ?? [])
    .map(toEditHistory)
    .filter(
      (entry) =>
        entry.entity_name === target.entity_name && entry.row_id === target.row_id,
    )
    .sort(compareHistoryEntries);
};

const getAipRows = (db: DbShape): RawAIPRow[] => {
  return (db.aip_rows ?? []) as RawAIPRow[];
};

const getMonitoringRows = (db: DbShape): RawMonitoringRow[] => {
  return (db.monitoring_rows ?? []) as RawMonitoringRow[];
};

const restoreAipSnapshot = (
  db: DbShape,
  entry: EditHistoryEntry,
): RawAIPRow => {
  if (!entry.row_snapshot) {
    throw new Error("No snapshot available for this history item");
  }

  const row = JSON.parse(entry.row_snapshot) as RawAIPRow;
  const rows = getAipRows(db);
  const idx = rows.findIndex((existing) => existing.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  db.aip_rows = rows.sort((left, right) => left.id - right.id);
  return row;
};

const restoreMonitoringSnapshot = (
  db: DbShape,
  entry: EditHistoryEntry,
): RawMonitoringRow => {
  if (!entry.row_snapshot) {
    throw new Error("No snapshot available for this history item");
  }

  const row = JSON.parse(entry.row_snapshot) as RawMonitoringRow;
  const rows = getMonitoringRows(db);
  const idx = rows.findIndex((existing) => existing.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  db.monitoring_rows = rows.sort((left, right) => left.id - right.id);
  return row;
};

const undoAipEntry = (db: DbShape, entry: EditHistoryEntry): void => {
  const rows = getAipRows(db);

  if (entry.action_type === "add") {
    db.aip_rows = rows.filter((row) => row.id !== entry.row_id);
    return;
  }

  if (entry.action_type === "delete") {
    restoreAipSnapshot(db, entry);
    return;
  }

  const idx = rows.findIndex((row) => row.id === entry.row_id);
  if (idx < 0) {
    throw new Error("AIP row not found");
  }

  const row = { ...rows[idx] };
  const field = entry.column_name as keyof AIPRow;
  row[field] = (
    typeof row[field] === "number"
      ? toNumber(entry.old_value)
      : String(entry.old_value ?? "")
  ) as never;
  if (field === "ps" || field === "mooe" || field === "fe" || field === "co") {
    row.total =
      toNumber(row.ps) +
      toNumber(row.mooe) +
      toNumber(row.fe) +
      toNumber(row.co);
  }

  rows[idx] = row;
  db.aip_rows = rows;
};

const undoMonitoringEntry = (db: DbShape, entry: EditHistoryEntry): void => {
  const rows = getMonitoringRows(db);

  if (entry.action_type === "add") {
    db.monitoring_rows = rows.filter((row) => row.id !== entry.row_id);
    return;
  }

  if (entry.action_type === "delete") {
    restoreMonitoringSnapshot(db, entry);
    return;
  }

  const idx = rows.findIndex((row) => row.id === entry.row_id);
  if (idx < 0) {
    throw new Error("Monitoring row not found");
  }

  const row = { ...rows[idx] };
  const field = entry.column_name as keyof MonitoringRow;
  row[field] = (
    typeof row[field] === "number"
      ? toNumber(entry.old_value)
      : String(entry.old_value ?? "")
  ) as never;
  rows[idx] = row;
  db.monitoring_rows = rows;
};

export async function getProjectMonitoringData(): Promise<{
  aipRows: AIPRow[];
  monitoringRows: MonitoringRow[];
  history: EditHistoryEntry[];
}> {
  const db = await readDb();
  const aipRows = (db.aip_rows ?? []).map(toAipRow).sort((a, b) => a.id - b.id);
  const monitoringRows = (db.monitoring_rows ?? [])
    .map(toMonitoringRow)
    .sort((a, b) => a.id - b.id);
  const history = (db.edit_history ?? [])
    .map(toEditHistory)
    .sort((a, b) => b.edited_at.localeCompare(a.edited_at));
  return { aipRows, monitoringRows, history };
}

export async function getAipPageData(): Promise<{
  aipRows: AIPRow[];
  history: EditHistoryEntry[];
}> {
  const { aipRows, history } = await getProjectMonitoringData();
  return { aipRows, history };
}

export async function getMonitoringPageData(): Promise<{
  monitoringRows: MonitoringRow[];
  history: EditHistoryEntry[];
}> {
  const { monitoringRows, history } = await getProjectMonitoringData();
  return { monitoringRows, history };
}

export async function createAipRow(): Promise<{
  row: AIPRow;
  historyEntry: EditHistoryEntry;
}> {
  const db = await readDb();
  const rows = db.aip_rows ?? [];
  const row: RawAIPRow = {
    id: nextId(rows),
    project_id: DEFAULT_PROJECT_ID,
    upload_id: 1,
    row_number: rows.length + 1,
    year: new Date().getFullYear(),
    sector: "",
    aipCode: "",
    description: "",
    department: "",
    startDate: "",
    endDate: "",
    outputs: "",
    funding: "",
    ps: 0,
    mooe: 0,
    fe: 0,
    co: 0,
    total: 0,
    ccAdaptation: 0,
    ccMitigation: 0,
    ccCode: "",
    created_at: new Date().toISOString(),
  };
  rows.push(row);
  const historyEntry = appendHistory(db, {
    project_id: row.project_id ?? DEFAULT_PROJECT_ID,
    entity_name: "aip_rows",
    row_id: row.id,
    column_name: "__row__",
    old_value: null,
    new_value: summarizeAipRow(row),
    edited_by_admin: DEFAULT_ADMIN_ID,
    action_type: "add",
    row_snapshot: snapshotRow(row),
  });
  db.aip_rows = rows;
  await writeDb(db);
  return { row: toAipRow(row), historyEntry };
}

export async function updateAipRowField(
  rowId: number,
  field: keyof AIPRow,
  value: string | number,
): Promise<{
  row: AIPRow;
  historyEntry: EditHistoryEntry | null;
}> {
  const db = await readDb();
  const rows = db.aip_rows ?? [];
  const idx = rows.findIndex((row) => row.id === rowId);
  if (idx < 0) throw new Error("AIP row not found");

  const row = { ...rows[idx] };
  const oldValue = row[field];
  const parsed = AIP_NUMERIC_FIELDS.has(field)
    ? toNumber(value)
    : String(value ?? "");

  if (String(oldValue) === String(parsed)) {
    return { row: toAipRow(row), historyEntry: null };
  }

  row[field] = parsed as never;

  if (field === "ps" || field === "mooe" || field === "fe" || field === "co") {
    row.total =
      toNumber(row.ps) +
      toNumber(row.mooe) +
      toNumber(row.fe) +
      toNumber(row.co);
  }

  rows[idx] = row;
  const historyEntry = appendHistory(db, {
    project_id: row.project_id ?? DEFAULT_PROJECT_ID,
    entity_name: "aip_rows",
    row_id: row.id,
    column_name: String(field),
    old_value: typeof oldValue === "number" ? oldValue : String(oldValue ?? ""),
    new_value: typeof parsed === "number" ? parsed : String(parsed ?? ""),
    edited_by_admin: DEFAULT_ADMIN_ID,
    action_type: "edit",
  });
  db.aip_rows = rows;
  await writeDb(db);
  return { row: toAipRow(row), historyEntry };
}

export async function deleteAipRows(
  ids: number[],
): Promise<EditHistoryEntry[]> {
  const db = await readDb();
  const selected = new Set(ids);
  const toDelete = (db.aip_rows ?? []).filter((row) => selected.has(row.id));
  const historyEntries = toDelete.map((row) =>
    appendHistory(db, {
      project_id: row.project_id ?? DEFAULT_PROJECT_ID,
      entity_name: "aip_rows",
      row_id: row.id,
      column_name: "__row__",
      old_value: summarizeAipRow(row),
      new_value: null,
      edited_by_admin: DEFAULT_ADMIN_ID,
      action_type: "delete",
      row_snapshot: snapshotRow(row),
    }),
  );

  db.aip_rows = (db.aip_rows ?? []).filter((row) => !selected.has(row.id));
  await writeDb(db);
  return historyEntries;
}

export async function createMonitoringRow(): Promise<{
  row: MonitoringRow;
  historyEntry: EditHistoryEntry;
}> {
  const db = await readDb();
  const rows = db.monitoring_rows ?? [];
  const row: RawMonitoringRow = {
    id: nextId(rows),
    project_id: DEFAULT_PROJECT_ID,
    upload_id: 1,
    row_number: rows.length + 1,
    project_name: "",
    agency: "",
    location: "",
    approved_budget: 0,
    certified_amount: 0,
    obligation: 0,
    actual_cost: 0,
    funding: "",
    certified_date: "",
    major_findings: "",
    issues: "",
    status_percent: 0,
    action_recommendation: "",
    remarks: "",
    created_at: new Date().toISOString(),
  };
  rows.push(row);
  const historyEntry = appendHistory(db, {
    project_id: row.project_id ?? DEFAULT_PROJECT_ID,
    entity_name: "monitoring_rows",
    row_id: row.id,
    column_name: "__row__",
    old_value: null,
    new_value: summarizeMonitoringRow(row),
    edited_by_admin: DEFAULT_ADMIN_ID,
    action_type: "add",
    row_snapshot: snapshotRow(row),
  });
  db.monitoring_rows = rows;
  await writeDb(db);
  return { row: toMonitoringRow(row), historyEntry };
}

export async function updateMonitoringRowField(
  rowId: number,
  field: keyof MonitoringRow,
  value: string | number,
): Promise<{
  row: MonitoringRow;
  historyEntry: EditHistoryEntry | null;
}> {
  const db = await readDb();
  const rows = db.monitoring_rows ?? [];
  const idx = rows.findIndex((row) => row.id === rowId);
  if (idx < 0) throw new Error("Monitoring row not found");

  const row = { ...rows[idx] };
  const oldValue = row[field];
  const parsed = MONITORING_NUMERIC_FIELDS.has(field)
    ? toNumber(value)
    : String(value ?? "");

  if (String(oldValue) === String(parsed)) {
    return { row: toMonitoringRow(row), historyEntry: null };
  }

  row[field] = parsed as never;
  rows[idx] = row;

  const historyEntry = appendHistory(db, {
    project_id: row.project_id ?? DEFAULT_PROJECT_ID,
    entity_name: "monitoring_rows",
    row_id: row.id,
    column_name: String(field),
    old_value: typeof oldValue === "number" ? oldValue : String(oldValue ?? ""),
    new_value: typeof parsed === "number" ? parsed : String(parsed ?? ""),
    edited_by_admin: DEFAULT_ADMIN_ID,
    action_type: "edit",
  });

  db.monitoring_rows = rows;
  await writeDb(db);
  return { row: toMonitoringRow(row), historyEntry };
}

export async function deleteMonitoringRows(
  ids: number[],
): Promise<EditHistoryEntry[]> {
  const db = await readDb();
  const selected = new Set(ids);
  const toDelete = (db.monitoring_rows ?? []).filter((row) =>
    selected.has(row.id),
  );
  const historyEntries = toDelete.map((row) =>
    appendHistory(db, {
      project_id: row.project_id ?? DEFAULT_PROJECT_ID,
      entity_name: "monitoring_rows",
      row_id: row.id,
      column_name: "__row__",
      old_value: summarizeMonitoringRow(row),
      new_value: null,
      edited_by_admin: DEFAULT_ADMIN_ID,
      action_type: "delete",
      row_snapshot: snapshotRow(row),
    }),
  );

  db.monitoring_rows = (db.monitoring_rows ?? []).filter(
    (row) => !selected.has(row.id),
  );
  await writeDb(db);
  return historyEntries;
}

export async function restoreHistoryEntry(historyId: number): Promise<{
  row: AIPRow | MonitoringRow | null;
}> {
  const db = await readDb();
  const history = db.edit_history ?? [];
  const rawEntry = history.find((entry) => entry.id === historyId);
  if (!rawEntry) {
    throw new Error("History entry not found");
  }

  const entry = toEditHistory(rawEntry as RawEditHistoryEntry);

  const rowHistory = getHistoryForRow(db, entry);
  const targetIndex = rowHistory.findIndex((historyEntry) => historyEntry.id === entry.id);
  if (targetIndex < 0) {
    throw new Error("History entry not found for row");
  }

  for (let index = rowHistory.length - 1; index > targetIndex; index -= 1) {
    const laterEntry = rowHistory[index];
    if (laterEntry.entity_name === "aip_rows") {
      undoAipEntry(db, laterEntry);
    } else {
      undoMonitoringEntry(db, laterEntry);
    }
  }

  if (entry.action_type === "edit") {
    if (entry.entity_name === "aip_rows") {
      const rows = getAipRows(db);
      const idx = rows.findIndex((row) => row.id === entry.row_id);
      if (idx < 0) throw new Error("AIP row not found");
      const row = rows[idx];
      await writeDb(db);
      return { row: toAipRow(row) };
    }

    const rows = getMonitoringRows(db);
    const idx = rows.findIndex((row) => row.id === entry.row_id);
    if (idx < 0) throw new Error("Monitoring row not found");
    const row = rows[idx];
    await writeDb(db);
    return { row: toMonitoringRow(row) };
  }

  if (entry.action_type === "add") {
    if (entry.entity_name === "aip_rows") {
      db.aip_rows = (db.aip_rows ?? []).filter(
        (row) => row.id !== entry.row_id,
      );
    } else {
      db.monitoring_rows = (db.monitoring_rows ?? []).filter(
        (row) => row.id !== entry.row_id,
      );
    }
    await writeDb(db);
    return { row: null };
  }

  if (!entry.row_snapshot) {
    throw new Error("No snapshot available for this history item");
  }

  if (entry.entity_name === "aip_rows") {
    const row = JSON.parse(entry.row_snapshot) as RawAIPRow;
    const rows = db.aip_rows ?? [];
    const idx = rows.findIndex((existing) => existing.id === row.id);
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
    db.aip_rows = rows.sort((a, b) => a.id - b.id);
    await writeDb(db);
    return { row: toAipRow(row) };
  }

  const row = JSON.parse(entry.row_snapshot) as RawMonitoringRow;
  const rows = db.monitoring_rows ?? [];
  const idx = rows.findIndex((existing) => existing.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  db.monitoring_rows = rows.sort((a, b) => a.id - b.id);
  await writeDb(db);
  return { row: toMonitoringRow(row) };
}
