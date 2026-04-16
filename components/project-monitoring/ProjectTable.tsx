"use client";

import React, { KeyboardEvent, useMemo, useState } from "react";
import {
  createAipRowAction,
  createMonitoringRowAction,
  deleteAipRowsAction,
  deleteMonitoringRowsAction,
  fetchProjectMonitoringDataAction,
  restoreHistoryEntryAction,
  updateAipRowFieldAction,
  updateMonitoringRowFieldAction,
} from "@/lib/services/projectMonitoringActions";
import AIPTable from "./AIPTable";
import MonitoringTable from "./MonitoringTable";
import {
  AIPRow,
  EditCell,
  EditHistoryEntry,
  MonitoringEditCell,
  MonitoringRow,
  MonitoringSortKey,
  SortDir,
  SortKey,
} from "./types";
import { IconBook, IconHistory, IconTrash } from "@tabler/icons-react";

type ActiveDataset = "aip" | "monitoring";

const AIP_NUMERIC_FIELDS = new Set<keyof AIPRow>([
  "ps",
  "mooe",
  "fe",
  "co",
  "total",
  "ccAdaptation",
  "ccMitigation",
]);

const MONITORING_NUMERIC_FIELDS = new Set<keyof MonitoringRow>([
  "approved_budget",
  "certified_amount",
  "obligation",
  "actual_cost",
  "status_percent",
]);

interface ProjectTableProps {
  mode: ActiveDataset;
  initialAipRows: AIPRow[];
  initialMonitoringRows: MonitoringRow[];
  initialHistory: EditHistoryEntry[];
}

