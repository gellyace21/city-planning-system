"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import {
  AIPRow,
  EditHistoryEntry,
  MonitoringRow,
} from "@/components/project-monitoring/types";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  addCommentToEntity,
  ActorContext,
  getActorNotifications,
  getCommentsForEntity,
  createAipRow,
  createMonitoringRow,
  deleteAipRows,
  deleteMonitoringRows,
  getProjectMonitoringData,
  getLeadUploadedFiles,
  LeadFileSummary,
  LeadUploadInputRow,
  markNotificationAsRead,
  reviewAipSuggestion,
  restoreHistoryEntry,
  uploadLeadAipRows,
  updateAipRowField,
  updateMonitoringRowField,
} from "@/lib/services/projectMonitoringService";
import {
  CommentEntry,
  NotificationEntry,
} from "@/components/project-monitoring/types";

const PAGE_PATH = "/dashboard/project-monitoring";

const requireActor = async (): Promise<ActorContext> => {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const id = Number(session?.user?.id);
  if (!session?.user || !role || !Number.isFinite(id)) {
    throw new Error("You must be signed in to continue.");
  }

  if (role !== "admin" && role !== "lead") {
    throw new Error("Unsupported role.");
  }

  return { id, role: role as "admin" | "lead" };
};

export async function fetchProjectMonitoringDataAction(): Promise<{
  aipRows: AIPRow[];
  monitoringRows: MonitoringRow[];
  history: EditHistoryEntry[];
}> {
  return getProjectMonitoringData();
}

export async function createAipRowAction(): Promise<{
  row: AIPRow;
  historyEntry: EditHistoryEntry;
}> {
  const actor = await requireActor();
  const row = await createAipRow(actor);
  revalidatePath(PAGE_PATH);
  return row;
}

export async function updateAipRowFieldAction(
  rowId: number,
  field: keyof AIPRow,
  value: string | number,
): Promise<{
  row: AIPRow;
  historyEntry: EditHistoryEntry | null;
}> {
  const actor = await requireActor();
  const row = await updateAipRowField(rowId, field, value, actor);
  revalidatePath(PAGE_PATH);
  revalidatePath("/dashboard/annual-investment-plan");
  return row;
}

export async function deleteAipRowsAction(
  ids: number[],
): Promise<EditHistoryEntry[]> {
  const actor = await requireActor();
  const entries = await deleteAipRows(ids, actor);
  revalidatePath(PAGE_PATH);
  return entries;
}

export async function createMonitoringRowAction(): Promise<{
  row: MonitoringRow;
  historyEntry: EditHistoryEntry;
}> {
  const actor = await requireActor();
  const row = await createMonitoringRow(actor);
  revalidatePath(PAGE_PATH);
  return row;
}

export async function updateMonitoringRowFieldAction(
  rowId: number,
  field: keyof MonitoringRow,
  value: string | number,
): Promise<{
  row: MonitoringRow;
  historyEntry: EditHistoryEntry | null;
}> {
  const actor = await requireActor();
  const row = await updateMonitoringRowField(rowId, field, value, actor);
  revalidatePath(PAGE_PATH);
  return row;
}

export async function deleteMonitoringRowsAction(
  ids: number[],
): Promise<EditHistoryEntry[]> {
  const actor = await requireActor();
  const entries = await deleteMonitoringRows(ids, actor);
  revalidatePath(PAGE_PATH);
  return entries;
}

export async function restoreHistoryEntryAction(historyId: number): Promise<{
  row: AIPRow | MonitoringRow | null;
}> {
  await requireActor();
  const result = await restoreHistoryEntry(historyId);
  revalidatePath(PAGE_PATH);
  return result;
}

export async function uploadLeadAipFileAction(
  fileName: string,
  rows: LeadUploadInputRow[],
): Promise<{ uploadedRows: AIPRow[]; file: LeadFileSummary }> {
  const actor = await requireActor();
  const result = await uploadLeadAipRows(actor, fileName, rows);
  revalidatePath(PAGE_PATH);
  revalidatePath("/dashboard/annual-investment-plan");
  return result;
}

export async function fetchLeadUploadedFilesAction(): Promise<
  LeadFileSummary[]
> {
  const actor = await requireActor();
  return getLeadUploadedFiles(actor);
}

export async function reviewAipSuggestionAction(
  historyId: number,
  decision: "approved" | "rejected",
): Promise<EditHistoryEntry> {
  const actor = await requireActor();
  const entry = await reviewAipSuggestion(actor, historyId, decision);
  revalidatePath(PAGE_PATH);
  revalidatePath("/dashboard/annual-investment-plan");
  return entry;
}

export async function fetchCommentsAction(
  entity: "aip_rows" | "monitoring_rows",
): Promise<CommentEntry[]> {
  const actor = await requireActor();
  return getCommentsForEntity(actor, entity);
}

export async function addCommentAction(payload: {
  entity_name: "aip_rows" | "monitoring_rows";
  row_id: number;
  column_name: string;
  comment_text: string;
}): Promise<CommentEntry> {
  const actor = await requireActor();
  const entry = await addCommentToEntity(actor, payload);
  revalidatePath(PAGE_PATH);
  revalidatePath("/dashboard/annual-investment-plan");
  return entry;
}

export async function fetchNotificationsAction(): Promise<NotificationEntry[]> {
  const actor = await requireActor();
  return getActorNotifications(actor);
}

export async function markNotificationReadAction(
  notificationId: number,
): Promise<NotificationEntry> {
  const actor = await requireActor();
  const updated = await markNotificationAsRead(actor, notificationId);
  revalidatePath(PAGE_PATH);
  revalidatePath("/dashboard/annual-investment-plan");
  return updated;
}
