"use client";

import React, {
  FC,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  MonitoringEditCell,
  MonitoringRow,
  MonitoringSortKey,
  SortDir,
} from "./types";
import { fmt } from "./utils";
import { IconMessageCircle } from "@tabler/icons-react";

interface MonitoringTableProps {
  filtered: MonitoringRow[];
  selectedRows: Set<number>;
  toggleRow: (id: number) => void;
  toggleAll: () => void;
  editCell: MonitoringEditCell;
  editValue: string;
  setEditValue: (value: string) => void;
  startEdit: (
    rowId: number,
    field: keyof MonitoringRow,
    currentVal: string | number,
  ) => void;
  commitEdit: () => void;
  handleKeyDown: (
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleSort: (col: MonitoringSortKey) => void;
  sortCol: MonitoringSortKey;
  sortDir: SortDir;
  commentCountsByCell: Record<string, number>;
  commentCountsByRow: Record<string, number>;
  onOpenComments: (
    rowId: number,
    field: keyof MonitoringRow | "__row__",
  ) => void;
}

const MONITORING_NUMERIC_FIELDS = new Set<keyof MonitoringRow>([
  "approved_budget",
  "certified_amount",
  "obligation",
  "actual_cost",
  "status_percent",
]);

const INITIAL_COLUMN_WIDTHS = [
  44, 220, 160, 120, 120, 120, 120, 120, 130, 120, 180, 180, 110, 220, 180,
  44,
];

const MIN_COLUMN_WIDTH = 72;

const MIN_COLUMN_WIDTH_BY_INDEX: Record<number, number> = {
  0: 40,
  15: 40,
};

export default function MonitoringTable({
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
  handleSort,
  sortCol,
  sortDir,
  commentCountsByCell,
  commentCountsByRow,
  onOpenComments,
}: MonitoringTableProps): React.JSX.Element {
  const [columnWidths, setColumnWidths] = useState<number[]>(
    INITIAL_COLUMN_WIDTHS,
  );
  const resizeStateRef = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

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

  const SortIcon: FC<{ col: MonitoringSortKey }> = ({ col }) =>
    sortCol === col ? (
      <span className="ml-1 text-emerald-600">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    ) : (
      <span className="ml-1 text-gray-300">↕</span>
    );

  const EditableCell: FC<{
    row: MonitoringRow;
    field: keyof MonitoringRow;
    className?: string;
    textarea?: boolean;
  }> = ({ row, field, className = "", textarea = false }) => {
    const isActive = editCell?.rowId === row.id && editCell?.field === field;
    const isNumeric = MONITORING_NUMERIC_FIELDS.has(field);
    const value =
      (row[field] as string | number | undefined) ?? (isNumeric ? 0 : "");
    const commentCount = commentCountsByCell[`${row.id}:${String(field)}`] ?? 0;
    const commentClass =
      commentCount > 0 ? "bg-amber-50/80 ring-1 ring-amber-300/70" : "";

    if (isActive) {
      return (
        <td className={`${className} ${commentClass} relative`}>
          {textarea ? (
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="w-full min-w-0 min-h-12 text-[11px] border border-emerald-400 rounded px-1 py-0.5 bg-emerald-50 focus:outline-none"
            />
          ) : (
            <input
              autoFocus
              type={isNumeric ? "number" : "text"}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="w-full min-w-0 text-[11px] border border-emerald-400 rounded px-1 py-0.5 bg-emerald-50 focus:outline-none"
            />
          )}
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

    const display = isNumeric ? fmt(Number(value) || 0) : (value as string);

    return (
      <td
        className={`${className} ${commentClass} cursor-pointer group relative`}
        onDoubleClick={() => startEdit(row.id, field, value)}
        title="Double-click to edit"
      >
        <span className="group-hover:bg-emerald-50 rounded px-0.5 transition-colors">
          {display || <span className="text-gray-300 italic">—</span>}
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

  const moneyTotal = filtered.reduce(
    (sum, row) => sum + row.approved_budget,
    0,
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full w-max table-fixed text-[14px] border-collapse [&_th]:align-top [&_td]:align-top [&_td]:wrap-break-word [&_td]:whitespace-normal">
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={`monitoring-col-${index}`} style={{ width: `${width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="w-8 px-1 py-2 text-[14px] relative">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={
                    selectedRows.size === filtered.length && filtered.length > 0
                  }
                  onChange={toggleAll}
                />
                <div
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none"
                  onMouseDown={(event) => startResize(0, event)}
                />
              </th>
              {[
                ["project_name", "Project"],
                ["agency", "Agency"],
                ["location", "Location"],
                ["approved_budget", "Approved Budget"],
                ["certified_amount", "Certified Amount"],
                ["obligation", "Obligation"],
                ["actual_cost", "Actual Cost"],
                ["funding", "Funding"],
                ["certified_date", "Certified Date"],
                ["major_findings", "Major Findings"],
                ["issues", "Issues"],
                ["status_percent", "Status %"],
                ["action_recommendation", "Action Recommendation"],
                ["remarks", "Remarks"],
              ].map(([col, label], index) => (
                <th
                  key={col}
                  className="px-1.5 py-2 text-left text-[10px] font-bold uppercase tracking-tight whitespace-normal wrap-break-word cursor-pointer hover:bg-emerald-50 relative select-none"
                  onClick={() => handleSort(col as MonitoringSortKey)}
                >
                  <span>
                    {label}
                    <SortIcon col={col as MonitoringSortKey} />
                  </span>
                  <div
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none"
                    onMouseDown={(event) => startResize(index + 1, event)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </th>
              ))}
              <th className="bg-transparent border-0 px-0 py-2 relative">
                <div
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none"
                  onMouseDown={(event) => startResize(15, event)}
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center py-16 text-gray-400">
                  No records found.
                </td>
              </tr>
            )}

            {filtered.map((row, i) => {
              const isSelected = selectedRows.has(row.id);
              const rowBg = isSelected
                ? "bg-emerald-50"
                : i % 2 === 0
                  ? "bg-white hover:bg-emerald-50/20"
                  : "bg-gray-50/50 hover:bg-emerald-50/20";

              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 transition-colors ${rowBg}`}
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
                    field="project_name"
                    className="px-1.5 py-1.5 font-medium text-gray-800"
                  />
                  <EditableCell
                    row={row}
                    field="agency"
                    className="px-1.5 py-1.5 text-gray-700"
                  />
                  <EditableCell
                    row={row}
                    field="location"
                    className="px-1.5 py-1.5 text-gray-700"
                  />
                  <EditableCell
                    row={row}
                    field="approved_budget"
                    className="px-1.5 py-1.5 text-right tabular-nums"
                  />
                  <EditableCell
                    row={row}
                    field="certified_amount"
                    className="px-1.5 py-1.5 text-right tabular-nums"
                  />
                  <EditableCell
                    row={row}
                    field="obligation"
                    className="px-1.5 py-1.5 text-right tabular-nums"
                  />
                  <EditableCell
                    row={row}
                    field="actual_cost"
                    className="px-1.5 py-1.5 text-right tabular-nums"
                  />
                  <EditableCell
                    row={row}
                    field="funding"
                    className="px-1.5 py-1.5"
                  />
                  <EditableCell
                    row={row}
                    field="certified_date"
                    className="px-1.5 py-1.5"
                  />
                  <EditableCell
                    row={row}
                    field="major_findings"
                    className="px-1.5 py-1.5"
                    textarea
                  />
                  <EditableCell
                    row={row}
                    field="issues"
                    className="px-1.5 py-1.5"
                    textarea
                  />
                  <EditableCell
                    row={row}
                    field="status_percent"
                    className="px-1.5 py-1.5 text-right tabular-nums"
                  />
                  <EditableCell
                    row={row}
                    field="action_recommendation"
                    className="px-1.5 py-1.5"
                    textarea
                  />
                  <EditableCell
                    row={row}
                    field="remarks"
                    className="px-1.5 py-1.5"
                    textarea
                  />
                  <td className="relative w-0 overflow-visible group border-0 bg-transparent px-0 py-1.5">
                    <button
                      type="button"
                      className="h-full inline-flex w-6 items-center justify-center align-center rounded text-gray-400 transition-colors group-hover:text-emerald-600"
                      title="Comments"
                      onClick={() => onOpenComments(row.id, "__row__")}
                    >
                      <IconMessageCircle />
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
            <tr className="bg-gray-900 text-white text-xs font-bold">
              <td
                colSpan={4}
                className="px-4 py-3 text-right uppercase tracking-wider"
              >
                Total ({filtered.length} records)
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-emerald-300">
                {fmt(moneyTotal)}
              </td>
              <td colSpan={11} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
