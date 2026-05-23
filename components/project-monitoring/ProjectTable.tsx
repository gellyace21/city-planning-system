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
  addLeadFileCommentAction,
  createAipRowAction,
  createMonitoringRowAction,
  deleteAipRowsAction,
  deleteLeadUploadedFileAction,
  deleteMonitoringRowsAction,
  fetchCommentsAction,
  fetchLeadFileCommentsAction,
  fetchLeadUploadedFilesAction,
  fetchProjectMonitoringDataAction,
  restoreHistoryEntryAction,
  submitLeadUploadAction,
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
  FileCommentEntry,
  LeadFileSummary,
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
  IconUsers,
} from "@tabler/icons-react";
import { downloadAIP, parseAIPExcel } from "@/lib/aipExport";
import { downloadMonitoring } from "@/lib/monitoringExportRevamp";
import { useSession } from "next-auth/react";

type ActiveDataset = "aip" | "monitoring";
type StatusTab = "all" | "submitted" | "draft";

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
  initialUploadId?: number | null;
}

const toYear = (value: string): number | null => {
  const parsed = Number(value.slice(0, 4));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const DATE_INPUT_RE =
  /^(\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})$/;

const isValidDateInput = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return DATE_INPUT_RE.test(trimmed);
};

const normalizeCode = (value: string): string => value.trim().toLowerCase();

function isCommentRow(c: CommentEntry | FileCommentEntry): c is CommentEntry {
  return (
    c &&
    typeof c === "object" &&
    "entity_name" in c &&
    "row_id" in c &&
    "column_name" in c
  );
}

const getAipClientIssues = (
  row: AIPRow,
  allRows: AIPRow[],
  submittedUploadIds: Set<number>,
): string[] => {
  if (row.upload_id && submittedUploadIds.has(row.upload_id)) {
    return [];
  }

  const issues: string[] = [];
  const requiredFields: (keyof AIPRow)[] = [
    "aipCode",
    "description",
    "department",
    "startDate",
    "endDate",
    "outputs",
    "funding",
  ];

  for (const field of requiredFields) {
    if (!String(row[field] ?? "").trim()) {
      issues.push(`${String(field)} is required`);
    }
  }

  if (row.startDate && !isValidDateInput(row.startDate)) {
    issues.push("invalid start date format");
  }
  if (row.endDate && !isValidDateInput(row.endDate)) {
    issues.push("invalid end date format");
  }

  const duplicateCode =
    normalizeCode(row.aipCode).length > 0 &&
    allRows.some(
      (item) =>
        item.id !== row.id &&
        normalizeCode(item.aipCode) === normalizeCode(row.aipCode),
    );
  if (duplicateCode) {
    issues.push("duplicate AIP code");
  }

  for (const numeric of [
    row.ps,
    row.mooe,
    row.fe,
    row.co,
    row.total,
    row.ccAdaptation,
    row.ccMitigation,
  ]) {
    if (!Number.isFinite(numeric) || numeric < 0) {
      issues.push("budget values must be non-negative numbers");
      break;
    }
  }

  return issues;
};

const getMonitoringClientIssues = (row: MonitoringRow): string[] => {
  const issues: string[] = [];
  for (const field of [
    "project_name",
    "agency",
    "location",
    "funding",
    "certified_date",
  ] as const) {
    if (!String(row[field] ?? "").trim()) {
      issues.push(`${field} is required`);
    }
  }

  if (row.certified_date && !isValidDateInput(row.certified_date)) {
    issues.push("invalid certified date format");
  }

  for (const numeric of [
    row.approved_budget,
    row.certified_amount,
    row.obligation,
    row.actual_cost,
  ]) {
    if (!Number.isFinite(numeric) || numeric < 0) {
      issues.push("budget values must be non-negative numbers");
      break;
    }
  }

  if (
    !Number.isFinite(row.status_percent) ||
    row.status_percent < 0 ||
    row.status_percent > 100
  ) {
    issues.push("status % must be between 0 and 100");
  }

  return issues;
};

const makeInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export default function ProjectTable({
  mode,
  initialAipRows,
  initialMonitoringRows,
  initialHistory,
  initialUploadId,
}: ProjectTableProps): React.JSX.Element {
  const { data: session } = useSession();
  const actorRole = session?.user?.role;
  const isLead = actorRole === "lead";
  const isAdmin = actorRole === "admin";
  const isSuperadmin = actorRole === "superadmin";

  const [busy, setBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [infoMsg, setInfoMsg] = useState<string>("");
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showLeadHistory, setShowLeadHistory] = useState<boolean>(false);
  const [compareEntry, setCompareEntry] = useState<EditHistoryEntry | null>(
    null,
  );
  const [history, setHistory] = useState<EditHistoryEntry[]>(initialHistory);
  const [leadFiles, setLeadFiles] = useState<LeadFileSummary[]>([]);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [selectedUploadId, setSelectedUploadId] = useState<number | "all">(
    typeof initialUploadId === "number" && Number.isFinite(initialUploadId)
      ? initialUploadId
      : "all",
  );

  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [fileComments, setFileComments] = useState<FileCommentEntry[]>([]);
  const [fileCommentTarget, setFileCommentTarget] =
    useState<LeadFileSummary | null>(null);
  const [fileCommentDraft, setFileCommentDraft] = useState<string>("");
  const [fileCommentSubmitting, setFileCommentSubmitting] =
    useState<boolean>(false);
  const [commentTarget, setCommentTarget] = useState<{
    rowId: number;
    field: string;
  } | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [selectedCommentKey, setSelectedCommentKey] = useState<string | null>(
    null,
  );
  const [commentSidebarMode, setCommentSidebarMode] = useState<
    "row" | "file" | "all" | null
  >(null);

  const [undoStack, setUndoStack] = useState<ChangeOperation[]>([]);
  const [redoStack, setRedoStack] = useState<ChangeOperation[]>([]);
  const historyPanelRef = useRef<HTMLDivElement | null>(null);
  const commentItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [aipRows, setAipRows] = useState<AIPRow[]>(initialAipRows);
  const [aipStatusTab, setAipStatusTab] = useState<StatusTab>("all");
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
  const [monitoringStatusTab, setMonitoringStatusTab] =
    useState<StatusTab>("all");
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
  const autosaveKey = useMemo(
    () =>
      `project-table-autosave:${mode}:${session?.user?.id ?? "anonymous"}:${session?.user?.role ?? "unknown"}`,
    [mode, session?.user?.id, session?.user?.role],
  );

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
    ].sort((a, b) =>
      a === "All" ? -1 : b === "All" ? 1 : Number(a) - Number(b),
    );
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
    ].sort((a, b) =>
      a === "All" ? -1 : b === "All" ? 1 : Number(a) - Number(b),
    );
  }, [monitoringRows]);

  const selectedUpload = useMemo(() => {
    if (selectedUploadId === "all") return null;
    return leadFiles.find((file) => file.id === selectedUploadId) || null;
  }, [leadFiles, selectedUploadId]);

  const submittedUploadIds = useMemo(() => {
    return new Set(
      leadFiles
        .filter((file) => file.is_submitted || file.submitted_at)
        .map((file) => file.id),
    );
  }, [leadFiles]);

  const aipIssueMap = useMemo(() => {
    return new Map(
      aipRows.map((row) => [
        row.id,
        getAipClientIssues(row, aipRows, submittedUploadIds),
      ]),
    );
  }, [aipRows, submittedUploadIds]);

  const monitoringIssueMap = useMemo(() => {
    return new Map(
      monitoringRows.map((row) => [row.id, getMonitoringClientIssues(row)]),
    );
  }, [monitoringRows]);

  const aipStatusCounts = useMemo(() => {
    let submitted = 0;
    let draft = 0;
    for (const row of visibleAipRows) {
      const issues = aipIssueMap.get(row.id) ?? [];
      if (issues.length === 0) submitted += 1;
      else draft += 1;
    }
    return { submitted, draft };
  }, [visibleAipRows, aipIssueMap]);

  const monitoringStatusCounts = useMemo(() => {
    let submitted = 0;
    let draft = 0;
    for (const row of monitoringRows) {
      const issues = monitoringIssueMap.get(row.id) ?? [];
      if (issues.length === 0) submitted += 1;
      else draft += 1;
    }
    return { submitted, draft };
  }, [monitoringRows, monitoringIssueMap]);

  const isLeadRowLocked = (rowId: number): boolean => {
    if (!isLead) return false;
    const row = aipRows.find((item) => item.id === rowId);
    if (!row?.upload_id) return false;
    const file = leadFiles.find((entry) => entry.id === row.upload_id);
    return Boolean(file?.is_submitted || file?.submitted_at);
  };

  const leadFilesByDepartment = useMemo(() => {
    const grouped: Record<string, Record<number, LeadFileSummary[]>> = {};
    for (const file of leadFiles) {
      const department = file.department || "General";
      if (!grouped[department]) grouped[department] = {};
      if (!grouped[department][file.lead_id]) {
        grouped[department][file.lead_id] = [];
      }
      grouped[department][file.lead_id].push(file);
    }
    return grouped;
  }, [leadFiles]);

  const fileCommentCountsByFileId = useMemo(() => {
    return fileComments.reduce(
      (acc, comment) => {
        acc[comment.file_id] = (acc[comment.file_id] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );
  }, [fileComments]);

  const filteredAip = useMemo(() => {
    return visibleAipRows
      .filter((row) => {
        if (aipStatusTab === "all") return true;
        const issues = aipIssueMap.get(row.id) ?? [];
        return aipStatusTab === "submitted"
          ? issues.length === 0
          : issues.length > 0;
      })
      .filter((row) => aipSector === "All" || row.sector === aipSector)
      .filter((row) =>
        aipDepartment === "All" ? true : row.department === aipDepartment,
      )
      .filter((row) =>
        aipYear === "All" ? true : String(row.year ?? "") === aipYear,
      )
      .filter((row) =>
        selectedUploadId === "all" ? true : row.upload_id === selectedUploadId,
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
    selectedUploadId,
    aipStatusTab,
    aipIssueMap,
  ]);

  const filteredMonitoring = useMemo(() => {
    return monitoringRows
      .filter((row) => {
        if (monitoringStatusTab === "all") return true;
        const issues = monitoringIssueMap.get(row.id) ?? [];
        return monitoringStatusTab === "submitted"
          ? issues.length === 0
          : issues.length > 0;
      })
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
    monitoringStatusTab,
    monitoringIssueMap,
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

  const activeHistoryFeed = useMemo(() => history, [history]);

  const activeHistoryTitle = "Edit History";

  const openHistoryPanel = (): void => {
    setShowHistory(true);
  };

  const scopedComments = useMemo(() => {
    if (mode !== "aip" || selectedUploadId === "all") {
      return comments;
    }
    const rowIds = new Set(
      aipRows
        .filter((row) => row.upload_id === selectedUploadId)
        .map((row) => row.id),
    );
    return comments.filter((comment) => rowIds.has(comment.row_id));
  }, [comments, mode, selectedUploadId, aipRows]);

  const commentCountsByCell = useMemo(() => {
    const mapped: Record<string, number> = {};
    for (const comment of scopedComments) {
      const key = `${comment.row_id}:${comment.column_name}`;
      mapped[key] = (mapped[key] ?? 0) + 1;
    }
    return mapped;
  }, [scopedComments]);

  const commentCountsByRow = useMemo(() => {
    const mapped: Record<string, number> = {};
    for (const comment of scopedComments) {
      const key = String(comment.row_id);
      mapped[key] = (mapped[key] ?? 0) + 1;
    }
    return mapped;
  }, [scopedComments]);

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

  const fileCommentThread = useMemo(() => {
    if (!fileCommentTarget) return [];
    return fileComments
      .filter((comment) => comment.file_id === fileCommentTarget.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [fileComments, fileCommentTarget]);

  const commentSidebarTitle = useMemo(() => {
    if (commentSidebarMode === "all") {
      return "All Comments";
    }
    if (commentTarget) {
      return `Comments - Row ${commentTarget.rowId} · ${commentTarget.field}`;
    }
    if (fileCommentTarget) {
      return `File Comments - ${fileCommentTarget.file_name}`;
    }
    return "Comments";
  }, [commentSidebarMode, commentTarget, fileCommentTarget]);

  const activeCommentList = useMemo(() => {
    if (commentSidebarMode === "all") return scopedComments;
    if (commentSidebarMode === "row") return commentThread;
    if (commentSidebarMode === "file") return fileCommentThread;
    return [];
  }, [commentSidebarMode, scopedComments, commentThread, fileCommentThread]);

  const activeCommentKeyPrefix = commentSidebarMode ?? "none";

  useEffect(() => {
    if (!selectedCommentKey) return;
    const target = commentItemRefs.current[selectedCommentKey];
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [selectedCommentKey]);

  useEffect(() => {
    if (activeCommentList.length === 0) {
      setSelectedCommentKey(null);
      return;
    }

    const hasSelection = selectedCommentKey
      ? activeCommentList.some(
          (comment) =>
            `${activeCommentKeyPrefix}:${comment.id}` === selectedCommentKey,
        )
      : false;

    if (!hasSelection) {
      setSelectedCommentKey(
        `${activeCommentKeyPrefix}:${activeCommentList[0].id}`,
      );
    }
  }, [activeCommentList, activeCommentKeyPrefix, selectedCommentKey]);

  const refreshComments = async (): Promise<void> => {
    try {
      const data = await fetchCommentsAction(entityName);
      setComments(data);
    } catch {
      setComments([]);
    }
  };

  const refreshFileComments = async (): Promise<void> => {
    try {
      const data = await fetchLeadFileCommentsAction();
      setFileComments(data);
    } catch {
      setFileComments([]);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    void (async () => {
      await refreshComments();
    })();
  }, [session?.user?.id, session?.user?.role, entityName]);

  useEffect(() => {
    if (!session?.user) return;
    void (async () => {
      await refreshFileComments();
    })();
  }, [session?.user?.id, session?.user?.role]);

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

  useEffect(() => {
    if (!session?.user) return;
    try {
      const raw = window.localStorage.getItem(autosaveKey);
      if (!raw) return;
      const snapshot = JSON.parse(raw) as {
        aipEditCell?: EditCell;
        aipEditValue?: string;
        monitoringEditCell?: MonitoringEditCell;
        monitoringEditValue?: string;
        aipSearch?: string;
        monitoringSearch?: string;
        aipYear?: string;
        monitoringYear?: string;
        selectedUploadId?: number | "all";
        aipStatusTab?: StatusTab;
        monitoringStatusTab?: StatusTab;
      };

      if (snapshot.aipEditCell) setAipEditCell(snapshot.aipEditCell);
      if (typeof snapshot.aipEditValue === "string") {
        setAipEditValue(snapshot.aipEditValue);
      }
      if (snapshot.monitoringEditCell) {
        setMonitoringEditCell(snapshot.monitoringEditCell);
      }
      if (typeof snapshot.monitoringEditValue === "string") {
        setMonitoringEditValue(snapshot.monitoringEditValue);
      }
      if (typeof snapshot.aipSearch === "string")
        setAipSearch(snapshot.aipSearch);
      if (typeof snapshot.monitoringSearch === "string") {
        setMonitoringSearch(snapshot.monitoringSearch);
      }
      if (typeof snapshot.aipYear === "string") setAipYear(snapshot.aipYear);
      if (typeof snapshot.monitoringYear === "string") {
        setMonitoringYear(snapshot.monitoringYear);
      }
      if (
        snapshot.selectedUploadId === "all" ||
        typeof snapshot.selectedUploadId === "number"
      ) {
        setSelectedUploadId(snapshot.selectedUploadId);
      }
      if (
        snapshot.aipStatusTab === "all" ||
        snapshot.aipStatusTab === "submitted" ||
        snapshot.aipStatusTab === "draft"
      ) {
        setAipStatusTab(snapshot.aipStatusTab);
      }
      if (
        snapshot.monitoringStatusTab === "all" ||
        snapshot.monitoringStatusTab === "submitted" ||
        snapshot.monitoringStatusTab === "draft"
      ) {
        setMonitoringStatusTab(snapshot.monitoringStatusTab);
      }
      setInfoMsg("Recovered your unsaved table workspace from local autosave.");
    } catch {
      // Ignore malformed local autosave payloads.
    }
  }, [autosaveKey, session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    const payload = {
      aipEditCell,
      aipEditValue,
      monitoringEditCell,
      monitoringEditValue,
      aipSearch,
      monitoringSearch,
      aipYear,
      monitoringYear,
      selectedUploadId,
      aipStatusTab,
      monitoringStatusTab,
      savedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(autosaveKey, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors.
    }
  }, [
    autosaveKey,
    session?.user,
    aipEditCell,
    aipEditValue,
    monitoringEditCell,
    monitoringEditValue,
    aipSearch,
    monitoringSearch,
    aipYear,
    monitoringYear,
    selectedUploadId,
    aipStatusTab,
    monitoringStatusTab,
  ]);

  const handleFailure = (error: unknown): void => {
    setInfoMsg("");
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
    setAipRows((prev) =>
      prev.map((item) => (item.id === rowId ? result.row : item)),
    );
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
    if (isLead && isLeadRowLocked(aipEditCell.rowId)) {
      setErrorMsg("This file is submitted and locked.");
      setAipEditCell(null);
      setAipEditValue("");
      return;
    }
    setBusy(true);
    try {
      await applyAipFieldChange(
        aipEditCell.rowId,
        aipEditCell.field,
        aipEditValue,
      );
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
        await applyAipFieldChange(
          op.rowId,
          op.field as keyof AIPRow,
          op.nextValue,
          false,
        );
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
    if (isLead && isLeadRowLocked(rowId)) {
      setErrorMsg("This file is submitted and locked.");
      return;
    }
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

  const createAipRowForEdit = async (): Promise<AIPRow | null> => {
    setBusy(true);
    try {
      const result = await createAipRowAction();
      setAipRows((prev) => [...prev, result.row]);
      pushHistory(result.historyEntry);
      setErrorMsg("");
      return result.row;
    } catch (error) {
      handleFailure(error);
      return null;
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

  const createMonitoringRowForEdit =
    async (): Promise<MonitoringRow | null> => {
      setBusy(true);
      try {
        const result = await createMonitoringRowAction();
        setMonitoringRows((prev) => [...prev, result.row]);
        pushHistory(result.historyEntry);
        setErrorMsg("");
        return result.row;
      } catch (error) {
        handleFailure(error);
        return null;
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
      setCompareEntry(null);
      setErrorMsg("");
      setInfoMsg(
        "History restored. You can compare again before the next restore.",
      );
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
    setCommentSidebarMode("row");
    setCommentTarget({ rowId, field: String(field) });
    setFileCommentTarget(null);
    setCommentDraft("");
    setSelectedCommentKey(null);
  };

  const closeComments = (): void => {
    setCommentSidebarMode(null);
    setCommentTarget(null);
    setCommentDraft("");
    setSelectedCommentKey(null);
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

  const openFileComments = (file: LeadFileSummary): void => {
    setCommentSidebarMode("file");
    setFileCommentTarget(file);
    setCommentTarget(null);
    setFileCommentDraft("");
    setSelectedCommentKey(null);
  };

  const closeFileComments = (): void => {
    setCommentSidebarMode(null);
    setFileCommentTarget(null);
    setFileCommentDraft("");
    setSelectedCommentKey(null);
  };

  const openAllCommentsSidebar = (): void => {
    setCommentSidebarMode("all");
    setCommentTarget(null);
    setFileCommentTarget(null);
    setSelectedCommentKey(null);
  };

  const submitFileComment = async (): Promise<void> => {
    if (!isAdmin) {
      setErrorMsg("Only admins can add file comments.");
      return;
    }
    if (!fileCommentTarget || !fileCommentDraft.trim()) return;
    setFileCommentSubmitting(true);
    try {
      const created = await addLeadFileCommentAction({
        file_id: fileCommentTarget.id,
        comment_text: fileCommentDraft,
      });
      setFileComments((prev) => [created, ...prev]);
      setFileCommentDraft("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setFileCommentSubmitting(false);
    }
  };

  const selectLeadUpload = (file: LeadFileSummary): void => {
    setSelectedUploadId(file.id);
    setAipSearch("");
    setAipSector("All");
    setAipDepartment("All");
    setAipYear("All");
  };

  const clearLeadUploadFilter = (): void => {
    setSelectedUploadId("all");
  };

  const handleSubmitLeadFile = async (fileId: number): Promise<void> => {
    if (
      !window.confirm(
        "Submit this file? After submission, it will be locked and visible to admins.",
      )
    ) {
      return;
    }
    setBusy(true);
    setErrorMsg("");
    try {
      await submitLeadUploadAction(fileId);
      const files = await fetchLeadUploadedFilesAction();
      setLeadFiles(files);
      if (selectedUploadId === fileId) {
        setSelectedUploadId(fileId);
      }
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLeadFile = async (fileId: number): Promise<void> => {
    if (
      !window.confirm(
        "Delete this uploaded file and its rows? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await deleteLeadUploadedFileAction(fileId);
      setAipRows((prev) =>
        prev.filter((row) => !result.removedRowIds.includes(row.id)),
      );
      const files = await fetchLeadUploadedFilesAction();
      setLeadFiles(files);
      await refreshFileComments();
      if (selectedUploadId === fileId) {
        setSelectedUploadId("all");
      }
      setErrorMsg("");
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
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
    downloadAIP(rows, `AIP_${aipYear === "All" ? "all-years" : aipYear}.xlsx`, {
      fallbackToCsv: true,
    });
  };

  const exportMonitoring = (): void => {
    const debugValidate =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debugExport") === "1";
    downloadMonitoring(
      filteredMonitoring,
      `monitoring_${monitoringYear === "All" ? "all-years" : monitoringYear}.xlsx`,
      {
        fallbackToCsv: true,
        debugValidate,
      },
    );
  };

  const getSnapshotText = (entry: EditHistoryEntry): string => {
    if (!entry.row_snapshot) return "";
    try {
      return JSON.stringify(JSON.parse(entry.row_snapshot), null, 2);
    } catch {
      return entry.row_snapshot;
    }
  };

  return (
    <div className="min-h-screen relative py-15">
      <div
        className={`max-w-screen mx-auto px-0 py-0 space-y-4 transition-all duration-200 ease-in-out ${showHistory && showLeadHistory ? "mr-120 w-[68vw]" : showHistory || showLeadHistory || commentSidebarMode ? "mr-74 w-[70vw]" : "mr-0 ml-0 w-[90vw]"}`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-primary">
              {mode === "aip" ? "Annual Investment Plan" : "Project Monitoring"}
            </h1>
            <p className="text-sm text-gray-500">
              Data source: Neon via services
            </p>
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
            {(isAdmin || isSuperadmin) && (
              <>
                <button
                  onClick={() => {
                    setShowLeadHistory(!showLeadHistory);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border flex gap-2 justify-center items-center hover:bg-amber-100 hover:cursor-pointer duration-200 ease-in-out ${
                    showLeadHistory
                      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-400"
                      : "bg-white text-blue-700 border-blue-200"
                  }`}
                >
                  <IconUsers size={16} />
                  Lead History ({leadFiles.length})
                </button>
                <button
                  onClick={() => {
                    if (showLeadHistory) {
                      setShowLeadHistory(false);
                      return;
                    }
                    openHistoryPanel();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border flex gap-2 justify-center items-center hover:bg-amber-100 hover:cursor-pointer duration-200 ease-in-out ${
                    showHistory
                      ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-400"
                      : "bg-white text-amber-700 border-amber-200"
                  }`}
                >
                  <IconHistory size={16} />
                  History ({history.length})
                </button>
              </>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="px-4 py-2 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="px-4 py-2 rounded-lg text-sm text-sky-700 bg-sky-50 border border-sky-200">
            {infoMsg}
          </div>
        )}

        {(isAdmin || isSuperadmin) && (
          <div
            ref={historyPanelRef}
            className={`bg-white border fixed w-96 ${showHistory ? "right-0" : "-right-96"} duration-200 ease-in-out top-25 border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full z-20`}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">
                {activeHistoryTitle}
              </h2>
              <span className="text-xs text-gray-500">
                {activeHistoryFeed.length} changes
              </span>
            </div>
            <div className="max-h-full overflow-y-auto divide-y divide-gray-100">
              {activeHistoryFeed.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-400">
                  No history yet.
                </div>
              ) : (
                activeHistoryFeed.map((entry) => (
                  <div key={entry.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-800">
                        {entry.entity_name === "aip_rows"
                          ? "AIP"
                          : "Monitoring"}{" "}
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
                        {entry.old_value === null
                          ? "—"
                          : String(entry.old_value)}
                      </span>
                      <span className="text-gray-400">to</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {entry.new_value === null
                          ? "—"
                          : String(entry.new_value)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
                      <button
                        onClick={() => setCompareEntry(entry)}
                        className="text-violet-700 hover:underline"
                      >
                        Compare
                      </button>
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
              <div
                className={`lead-upload fixed w-96 bg-white border rounded-2xl shadow-sm overflow-hidden h-full z-10 top-25 border-gray-200 duration-200 ease-in-out ${showLeadHistory ? (showHistory ? "right-98" : "right-0") : "-right-96"}`}
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      {isLead ? "Upload AIP .xlsx" : "Lead Uploaded AIP Files"}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {isLead
                        ? "Upload, edit, then submit to finalize."
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

                <div className="h-[calc(100%-4.5rem)] overflow-y-auto px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Uploaded files
                    </p>
                    {selectedUpload ? (
                      <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-1 rounded-lg flex items-center gap-2 flex-wrap justify-end text-right">
                        Viewing: {selectedUpload.file_name}
                        {selectedUpload.lead_username
                          ? ` · ${selectedUpload.lead_username}`
                          : ""}
                        {selectedUpload.is_submitted ||
                        selectedUpload.submitted_at
                          ? " · Submitted"
                          : " · Draft"}
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-sky-700 underline"
                          onClick={clearLeadUploadFilter}
                        >
                          Clear
                        </button>
                      </span>
                    ) : null}
                  </div>
                  {leadFiles.length === 0 ? (
                    <p className="text-xs text-gray-400">No uploads yet.</p>
                  ) : isAdmin ? (
                    <div className="space-y-3">
                      {Object.entries(leadFilesByDepartment).map(
                        ([department, leads]) => (
                          <div
                            key={department}
                            className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                          >
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <span className="text-xs font-semibold text-gray-700">
                                {department}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {Object.keys(leads).length} lead
                                {Object.keys(leads).length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(leads).map(([leadId, files]) => (
                                <details
                                  key={leadId}
                                  className="rounded-lg border border-gray-100 bg-white"
                                >
                                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-700 flex items-center justify-between">
                                    <span>
                                      {files[0]?.lead_username ||
                                        `Lead #${leadId}`}
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                      {files.length} file
                                      {files.length > 1 ? "s" : ""}
                                    </span>
                                  </summary>
                                  <div className="px-3 pb-2 space-y-2">
                                    {files.map((file) => (
                                      <div
                                        key={file.id}
                                        className={`px-2 py-2 text-xs rounded border flex items-center justify-between gap-2 ${
                                          selectedUploadId === file.id
                                            ? "border-sky-200 bg-sky-50"
                                            : "border-gray-100 bg-gray-50"
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="font-semibold text-gray-700 truncate">
                                            {file.file_name}
                                          </div>
                                          <div className="text-[11px] text-gray-500">
                                            {file.row_count} rows ·{" "}
                                            {new Date(
                                              file.uploaded_at,
                                            ).toLocaleString()}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            type="button"
                                            className="px-2 py-1 rounded bg-white border border-gray-200 text-[11px] font-semibold text-sky-700 hover:bg-sky-50"
                                            onClick={() =>
                                              selectLeadUpload(file)
                                            }
                                          >
                                            View Table
                                          </button>
                                          <button
                                            type="button"
                                            className="px-2 py-1 rounded bg-white border border-gray-200 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                                            onClick={() =>
                                              openFileComments(file)
                                            }
                                          >
                                            Comments
                                            {fileCommentCountsByFileId[file.id]
                                              ? ` (${fileCommentCountsByFileId[file.id]})`
                                              : ""}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leadFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`px-2 py-2 text-xs rounded border flex items-center justify-between gap-2 ${
                            selectedUploadId === file.id
                              ? "border-sky-200 bg-sky-50"
                              : "border-gray-100 bg-gray-50"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-700 truncate">
                              {file.file_name}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {file.row_count} rows ·{" "}
                              {new Date(file.uploaded_at).toLocaleString()} ·{" "}
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  file.is_submitted || file.submitted_at
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                }`}
                              >
                                {file.is_submitted || file.submitted_at
                                  ? "Submitted"
                                  : "Draft"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!(file.is_submitted || file.submitted_at) ? (
                              <button
                                type="button"
                                className="px-2 py-1 rounded bg-white border border-emerald-200 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                onClick={() => {
                                  void handleSubmitLeadFile(file.id);
                                }}
                                disabled={busy}
                              >
                                Submit
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="px-2 py-1 rounded bg-white border border-gray-200 text-[11px] font-semibold text-sky-700 hover:bg-sky-50"
                              onClick={() => selectLeadUpload(file)}
                            >
                              View Table
                            </button>
                            <button
                              type="button"
                              className="px-2 py-1 rounded bg-white border border-gray-200 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                              onClick={() => openFileComments(file)}
                            >
                              Comments
                              {fileCommentCountsByFileId[file.id]
                                ? ` (${fileCommentCountsByFileId[file.id]})`
                                : ""}
                            </button>
                            <button
                              type="button"
                              className="px-2 py-1 rounded bg-white border border-red-200 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              onClick={() => {
                                void handleDeleteLeadFile(file.id);
                              }}
                              disabled={
                                busy ||
                                Boolean(file.is_submitted || file.submitted_at)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
                {(
                  [
                    ["all", `All (${visibleAipRows.length})`],
                    ["submitted", `Submitted (${aipStatusCounts.submitted})`],
                    ["draft", `Draft (${aipStatusCounts.draft})`],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setAipStatusTab(tab)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      aipStatusTab === tab
                        ? "bg-sky-600 text-white"
                        : "text-gray-700 hover:bg-sky-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
              <button
                type="button"
                onClick={openAllCommentsSidebar}
                className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                Comments: {scopedComments.length}
              </button>
              {selectedUpload ? (
                <span className="px-3 py-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold flex items-center gap-2">
                  {selectedUpload.file_name}
                  <button
                    type="button"
                    onClick={clearLeadUploadFilter}
                    className="text-[10px] underline"
                  >
                    Clear
                  </button>
                </span>
              ) : null}
              <button
                onClick={exportAip}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
              >
                Export XLSX
              </button>
              {(isAdmin || isSuperadmin) && (
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
              onCreateRow={createAipRowForEdit}
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
              cellStatuses={isAdmin || isSuperadmin ? {} : leadCellStatuses}
              commentCountsByCell={commentCountsByCell}
              commentCountsByRow={commentCountsByRow}
              onOpenComments={(rowId, field) => openComments(rowId, field)}
              focusedRowId={focusedAipRowId}
            />
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
                {(
                  [
                    ["all", `All (${monitoringRows.length})`],
                    [
                      "submitted",
                      `Submitted (${monitoringStatusCounts.submitted})`,
                    ],
                    ["draft", `Draft (${monitoringStatusCounts.draft})`],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMonitoringStatusTab(tab)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      monitoringStatusTab === tab
                        ? "bg-emerald-600 text-white"
                        : "text-gray-700 hover:bg-emerald-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
              <button
                type="button"
                onClick={openAllCommentsSidebar}
                className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                Comments: {scopedComments.length}
              </button>
              <button
                onClick={exportMonitoring}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
              >
                Export XLSX
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
              onCreateRow={createMonitoringRowForEdit}
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

      {compareEntry && (
        <div
          className="fixed inset-0 bg-black/30 z-30 flex items-center justify-center p-4"
          onClick={() => setCompareEntry(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Compare Version Before Restore
                </h3>
                <p className="text-xs text-gray-500">
                  {compareEntry.entity_name === "aip_rows"
                    ? "AIP"
                    : "Monitoring"}{" "}
                  row {compareEntry.row_id} · field {compareEntry.column_name}
                </p>
              </div>
              <button
                onClick={() => setCompareEntry(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold uppercase text-red-700">
                    Old Value
                  </p>
                  <p className="text-sm text-red-900 whitespace-pre-wrap wrap-break-word mt-1">
                    {compareEntry.old_value === null
                      ? "(empty)"
                      : String(compareEntry.old_value)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase text-emerald-700">
                    New Value
                  </p>
                  <p className="text-sm text-emerald-900 whitespace-pre-wrap wrap-break-word mt-1">
                    {compareEntry.new_value === null
                      ? "(empty)"
                      : String(compareEntry.new_value)}
                  </p>
                </div>
              </div>

              {compareEntry.row_snapshot ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-700 mb-2">
                    Saved Row Snapshot
                  </p>
                  <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap wrap-break-word">
                    {getSnapshotText(compareEntry)}
                  </pre>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompareEntry(null)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void restoreHistory(compareEntry);
                  }}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white disabled:opacity-50"
                >
                  {busy ? "Restoring..." : "Restore This Version"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <aside
        className={`fixed right-4 top-24 bottom-4 z-30 flex w-96 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl transform transition-all duration-200 ease-in-out ${
          commentSidebarMode
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {commentSidebarTitle}
            </h3>
            <p className="text-xs text-gray-500">Click a comment to focus it</p>
          </div>
          <button
            onClick={() => {
              if (commentSidebarMode === "row") {
                closeComments();
              } else if (commentSidebarMode === "file") {
                closeFileComments();
              } else {
                setCommentSidebarMode(null);
              }
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        {commentSidebarMode === "row" && commentTarget && (
          <div className="border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase text-gray-600">
                Target
              </label>
              <select
                value={commentTarget.field}
                onChange={(e) =>
                  setCommentTarget((prev) =>
                    prev ? { ...prev, field: e.target.value } : prev,
                  )
                }
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                {commentFields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {activeCommentList.length === 0 ? (
            <p className="px-3 py-6 text-sm text-gray-400">No comments yet.</p>
          ) : (
            activeCommentList.map((comment) => {
              const commentKey = `${activeCommentKeyPrefix}:${comment.id}`;
              const isSelected = selectedCommentKey === commentKey;
              const isRowComment = isCommentRow(comment);
              let commentScopeLabel = "";
              if (commentSidebarMode === "row") {
                if (isRowComment) {
                  const { entity_name, row_id, column_name } =
                    comment as CommentEntry;
                  commentScopeLabel = `${entity_name === "aip_rows" ? "AIP" : "Monitoring"} · Row ${row_id} · ${column_name}`;
                } else {
                  commentScopeLabel = "Row comment";
                }
              } else if (commentSidebarMode === "file") {
                commentScopeLabel = `File · ${fileCommentTarget?.file_name ?? "Unknown file"}`;
              } else {
                if (isRowComment) {
                  const { entity_name, row_id, column_name } =
                    comment as CommentEntry;
                  commentScopeLabel = `${entity_name === "aip_rows" ? "AIP" : "Monitoring"} · Row ${row_id} · ${column_name}`;
                } else {
                  commentScopeLabel = "Row comment";
                }
              }

              return (
                <div
                  key={comment.id}
                  ref={(node) => {
                    commentItemRefs.current[commentKey] = node;
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedCommentKey(commentKey);
                    if (isRowComment) {
                      const rowId = (comment as CommentEntry).row_id;
                      setFocusedAipRowId(rowId);
                      window.setTimeout(() => {
                        const target = document.getElementById(
                          `aip-row-${rowId}`,
                        );
                        if (target)
                          target.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }, 50);
                      window.setTimeout(() => setFocusedAipRowId(null), 900);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedCommentKey(commentKey);
                    }
                  }}
                  className={`px-4 py-3 text-sm border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? "bg-sky-50 ring-1 ring-sky-200" : "hover:bg-gray-50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800">
                      {(() => {
                        if (commentSidebarMode === "row") {
                          if (isRowComment) {
                            const { entity_name } = comment as CommentEntry;
                            return entity_name === "aip_rows"
                              ? "AIP"
                              : "Monitoring";
                          }
                          return "Row";
                        }
                        if (commentSidebarMode === "file")
                          return "File Comment";
                        if (isRowComment) {
                          const { entity_name } = comment as CommentEntry;
                          return entity_name === "aip_rows"
                            ? "AIP"
                            : "Monitoring";
                        }
                        return "Row";
                      })()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {commentScopeLabel}
                  </div>
                  <div className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">
                    {comment.comment_text}
                  </div>
                  {commentSidebarMode === "all" ? (
                    <div className="mt-2 inline-flex rounded bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 border border-gray-200">
                      {comment.created_by_name} ({comment.created_by_role})
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-gray-500">
                      {comment.created_by_name} ({comment.created_by_role})
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4">
          {commentSidebarMode === "row" && commentTarget ? (
            isAdmin ? (
              <>
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={3}
                  placeholder="Add a comment..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      void submitComment();
                    }}
                    disabled={commentSubmitting || !commentDraft.trim()}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {commentSubmitting ? "Saving..." : "Add Comment"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Comments are admin-only. You can view existing comments here.
              </p>
            )
          ) : commentSidebarMode === "file" ? (
            isAdmin ? (
              <>
                <textarea
                  value={fileCommentDraft}
                  onChange={(e) => setFileCommentDraft(e.target.value)}
                  rows={3}
                  placeholder="Add a file comment..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      void submitFileComment();
                    }}
                    disabled={fileCommentSubmitting || !fileCommentDraft.trim()}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {fileCommentSubmitting ? "Saving..." : "Add Comment"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                File comments are admin-only. You can view existing comments
                here.
              </p>
            )
          ) : (
            <p className="text-xs text-gray-500">
              Browse the comment list above. Click a comment to keep it in view.
            </p>
          )}
        </div>
      </aside>

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
