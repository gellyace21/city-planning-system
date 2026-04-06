"use client";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import ExcelJS from "exceljs";
import { downloadAIP, parseAIPExcel } from "@/lib/aipExport";
import SectorPillColumn from "./SectorPillColumn";

interface AIPRow {
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

type SortKey = keyof AIPRow | null;
type SortDir = "asc" | "desc";
type ViewMode = "table" | "summary";
type EditCell = { rowId: number; field: keyof AIPRow } | null;

interface AIPUser {
  id: string;
  name: string;
  email: string;
}

interface ChangeRecord {
  id: string;
  timestamp: Date;
  user: AIPUser;
  rowId: number;
  aipCode: string;
  field: keyof AIPRow;
  oldValue: string | number;
  newValue: string | number;
  type: "edit" | "add" | "delete" | "import";
  snapshot: AIPRow | null;
}

const THEME = {
  filterActive: "bg-teal-600 text-white border-teal-600",
  filterInactive:
    "bg-white text-gray-600 border-gray-200 hover:border-teal-400",
  sectorPills: {
    "Social Services": "bg-teal-400 text-white",
    Infrastructure: "bg-cyan-500 text-white",
    "Economic Development": "bg-yellow-300 text-yellow-900",
    Environment: "bg-emerald-400 text-white",
  } as Record<string, string>,
  sectorPillFallback: "bg-gray-300 text-gray-700",
} as const;

const DEFAULT_SECTORS = [
  "Social Services",
  "Infrastructure",
  "Economic Development",
  "Environment",
];

const NUMERIC_FIELDS: (keyof AIPRow)[] = [
  "ps",
  "mooe",
  "fe",
  "co",
  "total",
  "ccAdaptation",
  "ccMitigation",
];

const DUMMY_DATA: AIPRow[] = [
  {
    id: 1,
    sector: "Social Services",
    aipCode: "SS-001",
    description: "Construction of Barangay Health Center",
    department: "City Health Office",
    startDate: "Jan 2027",
    endDate: "Jun 2027",
    outputs: "1 Health Center constructed",
    funding: "General Fund",
    ps: 500,
    mooe: 1200,
    fe: 0,
    co: 8300,
    total: 10000,
    ccAdaptation: 2000,
    ccMitigation: 500,
    ccCode: "A",
  },
  {
    id: 2,
    sector: "Infrastructure",
    aipCode: "INF-001",
    description: "Road Concreting - Barangay San Isidro",
    department: "City Engineering Office",
    startDate: "Mar 2027",
    endDate: "Sep 2027",
    outputs: "2.5 km road concreted",
    funding: "General Fund",
    ps: 1200,
    mooe: 3800,
    fe: 0,
    co: 25000,
    total: 30000,
    ccAdaptation: 5000,
    ccMitigation: 1000,
    ccCode: "A",
  },
  {
    id: 3,
    sector: "Economic Development",
    aipCode: "ED-001",
    description: "Public Market Renovation",
    department: "City Market Authority",
    startDate: "Jun 2027",
    endDate: "Dec 2027",
    outputs: "1 market renovated",
    funding: "General Fund",
    ps: 600,
    mooe: 1400,
    fe: 0,
    co: 18000,
    total: 20000,
    ccAdaptation: 0,
    ccMitigation: 0,
    ccCode: "",
  },
];

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  checkbox: 40,
  aipCode: 100,
  description: 280,
  department: 180,
  schedule: 120,
  outputs: 180,
  funding: 120,
  ps: 150,
  mooe: 180,
  fe: 140,
  co: 140,
  total: 100,
  ccAdaptation: 150,
  ccMitigation: 150,
  ccCode: 80,
};

const MOCK_USER: AIPUser = {
  id: "user-001",
  name: "John Patrick Salen",
  email: "johnpatrick@cpdo.gov.ph",
};

