"use client";

import React, { FC, KeyboardEvent } from "react";
import { AIPRow, EditCell, SortDir, SortKey } from "./types";
import { fmt } from "./utils";
import SectorBadge from "./SectorBadge";

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
}: AIPTableProps): React.JSX.Element {
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

    if (readOnly) {
      return (
        <td className={className}>
          <span className="font-bold text-sky-700">{fmt(value as number)}</span>
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
            className="w-full min-w-[60px] text-xs border border-sky-400 rounded px-1.5 py-0.5 bg-sky-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </td>
      );
    }

    return (
      <td
        className={`${className} cursor-pointer group`}
        onDoubleClick={() => startEdit(row.id, field, value)}
        title="Double-click to edit"
      >
        <span className="group-hover:bg-sky-50 rounded px-0.5 transition-colors">
          {numeric
            ? fmt(value as number)
            : (value as string) || (
                <span className="text-gray-300 italic text-xs">—</span>
              )}
        </span>
      </td>
    );
  };

  const SortIcon: FC<{ col: SortKey }> = ({ col }) =>
    sortCol === col ? (
      <span className="ml-1 text-sky-500">{sortDir === "asc" ? "↑" : "↓"}</span>
    ) : (
      <span className="ml-1 text-gray-300">↕</span>
    );

  const Th: FC<{ col: SortKey; label: string; cls?: string }> = ({
    col,
    label,
    cls = "",
  }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-bold uppercase tracking-wider select-none whitespace-nowrap transition-colors ${col ? "cursor-pointer hover:bg-sky-50" : ""} ${cls}`}
      onClick={() => col && handleSort(col)}
    >
      {label}
      {col && <SortIcon col={col} />}
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[1400px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={
                    selectedRows.size === filtered.length && filtered.length > 0
                  }
                  onChange={toggleAll}
                />
              </th>
              <Th col="aipCode" label="AIP Code" cls="w-28" />
              <Th
                col="description"
                label="Program / Project / Activity"
                cls="w-72"
              />
              <Th col="sector" label="Sector" />
              <Th col="department" label="Department" cls="w-44" />
              <Th col={null} label="Schedule" />
              <Th col="outputs" label="Expected Outputs" cls="w-48" />
              <Th col="funding" label="Funding" />
              <th
                className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border-l border-sky-100"
                colSpan={5}
              >
                Amount (₱ Thousands)
              </th>
              <th
                className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-l border-emerald-100"
                colSpan={3}
              >
                Climate Change Expenditure
              </th>
            </tr>
            <tr className="bg-gray-50 border-b-2 border-gray-300 text-gray-500 text-xs">
              <th colSpan={8} />
              {amountCols.map(([col, label]) => (
                <th
                  key={col as string}
                  className={`px-3 py-2 text-right font-semibold cursor-pointer hover:bg-sky-100 transition border-l border-sky-100 ${col === "total" ? "text-sky-700 font-bold" : ""}`}
                  onClick={() => handleSort(col)}
                >
                  {label}
                  <SortIcon col={col} />
                </th>
              ))}
              {ccCols.map(([col, label]) => (
                <th
                  key={col as string}
                  className="px-3 py-2 text-right font-semibold cursor-pointer hover:bg-emerald-100 transition border-l border-emerald-100"
                  onClick={() => handleSort(col)}
                >
                  {label}
                  <SortIcon col={col} />
                </th>
              ))}
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
                ? "bg-sky-50"
                : i % 2 === 0
                  ? "bg-white hover:bg-sky-50/20"
                  : "bg-gray-50/50 hover:bg-sky-50/20";
              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 transition-colors ${rowBg}`}
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
                    className="px-3 py-2 font-mono text-xs font-bold text-sky-700 whitespace-nowrap"
                  />
                  <EditableCell
                    row={row}
                    field="description"
                    className="px-3 py-2 font-medium text-gray-800 leading-snug"
                  />

                  {/* Sector — dropdown */}
                  <td
                    className="px-3 py-2 cursor-pointer"
                    onDoubleClick={() =>
                      startEdit(row.id, "sector", row.sector)
                    }
                    title="Double-click to edit"
                  >
                    {editCell?.rowId === row.id &&
                    editCell?.field === "sector" ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        className="text-xs border border-sky-400 rounded px-1 py-0.5 bg-white focus:outline-none"
                      >
                        <option value="">— select —</option>
                        {allSectors.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <SectorBadge sector={row.sector} />
                    )}
                  </td>

                  <EditableCell
                    row={row}
                    field="department"
                    className="px-3 py-2 text-gray-600 text-xs"
                  />

                  {/* Schedule */}
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
                        </span>
                      )}
                    </div>
                  </td>

                  <EditableCell
                    row={row}
                    field="outputs"
                    className="px-3 py-2 text-xs text-gray-600"
                  />

                  {/* Funding */}
                  <td
                    className="px-3 py-2 text-xs"
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
                  </td>

                  {/* PS / MOOE / FE / CO */}
                  {(["ps", "mooe", "fe", "co"] as (keyof AIPRow)[]).map((k) => (
                    <EditableCell
                      key={k as string}
                      row={row}
                      field={k}
                      className="px-3 py-2 text-right text-xs text-gray-600 border-l border-sky-50 tabular-nums"
                      numeric
                    />
                  ))}

                  {/* Total — read-only */}
                  <EditableCell
                    row={row}
                    field="total"
                    readOnly
                    className="px-3 py-2 text-right text-xs border-l border-sky-100 tabular-nums bg-sky-50/40"
                  />

                  {/* CC fields */}
                  <EditableCell
                    row={row}
                    field="ccAdaptation"
                    className="px-3 py-2 text-right text-xs text-emerald-700 border-l border-emerald-100 tabular-nums"
                    numeric
                  />
                  <EditableCell
                    row={row}
                    field="ccMitigation"
                    className="px-3 py-2 text-right text-xs text-emerald-700 tabular-nums"
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
