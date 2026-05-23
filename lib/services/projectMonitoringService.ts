import "server-only";

import {
  AIPRow,
  CommentEntry,
  EditHistoryEntry,
  MonitoringRow,
  NotificationEntry,
} from "@/components/project-monitoring/types";
import {
  MonitoringTableState,
  readMonitoringTableState,
  writeMonitoringTableState,
} from "@/lib/services/projectMonitoringTableStore";

interface DbShape {
  projects?: Array<{
    id: number;
    project_name: string;
    year?: number | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }>;
  monitoring_categories?: Array<{
    id: number;
    project_id?: number | null;
    name: string;
    created_at?: string | null;
  }>;
  aip_rows?: RawAIPRow[];
  monitoring_rows?: RawMonitoringRow[];
  edit_history?: RawEditHistoryEntry[];
  lead_files?: RawLeadFile[];
  file_comments?: RawFileCommentEntry[];
  comments?: RawCommentEntry[];
  notifications?: RawNotificationEntry[];
  admins?: RawAdminUser[];
  leads?: RawLeadUser[];
  [key: string]: unknown;
}

interface RawAdminUser {
  id: number;
  name: string;
  email: string;
  profile_pic?: string;
  is_superadmin?: boolean;
}

interface RawLeadUser {
  id: number;
  username: string;
  department?: string;
  profile_pic?: string;
}

export interface ActorContext {
  id: number;
  role: "admin" | "superadmin" | "lead";
}

export interface LeadUploadInputRow {
  aipCode: string;
  description: string;
  department: string;
  startDate: string;
  endDate: string;
  outputs: string;
  funding: string;
  ps: number;
  mooe: number;
  fe: number;
  co: number;
  total: number;
  ccAdaptation: number;
  ccMitigation: number;
  ccCode: string;
  sector?: string;
}

export interface LeadFileSummary {
  id: number;
  lead_id: number;
  file_name: string;
  uploaded_at: string;
  row_count: number;
  department?: string;
  lead_username?: string;
  is_submitted: boolean;
  submitted_at?: string | null;
}

export interface FileCommentEntry {
  id: number;
  file_id: number;
  lead_id: number;
  comment_text: string;
  created_by_id: number;
  created_by_role: "admin" | "superadmin" | "lead";
  created_by_name: string;
  created_by_avatar?: string;
  created_at: string;
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
  edited_by_user?: number;
  edited_by_role?: "admin" | "superadmin" | "lead";
  change_status?: "pending" | "approved" | "rejected";
  reviewed_by_admin?: number | null;
  reviewed_at?: string | null;
  edited_at: string;
  action_type?: "edit" | "add" | "delete";
  row_snapshot?: string | null;
}

interface RawLeadFile {
  id: number;
  lead_id: number;
  file_name: string;
  uploaded_at: string;
  submitted_at?: string | null;
  row_count: number;
  department?: string;
  is_submitted?: boolean;
}

interface RawCommentEntry {
  id: number;
  project_id: number;
  entity_name: "aip_rows" | "monitoring_rows";
  row_id: number;
  column_name: string;
  comment_text: string;
  created_by_id: number;
  created_by_role: "admin" | "superadmin" | "lead";
  created_by_name: string;
  created_by_avatar?: string;
  created_at: string;
}

interface RawFileCommentEntry {
  id: number;
  file_id: number;
  lead_id: number;
  comment_text: string;
  created_by_id: number;
  created_by_role: "admin" | "superadmin" | "lead";
  created_by_name: string;
  created_by_avatar?: string;
  created_at: string;
}

interface RawNotificationEntry {
  id: number;
  recipient_id: number;
  recipient_role: "admin" | "superadmin" | "lead";
  actor_id: number;
  actor_role: "admin" | "superadmin" | "lead";
  actor_name: string;
  actor_avatar?: string;
  message: string;
  entity_name: "aip_rows" | "monitoring_rows";
  row_id: number;
  column_name: string;
  created_at: string;
  read_at?: string | null;
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

const AIP_REQUIRED_FIELDS: (keyof AIPRow)[] = [
  "aipCode",
  "description",
  "department",
  "startDate",
  "endDate",
  "outputs",
  "funding",
];

const MONITORING_REQUIRED_FIELDS: (keyof MonitoringRow)[] = [
  "project_name",
  "agency",
  "location",
  "funding",
  "certified_date",
];

const DATE_INPUT_RE =
  /^(\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})$/;

const isValidDateInput = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return DATE_INPUT_RE.test(trimmed);
};

const normalizeCode = (value: string): string => value.trim().toLowerCase();

