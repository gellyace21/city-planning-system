"use client";

import React, {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addCommentAction,
  createAipRowAction,
  createMonitoringRowAction,
  deleteAipRowsAction,
  deleteMonitoringRowsAction,
  fetchCommentsAction,
  fetchLeadUploadedFilesAction,
  fetchProjectMonitoringDataAction,
  restoreHistoryEntryAction,
  uploadLeadAipFileAction,
  updateAipRowFieldAction,
  updateMonitoringRowFieldAction,
} from "@/lib/services/projectMonitoringActions";
import AIPTable from "./AIPTable";
import MonitoringTable from "./MonitoringTable";
import {
  AIPRow,
  CommentEntry,
  EditCell,
  EditHistoryEntry,
  MonitoringEditCell,
  MonitoringRow,
  MonitoringSortKey,
  SortDir,
  SortKey,
} from "./types";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconHistory,
  IconPrinter,
  IconTrash,
} from "@tabler/icons-react";
import { downloadAIP, parseAIPExcel } from "@/lib/aipExport";
import { useSession } from "next-auth/react";

type ActiveDataset = "aip" | "monitoring";
type HistoryPanelView = "all" | "lead";

type ChangeOperation = {
  dataset: ActiveDataset;
  rowId: number;
  field: keyof AIPRow | keyof MonitoringRow;
  previousValue: string | number;
  nextValue: string | number;
};

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

