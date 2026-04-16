import { AIPRow, SectorColors } from "./types";

export const NUMERIC_FIELDS: (keyof AIPRow)[] = [
  "ps",
  "mooe",
  "fe",
  "co",
  "total",
  "ccAdaptation",
  "ccMitigation",
];

export const DEFAULT_SECTORS = [
  "Social Services",
  "Infrastructure",
  "Economic Development",
  "Environment",
];

export const SECTOR_COLORS: Record<string, SectorColors> = {
  "Social Services": {
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    border: "border-blue-200",
  },
  Infrastructure: {
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    border: "border-amber-200",
  },
  "Economic Development": {
    bg: "bg-green-50",
    badge: "bg-green-100 text-green-800",
    border: "border-green-200",
  },
  Environment: {
    bg: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    border: "border-emerald-200",
  },
};

export const EMPTY_ROW = (): AIPRow => ({
  id: Date.now(),
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
});
