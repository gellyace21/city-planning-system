"use client";

import React from "react";
import { AIPRow, BudgetSegment, SectorSummary } from "./types";
import { SECTOR_COLORS } from "./constants";
import { fmtK } from "./utils";
import SectorBadge from "./SectorBadge";

interface SummaryViewProps {
  sectorSummary: SectorSummary[];
  filtered: AIPRow[];
}

export default function SummaryView({
  sectorSummary,
  filtered,
}: SummaryViewProps): React.JSX.Element {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {sectorSummary.map((s) => {
        const c = SECTOR_COLORS[s.sector] ?? {
          bg: "bg-gray-50",
          border: "border-gray-200",
        };
        const sectorRows = filtered.filter((r) => r.sector === s.sector);
        const segments: BudgetSegment[] = [
          {
            key: "ps",
            color: "bg-blue-400",
            total: sectorRows.reduce((a, r) => a + r.ps, 0),
          },
          {
            key: "mooe",
            color: "bg-amber-400",
            total: sectorRows.reduce((a, r) => a + r.mooe, 0),
          },
          {
            key: "co",
            color: "bg-indigo-400",
            total: sectorRows.reduce((a, r) => a + r.co, 0),
          },
        ];

        return (
          <div
            key={s.sector}
            className={`rounded-2xl border p-6 ${c.bg} ${c.border}`}
          >
            <div className="flex justify-between items-start mb-4">
              <SectorBadge sector={s.sector} />
              <span className="text-2xl font-black text-gray-800">
                {fmtK(s.total)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Projects", value: s.count },
                { label: "CC Expenditure", value: fmtK(s.cc) },
                {
                  label: "CC Share",
                  value: `${s.total ? ((s.cc / s.total) * 100).toFixed(0) : 0}%`,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-xl p-3 shadow-sm"
                >
                  <div className="text-lg font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-1">Budget breakdown</div>
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                {segments.map((seg) => (
                  <div
                    key={seg.key}
                    className={`${seg.color} transition-all`}
                    style={{ flex: seg.total || 0 }}
                  />
                ))}
              </div>
              <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                {(
                  [
                    ["bg-blue-400", "PS"],
                    ["bg-amber-400", "MOOE"],
                    ["bg-indigo-400", "CO"],
                  ] as [string, string][]
                ).map(([bg, lbl]) => (
                  <span key={lbl}>
                    <span
                      className={`inline-block w-2 h-2 rounded-sm ${bg} mr-1`}
                    />
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
