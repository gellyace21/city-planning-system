"use client";

import React, {
  FC,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { AIPRow, EditCell, SortDir, SortKey } from "./types";
import { fmt } from "./utils";
import SectorBadge from "./SectorBadge";
import { IconMessageCircle } from "@tabler/icons-react";

const INITIAL_COLUMN_WIDTHS = [
  44, 110, 320, 130, 160, 150, 220, 130, 90, 90, 90, 90, 100, 120, 120, 90,
  44,
];

const MIN_COLUMN_WIDTH = 72;

const MIN_COLUMN_WIDTH_BY_INDEX: Record<number, number> = {
  0: 40,
  8: 70,
  9: 70,
  10: 70,
  11: 70,
  12: 80,
  13: 90,
  14: 90,
  15: 70,
  16: 40,
};

interface AIPTableProps {
  filtered: AIPRow[];
  selectedRows: Set<number>;
  toggleRow: (id: number) => void;
  toggleAll: () => void;
  editCell: EditCell;
  editValue: string;
  setEditValue: (v: string) => void;
  startEdit: (
    rowId: number,
    field: keyof AIPRow,
    currentVal: string | number,
  ) => void;
  commitEdit: () => void;
  handleKeyDown: (
    e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  allSectors: string[];
  handleSort: (col: SortKey) => void;
  sortCol: SortKey;
  sortDir: SortDir;
  sectorFilter: string;
  departmentFilter: string;
  sectorOptions: string[];
  departmentOptions: string[];
  onSectorFilterChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  cellStatuses: Record<string, "pending" | "approved" | "rejected">;
  commentCountsByCell: Record<string, number>;
  commentCountsByRow: Record<string, number>;
  onOpenComments: (rowId: number, field: keyof AIPRow | "__row__") => void;
  focusedRowId?: number | null;
}

export default function AIPTable({
  filtered,
  selectedRows,
  toggleRow,
  toggleAll,
  editCell,
  editValue,
  setEditValue,
  startEdit,
  commitEdit,
  handleKeyDown,
  allSectors,
  handleSort,
  sortCol,
  sortDir,
  sectorFilter,
  departmentFilter,
  sectorOptions,
  departmentOptions,
  onSectorFilterChange,
  onDepartmentFilterChange,
  cellStatuses,
  commentCountsByCell,
  commentCountsByRow,
  onOpenComments,
  focusedRowId,
}: AIPTableProps): React.JSX.Element {
  const [columnWidths, setColumnWidths] = useState<number[]>(
    INITIAL_COLUMN_WIDTHS,
  );
  const [openFilter, setOpenFilter] = useState<"sector" | "department" | null>(
    null,
  );
  const resizeStateRef = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent): void => {
      const state = resizeStateRef.current;
      if (!state) return;

      const minWidth =
        MIN_COLUMN_WIDTH_BY_INDEX[state.colIndex] ?? MIN_COLUMN_WIDTH;
      const nextWidth = Math.max(
        minWidth,
        state.startWidth + (event.clientX - state.startX),
      );

      setColumnWidths((prev) => {
        const next = [...prev];
        next[state.colIndex] = nextWidth;
        return next;
      });
    };

    const onMouseUp = (): void => {
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!tableWrapRef.current?.contains(target)) {
        setOpenFilter(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const startResize = (
    colIndex: number,
    event: ReactMouseEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    resizeStateRef.current = {
      colIndex,
      startX: event.clientX,
      startWidth: columnWidths[colIndex] ?? INITIAL_COLUMN_WIDTHS[colIndex],
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const HeaderResizeHandle: FC<{ colIndex: number }> = ({ colIndex }) => (
    <div
      className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none"
      onMouseDown={(event) => startResize(colIndex, event)}
      onClick={(event) => event.stopPropagation()}
    />
  );

  const FilterHeader: FC<{
    label: string;
    filterKey: "sector" | "department";
    options: string[];
    value: string;
    onChange: (value: string) => void;
    colIndex: number;
  }> = ({ label, filterKey, options, value, onChange, colIndex }) => {
    const isOpen = openFilter === filterKey;
    return (
      <th
        className="px-1.5 py-2 text-left text-[10px] font-bold uppercase tracking-tight select-none whitespace-normal wrap-break-word transition-colors relative"
      >
        <button
          type="button"
          className="flex items-center gap-1 cursor-pointer hover:bg-sky-50 rounded px-0.5"
          onClick={(event) => {
            event.stopPropagation();
            setOpenFilter((current) => (current === filterKey ? null : filterKey));
          }}
        >
          <span>{label}</span>
          <span className="text-gray-300">↕</span>
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden normal-case text-sm">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={`w-full text-left px-3 py-2 hover:bg-sky-50 ${option === value ? "bg-sky-50 font-semibold text-sky-700" : "text-gray-700"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(option);
                  setOpenFilter(null);
                }}
              >
                {filterKey === "department" && option === "All"
                  ? "All Departments"
                  : option}
              </button>
            ))}
          </div>
        )}

        <HeaderResizeHandle colIndex={colIndex} />
      </th>
    );
  };

  // ── Sub-components ──
  interface EditableCellProps {
    row: AIPRow;
    field: keyof AIPRow;
    className?: string;
    numeric?: boolean;
    readOnly?: boolean;
  }

  const EditableCell: FC<EditableCellProps> = ({
    row,
    field,
    className = "",
    numeric = false,
    readOnly = false,
  }) => {
    const isActive = editCell?.rowId === row.id && editCell?.field === field;
    const value = row[field];
    const status = cellStatuses[`${row.id}:${String(field)}`];
    const commentCount = commentCountsByCell[`${row.id}:${String(field)}`] ?? 0;
    const statusClass =
      status === "pending"
        ? "bg-sky-100/70"
        : status === "approved"
          ? "bg-blue-50/80"
          : status === "rejected"
            ? "bg-rose-50/80"
            : "";
    const commentClass =
      commentCount > 0 ? "bg-amber-50/80 ring-1 ring-amber-300/70" : "";

    if (readOnly) {
      return (
        <td className={`${className} ${statusClass} ${commentClass} relative`}>
          <span className="font-bold text-sky-700">{fmt(value as number)}</span>
          {commentCount > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenComments(row.id, field);
              }}
              className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
              title={`Open ${commentCount} comment${commentCount > 1 ? "s" : ""}`}
            >
              <IconMessageCircle size={11} />
              {commentCount}
            </button>
          )}
        </td>
      );
    }

    if (isActive) {
      return (
        <td className={`${className} ${statusClass} ${commentClass} relative`}>
          <input
            autoFocus
            type={numeric ? "number" : "text"}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full min-w-0 text-[11px] border border-sky-400 rounded px-1 py-0.5 bg-sky-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {commentCount > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenComments(row.id, field);
              }}
              className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
              title={`Open ${commentCount} comment${commentCount > 1 ? "s" : ""}`}
            >
              <IconMessageCircle size={11} />
              {commentCount}
            </button>
          )}
        </td>
      );
    }

    return (
      <td
        className={`${className} ${statusClass} ${commentClass} cursor-pointer group relative`}
        onDoubleClick={() => startEdit(row.id, field, value)}
        title="Double-click to edit"
      >
        <span className="group-hover:bg-sky-50 rounded px-0.5 transition-colors">
          {numeric
            ? fmt(value as number)
            : (value as string) || (
                <span className="text-gray-300 italic text-xs">—</span>
              )}
          {status && (
            <span
              className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${
                status === "pending"
                  ? "bg-sky-600"
                  : status === "approved"
                    ? "bg-blue-600"
                    : "bg-rose-500"
              }`}
            />
          )}
        </span>
        {commentCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenComments(row.id, field);
            }}
            className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 opacity-95 transition-opacity group-hover:opacity-100"
            title={`Open ${commentCount} comment${commentCount > 1 ? "s" : ""}`}
          >
            <IconMessageCircle size={11} />
            {commentCount}
          </button>
        )}
      </td>
    );
  };

  const renderSortIcon = (col: SortKey): React.JSX.Element =>
    sortCol === col ? (
      <span className="ml-1 text-sky-500">{sortDir === "asc" ? "↑" : "↓"}</span>
    ) : (
      <span className="ml-1 text-gray-300">↕</span>
    );

  const renderTh = ({
    col,
    label,
    colIndex,
    cls = "",
  }: {
    col: SortKey;
    label: string;
    colIndex: number;
    cls?: string;
  }): React.JSX.Element => (
    <th
      className={`px-1.5 py-2 text-left text-[10px] font-bold uppercase tracking-tight select-none whitespace-normal wrap-break-word transition-colors ${col ? "cursor-pointer hover:bg-sky-50" : ""} ${cls}`}
      onClick={() => col && handleSort(col)}
    >
      {label}
      {col && renderSortIcon(col)}
      <HeaderResizeHandle colIndex={colIndex} />
    </th>
  );

  const amountCols: [keyof AIPRow, string][] = [
    ["ps", "PS"],
    ["mooe", "MOOE"],
    ["fe", "FE"],
    ["co", "CO"],
    ["total", "Total"],
  ];
  const ccCols: [keyof AIPRow, string][] = [
    ["ccAdaptation", "Adaptation"],
    ["ccMitigation", "Mitigation"],
    ["ccCode", "Code"],
  ];

  const totalBudget = filtered.reduce((s, r) => s + r.total, 0);

  return (
    <div ref={tableWrapRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full w-max table-fixed text-[11px] border-collapse [&_th]:align-top [&_td]:align-top [&_td]:wrap-break-word [&_td]:whitespace-normal">
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={`aip-col-${index}`} style={{ width: `${width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="w-8 px-1 py-2 relative">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={
                    selectedRows.size === filtered.length && filtered.length > 0
                  }
                  onChange={toggleAll}
                />
                <HeaderResizeHandle colIndex={0} />
              </th>
              {renderTh({
                col: "aipCode",
                label: "AIP Code",
                colIndex: 1,
                cls: "relative",
              })}
              {renderTh({
                col: "description",
                label: "Program / Project / Activity",
                colIndex: 2,
                cls: "relative",
              })}
              <FilterHeader
                label="Sector"
                filterKey="sector"
                options={sectorOptions}
                value={sectorFilter}
                onChange={onSectorFilterChange}
                colIndex={3}
              />
              <FilterHeader
                label="Department"
                filterKey="department"
                options={departmentOptions}
                value={departmentFilter}
                onChange={onDepartmentFilterChange}
                colIndex={4}
              />
              {renderTh({
                col: null,
                label: "Schedule",
                colIndex: 5,
                cls: "relative",
              })}
              {renderTh({
                col: "outputs",
                label: "Expected Outputs",
                colIndex: 6,
                cls: "relative",
              })}
              {renderTh({
                col: "funding",
                label: "Funding",
                colIndex: 7,
                cls: "relative",
              })}
              <th
                className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-tight bg-sky-50 text-sky-700 border-l border-sky-100 relative"
                colSpan={5}
              >
                Amount (₱ Thousands)
                <HeaderResizeHandle colIndex={12} />
              </th>
              <th
                className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-tight bg-emerald-50 text-emerald-700 border-l border-emerald-100 relative"
                colSpan={3}
              >
                Climate Change Expenditure
                <HeaderResizeHandle colIndex={15} />
              </th>
              <th className="bg-transparent border-0 px-0 py-2 relative">
                <HeaderResizeHandle colIndex={16} />
              </th>
            </tr>
            <tr className="bg-gray-50 border-b-2 border-gray-300 text-gray-500 text-xs">
              <th colSpan={8} />
              {amountCols.map(([col, label], idx) => (
                <th
                  key={col as string}
                  className={`px-1 py-2 text-right text-[10px] font-semibold cursor-pointer hover:bg-sky-100 transition border-l border-sky-100 relative ${col === "total" ? "text-sky-700 font-bold" : ""}`}
                  onClick={() => handleSort(col)}
                >
                  {label}
                  {renderSortIcon(col)}
                  <HeaderResizeHandle colIndex={8 + idx} />
                </th>
              ))}
              {ccCols.map(([col, label], idx) => (
                <th
                  key={col as string}
                  className="px-1 py-2 text-right text-[10px] font-semibold cursor-pointer hover:bg-emerald-100 transition border-l border-emerald-100 relative"
                  onClick={() => handleSort(col)}
                >
                  {label}
                  {renderSortIcon(col)}
                  <HeaderResizeHandle colIndex={13 + idx} />
                </th>
              ))}
              <th className="relative">
                <HeaderResizeHandle colIndex={16} />
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={17} className="text-center py-16 text-gray-400">
                  No records found.
                </td>
              </tr>
            )}

            {filtered.map((row, i) => {
              const isSelected = selectedRows.has(row.id);
              const rowBg = isSelected
                ? "bg-sky-50"
                : i % 2 === 0
                  ? "bg-white hover:bg-sky-50/20"
                  : "bg-gray-50/50 hover:bg-sky-50/20";
              const isFocused = focusedRowId === row.id;
              const sectorCommentCount =
                commentCountsByCell[`${row.id}:sector`] ?? 0;
              const startDateCommentCount =
                commentCountsByCell[`${row.id}:startDate`] ?? 0;
              const endDateCommentCount =
                commentCountsByCell[`${row.id}:endDate`] ?? 0;
              const fundingCommentCount =
                commentCountsByCell[`${row.id}:funding`] ?? 0;
              const sectorCommentClass =
                sectorCommentCount > 0
                  ? "bg-amber-50/80 ring-1 ring-amber-300/70"
                  : "";
              const scheduleCommentClass =
                startDateCommentCount + endDateCommentCount > 0
                  ? "bg-amber-50/80 ring-1 ring-amber-300/70"
                  : "";
              const fundingCommentClass =
                fundingCommentCount > 0
                  ? "bg-amber-50/80 ring-1 ring-amber-300/70"
                  : "";
              return (
                <tr
                  key={row.id}
                  id={`aip-row-${row.id}`}
                  className={`border-b border-gray-100 transition-colors ${rowBg} ${isFocused ? "ring-2 ring-amber-400 bg-amber-50" : ""}`}
                >
                  <td className="px-1 py-1.5 text-center">
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
                    className="px-1 py-1 font-mono text-[10px] font-bold text-sky-700"
                  />
                  <EditableCell
                    row={row}
                    field="description"
                    className="px-1.5 py-1.5 font-medium text-gray-800 leading-snug"
                  />

                  {/* Sector — free text edit */}
                  <td
                    className={`px-1.5 py-1.5 cursor-pointer relative ${sectorCommentClass}`}
                    onDoubleClick={() =>
                      startEdit(row.id, "sector", row.sector)
                    }
                    title="Double-click to edit"
                  >
                    {editCell?.rowId === row.id &&
                    editCell?.field === "sector" ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full text-xs border border-sky-400 rounded px-1 py-0.5 bg-sky-50 focus:outline-none"
                      />
                    ) : (
                      <SectorBadge sector={row.sector} />
                    )}
                    {sectorCommentCount > 0 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenComments(row.id, "sector");
                        }}
                        className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                        title={`Open ${sectorCommentCount} comment${sectorCommentCount > 1 ? "s" : ""}`}
                      >
                        <IconMessageCircle size={11} />
                        {sectorCommentCount}
                      </button>
                    )}
                  </td>

                  <EditableCell
                    row={row}
                    field="department"
                    className="px-1.5 py-1.5 text-gray-600 text-[11px]"
                  />

                  {/* Schedule */}
                  <td
                    className={`px-1.5 py-1.5 text-[11px] text-gray-500 relative ${scheduleCommentClass}`}
                  >
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
                          className="w-20 text-xs border border-sky-400 rounded px-1 py-0.5 bg-sky-50 focus:outline-none"
                        />
                      ) : (
                        <span
                          className="font-medium text-gray-700 cursor-pointer hover:bg-sky-50 rounded px-0.5 transition-colors"
                          onDoubleClick={() =>
                            startEdit(row.id, "startDate", row.startDate)
                          }
                          title="Double-click to edit"
                        >
                          {row.startDate || (
                            <span className="text-gray-300 italic">start</span>
                          )}
                          {startDateCommentCount > 0 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenComments(row.id, "startDate");
                              }}
                              className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                              title={`Open ${startDateCommentCount} comment${startDateCommentCount > 1 ? "s" : ""}`}
                            >
                              <IconMessageCircle size={11} />
                              {startDateCommentCount}
                            </button>
                          )}
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
                          className="w-20 text-xs border border-sky-400 rounded px-1 py-0.5 bg-sky-50 focus:outline-none"
                        />
                      ) : (
                        <span
                          className="text-gray-400 cursor-pointer hover:bg-sky-50 rounded px-0.5 transition-colors"
                          onDoubleClick={() =>
                            startEdit(row.id, "endDate", row.endDate)
                          }
                          title="Double-click to edit"
                        >
                          →{" "}
                          {row.endDate || (
                            <span className="text-gray-300 italic">end</span>
                          )}
                          {endDateCommentCount > 0 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenComments(row.id, "endDate");
                              }}
                              className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                              title={`Open ${endDateCommentCount} comment${endDateCommentCount > 1 ? "s" : ""}`}
                            >
                              <IconMessageCircle size={11} />
                              {endDateCommentCount}
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </td>

                  <EditableCell
                    row={row}
                    field="outputs"
                    className="px-1.5 py-1.5 text-[11px] text-gray-600"
                  />

                  {/* Funding */}
                  <td
                    className={`px-1.5 py-1.5 text-[11px] relative ${fundingCommentClass}`}
                    onDoubleClick={() =>
                      startEdit(row.id, "funding", row.funding)
                    }
                    title="Double-click to edit"
                  >
                    {editCell?.rowId === row.id &&
                    editCell?.field === "funding" ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full text-xs border border-sky-400 rounded px-1.5 py-0.5 bg-sky-50 focus:outline-none"
                      />
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium cursor-pointer hover:bg-sky-50 transition-colors">
                        {row.funding || (
                          <span className="text-gray-300 italic">—</span>
                        )}
                      </span>
                    )}
                    {fundingCommentCount > 0 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenComments(row.id, "funding");
                        }}
                        className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                        title={`Open ${fundingCommentCount} comment${fundingCommentCount > 1 ? "s" : ""}`}
                      >
                        <IconMessageCircle size={11} />
                        {fundingCommentCount}
                      </button>
                    )}
                  </td>

                  {/* PS / MOOE / FE / CO */}
                  {(["ps", "mooe", "fe", "co"] as (keyof AIPRow)[]).map((k) => (
                    <EditableCell
                      key={k as string}
                      row={row}
                      field={k}
                      className="px-1.5 py-1.5 text-right text-[11px] text-gray-600 border-l border-sky-50 tabular-nums"
                      numeric
                    />
                  ))}

                  {/* Total — read-only */}
                  <EditableCell
                    row={row}
                    field="total"
                    readOnly
                    className="px-1.5 py-1.5 text-right text-[11px] border-l border-sky-100 tabular-nums bg-sky-50/40"
                  />

                  {/* CC fields */}
                  <EditableCell
                    row={row}
                    field="ccAdaptation"
                    className="px-1.5 py-1.5 text-right text-[11px] text-emerald-700 border-l border-emerald-100 tabular-nums"
                    numeric
                  />
                  <EditableCell
                    row={row}
                    field="ccMitigation"
                    className="px-1.5 py-1.5 text-right text-[11px] text-emerald-700 tabular-nums"
                    numeric
                  />
                  <EditableCell
                    row={row}
                    field="ccCode"
                    className="px-1.5 py-1.5 text-center text-[11px]"
                  />
                  <td className="relative w-0 overflow-visible group border-0 bg-transparent px-0 py-1.5">
                    <button
                      type="button"
                      className="h-full inline-flex w-7 items-center justify-center rounded text-gray-400 transition-colors group-hover:text-sky-600"
                      title="Comments"
                      onClick={() => onOpenComments(row.id, "__row__")}
                    >
                      <IconMessageCircle size={16} />
                      {(commentCountsByRow[String(row.id)] ?? 0) > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold items-center justify-center">
                          {commentCountsByRow[String(row.id)]}
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-gray-900 text-white font-bold text-xs">
              <td
                colSpan={8}
                className="px-5 py-3 text-right uppercase tracking-wider"
              >
                TOTAL ({filtered.length} projects)
              </td>
              {(["ps", "mooe", "fe", "co"] as (keyof AIPRow)[]).map((k) => (
                <td
                  key={k as string}
                  className="px-3 py-3 text-right tabular-nums border-l border-gray-700"
                >
                  {fmt(filtered.reduce((s, r) => s + (r[k] as number), 0))}
                </td>
              ))}
              <td className="px-3 py-3 text-right tabular-nums text-sky-300 border-l border-sky-800 bg-sky-900/40">
                {fmt(totalBudget)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-emerald-300 border-l border-emerald-800">
                {fmt(filtered.reduce((s, r) => s + r.ccAdaptation, 0))}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-emerald-300">
                {fmt(filtered.reduce((s, r) => s + r.ccMitigation, 0))}
              </td>
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