const EMPTY_ROW = (): AIPRow => ({
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

const fmt = (n: number): string => (n === 0 ? "-" : n.toLocaleString());
const fmtM = (n: number): string => `P${(n / 1000).toFixed(1)}M`;

export default function AIPDashboard(): React.JSX.Element {
  const [data, setData] = useState<AIPRow[]>(DUMMY_DATA);
  const [search, setSearch] = useState<string>("");
  const [filterSector, setFilterSector] = useState<string>("All");
  const [sortCol, setSortCol] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [importing, setImporting] = useState<boolean>(false);
  const [importMsg, setImportMsg] = useState<string>("");
  const [view, setView] = useState<ViewMode>("table");
  const [editCell, setEditCell] = useState<EditCell>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<ChangeRecord[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [highlighted, setHighlighted] = useState<EditCell>(null);
  const [theadHeight, setTheadHeight] = useState<number>(89);
  const [trHeight, setTrHeight] = useState<number>(56);
  const [expandedColumns, setExpandedColumns] = useState<boolean>(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    DEFAULT_COLUMN_WIDTHS,
  );
  const [resizing, setResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const recordChange = (
    type: ChangeRecord["type"],
    rowId: number,
    aipCode: string,
    field: keyof AIPRow,
    oldValue: string | number,
    newValue: string | number,
    snapshot: AIPRow | null,
  ): void => {
    setHistory((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: new Date(),
          user: MOCK_USER,
          rowId,
          aipCode,
          field,
          oldValue,
          newValue,
          type,
          snapshot,
        },
        ...prev,
      ].slice(0, 200),
    );
    setHighlighted({ rowId, field });
    setTimeout(() => setHighlighted(null), 1500);
  };

  const startResize = (columnId: string, e: React.MouseEvent): void => {
    e.preventDefault();
    const th = (e.target as HTMLElement).closest("th");
    if (!th) return;
    setResizing(columnId);
    setStartX(e.pageX);
    setStartWidth(th.offsetWidth);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!resizing) return;
      const diff = e.pageX - startX;
      const newWidth = Math.max(60, startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [resizing]: newWidth }));
    },
    [resizing, startX, startWidth],
  );

  const handleMouseUp = useCallback((): void => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizing, handleMouseMove, handleMouseUp]);

  const getColumnWidth = (columnId: string): number => {
    return columnWidths[columnId];
  };

  const shouldShowFullName = (columnId: string): boolean => {
    const width = columnWidths[columnId];
    const thresholds: Record<string, number> = {
      ps: 130,
      mooe: 150,
      fe: 120,
      co: 120,
      ccAdaptation: 130,
      ccMitigation: 130,
    };
    const threshold = thresholds[columnId];
    return expandedColumns || (threshold !== undefined && width >= threshold);
  };

  const allSectors: string[] = [
    ...new Set([
      ...DEFAULT_SECTORS,
      ...data.map((d) => d.sector).filter(Boolean),
    ]),
  ];

  const handleSort = (col: SortKey): void => {
    if (!col) return;
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const restoreChange = (change: ChangeRecord): void => {
    if (!change.snapshot) return;
    setData((prev) =>
      prev.map((r) => (r.id === change.rowId ? { ...change.snapshot! } : r)),
    );
    recordChange(
      "edit",
      change.rowId,
      change.aipCode,
      change.field,
      change.newValue,
      change.oldValue,
      change.snapshot,
    );
  };

  const filtered: AIPRow[] = data
    .filter((r) => filterSector === "All" || r.sector === filterSector)
    .filter(
      (r) =>
        !search ||
        ([r.aipCode, r.description, r.department, r.outputs] as string[]).some(
          (f) => f?.toLowerCase().includes(search.toLowerCase()),
        ),
    )
    .sort((a, b) => {
      if (!sortCol) return 0;
      const av = a[sortCol],
        bv = b[sortCol];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  useEffect(() => {
    if (theadRef.current) {
      setTheadHeight(theadRef.current.getBoundingClientRect().height);
    }
    if (tbodyRef.current) {
      const firstRow = tbodyRef.current.querySelector("tr");
      if (firstRow) {
        setTrHeight(firstRow.getBoundingClientRect().height);
      }
    }
  }, [filtered.length, view]);

  const totalBudget = filtered.reduce((s, r) => s + r.total, 0);
  const totalCC = filtered.reduce(
    (s, r) => s + r.ccAdaptation + r.ccMitigation,
    0,
  );
  const ccPercent = totalBudget
    ? ((totalCC / totalBudget) * 100).toFixed(1)
    : "0";

  const startEdit = (
    rowId: number,
    field: keyof AIPRow,
    currentVal: string | number,
  ): void => {
    setEditCell({ rowId, field });
    setEditValue(
      String(
        currentVal === 0 && NUMERIC_FIELDS.includes(field) ? "" : currentVal,
      ),
    );
  };

  const commitEdit = (): void => {
    if (!editCell) return;
    const { rowId, field } = editCell;
    setData((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const isNum = NUMERIC_FIELDS.includes(field);
        const parsed = isNum ? parseFloat(editValue) || 0 : editValue;
        const oldValue = r[field];
        if (String(oldValue) === String(parsed)) return r;
        const snapshot = { ...r };
        const updated = { ...r, [field]: parsed };
        if (["ps", "mooe", "fe", "co"].includes(field as string))
          updated.total = updated.ps + updated.mooe + updated.fe + updated.co;
        recordChange(
          "edit",
          rowId,
          r.aipCode || String(r.id),
          field,
          oldValue,
          parsed,
          snapshot,
        );
        return updated;
      }),
    );
    setEditCell(null);
    setEditValue("");
  };

  const cancelEdit = (): void => {
    setEditCell(null);
    setEditValue("");
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") cancelEdit();
  };

  const addRow = (): void => {
    const row = EMPTY_ROW();
    setData((prev) => [...prev, row]);
    recordChange("add", row.id, "NEW", "aipCode", "", "", row);
    setTimeout(() => startEdit(row.id, "aipCode", ""), 50);
  };

  const deleteSelected = (): void => {
    setData((prev) => {
      prev
        .filter((r) => selectedRows.has(r.id))
        .forEach((r) =>
          recordChange(
            "delete",
            r.id,
            r.aipCode,
            "aipCode",
            r.aipCode,
            "DELETED",
            { ...r },
          ),
        );
      return prev.filter((r) => !selectedRows.has(r.id));
    });
    setSelectedRows(new Set());
  };

  const toggleRow = (id: number): void =>
    setSelectedRows((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = (): void =>
    setSelectedRows(
      selectedRows.size === filtered.length && filtered.length > 0
        ? new Set()
        : new Set(filtered.map((r) => r.id)),
    );

  // ── Import ──
  const handleImport = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");

    void parseAIPExcel(file)
      .then((rows) => {
        const mapped: AIPRow[] = rows.map((r, i) => ({
          ...r,
          id: i + 1,
          sector: "",
        }));
        setData(mapped);
        recordChange("import", 0, file.name, "aipCode", 0, mapped.length, null);
        setImportMsg(`✓ Imported ${rows.length} rows from "${file.name}"`);
      })
      .catch((err: unknown) => {
        setImportMsg(`✗ Import failed: ${(err as Error).message}`);
      })
      .finally(() => {
        setImporting(false);
        e.target.value = "";
      });
  }, []);

  const toExportRows = () =>
    data.map((r) => ({
      Sector: r.sector,
      "AIP Reference Code": r.aipCode,
      "Program/Project/Activity Description": r.description,
      "Implementing Office/Department": r.department,
      "Start Date": r.startDate,
      "Completion Date": r.endDate,
      "Expected Outputs": r.outputs,
      "Funding Source": r.funding,
      PS: r.ps,
      MOOE: r.mooe,
      FE: r.fe,
      CO: r.co,
      Total: r.total,
      "CC Adaptation": r.ccAdaptation,
      "CC Mitigation": r.ccMitigation,
      "CC Typology Code": r.ccCode,
    }));

  const downloadExcel = async (): Promise<void> => {
    downloadAIP(data, "AIP_FY2027.xlsx");
  };

  const downloadCSV = async (): Promise<void> => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("AIP FY2027");
    const rows = toExportRows();
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]) as (keyof ReturnType<
      typeof toExportRows
    >[0])[];
    sheet.columns = headers.map((h) => ({ header: h, key: h }));
    rows.forEach((r) => sheet.addRow(r));
    const csv = await workbook.csv.writeBuffer();
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: "AIP_FY2027_Export.csv",
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const EditableCell = ({
    row,
    field,
    className = "",
    numeric = false,
    readOnly = false,
  }: {
    row: AIPRow;
    field: keyof AIPRow;
    className?: string;
    numeric?: boolean;
    readOnly?: boolean;
  }): React.JSX.Element => {
    const isActive = editCell?.rowId === row.id && editCell?.field === field;
    const isHighlighted =
      highlighted?.rowId === row.id && highlighted?.field === field;
    const value = row[field];

    if (readOnly) {
      return (
        <td className={`${className} ${isHighlighted ? "bg-yellow-100" : ""}`}>
          <span className="font-bold text-teal-700">
            {fmt(value as number)}
          </span>
        </td>
      );
    }

    if (isActive) {
      return (
        <td className={className}>
          <input
            autoFocus
            type={numeric ? "number" : "text"}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full min-w-[60px] text-xs border border-teal-400 rounded px-1.5 py-0.5 bg-teal-50 focus:outline-none"
          />
        </td>
      );
    }

    return (
      <td
        className={`${className} cursor-pointer ${isHighlighted ? "bg-yellow-100" : ""}`}
        onDoubleClick={() => startEdit(row.id, field, value)}
      >
        {numeric
          ? fmt(value as number)
          : (value as string) || (
              <span className="text-gray-300 italic text-xs">-</span>
            )}
      </td>
    );
  };

  const ResizeHandle = ({
    columnId,
  }: {
    columnId: string;
  }): React.JSX.Element => (
    <div
      onMouseDown={(e) => startResize(columnId, e)}
      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-teal-400 group z-10"
      style={{ userSelect: "none" }}
    >
      <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gray-300 group-hover:bg-teal-500 group-hover:w-1" />
    </div>
  );

  return (
    <div
      className="min-h-screen bg-teal-50"
      style={{
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        paddingRight: showHistory ? "320px" : undefined,
        userSelect: resizing ? "none" : "auto",
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              FY 2027 Annual Investment Program
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              By Program / Project / Activity by Sector
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpandedColumns((v) => !v)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
              title={
                expandedColumns
                  ? "Show abbreviated columns"
                  : "Show full column names"
              }
            >
              {expandedColumns ? "⇄ Collapse" : "⇆ Expand"}
            </button>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${showHistory ? "bg-teal-600 text-white border-teal-600" : "bg-white text-teal-700 border-teal-200 hover:bg-teal-50"}`}
            >
              History {history.length > 0 ? `(${history.length})` : ""}
            </button>
            <button
              onClick={() =>
                setView((v) => (v === "table" ? "summary" : "table"))
              }
              className="px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-50"
            >
              {view === "table" ? "Summary" : "Table"}
            </button>
            <label className="cursor-pointer">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImport}
              />
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                {importing ? "Importing..." : "Import"}
              </span>
            </label>
            <div className="relative group">
              <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                Export
              </button>
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20 hidden group-hover:block">
                <button
                  onClick={downloadExcel}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 text-gray-700"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={downloadCSV}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 text-gray-700"
                >
                  CSV (.csv)
                </button>
              </div>
            </div>
          </div>
        </div>

        {importMsg && (
          <div
            className={`mb-2 px-4 py-2 rounded-lg text-sm font-medium border ${importMsg.startsWith("✓") ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-red-50 text-red-700 border-red-200"}`}
          >
            {importMsg}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl p-5 border border-teal-100 bg-teal-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Total Projects
            </span>
            <div className="text-2xl font-bold text-gray-900">
              {filtered.length}
            </div>
          </div>
          <div className="rounded-2xl p-5 border border-amber-100 bg-amber-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Total Budget
            </span>
            <div className="text-2xl font-bold text-gray-900">
              {fmtM(totalBudget)}
            </div>
          </div>
          <div className="rounded-2xl p-5 border border-emerald-100 bg-emerald-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              CC Expenditure
            </span>
            <div className="text-2xl font-bold text-gray-900">
              {fmtM(totalCC)}
            </div>
          </div>
          <div className="rounded-2xl p-5 border border-cyan-100 bg-cyan-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              CC Share
            </span>
            <div className="text-2xl font-bold text-gray-900">{ccPercent}%</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            placeholder="Search code, project, department..."
            className="flex-1 min-w-48 px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <div className="flex gap-2 flex-wrap">
            {["All", ...allSectors].map((s) => (
              <button
                key={s}
                onClick={() => setFilterSector(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${filterSector === s ? THEME.filterActive : THEME.filterInactive}`}
              >
                {s}
              </button>
            ))}
          </div>
          {view === "table" && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={addRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition"
              >
                + Add Row
              </button>
              {selectedRows.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition"
                >
                  Delete ({selectedRows.size})
                </button>
              )}
            </div>
          )}
        </div>

        {view === "summary" ? (
          <div className="grid md:grid-cols-2 gap-5">
            {allSectors.map((sec) => {
              const rows = filtered.filter((r) => r.sector === sec);
              const total = rows.reduce((s, r) => s + r.total, 0);
              const cc = rows.reduce(
                (s, r) => s + r.ccAdaptation + r.ccMitigation,
                0,
              );
              if (!rows.length) return null;
              return (
                <div
                  key={sec}
                  className="rounded-2xl border p-6 bg-white border-gray-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${THEME.sectorPills[sec] ?? THEME.sectorPillFallback}`}
                    >
                      {sec}
                    </span>
                    <span className="text-2xl font-black text-gray-800">
                      {fmtM(total)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-lg font-bold text-gray-900">
                        {rows.length}
                      </div>
                      <div className="text-xs text-gray-500">Projects</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-lg font-bold text-gray-900">
                        {fmtM(cc)}
                      </div>
                      <div className="text-xs text-gray-500">CC Exp.</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-lg font-bold text-gray-900">
                        {total ? ((cc / total) * 100).toFixed(0) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">CC Share</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-4 items-start">
            <SectorPillColumn
              filtered={filtered}
              editCell={editCell}
              editValue={editValue}
              allSectors={allSectors}
              theadHeight={theadHeight}
              trHeight={trHeight}
              sectorPills={THEME.sectorPills}
              sectorPillFallback={THEME.sectorPillFallback}
              setEditValue={setEditValue}
              startEdit={startEdit}
              commitEdit={commitEdit}
              handleKeyDown={handleKeyDown}
            />

            <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table
                  className="text-sm"
                  style={{ minWidth: "100%", width: "max-content" }}
                >
                  <thead ref={theadRef}>
                    <tr className="bg-teal-50 border-b border-teal-200 text-teal-700">
                      <th
                        className="px-3 py-3 relative text-center"
                        style={{ width: getColumnWidth("checkbox") }}
                      >
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={
                            selectedRows.size === filtered.length &&
                            filtered.length > 0
                          }
                          onChange={toggleAll}
                        />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase cursor-pointer relative"
                        onClick={() => handleSort("aipCode")}
                        style={{ width: getColumnWidth("aipCode") }}
                      >
                        AIP Code
                        <ResizeHandle columnId="aipCode" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase relative"
                        style={{ width: getColumnWidth("description") }}
                      >
                        Description
                        <ResizeHandle columnId="description" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase relative"
                        style={{ width: getColumnWidth("department") }}
                      >
                        Department
                        <ResizeHandle columnId="department" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase relative"
                        style={{ width: getColumnWidth("schedule") }}
                      >
                        Schedule
                        <ResizeHandle columnId="schedule" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase relative"
                        style={{ width: getColumnWidth("outputs") }}
                      >
                        Outputs
                        <ResizeHandle columnId="outputs" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase relative"
                        style={{ width: getColumnWidth("funding") }}
                      >
                        Funding
                        <ResizeHandle columnId="funding" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase whitespace-nowrap relative"
                        style={{ width: getColumnWidth("ps") }}
                      >
                        {shouldShowFullName("ps") ? "Personal Services" : "PS"}
                        <ResizeHandle columnId="ps" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase whitespace-nowrap relative"
                        style={{ width: getColumnWidth("mooe") }}
                      >
                        {shouldShowFullName("mooe")
                          ? "Maintenance & OOE"
                          : "MOOE"}
                        <ResizeHandle columnId="mooe" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase whitespace-nowrap relative"
                        style={{ width: getColumnWidth("fe") }}
                      >
                        {shouldShowFullName("fe") ? "Financial Exp" : "FE"}
                        <ResizeHandle columnId="fe" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase whitespace-nowrap relative"
                        style={{ width: getColumnWidth("co") }}
                      >
                        {shouldShowFullName("co") ? "Capital Outlay" : "CO"}
                        <ResizeHandle columnId="co" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase whitespace-nowrap relative"
                        style={{ width: getColumnWidth("total") }}
                      >
                        Total
                        <ResizeHandle columnId="total" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase whitespace-nowrap relative"
                        style={{ width: getColumnWidth("ccAdaptation") }}
                      >
                        {shouldShowFullName("ccAdaptation")
                          ? "CC Adaptation"
                          : "CC Adapt"}
                        <ResizeHandle columnId="ccAdaptation" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase whitespace-nowrap relative"
                        style={{ width: getColumnWidth("ccMitigation") }}
                      >
                        {shouldShowFullName("ccMitigation")
                          ? "CC Mitigation"
                          : "CC Mit"}
                        <ResizeHandle columnId="ccMitigation" />
                      </th>
                      <th
                        className="px-3 py-3 text-center text-xs font-bold uppercase relative"
                        style={{ width: getColumnWidth("ccCode") }}
                      >
                        CC Code
                        <ResizeHandle columnId="ccCode" />
                      </th>
                    </tr>
                  </thead>
                  <tbody ref={tbodyRef}>
                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={15}
                          className="text-center py-16 text-gray-400"
                        >
                          No records found.
                        </td>
                      </tr>
                    )}
                    {filtered.map((row, i) => {
                      const isSelected = selectedRows.has(row.id);
                      const rowBg = isSelected
                        ? "bg-teal-50"
                        : i % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50/60";
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-gray-100 ${rowBg}`}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={isSelected}
                              onChange={() => toggleRow(row.id)}
                            />
                          </td>
                          <EditableCell
                            row={row}
                            field="aipCode"
                            className="px-3 py-2 font-mono text-xs font-bold text-teal-700 whitespace-nowrap"
                          />
                          <EditableCell
                            row={row}
                            field="description"
                            className="px-3 py-2 text-gray-800"
                          />
                          <EditableCell
                            row={row}
                            field="department"
                            className="px-3 py-2 text-gray-600 text-xs"
                          />
                          <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              {editCell?.rowId === row.id &&
                              editCell?.field === "startDate" ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                  className="w-20 text-xs border border-teal-400 rounded px-1 py-0.5 bg-teal-50"
                                />
                              ) : (
                                <span
                                  onDoubleClick={() =>
                                    startEdit(
                                      row.id,
                                      "startDate",
                                      row.startDate,
                                    )
                                  }
                                >
                                  {row.startDate || "start"}
                                </span>
                              )}
                              {editCell?.rowId === row.id &&
                              editCell?.field === "endDate" ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                  className="w-20 text-xs border border-teal-400 rounded px-1 py-0.5 bg-teal-50"
                                />
                              ) : (
                                <span
                                  onDoubleClick={() =>
                                    startEdit(row.id, "endDate", row.endDate)
                                  }
                                >
                                  -&gt; {row.endDate || "end"}
                                </span>
                              )}
                            </div>
                          </td>
                          <EditableCell
                            row={row}
                            field="outputs"
                            className="px-3 py-2 text-xs text-gray-600"
                          />
                          <EditableCell
                            row={row}
                            field="funding"
                            className="px-3 py-2 text-xs text-gray-600"
                          />
                          <EditableCell
                            row={row}
                            field="ps"
                            className="px-3 py-2 text-right text-xs"
                            numeric
                          />
                          <EditableCell
                            row={row}
                            field="mooe"
                            className="px-3 py-2 text-right text-xs"
                            numeric
                          />
                          <EditableCell
                            row={row}
                            field="fe"
                            className="px-3 py-2 text-right text-xs"
                            numeric
                          />
                          <EditableCell
                            row={row}
                            field="co"
                            className="px-3 py-2 text-right text-xs"
                            numeric
                          />
                          <EditableCell
                            row={row}
                            field="total"
                            className="px-3 py-2 text-right text-xs bg-teal-50/40"
                            readOnly
                          />
                          <EditableCell
                            row={row}
                            field="ccAdaptation"
                            className="px-3 py-2 text-right text-xs"
                            numeric
                          />
                          <EditableCell
                            row={row}
                            field="ccMitigation"
                            className="px-3 py-2 text-right text-xs"
                            numeric
                          />
                          <EditableCell
                            row={row}
                            field="ccCode"
                            className="px-3 py-2 text-center text-xs"
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-400">
          Import columns:{" "}
          <code className="bg-gray-100 px-1 rounded">
            Sector, AIP Reference Code, Program/Project/Activity Description,
            Implementing Office/Department, Start Date, Completion Date,
            Expected Outputs, Funding Source, PS, MOOE, FE, CO, Total, CC
            Adaptation, CC Mitigation, CC Typology Code
          </code>
        </div>
      </div>

      {showHistory && (
        <aside className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Change History
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {history.length} changes
              </p>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              X
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {history.length === 0 && (
              <div className="p-6 text-xs text-gray-400">No changes yet.</div>
            )}
            {history.map((change) => (
              <div key={change.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">
                  {change.user.name} ·{" "}
                  {change.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-2">
                  {change.type.toUpperCase()}{" "}
                  {change.aipCode ? `- ${change.aipCode}` : ""}
                </div>
                {change.type === "edit" && (
                  <div className="text-xs flex items-center gap-1.5 mb-2">
                    <span className="bg-red-50 border border-red-100 rounded px-2 py-1 text-red-700">
                      {String(change.oldValue) || "-"}
                    </span>
                    <span className="text-gray-400">-&gt;</span>
                    <span className="bg-teal-50 border border-teal-100 rounded px-2 py-1 text-teal-700">
                      {String(change.newValue) || "-"}
                    </span>
                  </div>
                )}
                {change.snapshot && change.type === "edit" && (
                  <button
                    onClick={() => restoreChange(change)}
                    className="text-xs text-amber-700 hover:underline"
                  >
                    Restore
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