export default function ProjectTable({
  mode,
  initialAipRows,
  initialMonitoringRows,
  initialHistory,
}: ProjectTableProps): React.JSX.Element {
  const [busy, setBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<EditHistoryEntry[]>(initialHistory);

  const [aipRows, setAipRows] = useState<AIPRow[]>(initialAipRows);
  const [aipSearch, setAipSearch] = useState<string>("");
  const [aipSector, setAipSector] = useState<string>("All");
  const [aipSortCol, setAipSortCol] = useState<SortKey>(null);
  const [aipSortDir, setAipSortDir] = useState<SortDir>("asc");
  const [aipSelectedRows, setAipSelectedRows] = useState<Set<number>>(
    new Set(),
  );
  const [aipEditCell, setAipEditCell] = useState<EditCell>(null);
  const [aipEditValue, setAipEditValue] = useState<string>("");

  const [monitoringRows, setMonitoringRows] = useState<MonitoringRow[]>(
    initialMonitoringRows,
  );
  const [monitoringSearch, setMonitoringSearch] = useState<string>("");
  const [monitoringSortCol, setMonitoringSortCol] =
    useState<MonitoringSortKey>(null);
  const [monitoringSortDir, setMonitoringSortDir] = useState<SortDir>("asc");
  const [monitoringSelectedRows, setMonitoringSelectedRows] = useState<
    Set<number>
  >(new Set());
  const [monitoringEditCell, setMonitoringEditCell] =
    useState<MonitoringEditCell>(null);
  const [monitoringEditValue, setMonitoringEditValue] = useState<string>("");

  const allSectors = useMemo(
    () => ["All", ...new Set(aipRows.map((row) => row.sector).filter(Boolean))],
    [aipRows],
  );

  const filteredAip = useMemo(() => {
    return aipRows
      .filter((row) => aipSector === "All" || row.sector === aipSector)
      .filter((row) => {
        if (!aipSearch.trim()) return true;
        const q = aipSearch.toLowerCase();
        return [
          row.aipCode,
          row.description,
          row.department,
          row.outputs,
          row.funding,
          row.sector,
        ].some((field) => field?.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (!aipSortCol) return 0;
        const av = a[aipSortCol];
        const bv = b[aipSortCol];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return aipSortDir === "asc" ? cmp : -cmp;
      });
  }, [aipRows, aipSector, aipSearch, aipSortCol, aipSortDir]);

  const filteredMonitoring = useMemo(() => {
    return monitoringRows
      .filter((row) => {
        if (!monitoringSearch.trim()) return true;
        const q = monitoringSearch.toLowerCase();
        return [
          row.project_name,
          row.agency,
          row.location,
          row.funding,
          row.major_findings,
          row.issues,
          row.action_recommendation,
          row.remarks,
          row.certified_date,
        ].some((field) => field?.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (!monitoringSortCol) return 0;
        const av = a[monitoringSortCol];
        const bv = b[monitoringSortCol];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return monitoringSortDir === "asc" ? cmp : -cmp;
      });
  }, [monitoringRows, monitoringSearch, monitoringSortCol, monitoringSortDir]);

  const handleFailure = (error: unknown): void => {
    setErrorMsg(
      error instanceof Error ? error.message : "Failed to save changes.",
    );
  };

  const pushHistory = (
    entries: EditHistoryEntry | EditHistoryEntry[],
  ): void => {
    const arr = Array.isArray(entries) ? entries : [entries];
    if (arr.length === 0) return;
    setHistory((prev) =>
      [...arr, ...prev]
        .sort((a, b) => b.edited_at.localeCompare(a.edited_at))
        .slice(0, 300),
    );
  };

  const startAipEdit = (
    rowId: number,
    field: keyof AIPRow,
    currentVal: string | number,
  ): void => {
    setErrorMsg("");
    setAipEditCell({ rowId, field });
    setAipEditValue(String(currentVal));
  };

  const commitAipEdit = async (): Promise<void> => {
    if (!aipEditCell) return;
    setBusy(true);
    try {
      const { rowId, field } = aipEditCell;
      const value = AIP_NUMERIC_FIELDS.has(field)
        ? Number.parseFloat(aipEditValue) || 0
        : aipEditValue;
      const result = await updateAipRowFieldAction(rowId, field, value);
      setAipRows((prev) =>
        prev.map((row) => (row.id === rowId ? result.row : row)),
      );
      if (result.historyEntry) pushHistory(result.historyEntry);
      setAipEditCell(null);
      setAipEditValue("");
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const handleAipKeyDown = (
    e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    if (e.key === "Enter") void commitAipEdit();
    if (e.key === "Escape") {
      setAipEditCell(null);
      setAipEditValue("");
    }
  };

  const handleAipSort = (col: SortKey): void => {
    if (!col) return;
    if (aipSortCol === col) {
      setAipSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setAipSortCol(col);
    setAipSortDir("asc");
  };

  const toggleAipRow = (id: number): void => {
    setAipSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllAipRows = (): void => {
    setAipSelectedRows(
      aipSelectedRows.size === filteredAip.length && filteredAip.length > 0
        ? new Set()
        : new Set(filteredAip.map((row) => row.id)),
    );
  };

  const addAipRow = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await createAipRowAction();
      setAipRows((prev) => [...prev, result.row]);
      pushHistory(result.historyEntry);
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const deleteAipSelection = async (): Promise<void> => {
    const ids = [...aipSelectedRows];
    if (ids.length === 0) return;

    setBusy(true);
    try {
      const entries = await deleteAipRowsAction(ids);
      setAipRows((prev) => prev.filter((row) => !aipSelectedRows.has(row.id)));
      pushHistory(entries);
      setAipSelectedRows(new Set());
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const startMonitoringEdit = (
    rowId: number,
    field: keyof MonitoringRow,
    currentVal: string | number,
  ): void => {
    setErrorMsg("");
    setMonitoringEditCell({ rowId, field });
    setMonitoringEditValue(String(currentVal));
  };

  const commitMonitoringEdit = async (): Promise<void> => {
    if (!monitoringEditCell) return;
    setBusy(true);
    try {
      const { rowId, field } = monitoringEditCell;
      const value = MONITORING_NUMERIC_FIELDS.has(field)
        ? Number.parseFloat(monitoringEditValue) || 0
        : monitoringEditValue;
      const result = await updateMonitoringRowFieldAction(rowId, field, value);
      setMonitoringRows((prev) =>
        prev.map((row) => (row.id === rowId ? result.row : row)),
      );
      if (result.historyEntry) pushHistory(result.historyEntry);
      setMonitoringEditCell(null);
      setMonitoringEditValue("");
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const handleMonitoringKeyDown = (
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void commitMonitoringEdit();
    }
    if (e.key === "Escape") {
      setMonitoringEditCell(null);
      setMonitoringEditValue("");
    }
  };

  const handleMonitoringSort = (col: MonitoringSortKey): void => {
    if (!col) return;
    if (monitoringSortCol === col) {
      setMonitoringSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setMonitoringSortCol(col);
    setMonitoringSortDir("asc");
  };

  const toggleMonitoringRow = (id: number): void => {
    setMonitoringSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllMonitoringRows = (): void => {
    setMonitoringSelectedRows(
      monitoringSelectedRows.size === filteredMonitoring.length &&
        filteredMonitoring.length > 0
        ? new Set()
        : new Set(filteredMonitoring.map((row) => row.id)),
    );
  };

  const addMonitoringRow = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await createMonitoringRowAction();
      setMonitoringRows((prev) => [...prev, result.row]);
      pushHistory(result.historyEntry);
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const deleteMonitoringSelection = async (): Promise<void> => {
    const ids = [...monitoringSelectedRows];
    if (ids.length === 0) return;

    setBusy(true);
    try {
      const entries = await deleteMonitoringRowsAction(ids);
      setMonitoringRows((prev) =>
        prev.filter((row) => !monitoringSelectedRows.has(row.id)),
      );
      pushHistory(entries);
      setMonitoringSelectedRows(new Set());
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const restoreHistory = async (entry: EditHistoryEntry): Promise<void> => {
    setBusy(true);
    try {
      await restoreHistoryEntryAction(entry.id);
      const refreshed = await fetchProjectMonitoringDataAction();
      setAipRows(refreshed.aipRows);
      setMonitoringRows(refreshed.monitoringRows);
      setHistory(refreshed.history);
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div
        className={`max-w-screen mx-auto px-12 py-12 space-y-4 duration-200 ease-in-out ${showHistory ? "mr-74 w-[85vw]" : "mr-0 w-[90vw]"}`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {mode === "aip" ? "Annual Investment Plan" : "Project Monitoring"}
            </h1>
            <p className="text-sm text-gray-500">
              Data source: db.json via services
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border flex gap-2 justify-center items-center hover:bg-amber-100 hover:cursor-pointer duration-200 ease-in-out ${
                showHistory
                  ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-400"
                  : "bg-white text-amber-700 border-amber-200"
              }`}
            >
              <IconHistory /> History ({history.length})
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="px-4 py-2 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {errorMsg}
          </div>
        )}

        <div
          className={`bg-white border fixed ${showHistory ? "right-0" : "-right-100"} duration-200 ease-in-out top-25 border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full z-1`}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Edit History</h2>
            <span className="text-xs text-gray-500">
              {history.length} changes
            </span>
          </div>
          <div className="max-h-full overflow-y-auto divide-y divide-gray-100">
            {history.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-400">
                No history yet.
              </div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800">
                      {entry.entity_name === "aip_rows" ? "AIP" : "Monitoring"}{" "}
                      · {entry.action_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.edited_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Row {entry.row_id} · Field {entry.column_name}
                  </div>
                  <div className="mt-1 text-xs flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
                      {entry.old_value === null ? "—" : String(entry.old_value)}
                    </span>
                    <span className="text-gray-400">to</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {entry.new_value === null ? "—" : String(entry.new_value)}
                    </span>
                  </div>
                  <button
                    onClick={() => void restoreHistory(entry)}
                    disabled={busy}
                    className="mt-2 text-xs font-semibold text-amber-700 hover:underline disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {mode === "aip" ? (
          // AIP
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={aipSearch}
                onChange={(e) => setAipSearch(e.target.value)}
                placeholder="Search code, description, department..."
                className="flex-1 min-w-64 px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              />
              <select
                value={aipSector}
                onChange={(e) => setAipSector(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              >
                {allSectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void addAipRow()}
                disabled={busy}
                className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                + Add AIP Row
              </button>
              <button
                onClick={() => void deleteAipSelection()}
                disabled={busy || aipSelectedRows.size === 0}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Delete ({aipSelectedRows.size})
              </button>
            </div>

            <AIPTable
              filtered={filteredAip}
              selectedRows={aipSelectedRows}
              toggleRow={toggleAipRow}
              toggleAll={toggleAllAipRows}
              editCell={aipEditCell}
              editValue={aipEditValue}
              setEditValue={setAipEditValue}
              startEdit={startAipEdit}
              commitEdit={() => {
                void commitAipEdit();
              }}
              handleKeyDown={handleAipKeyDown}
              allSectors={allSectors.filter((sector) => sector !== "All")}
              handleSort={handleAipSort}
              sortCol={aipSortCol}
              sortDir={aipSortDir}
            />
          </>
        ) : (
          // Monitoring
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={monitoringSearch}
                onChange={(e) => setMonitoringSearch(e.target.value)}
                placeholder="Search project, agency, findings, issues..."
                className="flex-1 min-w-64 px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              />
              <button
                onClick={() => void addMonitoringRow()}
                disabled={busy}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-emerald-500 duration-200 ease-in-out cursor-pointer"
              >
                + Add Monitoring Row
              </button>
              <button
                onClick={() => void deleteMonitoringSelection()}
                disabled={busy || monitoringSelectedRows.size === 0}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-500 duration-200 ease-in-out cursor-pointer"
              >
                <IconTrash /> Delete ({monitoringSelectedRows.size})
              </button>
            </div>

            <MonitoringTable
              filtered={filteredMonitoring}
              selectedRows={monitoringSelectedRows}
              toggleRow={toggleMonitoringRow}
              toggleAll={toggleAllMonitoringRows}
              editCell={monitoringEditCell}
              editValue={monitoringEditValue}
              setEditValue={setMonitoringEditValue}
              startEdit={startMonitoringEdit}
              commitEdit={() => {
                void commitMonitoringEdit();
              }}
              handleKeyDown={handleMonitoringKeyDown}
              handleSort={handleMonitoringSort}
              sortCol={monitoringSortCol}
              sortDir={monitoringSortDir}
            />
          </>
        )}
      </div>
    </div>
  );
}