const toYear = (value: string): number | null => {
  const parsed = Number(value.slice(0, 4));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const makeInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export default function ProjectTable({
  mode,
  initialAipRows,
  initialMonitoringRows,
  initialHistory,
}: ProjectTableProps): React.JSX.Element {
  const { data: session } = useSession();
  const actorRole = session?.user?.role;
  const isLead = actorRole === "lead";
  const isAdmin = actorRole === "admin";

  const [busy, setBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyPanelView, setHistoryPanelView] = useState<HistoryPanelView>(
    "all",
  );
  const [history, setHistory] = useState<EditHistoryEntry[]>(initialHistory);
  const [leadFiles, setLeadFiles] = useState<
    {
      id: number;
      lead_id: number;
      file_name: string;
      uploaded_at: string;
      row_count: number;
    }[]
  >([]);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [commentTarget, setCommentTarget] = useState<{
    rowId: number;
    field: string;
  } | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);

  const [undoStack, setUndoStack] = useState<ChangeOperation[]>([]);
  const [redoStack, setRedoStack] = useState<ChangeOperation[]>([]);
  const historyPanelRef = useRef<HTMLDivElement | null>(null);

  const [aipRows, setAipRows] = useState<AIPRow[]>(initialAipRows);
  const [aipSearch, setAipSearch] = useState<string>("");
  const [aipSector, setAipSector] = useState<string>("All");
  const [aipDepartment, setAipDepartment] = useState<string>("All");
  const [aipYear, setAipYear] = useState<string>("All");
  const [aipSortCol, setAipSortCol] = useState<SortKey>(null);
  const [aipSortDir, setAipSortDir] = useState<SortDir>("asc");
  const [aipSelectedRows, setAipSelectedRows] = useState<Set<number>>(
    new Set(),
  );
  const [focusedAipRowId, setFocusedAipRowId] = useState<number | null>(null);
  const [aipEditCell, setAipEditCell] = useState<EditCell>(null);
  const [aipEditValue, setAipEditValue] = useState<string>("");

  const [monitoringRows, setMonitoringRows] = useState<MonitoringRow[]>(
    initialMonitoringRows,
  );
  const [monitoringSearch, setMonitoringSearch] = useState<string>("");
  const [monitoringYear, setMonitoringYear] = useState<string>("All");
  const [monitoringSortCol, setMonitoringSortCol] =
    useState<MonitoringSortKey>(null);
  const [monitoringSortDir, setMonitoringSortDir] = useState<SortDir>("asc");
  const [monitoringSelectedRows, setMonitoringSelectedRows] = useState<
    Set<number>
  >(new Set());
  const [monitoringEditCell, setMonitoringEditCell] =
    useState<MonitoringEditCell>(null);
  const [monitoringEditValue, setMonitoringEditValue] = useState<string>("");

  const entityName = mode === "aip" ? "aip_rows" : "monitoring_rows";

  const commentFields = useMemo(() => {
    if (mode === "aip") {
      return [
        "__row__",
        "aipCode",
        "description",
        "sector",
        "department",
        "startDate",
        "endDate",
        "outputs",
        "funding",
        "ps",
        "mooe",
        "fe",
        "co",
        "total",
        "ccAdaptation",
        "ccMitigation",
        "ccCode",
      ];
    }
    return [
      "__row__",
      "project_name",
      "agency",
      "location",
      "approved_budget",
      "certified_amount",
      "obligation",
      "actual_cost",
      "funding",
      "certified_date",
      "major_findings",
      "issues",
      "status_percent",
      "action_recommendation",
      "remarks",
    ];
  }, [mode]);

  const visibleAipRows = useMemo(() => {
    if (!isLead) return aipRows;
    const leadId = Number(session?.user?.id);
    return aipRows.filter((row) => row.lead_id === leadId);
  }, [aipRows, isLead, session?.user?.id]);

  const allSectors = useMemo(
    () => [
      "All",
      ...new Set(visibleAipRows.map((row) => row.sector).filter(Boolean)),
    ],
    [visibleAipRows],
  );

  const allDepartments = useMemo(
    () => [
      "All",
      ...new Set(visibleAipRows.map((row) => row.department).filter(Boolean)),
    ],
    [visibleAipRows],
  );

  const aipYearOptions = useMemo(() => {
    return [
      "All",
      ...new Set(
        visibleAipRows
          .map((row) => row.year)
          .filter((value): value is number => Number.isFinite(value))
          .map((value) => String(value)),
      ),
    ].sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : Number(a) - Number(b)));
  }, [visibleAipRows]);

  const monitoringYearOptions = useMemo(() => {
    return [
      "All",
      ...new Set(
        monitoringRows
          .map((row) => row.year || toYear(row.certified_date || ""))
          .filter((value): value is number => Number.isFinite(value))
          .map((value) => String(value)),
      ),
    ].sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : Number(a) - Number(b)));
  }, [monitoringRows]);

  const filteredAip = useMemo(() => {
    return visibleAipRows
      .filter((row) => aipSector === "All" || row.sector === aipSector)
      .filter((row) =>
        aipDepartment === "All" ? true : row.department === aipDepartment,
      )
      .filter((row) =>
        aipYear === "All" ? true : String(row.year ?? "") === aipYear,
      )
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
  }, [
    visibleAipRows,
    aipSector,
    aipDepartment,
    aipYear,
    aipSearch,
    aipSortCol,
    aipSortDir,
  ]);

  const filteredMonitoring = useMemo(() => {
    return monitoringRows
      .filter((row) => {
        const resolvedYear = row.year || toYear(row.certified_date || "");
        return monitoringYear === "All"
          ? true
          : String(resolvedYear ?? "") === monitoringYear;
      })
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
  }, [
    monitoringRows,
    monitoringYear,
    monitoringSearch,
    monitoringSortCol,
    monitoringSortDir,
  ]);

  const leadCellStatuses = useMemo(() => {
    const map: Record<string, "pending" | "approved" | "rejected"> = {};
    const sorted = [...history].sort(
      (a, b) =>
        new Date(b.edited_at).getTime() - new Date(a.edited_at).getTime(),
    );
    for (const entry of sorted) {
      if (entry.entity_name !== "aip_rows" || entry.action_type !== "edit") {
        continue;
      }
      if (entry.edited_by_role !== "lead") continue;
      const key = `${entry.row_id}:${entry.column_name}`;
      if (!map[key] && entry.change_status) {
        map[key] = entry.change_status;
      }
    }
    return map;
  }, [history]);

  const monitoringChangeCountsByCell = useMemo(() => {
    const result: Record<string, number> = {};
    for (const entry of history) {
      if (
        entry.entity_name !== "monitoring_rows" ||
        entry.action_type !== "edit" ||
        entry.column_name === "__row__"
      ) {
        continue;
      }
      const key = `${entry.row_id}:${entry.column_name}`;
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
  }, [history]);

  const leadChangeLog = useMemo(() => {
    return history.filter(
      (entry) =>
        entry.entity_name === "aip_rows" &&
        entry.edited_by_role === "lead" &&
        entry.action_type === "edit",
    );
  }, [history]);

  const activeHistoryFeed = useMemo(() => {
    if (mode === "aip" && historyPanelView === "lead") {
      return leadChangeLog;
    }
    return history;
  }, [history, historyPanelView, leadChangeLog, mode]);

  const activeHistoryTitle =
    mode === "aip" && historyPanelView === "lead"
      ? "Lead Edit History"
      : "Edit History";

  const openHistoryPanel = (view: HistoryPanelView): void => {
    setHistoryPanelView(view);
    setShowHistory(true);
  };

  const commentCountsByCell = useMemo(() => {
    const mapped: Record<string, number> = {};
    for (const comment of comments) {
      const key = `${comment.row_id}:${comment.column_name}`;
      mapped[key] = (mapped[key] ?? 0) + 1;
    }
    return mapped;
  }, [comments]);

  const commentCountsByRow = useMemo(() => {
    const mapped: Record<string, number> = {};
    for (const comment of comments) {
      const key = String(comment.row_id);
      mapped[key] = (mapped[key] ?? 0) + 1;
    }
    return mapped;
  }, [comments]);

  const commentThread = useMemo(() => {
    if (!commentTarget) return [];
    return comments
      .filter(
        (comment) =>
          comment.row_id === commentTarget.rowId &&
          comment.column_name === commentTarget.field,
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [comments, commentTarget]);

  const refreshComments = async (): Promise<void> => {
    try {
      const data = await fetchCommentsAction(entityName);
      setComments(data);
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    void (async () => {
      await refreshComments();
    })();
  }, [session?.user?.id, session?.user?.role, entityName]);

  useEffect(() => {
    if (!showHistory) return;

    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!historyPanelRef.current?.contains(target)) {
        setShowHistory(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [showHistory]);

  useEffect(() => {
    if (!session?.user) return;
    void (async () => {
      try {
        const files = await fetchLeadUploadedFilesAction();
        setLeadFiles(files);
      } catch {
        setLeadFiles([]);
      }
    })();
  }, [session?.user?.id, session?.user?.role]);

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

  const applyAipFieldChange = async (
    rowId: number,
    field: keyof AIPRow,
    rawValue: string | number,
    pushUndo = true,
  ): Promise<void> => {
    const row = aipRows.find((item) => item.id === rowId);
    if (!row) return;
    const previous = row[field] as string | number;
    const value = AIP_NUMERIC_FIELDS.has(field)
      ? Number.parseFloat(String(rawValue)) || 0
      : String(rawValue);

    const result = await updateAipRowFieldAction(rowId, field, value);
    setAipRows((prev) => prev.map((item) => (item.id === rowId ? result.row : item)));
    if (result.historyEntry) {
      pushHistory(result.historyEntry);
    }

    if (pushUndo && String(previous) !== String(value)) {
      setUndoStack((prev) => [
        ...prev,
        {
          dataset: "aip",
          rowId,
          field,
          previousValue: previous,
          nextValue: value,
        },
      ]);
      setRedoStack([]);
    }
  };

  const applyMonitoringFieldChange = async (
    rowId: number,
    field: keyof MonitoringRow,
    rawValue: string | number,
    pushUndo = true,
  ): Promise<void> => {
    const row = monitoringRows.find((item) => item.id === rowId);
    if (!row) return;
    const previous = row[field] as string | number;
    const value = MONITORING_NUMERIC_FIELDS.has(field)
      ? Number.parseFloat(String(rawValue)) || 0
      : String(rawValue);

    const result = await updateMonitoringRowFieldAction(rowId, field, value);
    setMonitoringRows((prev) =>
      prev.map((item) => (item.id === rowId ? result.row : item)),
    );
    if (result.historyEntry) {
      pushHistory(result.historyEntry);
    }

    if (pushUndo && String(previous) !== String(value)) {
      setUndoStack((prev) => [
        ...prev,
        {
          dataset: "monitoring",
          rowId,
          field,
          previousValue: previous,
          nextValue: value,
        },
      ]);
      setRedoStack([]);
    }
  };

  const commitAipEdit = async (): Promise<void> => {
    if (!aipEditCell) return;
    setBusy(true);
    try {
      await applyAipFieldChange(aipEditCell.rowId, aipEditCell.field, aipEditValue);
      setAipEditCell(null);
      setAipEditValue("");
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const commitMonitoringEdit = async (): Promise<void> => {
    if (!monitoringEditCell) return;
    setBusy(true);
    try {
      await applyMonitoringFieldChange(
        monitoringEditCell.rowId,
        monitoringEditCell.field,
        monitoringEditValue,
      );
      setMonitoringEditCell(null);
      setMonitoringEditValue("");
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async (): Promise<void> => {
    const op = undoStack[undoStack.length - 1];
    if (!op || busy) return;

    setBusy(true);
    try {
      if (op.dataset === "aip") {
        await applyAipFieldChange(
          op.rowId,
          op.field as keyof AIPRow,
          op.previousValue,
          false,
        );
      } else {
        await applyMonitoringFieldChange(
          op.rowId,
          op.field as keyof MonitoringRow,
          op.previousValue,
          false,
        );
      }
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, op]);
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const handleRedo = async (): Promise<void> => {
    const op = redoStack[redoStack.length - 1];
    if (!op || busy) return;

    setBusy(true);
    try {
      if (op.dataset === "aip") {
        await applyAipFieldChange(op.rowId, op.field as keyof AIPRow, op.nextValue, false);
      } else {
        await applyMonitoringFieldChange(
          op.rowId,
          op.field as keyof MonitoringRow,
          op.nextValue,
          false,
        );
      }
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, op]);
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      const accel = event.ctrlKey || event.metaKey;
      if (!accel) return;

      const lower = event.key.toLowerCase();
      const redoCombo = lower === "y" || (lower === "z" && event.shiftKey);
      const undoCombo = lower === "z" && !event.shiftKey;

      if (undoCombo) {
        event.preventDefault();
        void handleUndo();
      }
      if (redoCombo) {
        event.preventDefault();
        void handleRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [undoStack, redoStack, busy]);

  const startAipEdit = (
    rowId: number,
    field: keyof AIPRow,
    currentVal: string | number,
  ): void => {
    setErrorMsg("");
    setAipEditCell({ rowId, field });
    setAipEditValue(String(currentVal));
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

  const handleLeadAipUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setErrorMsg("");
    try {
      const parsedRows = await parseAIPExcel(file);
      const result = await uploadLeadAipFileAction(file.name, parsedRows);
      setAipRows((prev) => [...prev, ...result.uploadedRows]);
      const files = await fetchLeadUploadedFilesAction();
      setLeadFiles(files);
    } catch (error) {
      handleFailure(error);
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const jumpToAipChange = (entry: EditHistoryEntry): void => {
    setAipSearch("");
    setAipSector("All");
    setAipDepartment("All");
    setShowHistory(false);
    setFocusedAipRowId(entry.row_id);

    window.setTimeout(() => {
      const target = document.getElementById(`aip-row-${entry.row_id}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);

    window.setTimeout(() => {
      setFocusedAipRowId(null);
    }, 900);
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

  const openComments = (
    rowId: number,
    field: keyof AIPRow | keyof MonitoringRow | "__row__",
  ): void => {
    setCommentTarget({ rowId, field: String(field) });
    setCommentDraft("");
  };

  const closeComments = (): void => {
    setCommentTarget(null);
    setCommentDraft("");
  };

  const submitComment = async (): Promise<void> => {
    if (!isAdmin) {
      setErrorMsg("Only admins can add comments.");
      return;
    }
    if (!commentTarget || !commentDraft.trim()) return;
    setCommentSubmitting(true);
    try {
      const created = await addCommentAction({
        entity_name: entityName,
        row_id: commentTarget.rowId,
        column_name: commentTarget.field,
        comment_text: commentDraft,
      });
      setComments((prev) => [created, ...prev]);
      setCommentDraft("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handlePrint = (): void => {
    window.print();
  };

  const exportAip = (): void => {
    const rows = filteredAip.map((row) => ({
      aipCode: row.aipCode,
      description: row.description,
      department: row.department,
      startDate: row.startDate,
      endDate: row.endDate,
      outputs: row.outputs,
      funding: row.funding,
      ps: row.ps,
      mooe: row.mooe,
      fe: row.fe,
      co: row.co,
      total: row.total,
      ccAdaptation: row.ccAdaptation,
      ccMitigation: row.ccMitigation,
      ccCode: row.ccCode,
    }));
    downloadAIP(rows, `AIP_${aipYear === "All" ? "all-years" : aipYear}.xlsx`);
  };

  const exportMonitoringCsv = (): void => {
    const headers = [
      "project_name",
      "agency",
      "location",
      "approved_budget",
      "certified_amount",
      "obligation",
      "actual_cost",
      "funding",
      "certified_date",
      "major_findings",
      "issues",
      "status_percent",
      "action_recommendation",
      "remarks",
    ] as const;

    const lines = [headers.join(",")];
    for (const row of filteredMonitoring) {
      const cells = headers.map((header) => {
        const raw = String(row[header] ?? "").replaceAll("\"", "\"\"");
        return `\"${raw}\"`;
      });
      lines.push(cells.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monitoring_${
      monitoringYear === "All" ? "all-years" : monitoringYear
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen relative p-20">
      <div
        className={`max-w-screen mx-auto px-12 py-12 space-y-4 duration-200 ease-in-out ${showHistory ? "mr-74 w-[85vw]" : "mr-0 w-[90vw]"}`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {mode === "aip" ? "Annual Investment Plan" : "Project Monitoring"}
            </h1>
            <p className="text-sm text-gray-500">Data source: db.json via services</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                void handleUndo();
              }}
              disabled={undoStack.length === 0 || busy}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border bg-white text-gray-700 border-gray-200 disabled:opacity-50 flex items-center gap-1"
              title="Undo (Ctrl+Z)"
            >
              <IconArrowBackUp size={16} /> Undo
            </button>
            <button
              onClick={() => {
                void handleRedo();
              }}
              disabled={redoStack.length === 0 || busy}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border bg-white text-gray-700 border-gray-200 disabled:opacity-50 flex items-center gap-1"
              title="Redo (Ctrl+Y)"
            >
              <IconArrowForwardUp size={16} /> Redo
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border bg-white text-gray-700 border-gray-200 flex items-center gap-1"
            >
              <IconPrinter size={16} /> Print
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    if (showHistory && historyPanelView === "all") {
                      setShowHistory(false);
                      return;
                    }
                    openHistoryPanel("all");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border flex gap-2 justify-center items-center hover:bg-amber-100 hover:cursor-pointer duration-200 ease-in-out ${
                    showHistory && historyPanelView === "all"
                      ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-400"
                      : "bg-white text-amber-700 border-amber-200"
                  }`}
                >
                  <IconHistory size={16} />
                  History ({history.length})
                </button>
                {mode === "aip" && (
                  <button
                    onClick={() => {
                      if (showHistory && historyPanelView === "lead") {
                        setShowHistory(false);
                        return;
                      }
                      openHistoryPanel("lead");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border flex gap-2 justify-center items-center hover:bg-sky-100 hover:cursor-pointer duration-200 ease-in-out ${
                      showHistory && historyPanelView === "lead"
                        ? "bg-sky-600 text-white border-sky-600 hover:bg-sky-500"
                        : "bg-white text-sky-700 border-sky-200"
                    }`}
                  >
                    <IconHistory size={16} />
                    Lead Edit History ({leadChangeLog.length})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="px-4 py-2 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {errorMsg}
          </div>
        )}

        {isAdmin && (
          <div
            ref={historyPanelRef}
            className={`bg-white border fixed ${showHistory ? "right-0" : "-right-100"} duration-200 ease-in-out top-25 border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full z-1`}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">{activeHistoryTitle}</h2>
              <span className="text-xs text-gray-500">
                {activeHistoryFeed.length} changes
              </span>
            </div>
            <div className="max-h-full overflow-y-auto divide-y divide-gray-100">
              {activeHistoryFeed.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-400">No history yet.</div>
              ) : (
                activeHistoryFeed.map((entry) => (
                  <div key={entry.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-800">
                        {entry.entity_name === "aip_rows" ? "AIP" : "Monitoring"} ·{" "}
                        {entry.action_type.toUpperCase()}
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
                    <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
                      {entry.entity_name === "aip_rows" && (
                        <button
                          onClick={() => jumpToAipChange(entry)}
                          className="text-sky-700 hover:underline"
                        >
                          Jump To Row
                        </button>
                      )}
                      {entry.action_type === "edit" ||
                      entry.action_type === "add" ||
                      entry.action_type === "delete" ? (
                      <button
                        onClick={() => {
                          void restoreHistory(entry);
                        }}
                        disabled={busy}
                        className="text-amber-700 hover:underline disabled:opacity-50"
                      >
                        Restore
                      </button>
                    ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {mode === "aip" ? (
          <>
            {(isLead || isAdmin) && (
              <div className="p-4 rounded-xl border border-gray-200 bg-white">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800">
                      {isLead ? "Upload AIP .xlsx" : "Lead Uploaded AIP Files"}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {isLead
                        ? "Uploaded rows are editable live, and every lead edit is logged."
                        : "Review files submitted by leads and their row totals."}
                    </p>
                  </div>
                  {isLead && (
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold cursor-pointer hover:bg-sky-500">
                      {uploadingFile ? "Uploading..." : "Upload File"}
                      <input
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => {
                          void handleLeadAipUpload(e);
                        }}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Uploaded files</p>
                  {leadFiles.length === 0 ? (
                    <p className="text-xs text-gray-400">No uploads yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {leadFiles.map((file) => (
                        <div
                          key={file.id}
                          className="px-2 py-1.5 text-xs rounded border border-gray-100 bg-gray-50 flex items-center justify-between"
                        >
                          <span className="font-medium text-gray-700">
                            {file.file_name}
                            {isAdmin ? ` (Lead #${file.lead_id})` : ""}
                          </span>
                          <span className="text-gray-500">
                            {file.row_count} rows · {new Date(file.uploaded_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={aipSearch}
                onChange={(e) => setAipSearch(e.target.value)}
                placeholder="Search code, description, department..."
                className="flex-1 min-w-64 px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              />
              <select
                value={aipYear}
                onChange={(e) => setAipYear(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              >
                {aipYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year === "All" ? "All Years" : year}
                  </option>
                ))}
              </select>
              <span className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold">
                Comments: {comments.length}
              </span>
              <button
                onClick={exportAip}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
              >
                Export XLSX
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    void addAipRow();
                  }}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  + Add AIP Row
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    void deleteAipSelection();
                  }}
                  disabled={busy || aipSelectedRows.size === 0}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Delete ({aipSelectedRows.size})
                </button>
              )}
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
              sectorFilter={aipSector}
              departmentFilter={aipDepartment}
              sectorOptions={allSectors}
              departmentOptions={allDepartments}
              onSectorFilterChange={setAipSector}
              onDepartmentFilterChange={setAipDepartment}
              cellStatuses={leadCellStatuses}
              commentCountsByCell={commentCountsByCell}
              commentCountsByRow={commentCountsByRow}
              onOpenComments={(rowId, field) => openComments(rowId, field)}
              focusedRowId={focusedAipRowId}
            />
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={monitoringSearch}
                onChange={(e) => setMonitoringSearch(e.target.value)}
                placeholder="Search project, agency, findings, issues..."
                className="flex-1 min-w-64 px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              />
              <select
                value={monitoringYear}
                onChange={(e) => setMonitoringYear(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              >
                {monitoringYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year === "All" ? "All Years" : year}
                  </option>
                ))}
              </select>
              <span className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold">
                Comments: {comments.length}
              </span>
              <button
                onClick={exportMonitoringCsv}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  void addMonitoringRow();
                }}
                disabled={busy}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-emerald-500 duration-200 ease-in-out cursor-pointer"
              >
                + Add Monitoring Row
              </button>
              <button
                onClick={() => {
                  void deleteMonitoringSelection();
                }}
                disabled={busy || monitoringSelectedRows.size === 0}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-500 duration-200 ease-in-out cursor-pointer"
              >
                <IconTrash size={16} /> Delete ({monitoringSelectedRows.size})
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
              commentCountsByCell={commentCountsByCell}
              commentCountsByRow={commentCountsByRow}
              onOpenComments={(rowId, field) => openComments(rowId, field)}
            />
          </>
        )}
      </div>

      {commentTarget && (
        <div
          className="fixed inset-0 bg-black/30 z-30 flex items-center justify-center p-4"
          onClick={closeComments}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Comments</h3>
                <p className="text-xs text-gray-500">
                  Row {commentTarget.rowId} · {commentTarget.field}
                </p>
              </div>
              <button
                onClick={closeComments}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 uppercase">Target</label>
                <select
                  value={commentTarget.field}
                  onChange={(e) =>
                    setCommentTarget((prev) =>
                      prev ? { ...prev, field: e.target.value } : prev,
                    )
                  }
                  className="px-2 py-1 text-sm rounded border border-gray-300"
                >
                  {commentFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-64 overflow-auto border border-gray-100 rounded-xl">
                {commentThread.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400">No comments for this target yet.</p>
                ) : (
                  commentThread.map((comment) => (
                    <div key={comment.id} className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-start gap-2">
                        {comment.created_by_avatar ? (
                          <img
                            src={comment.created_by_avatar}
                            alt={comment.created_by_name}
                            className="w-7 h-7 rounded-full object-cover"
                            title={`${comment.created_by_name} (${comment.created_by_role})`}
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center"
                            title={`${comment.created_by_name} (${comment.created_by_role})`}
                          >
                            {makeInitials(comment.created_by_name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            {comment.created_by_name} ({comment.created_by_role}) ·{" "}
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {comment.comment_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {isAdmin ? (
                <>
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    rows={3}
                    placeholder="Add a comment..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        void submitComment();
                      }}
                      disabled={commentSubmitting || !commentDraft.trim()}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {commentSubmitting ? "Saving..." : "Add Comment"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500">
                  Comments are admin-only. You can view existing comments here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          nav,
          button,
          input,
          select,
          textarea {
            visibility: hidden !important;
          }

          table,
          table * {
            visibility: visible !important;
          }

          body {
            background: #ffffff !important;
          }
        }
      `}</style>
    </div>
  );
}
