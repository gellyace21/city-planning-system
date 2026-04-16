"use client";

import React, { FC, KeyboardEvent } from "react";
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
}

const MONITORING_NUMERIC_FIELDS = new Set<keyof MonitoringRow>([
  "approved_budget",
  "certified_amount",
  "obligation",
  "actual_cost",
  "status_percent",
]);

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
}: MonitoringTableProps): React.JSX.Element {
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
    const value = row[field];
    const isNumeric = MONITORING_NUMERIC_FIELDS.has(field);

    if (isActive) {
      return (
        <td className={className}>
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
        </td>
      );
    }

    const display = isNumeric ? fmt(Number(value) || 0) : (value as string);

    return (
      <td
        className={`${className} cursor-pointer group relative`}
        onDoubleClick={() => startEdit(row.id, field, value)}
        title="Double-click to edit"
      >
        <span className="group-hover:bg-emerald-50 rounded px-0.5 transition-colors">
          {display || <span className="text-gray-300 italic">—</span>}
        </span>
      </td>
    );
  };

  const moneyTotal = filtered.reduce(
    (sum, row) => sum + row.approved_budget,
    0,
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-hidden">
        <table className="w-full table-fixed text-[14px] border-collapse [&_th]:align-top [&_td]:align-top [&_td]:wrap-break-word [&_td]:whitespace-normal">
          <colgroup>
            <col style={{ width: "2%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "2%" }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="w-8 px-1 py-2 text-[14px]">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={
                    selectedRows.size === filtered.length && filtered.length > 0
                  }
                  onChange={toggleAll}
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
              ].map(([col, label]) => (
                <th
                  key={col}
                  className="px-1.5 py-2 text-left text-[10px] font-bold uppercase tracking-tight whitespace-normal wrap-break-word cursor-pointer hover:bg-emerald-50"
                  onClick={() => handleSort(col as MonitoringSortKey)}
                >
                  {label}
                  <SortIcon col={col as MonitoringSortKey} />
                </th>
              ))}
              <th className="bg-transparent border-0 px-0 py-2" />
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
                    >
                      <IconMessageCircle />
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
