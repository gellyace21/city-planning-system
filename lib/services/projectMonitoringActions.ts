"use server";

import { revalidatePath } from "next/cache";
import {
  AIPRow,
  EditHistoryEntry,
  MonitoringRow,
} from "@/components/project-monitoring/types";
import {
  createAipRow,
  createMonitoringRow,
  deleteAipRows,
  deleteMonitoringRows,
  getProjectMonitoringData,
  restoreHistoryEntry,
  updateAipRowField,
  updateMonitoringRowField,
} from "@/lib/services/projectMonitoringService";

const PAGE_PATH = "/dashboard/project-monitoring";

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
  const row = await createAipRow();
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
  const row = await updateAipRowField(rowId, field, value);
  revalidatePath(PAGE_PATH);
  return row;
}

export async function deleteAipRowsAction(
  ids: number[],
): Promise<EditHistoryEntry[]> {
  const entries = await deleteAipRows(ids);
  revalidatePath(PAGE_PATH);
  return entries;
}

export async function createMonitoringRowAction(): Promise<{
  row: MonitoringRow;
  historyEntry: EditHistoryEntry;
}> {
  const row = await createMonitoringRow();
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
  const row = await updateMonitoringRowField(rowId, field, value);
  revalidatePath(PAGE_PATH);
  return row;
}

export async function deleteMonitoringRowsAction(
  ids: number[],
): Promise<EditHistoryEntry[]> {
  const entries = await deleteMonitoringRows(ids);
  revalidatePath(PAGE_PATH);
  return entries;
}

export async function restoreHistoryEntryAction(historyId: number): Promise<{
  row: AIPRow | MonitoringRow | null;
}> {
  const result = await restoreHistoryEntry(historyId);
  revalidatePath(PAGE_PATH);
  return result;
}