const assertValidNumberField = (
  field: string,
  value: string | number,
  options?: { max?: number },
): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a valid number.`);
  }
  if (parsed < 0) {
    throw new Error(`${field} cannot be negative.`);
  }
  if (
    typeof options?.max === "number" &&
    Number.isFinite(options.max) &&
    parsed > options.max
  ) {
    throw new Error(`${field} cannot be greater than ${options.max}.`);
  }
  return parsed;
};

const validateAipRowForSubmission = (
  row: RawAIPRow,
  allRows: RawAIPRow[],
): string[] => {
  const issues: string[] = [];

  for (const field of AIP_REQUIRED_FIELDS) {
    const value = String(row[field] ?? "").trim();
    if (!value) {
      issues.push(`${String(field)} is required`);
    }
  }

  if (row.startDate && !isValidDateInput(String(row.startDate))) {
    issues.push("startDate has an invalid format");
  }
  if (row.endDate && !isValidDateInput(String(row.endDate))) {
    issues.push("endDate has an invalid format");
  }

  for (const numericField of AIP_NUMERIC_FIELDS) {
    const parsed = Number(row[numericField]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      issues.push(`${String(numericField)} must be a non-negative number`);
    }
  }

  const code = normalizeCode(String(row.aipCode ?? ""));
  if (code) {
    const duplicateCount = allRows.filter(
      (item) =>
        item.id !== row.id &&
        normalizeCode(String(item.aipCode ?? "")) === code,
    ).length;
    if (duplicateCount > 0) {
      issues.push("aipCode is duplicated");
    }
  }

  return issues;
};

const validateMonitoringRow = (row: RawMonitoringRow): string[] => {
  const issues: string[] = [];

  for (const field of MONITORING_REQUIRED_FIELDS) {
    const value = String(row[field] ?? "").trim();
    if (!value) {
      issues.push(`${String(field)} is required`);
    }
  }

  if (row.certified_date && !isValidDateInput(String(row.certified_date))) {
    issues.push("certified_date has an invalid format");
  }

  for (const field of MONITORING_NUMERIC_FIELDS) {
    const max = field === "status_percent" ? 100 : undefined;
    const parsed = Number(row[field]);
    if (
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      (max !== undefined && parsed > max)
    ) {
      issues.push(
        max === undefined
          ? `${String(field)} must be a non-negative number`
          : `${String(field)} must be between 0 and ${max}`,
      );
    }
  }

  return issues;
};

const toNumber = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toStringSafe = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

const toAipRow = (raw: RawAIPRow): AIPRow => ({
  id: toNumber(raw.id),
  year: raw.year ? toNumber(raw.year) : undefined,
  lead_id: raw.lead_id ? toNumber(raw.lead_id) : undefined,
  upload_id: raw.upload_id ? toNumber(raw.upload_id) : undefined,
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
  year: raw.year
    ? toNumber(raw.year)
    : toNumber(toStringSafe(raw.certified_date).slice(0, 4)) || undefined,
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
  edited_by_user: toNumber(raw.edited_by_user) || toNumber(raw.edited_by_admin),
  edited_by_role: raw.edited_by_role ?? "admin",
  change_status: raw.change_status ?? "approved",
  reviewed_by_admin:
    raw.reviewed_by_admin === null || raw.reviewed_by_admin === undefined
      ? null
      : toNumber(raw.reviewed_by_admin),
  reviewed_at: raw.reviewed_at ?? null,
  edited_at: toStringSafe(raw.edited_at),
  action_type: raw.action_type ?? "edit",
  row_snapshot: typeof raw.row_snapshot === "string" ? raw.row_snapshot : null,
});

const toLeadFileSummary = (raw: RawLeadFile): LeadFileSummary => ({
  id: toNumber(raw.id),
  lead_id: toNumber(raw.lead_id),
  file_name: toStringSafe(raw.file_name),
  uploaded_at: toStringSafe(raw.uploaded_at),
  submitted_at:
    raw.submitted_at === null
      ? null
      : toStringSafe(raw.submitted_at ?? raw.uploaded_at),
  row_count: toNumber(raw.row_count),
  department: toStringSafe(raw.department) || undefined,
  is_submitted: raw.is_submitted ?? true,
});

const toCommentEntry = (raw: RawCommentEntry): CommentEntry => ({
  id: toNumber(raw.id),
  project_id: toNumber(raw.project_id) || DEFAULT_PROJECT_ID,
  entity_name:
    raw.entity_name === "monitoring_rows" ? "monitoring_rows" : "aip_rows",
  row_id: toNumber(raw.row_id),
  column_name: toStringSafe(raw.column_name) || "__row__",
  comment_text: toStringSafe(raw.comment_text),
  created_by_id: toNumber(raw.created_by_id),
  created_by_role: raw.created_by_role ?? "admin",
  created_by_name: toStringSafe(raw.created_by_name) || "Unknown",
  created_by_avatar: toStringSafe(raw.created_by_avatar) || undefined,
  created_at: toStringSafe(raw.created_at),
});

const toFileCommentEntry = (raw: RawFileCommentEntry): FileCommentEntry => ({
  id: toNumber(raw.id),
  file_id: toNumber(raw.file_id),
  lead_id: toNumber(raw.lead_id),
  comment_text: toStringSafe(raw.comment_text),
  created_by_id: toNumber(raw.created_by_id),
  created_by_role: raw.created_by_role ?? "admin",
  created_by_name: toStringSafe(raw.created_by_name) || "Unknown",
  created_by_avatar: toStringSafe(raw.created_by_avatar) || undefined,
  created_at: toStringSafe(raw.created_at),
});

const toNotificationEntry = (raw: RawNotificationEntry): NotificationEntry => ({
  id: toNumber(raw.id),
  recipient_id: toNumber(raw.recipient_id),
  recipient_role: raw.recipient_role ?? "admin",
  actor_id: toNumber(raw.actor_id),
  actor_role: raw.actor_role ?? "admin",
  actor_name: toStringSafe(raw.actor_name) || "Unknown",
  actor_avatar: toStringSafe(raw.actor_avatar) || undefined,
  message: toStringSafe(raw.message),
  entity_name:
    raw.entity_name === "monitoring_rows" ? "monitoring_rows" : "aip_rows",
  row_id: toNumber(raw.row_id),
  column_name: toStringSafe(raw.column_name) || "__row__",
  created_at: toStringSafe(raw.created_at),
  read_at: raw.read_at ?? null,
});

const readDb = async (): Promise<DbShape> => {
  const data = await readMonitoringTableState();
  return {
    ...data,
    projects: data.projects ?? [],
    monitoring_categories: data.monitoring_categories ?? [],
    aip_rows: (data.aip_rows ?? []) as unknown as RawAIPRow[],
    monitoring_rows: (data.monitoring_rows ??
      []) as unknown as RawMonitoringRow[],
    edit_history: (data.edit_history ?? []) as unknown as RawEditHistoryEntry[],
    lead_files: (data.lead_files ?? []) as RawLeadFile[],
    file_comments: (data.file_comments ??
      []) as unknown as RawFileCommentEntry[],
    comments: (data.comments ?? []) as unknown as RawCommentEntry[],
    notifications: (data.notifications ??
      []) as unknown as RawNotificationEntry[],
    admins: (data.admins ?? []) as RawAdminUser[],
    leads: (data.leads ?? []) as RawLeadUser[],
  };
};

const writeDb = async (db: DbShape): Promise<void> => {
  await writeMonitoringTableState(db as MonitoringTableState);
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
    edited_by_user: entry.edited_by_user ?? entry.edited_by_admin,
    edited_by_role: entry.edited_by_role ?? "admin",
    change_status: entry.change_status ?? "approved",
    reviewed_by_admin: entry.reviewed_by_admin ?? null,
    reviewed_at: entry.reviewed_at ?? null,
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
        entry.entity_name === target.entity_name &&
        entry.row_id === target.row_id,
    )
    .sort(compareHistoryEntries);
};

const getAipRows = (db: DbShape): RawAIPRow[] => {
  return (db.aip_rows ?? []) as RawAIPRow[];
};

const getMonitoringRows = (db: DbShape): RawMonitoringRow[] => {
  return (db.monitoring_rows ?? []) as RawMonitoringRow[];
};

const getLeadFiles = (db: DbShape): RawLeadFile[] => {
  return (db.lead_files ?? []) as RawLeadFile[];
};

const getComments = (db: DbShape): RawCommentEntry[] => {
  return (db.comments ?? []) as RawCommentEntry[];
};

const getFileComments = (db: DbShape): RawFileCommentEntry[] => {
  return (db.file_comments ?? []) as RawFileCommentEntry[];
};

const getNotifications = (db: DbShape): RawNotificationEntry[] => {
  return (db.notifications ?? []) as RawNotificationEntry[];
};

const getAdmins = (db: DbShape): RawAdminUser[] => {
  return (db.admins ?? []) as RawAdminUser[];
};

const getLeads = (db: DbShape): RawLeadUser[] => {
  return (db.leads ?? []) as RawLeadUser[];
};

const getActorIdentity = (
  db: DbShape,
  actor: ActorContext,
): { name: string; avatar?: string } => {
  if (actor.role === "lead") {
    const lead = getLeads(db).find((item) => toNumber(item.id) === actor.id);
    return {
      name: lead?.username || `Lead ${actor.id}`,
      avatar: lead?.profile_pic,
    };
  }

  const admin = getAdmins(db).find((item) => toNumber(item.id) === actor.id);
  return {
    name: admin?.name || `Admin ${actor.id}`,
    avatar: admin?.profile_pic,
  };
};

const appendNotification = (
  db: DbShape,
  payload: Omit<RawNotificationEntry, "id" | "created_at" | "read_at">,
): RawNotificationEntry => {
  const notifications = getNotifications(db);
  const created: RawNotificationEntry = {
    id: nextId(notifications),
    created_at: new Date().toISOString(),
    read_at: null,
    ...payload,
  };
  notifications.push(created);
  db.notifications = notifications;
  return created;
};

const notifyRelevantUsers = (
  db: DbShape,
  actor: ActorContext,
  payload: {
    entity_name: "aip_rows" | "monitoring_rows";
    row_id: number;
    column_name: string;
    message: string;
  },
): void => {
  const actorIdentity = getActorIdentity(db, actor);
  const recipients = new Set<string>();

  if (actor.role === "lead") {
    for (const admin of getAdmins(db)) {
      if (admin.is_superadmin) continue;
      recipients.add(`${toNumber(admin.id)}:admin`);
    }
  } else if (payload.entity_name === "aip_rows") {
    const aipRow = getAipRows(db).find((row) => row.id === payload.row_id);
    if (aipRow?.lead_id) {
      recipients.add(`${toNumber(aipRow.lead_id)}:lead`);
    }
  }

  for (const key of recipients) {
    const [idText, roleText] = key.split(":");
    const recipientId = Number(idText);
    const recipientRole = roleText as "admin" | "superadmin" | "lead";
    if (!Number.isFinite(recipientId)) continue;
    if (recipientId === actor.id && recipientRole === actor.role) continue;

    appendNotification(db, {
      recipient_id: recipientId,
      recipient_role: recipientRole,
      actor_id: actor.id,
      actor_role: actor.role,
      actor_name: actorIdentity.name,
      actor_avatar: actorIdentity.avatar,
      message: payload.message,
      entity_name: payload.entity_name,
      row_id: payload.row_id,
      column_name: payload.column_name,
    });
  }
};

const notifyOtherAdmins = (
  db: DbShape,
  actor: ActorContext,
  payload: {
    entity_name: "aip_rows" | "monitoring_rows";
    row_id: number;
    column_name: string;
    message: string;
  },
): void => {
  const actorIdentity = getActorIdentity(db, actor);
  for (const admin of getAdmins(db)) {
    if (admin.is_superadmin) continue;
    const adminId = toNumber(admin.id);
    if (adminId === actor.id && actor.role === "admin") continue;
    appendNotification(db, {
      recipient_id: adminId,
      recipient_role: "admin",
      actor_id: actor.id,
      actor_role: actor.role,
      actor_name: actorIdentity.name,
      actor_avatar: actorIdentity.avatar,
      message: payload.message,
      entity_name: payload.entity_name,
      row_id: payload.row_id,
      column_name: payload.column_name,
    });
  }
};

const isAdminRole = (role: ActorContext["role"]): boolean => {
  return role === "admin" || role === "superadmin";
};

const normalizeAipValue = (
  field: keyof AIPRow,
  value: string | number,
): string | number => {
  if (AIP_NUMERIC_FIELDS.has(field)) {
    return assertValidNumberField(String(field), value);
  }

  const text = String(value ?? "");
  if ((field === "startDate" || field === "endDate") && text.trim()) {
    if (!isValidDateInput(text)) {
      throw new Error(
        `${String(field)} must use YYYY-MM-DD, MMM YYYY, or Month DD, YYYY format.`,
      );
    }
  }
  return text;
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

export async function getProjectMonitoringData(actor?: ActorContext): Promise<{
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

  if (actor && isAdminRole(actor.role)) {
    const submittedLeadUploads = new Set(
      getLeadFiles(db)
        .filter((file) => file.is_submitted || file.submitted_at)
        .map((file) => toNumber(file.id)),
    );

    const filteredAipRows = aipRows.filter((row) => {
      if (!row.lead_id) return true;
      return submittedLeadUploads.has(toNumber(row.upload_id));
    });

    const filteredHistory = history.filter(
      (entry) => entry.edited_by_role !== "lead",
    );

    return {
      aipRows: filteredAipRows,
      monitoringRows,
      history: filteredHistory,
    };
  }

  return { aipRows, monitoringRows, history };
}

export async function getAipPageData(actor?: ActorContext): Promise<{
  aipRows: AIPRow[];
  history: EditHistoryEntry[];
}> {
  const { aipRows, history } = await getProjectMonitoringData(actor);
  return { aipRows, history };
}

export async function getMonitoringPageData(actor?: ActorContext): Promise<{
  monitoringRows: MonitoringRow[];
  history: EditHistoryEntry[];
}> {
  const { monitoringRows, history } = await getProjectMonitoringData(actor);
  return { monitoringRows, history };
}

export async function createAipRow(actor: ActorContext): Promise<{
  row: AIPRow;
  historyEntry: EditHistoryEntry;
}> {
  if (!isAdminRole(actor.role)) {
    throw new Error("Only admins can create AIP rows.");
  }

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
    edited_by_admin: actor.id,
    edited_by_user: actor.id,
    edited_by_role: actor.role,
    change_status: "approved",
    action_type: "add",
    row_snapshot: snapshotRow(row),
  });
  db.aip_rows = rows;
  notifyRelevantUsers(db, actor, {
    entity_name: "aip_rows",
    row_id: row.id,
    column_name: "__row__",
    message: "AIP row created.",
  });
  await writeDb(db);
  return { row: toAipRow(row), historyEntry };
}

export async function updateAipRowField(
  rowId: number,
  field: keyof AIPRow,
  value: string | number,
  actor: ActorContext,
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
  const parsed = normalizeAipValue(field, value);

  if (String(oldValue) === String(parsed)) {
    return { row: toAipRow(row), historyEntry: null };
  }

  if (isAdminRole(actor.role)) {
    row[field] = parsed as never;

    if (
      field === "ps" ||
      field === "mooe" ||
      field === "fe" ||
      field === "co"
    ) {
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
      old_value:
        typeof oldValue === "number" ? oldValue : String(oldValue ?? ""),
      new_value: typeof parsed === "number" ? parsed : String(parsed ?? ""),
      edited_by_admin: actor.id,
      edited_by_user: actor.id,
      edited_by_role: actor.role,
      change_status: "approved",
      action_type: "edit",
    });
    db.aip_rows = rows;
    notifyRelevantUsers(db, actor, {
      entity_name: "aip_rows",
      row_id: row.id,
      column_name: String(field),
      message: `AIP field ${String(field)} was updated.`,
    });
    await writeDb(db);
    return { row: toAipRow(row), historyEntry };
  }

  if (row.lead_id !== actor.id) {
    throw new Error("Leads can only edit their own uploaded rows.");
  }

  const leadFile = getLeadFiles(db).find((entry) => entry.id === row.upload_id);
  if (leadFile && (leadFile.is_submitted || leadFile.submitted_at)) {
    throw new Error(
      "This file has been submitted and can no longer be edited.",
    );
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
    edited_by_user: actor.id,
    edited_by_role: actor.role,
    change_status: "pending",
    action_type: "edit",
  });

  db.aip_rows = rows;
  await writeDb(db);
  return { row: toAipRow(row), historyEntry };
}

export async function deleteAipRows(
  ids: number[],
  actor: ActorContext,
): Promise<EditHistoryEntry[]> {
  if (!isAdminRole(actor.role)) {
    throw new Error("Only admins can delete AIP rows.");
  }

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
      edited_by_admin: actor.id,
      edited_by_user: actor.id,
      edited_by_role: actor.role,
      change_status: "approved",
      action_type: "delete",
      row_snapshot: snapshotRow(row),
    }),
  );

  db.aip_rows = (db.aip_rows ?? []).filter((row) => !selected.has(row.id));
  for (const row of toDelete) {
    notifyRelevantUsers(db, actor, {
      entity_name: "aip_rows",
      row_id: row.id,
      column_name: "__row__",
      message: "AIP row deleted.",
    });
  }
  await writeDb(db);
  return historyEntries;
}

export async function createMonitoringRow(actor: ActorContext): Promise<{
  row: MonitoringRow;
  historyEntry: EditHistoryEntry;
}> {
  if (!isAdminRole(actor.role)) {
    throw new Error("Only admins can create monitoring rows.");
  }

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
    edited_by_admin: actor.id,
    edited_by_user: actor.id,
    edited_by_role: actor.role,
    change_status: "approved",
    action_type: "add",
    row_snapshot: snapshotRow(row),
  });
  db.monitoring_rows = rows;
  notifyRelevantUsers(db, actor, {
    entity_name: "monitoring_rows",
    row_id: row.id,
    column_name: "__row__",
    message: "Monitoring row created.",
  });
  await writeDb(db);
  return { row: toMonitoringRow(row), historyEntry };
}

export async function updateMonitoringRowField(
  rowId: number,
  field: keyof MonitoringRow,
  value: string | number,
  actor: ActorContext,
): Promise<{
  row: MonitoringRow;
  historyEntry: EditHistoryEntry | null;
}> {
  if (!isAdminRole(actor.role)) {
    throw new Error("Only admins can edit monitoring rows.");
  }

  const db = await readDb();
  const rows = db.monitoring_rows ?? [];
  const idx = rows.findIndex((row) => row.id === rowId);
  if (idx < 0) throw new Error("Monitoring row not found");

  const row = { ...rows[idx] };
  const oldValue = row[field];
  const parsed = MONITORING_NUMERIC_FIELDS.has(field)
    ? assertValidNumberField(String(field), value, {
        max: field === "status_percent" ? 100 : undefined,
      })
    : String(value ?? "");

  if (field === "certified_date" && String(parsed).trim()) {
    if (!isValidDateInput(String(parsed))) {
      throw new Error(
        "certified_date must use YYYY-MM-DD, MMM YYYY, or Month DD, YYYY format.",
      );
    }
  }

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
    edited_by_admin: actor.id,
    edited_by_user: actor.id,
    edited_by_role: actor.role,
    change_status: "approved",
    action_type: "edit",
  });

  db.monitoring_rows = rows;
  notifyRelevantUsers(db, actor, {
    entity_name: "monitoring_rows",
    row_id: row.id,
    column_name: String(field),
    message: `Monitoring field ${String(field)} was updated.`,
  });
  await writeDb(db);
  return { row: toMonitoringRow(row), historyEntry };
}

export async function deleteMonitoringRows(
  ids: number[],
  actor: ActorContext,
): Promise<EditHistoryEntry[]> {
  if (!isAdminRole(actor.role)) {
    throw new Error("Only admins can delete monitoring rows.");
  }

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
      edited_by_admin: actor.id,
      edited_by_user: actor.id,
      edited_by_role: actor.role,
      change_status: "approved",
      action_type: "delete",
      row_snapshot: snapshotRow(row),
    }),
  );

  db.monitoring_rows = (db.monitoring_rows ?? []).filter(
    (row) => !selected.has(row.id),
  );
  for (const row of toDelete) {
    notifyRelevantUsers(db, actor, {
      entity_name: "monitoring_rows",
      row_id: row.id,
      column_name: "__row__",
      message: "Monitoring row deleted.",
    });
  }
  await writeDb(db);
  return historyEntries;
}

export async function uploadLeadAipRows(
  actor: ActorContext,
  fileName: string,
  rowsToUpload: LeadUploadInputRow[],
): Promise<{ uploadedRows: AIPRow[]; file: LeadFileSummary }> {
  if (actor.role !== "lead") {
    throw new Error("Only leads can upload AIP files.");
  }

  const cleanedRows = rowsToUpload.filter(
    (row) => row.aipCode?.trim() || row.description?.trim(),
  );
  if (cleanedRows.length === 0) {
    throw new Error("The uploaded file has no valid AIP rows.");
  }

  const db = await readDb();
  const leadFiles = getLeadFiles(db);
  const aipRows = getAipRows(db);
  const existingCodes = new Set(
    aipRows
      .map((row) => normalizeCode(String(row.aipCode ?? "")))
      .filter(Boolean),
  );

  const seenUploadCodes = new Set<string>();
  for (const row of cleanedRows) {
    const code = normalizeCode(String(row.aipCode ?? ""));
    if (!code) continue;
    if (seenUploadCodes.has(code)) {
      throw new Error(
        `Duplicate AIP code found in uploaded file: ${row.aipCode}`,
      );
    }
    if (existingCodes.has(code)) {
      throw new Error(`AIP code already exists: ${row.aipCode}`);
    }
    seenUploadCodes.add(code);
  }

  const lead = getLeads(db).find((item) => toNumber(item.id) === actor.id);
  const leadDepartment = toStringSafe(lead?.department) || "General";

  const fileRecord: RawLeadFile = {
    id: nextId(leadFiles),
    lead_id: actor.id,
    file_name: fileName || `lead-upload-${Date.now()}.xlsx`,
    uploaded_at: new Date().toISOString(),
    submitted_at: null,
    row_count: cleanedRows.length,
    department: leadDepartment,
    is_submitted: false,
  };
  leadFiles.push(fileRecord);

  const createdRows: RawAIPRow[] = cleanedRows.map((row, index) => {
    const ps = toNumber(row.ps);
    const mooe = toNumber(row.mooe);
    const fe = toNumber(row.fe);
    const co = toNumber(row.co);
    const total = toNumber(row.total) || ps + mooe + fe + co;

    return {
      id: nextId(aipRows) + index,
      project_id: DEFAULT_PROJECT_ID,
      upload_id: fileRecord.id,
      lead_id: actor.id,
      row_number: aipRows.length + index + 1,
      year: new Date().getFullYear(),
      sector: row.sector ?? "",
      aipCode: String(row.aipCode ?? ""),
      description: String(row.description ?? ""),
      department: String(row.department ?? ""),
      startDate: String(row.startDate ?? ""),
      endDate: String(row.endDate ?? ""),
      outputs: String(row.outputs ?? ""),
      funding: String(row.funding ?? ""),
      ps,
      mooe,
      fe,
      co,
      total,
      ccAdaptation: toNumber(row.ccAdaptation),
      ccMitigation: toNumber(row.ccMitigation),
      ccCode: String(row.ccCode ?? ""),
      created_at: new Date().toISOString(),
    };
  });

  db.lead_files = leadFiles;
  db.aip_rows = [...aipRows, ...createdRows];
  await writeDb(db);

  return {
    uploadedRows: createdRows.map(toAipRow),
    file: toLeadFileSummary(fileRecord),
  };
}

export async function submitLeadAipFile(
  actor: ActorContext,
  fileId: number,
): Promise<LeadFileSummary> {
  if (actor.role !== "lead") {
    throw new Error("Only leads can submit AIP files.");
  }

  const db = await readDb();
  const leadFiles = getLeadFiles(db);
  const idx = leadFiles.findIndex((entry) => entry.id === fileId);
  if (idx < 0) {
    throw new Error("Lead file not found.");
  }

  const file = leadFiles[idx];
  if (file.lead_id !== actor.id) {
    throw new Error("Leads can only submit their own uploads.");
  }

  if (file.submitted_at === null) {
    leadFiles[idx] = {
      ...file,
      submitted_at: new Date().toISOString(),
    };
    db.lead_files = leadFiles;

    const firstRow = getAipRows(db).find((row) => row.upload_id === fileId);

    notifyRelevantUsers(db, actor, {
      entity_name: "aip_rows",
      row_id: firstRow?.id ?? 0,
      column_name: "__row__",
      message: `Lead submitted ${file.row_count} AIP row(s).`,
    });

    await writeDb(db);
    return toLeadFileSummary(leadFiles[idx]);
  }

  return toLeadFileSummary(file);
}

export async function getLeadUploadedFiles(
  actor: ActorContext,
): Promise<LeadFileSummary[]> {
  const db = await readDb();
  const leads = getLeads(db);
  const leadById = new Map(leads.map((lead) => [toNumber(lead.id), lead]));
  const allFiles = getLeadFiles(db)
    .map(toLeadFileSummary)
    .map((file) => {
      const lead = leadById.get(file.lead_id);
      const department =
        file.department?.trim() || toStringSafe(lead?.department) || "General";
      return {
        ...file,
        department,
        lead_username: toStringSafe(lead?.username) || `Lead ${file.lead_id}`,
      };
    });

  if (isAdminRole(actor.role)) {
    return allFiles
      .filter((file) => file.is_submitted || file.submitted_at)
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  }

  return allFiles
    .filter((file) => file.lead_id === actor.id)
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}

export async function submitLeadUpload(
  actor: ActorContext,
  fileId: number,
): Promise<LeadFileSummary> {
  if (actor.role !== "lead") {
    throw new Error("Only leads can submit AIP files.");
  }

  const db = await readDb();
  const leadFiles = getLeadFiles(db);
  const index = leadFiles.findIndex((file) => file.id === fileId);
  if (index < 0) {
    throw new Error("Lead file not found.");
  }

  const file = leadFiles[index];
  if (file.lead_id !== actor.id) {
    throw new Error("Leads can only submit their own uploads.");
  }

  if (file.is_submitted) {
    return toLeadFileSummary(file);
  }

  const aipRows = getAipRows(db).filter((row) => row.upload_id === fileId);
  if (aipRows.length === 0) {
    throw new Error("Cannot submit an empty file.");
  }

  const allRows = getAipRows(db);
  const issues: string[] = [];
  for (const row of aipRows) {
    const rowIssues = validateAipRowForSubmission(row, allRows);
    if (rowIssues.length > 0) {
      issues.push(`Row ${row.id}: ${rowIssues.join(", ")}`);
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Submission blocked. Please fix these issues first:\n${issues
        .slice(0, 12)
        .join("\n")}`,
    );
  }

  const submittedAt = new Date().toISOString();
  leadFiles[index] = {
    ...file,
    is_submitted: true,
    submitted_at: submittedAt,
  };
  db.lead_files = leadFiles;
  await writeDb(db);

  const firstRow = getAipRows(db).find((row) => row.upload_id === fileId);
  if (firstRow) {
    notifyRelevantUsers(db, actor, {
      entity_name: "aip_rows",
      row_id: firstRow.id,
      column_name: "__row__",
      message: `Lead submitted AIP file ${file.file_name}.`,
    });
    await writeDb(db);
  }

  return toLeadFileSummary(leadFiles[index]);
}

