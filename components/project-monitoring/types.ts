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

export type SortKey = keyof AIPRow | null;
export type SortDir = "asc" | "desc";
export type ViewMode = "table" | "summary";
export type EditCell = { rowId: number; field: keyof AIPRow } | null;

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
