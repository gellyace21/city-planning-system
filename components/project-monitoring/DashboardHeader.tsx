"use client";

import React, { ChangeEvent } from "react";
import { ViewMode } from "./types";
import { ChartBarIncreasing, NotepadText } from "lucide-react";

interface DashboardHeaderProps {
  view: ViewMode;
  setView: React.Dispatch<React.SetStateAction<ViewMode>>;
  importing: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  handleImport: (e: ChangeEvent<HTMLInputElement>) => void;
  downloadExcel: () => Promise<void>;
  downloadCSV: () => Promise<void>;
  importMsg: string;
}

export default function DashboardHeader({
  view,
  setView,
  importing,
  fileRef,
  handleImport,
  downloadExcel,
  downloadCSV,
  importMsg,
}: DashboardHeaderProps): React.JSX.Element {
  return (
    <div className="top-0 z-20">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 relative md:min-h-[64px]">
        {/* Truly centered title on desktop, normal flow on mobile */}
        <div className="text-center mb-3 md:mb-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
          <div className="font-bold text-gray-900 leading-tight whitespace-nowrap">
            FY 2027 Annual Planning Investment Program (AIP)
          </div>
          <div className="text-sm text-gray-500">
            By Program/Project/Activity by Sector
          </div>
        </div>

        {/* Actions stay right on desktop, centered on mobile */}
        <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
          <button
            onClick={() =>
              setView((v) => (v === "table" ? "summary" : "table"))
            }
            className="relative inline-flex items-center justify-center h-10 min-w-[132px] px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <span className="absolute left-2">
              {view === "table" ? <ChartBarIncreasing /> : <NotepadText />}
            </span>
            <span>{view === "table" ? "Summary" : "Table"}</span>
          </button>

          <label className="cursor-pointer">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImport}
            />
            <span className="relative inline-flex items-center justify-center h-10 min-w-[132px] px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer">
              <span className="absolute left-3">⬆</span>
              <span>{importing ? "Importing..." : "Import"}</span>
            </span>
          </label>

          <div className="relative group">
            <button className="relative inline-flex items-center justify-center h-10 min-w-[132px] px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow">
              <span className="absolute left-3">⬇</span>
              <span>Export ▾</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-30 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
              <button
                onClick={downloadExcel}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 text-gray-700 flex items-center gap-2"
              >
                📊 Excel (.xlsx)
              </button>
              <button
                onClick={downloadCSV}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 text-gray-700 flex items-center gap-2"
              >
                📄 CSV (.csv)
              </button>
            </div>
          </div>
        </div>
      </div>

      {importMsg && (
        <div
          className={`mx-6 mb-3 px-4 py-2 rounded-lg text-sm font-medium border ${
            importMsg.startsWith("✓")
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {importMsg}
        </div>
      )}
    </div>
  );
}