export async function reviewAipSuggestion(
  actor: ActorContext,
  historyId: number,
  decision: "approved" | "rejected",
): Promise<EditHistoryEntry> {
  if (!isAdminRole(actor.role)) {
    throw new Error("Only admins can approve or reject lead suggestions.");
  }

  const db = await readDb();
  const history = (db.edit_history ?? []) as RawEditHistoryEntry[];
  const entryIndex = history.findIndex((item) => item.id === historyId);
  if (entryIndex < 0) {
    throw new Error("Suggestion not found.");
  }

  const suggestion = toEditHistory(history[entryIndex]);
  if (suggestion.entity_name !== "aip_rows") {
    throw new Error("Only AIP suggestions are supported.");
  }
  if (suggestion.change_status !== "pending") {
    throw new Error("This suggestion has already been reviewed.");
  }
  if (suggestion.edited_by_role !== "lead") {
    throw new Error("Only lead-originated suggestions can be reviewed.");
  }

  if (decision === "approved") {
    const rows = getAipRows(db);
    const rowIndex = rows.findIndex((row) => row.id === suggestion.row_id);
    if (rowIndex < 0) {
      throw new Error("AIP row not found for this suggestion.");
    }

    const field = suggestion.column_name as keyof AIPRow;
    const row = { ...rows[rowIndex] };
    row[field] = (
      typeof row[field] === "number"
        ? toNumber(suggestion.new_value)
        : String(suggestion.new_value ?? "")
    ) as never;

    if (
      field === "ps" ||
      field === "mooe" ||
      field === "fe" ||
      field === "co"
    ) {
      row.total =
        toNumber(row.ps) +
        toNumber(row.mooe) +
        toNumber(row.fe) +
        toNumber(row.co);
    }

    rows[rowIndex] = row;
    db.aip_rows = rows;
  }

  history[entryIndex] = {
    ...history[entryIndex],
    change_status: decision,
    reviewed_by_admin: actor.id,
    reviewed_at: new Date().toISOString(),
  };
  db.edit_history = history;
  await writeDb(db);

  return toEditHistory(history[entryIndex]);
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

  if (entry.change_status && entry.change_status !== "approved") {
    throw new Error("Only approved history entries can be restored.");
  }
  if (entry.edited_by_role === "lead") {
    throw new Error(
      "Lead suggestions must be reviewed through approve/reject.",
    );
  }

  const rowHistory = getHistoryForRow(db, entry);
  const targetIndex = rowHistory.findIndex(
    (historyEntry) => historyEntry.id === entry.id,
  );
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

export async function getCommentsForEntity(
  actor: ActorContext,
  entity: "aip_rows" | "monitoring_rows",
): Promise<CommentEntry[]> {
  const db = await readDb();
  const comments = getComments(db)
    .map(toCommentEntry)
    .filter((comment) => comment.entity_name === entity);

  if (entity === "aip_rows" && actor.role === "lead") {
    const visibleIds = new Set(
      getAipRows(db)
        .filter((row) => row.lead_id === actor.id)
        .map((row) => row.id),
    );
    return comments
      .filter((comment) => visibleIds.has(comment.row_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  return comments.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addCommentToEntity(
  actor: ActorContext,
  payload: {
    entity_name: "aip_rows" | "monitoring_rows";
    row_id: number;
    column_name: string;
    comment_text: string;
  },
): Promise<CommentEntry> {
  const text = payload.comment_text.trim();
  if (!text) {
    throw new Error("Comment cannot be empty.");
  }

  const db = await readDb();
  if (actor.role !== "admin") {
    throw new Error("Only admins can create comments.");
  }

  const comments = getComments(db);
  const actorIdentity = getActorIdentity(db, actor);
  const created: RawCommentEntry = {
    id: nextId(comments),
    project_id: DEFAULT_PROJECT_ID,
    entity_name: payload.entity_name,
    row_id: payload.row_id,
    column_name: payload.column_name || "__row__",
    comment_text: text,
    created_by_id: actor.id,
    created_by_role: actor.role,
    created_by_name: actorIdentity.name,
    created_by_avatar: actorIdentity.avatar,
    created_at: new Date().toISOString(),
  };

  comments.push(created);
  db.comments = comments;

  notifyOtherAdmins(db, actor, {
    entity_name: payload.entity_name,
    row_id: payload.row_id,
    column_name: payload.column_name || "__row__",
    message: `New comment added on ${payload.column_name || "entry"}.`,
  });

  await writeDb(db);
  return toCommentEntry(created);
}

export async function getLeadFileComments(
  actor: ActorContext,
): Promise<FileCommentEntry[]> {
  const db = await readDb();
  const comments = getFileComments(db).map(toFileCommentEntry);

  if (isAdminRole(actor.role)) {
    return comments.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  return comments
    .filter((comment) => comment.lead_id === actor.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addLeadFileComment(
  actor: ActorContext,
  payload: {
    file_id: number;
    comment_text: string;
  },
): Promise<FileCommentEntry> {
  const text = payload.comment_text.trim();
  if (!text) {
    throw new Error("Comment cannot be empty.");
  }

  if (!isAdminRole(actor.role)) {
    throw new Error("Only admins can create file comments.");
  }

  const db = await readDb();
  const leadFiles = getLeadFiles(db);
  const file = leadFiles.find((entry) => entry.id === payload.file_id);
  if (!file) {
    throw new Error("Lead file not found.");
  }

  const comments = getFileComments(db);
  const actorIdentity = getActorIdentity(db, actor);
  const created: RawFileCommentEntry = {
    id: nextId(comments),
    file_id: file.id,
    lead_id: file.lead_id,
    comment_text: text,
    created_by_id: actor.id,
    created_by_role: actor.role,
    created_by_name: actorIdentity.name,
    created_by_avatar: actorIdentity.avatar,
    created_at: new Date().toISOString(),
  };

  comments.push(created);
  db.file_comments = comments;
  await writeDb(db);
  return toFileCommentEntry(created);
}

export async function deleteLeadUploadedFile(
  actor: ActorContext,
  fileId: number,
): Promise<{ deletedFileId: number; removedRowIds: number[] }> {
  const db = await readDb();
  const leadFiles = getLeadFiles(db);
  const file = leadFiles.find((entry) => entry.id === fileId);
  if (!file) {
    throw new Error("Lead file not found.");
  }

  if (!isAdminRole(actor.role) && file.lead_id !== actor.id) {
    throw new Error("Leads can only delete their own uploads.");
  }

  if (!isAdminRole(actor.role) && file.submitted_at !== null) {
    throw new Error("Submitted files can no longer be deleted.");
  }

  db.lead_files = leadFiles.filter((entry) => entry.id !== fileId);
  const aipRows = getAipRows(db);
  const removedRows = aipRows.filter((row) => row.upload_id === fileId);
  db.aip_rows = aipRows.filter((row) => row.upload_id !== fileId);
  db.file_comments = getFileComments(db).filter(
    (comment) => comment.file_id !== fileId,
  );
  await writeDb(db);

  return {
    deletedFileId: fileId,
    removedRowIds: removedRows.map((row) => row.id),
  };
}

export async function getActorNotifications(
  actor: ActorContext,
): Promise<NotificationEntry[]> {
  const db = await readDb();
  return getNotifications(db)
    .map(toNotificationEntry)
    .filter(
      (entry) =>
        entry.recipient_id === actor.id && entry.recipient_role === actor.role,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function markNotificationAsRead(
  actor: ActorContext,
  notificationId: number,
): Promise<NotificationEntry> {
  const db = await readDb();
  const notifications = getNotifications(db);
  const idx = notifications.findIndex((entry) => entry.id === notificationId);
  if (idx < 0) {
    throw new Error("Notification not found.");
  }

  const target = notifications[idx];
  if (
    target.recipient_id !== actor.id ||
    target.recipient_role !== actor.role
  ) {
    throw new Error("Not allowed to update this notification.");
  }

  notifications[idx] = {
    ...target,
    read_at: target.read_at ?? new Date().toISOString(),
  };
  db.notifications = notifications;
  await writeDb(db);
  return toNotificationEntry(notifications[idx]);
}

export async function markAllNotificationsAsRead(
  actor: ActorContext,
): Promise<NotificationEntry[]> {
  const db = await readDb();
  const notifications = getNotifications(db);
  const now = new Date().toISOString();
  let changed = false;

  const updated = notifications.map((entry) => {
    if (
      entry.recipient_id === actor.id &&
      entry.recipient_role === actor.role &&
      !entry.read_at
    ) {
      changed = true;
      return { ...entry, read_at: now };
    }
    return entry;
  });

  if (changed) {
    db.notifications = updated;
    await writeDb(db);
  }

  return updated
    .map(toNotificationEntry)
    .filter(
      (entry) =>
        entry.recipient_id === actor.id && entry.recipient_role === actor.role,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
