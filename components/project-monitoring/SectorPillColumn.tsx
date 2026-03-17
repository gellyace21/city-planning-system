import React from "react";

interface AIPRowLike {
  id: number;
  sector: string;
}

interface EditCellLike {
  rowId: number;
  field: string;
}

interface SectorPillColumnProps {
  filtered: AIPRowLike[];
  editCell: EditCellLike | null;
  editValue: string;
  allSectors: string[];
  theadHeight: number;
  trHeight: number;
  sectorPills: Record<string, string>;
  sectorPillFallback: string;
  setEditValue: (value: string) => void;
  startEdit: (rowId: number, field: "sector", currentVal: string) => void;
  commitEdit: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function SectorPillColumn({
  filtered,
  editCell,
  editValue,
  allSectors,
  theadHeight,
  trHeight,
  sectorPills,
  sectorPillFallback,
  setEditValue,
  startEdit,
  commitEdit,
  handleKeyDown,
}: SectorPillColumnProps): React.JSX.Element {
  return (
    <div className="flex-none flex flex-col" style={{ paddingTop: `${theadHeight}px` }}>
      {filtered.map((row) => {
        const pillBg = sectorPills[row.sector] ?? sectorPillFallback;

        return (
          <div
            key={`sector-${row.id}`}
            className="flex items-center justify-end pr-1"
            style={{ height: `${trHeight}px` }}
          >
            {editCell?.rowId === row.id && editCell?.field === "sector" ? (
              <select
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className="text-xs border border-teal-400 rounded px-1 py-0.5 bg-white focus:outline-none"
              >
                <option value="">- select -</option>
                {allSectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <span
                onDoubleClick={() => startEdit(row.id, "sector", row.sector)}
                title="Double-click to edit"
                className={`
                  cursor-pointer select-none
                  px-3 py-1 rounded-full
                  text-xs font-bold uppercase tracking-wide
                  whitespace-nowrap shadow-sm
                  transition-opacity hover:opacity-80
                  ${pillBg}
                `}
              >
                {row.sector || "-"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
