export interface AIPRow {
  id: number;
  sector: string;
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
}

export interface MonitoringRow {
  id: number;
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

export interface EditHistoryEntry {
  id: number;
  project_id: number;
  entity_name: "aip_rows" | "monitoring_rows";
  row_id: number;
  column_name: string;
  old_value: string | number | null;
  new_value: string | number | null;
  edited_by_admin: number;
  edited_at: string;
  action_type: "edit" | "add" | "delete";
  row_snapshot?: string | null;
}

export type SortKey = keyof AIPRow | null;
export type SortDir = "asc" | "desc";
export type ViewMode = "table" | "summary";
export type EditCell = { rowId: number; field: keyof AIPRow } | null;
export type MonitoringSortKey = keyof MonitoringRow | null;
export type MonitoringEditCell = {
  rowId: number;
  field: keyof MonitoringRow;
} | null;

export interface SectorColors {
  bg: string;
  badge: string;
  border: string;
}

export interface SectorSummary {
  sector: string;
  count: number;
  total: number;
  cc: number;
}

export interface BudgetSegment {
  key: string;
  color: string;
  total: number;
}
