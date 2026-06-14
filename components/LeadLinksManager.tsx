"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
// import { departmentOptions, getDepartmentTheme } from "@/lib/leadDepartments";
import {
  IconCopy,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconEye,
  IconEyeMinus,
  IconEyeOff,
} from "@tabler/icons-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";

type GeneratedLink = {
  id: number;
  lead_id: number;
  lead_username: string;
  lead_profile_pic?: string;
  token: string;
  created_at: string;
  last_accessed_at?: string;
  lead_department?: string;
  url: string;
};

type LeadUploadedFile = {
  id: number;
  lead_id: number;
  file_name: string;
  uploaded_at: string;
  submitted_at?: string | null;
  row_count: number;
  lead_username?: string;
  lead_department?: string;
};

export type LeadDepartmentTheme = {
  id: number;
  key: string;
  label: string;
  color: {
    bg: string;
    text: string;
    border: string;
    accent: string;
  };
};

const GENERAL_THEME: DepartmentTheme = {
  id: 0,
  label: "General",
  color: {
    bg: "#f1f5f9",
    text: "#475569",
    border: "#e2e8f0",
    accent: "#64748b",
  },
};

export default function LeadLinksManager({
  compact,
}: {
  compact?: boolean;
}): React.JSX.Element | null {
  const { data: session, status } = useSession();
  const isAdminView = ["admin", "superadmin"].includes(
    session?.user?.role || "",
  );

  const [linkValue, setLinkValue] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("General");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [leadUploads, setLeadUploads] = useState<
    Record<number, LeadUploadedFile[]>
  >({});
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [generatingLeadId, setGeneratingLeadId] = useState<number | null>(null);
  const [linkMessage, setLinkMessage] = useState("");
  const [linkError, setLinkError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<GeneratedLink | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  // Department Database Fetch
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<LeadDepartmentTheme[]>([]);

  // TODO: Add a fetch for lead_departments
  const fetchLeadDepartments = async () => {
    try {
      // Basic fetch block
      const res = await fetch("/api/lead-links/departments", {
        method: "GET", // Uses the get in the route.ts
        credentials: "same-origin", // ? Clarify same-origin
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load departments");

      const rows = (Array.isArray(data) ? data : []) as LeadDepartmentTheme[];
      setDepartments(rows);
      setDepartmentOptions([
        "General",
        ...rows.map((d) => d.label).filter((d) => d && d !== "General"),
      ]);
    } catch (err) {
      setDepartments([]);
      setDepartmentOptions(["General"]);
      toast.error("Failed to load departments.");
    }
  };

  const getDepartmentTheme = (department?: string): LeadDepartmentTheme => {
    const value = String(department || "")
      .trim()
      .toLowerCase();
    const match = departments.find(
      (d) => d.label.trim().toLowerCase() === value,
    );
    return match || GENERAL_THEME;
  };

  const groupedLinks = useMemo(() => {
    return generatedLinks.reduce(
      (acc, link) => {
        const dept = link.lead_department || "General";
        if (!acc[dept]) {
          acc[dept] = [];
        }
        acc[dept].push(link);
        return acc;
      },
      {} as Record<string, GeneratedLink[]>,
    );
  }, [generatedLinks]);

  // END OF DEPARTMENT LIST FETCH

  const groupedDepartments = useMemo(() => {
    const available: string[] = Object.keys(groupedLinks);
    const ordered = departmentOptions.filter((dept: string) =>
      available.includes(dept),
    );
    const extras = available.filter(
      (dept: string) => !departmentOptions.includes(dept),
    );
    return [...ordered, ...extras];
  }, [groupedLinks]);

  const departmentFilterOptions = useMemo(
    () => ["All", ...groupedDepartments],
    [groupedDepartments],
  );

  const filteredDepartments = useMemo(() => {
    if (departmentFilter === "All") return groupedDepartments;
    return groupedDepartments.filter((dept) => dept === departmentFilter);
  }, [departmentFilter, groupedDepartments]);

  const filteredLinks = useMemo(() => {
    return generatedLinks.filter((link) => {
      const dept = link.lead_department || "General";
      return departmentFilter === "All" || dept === departmentFilter;
    });
  }, [generatedLinks, departmentFilter]);

  const canGenerate = isAdminView && !linkLoading;

  const fetchLinks = async () => {
    if (!isAdminView) return;

    try {
      setIsLoadingLinks(true);
      const response = await fetch("/api/lead-links", {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Your session expired. Please sign in again."
            : data?.error || "Failed to load lead links",
        );
      }
      // Merge any leads that don't yet have a generated link so admins can see them
      const apiLinks: GeneratedLink[] = data.links || [];
      const apiLeads: Array<{
        id: number;
        username?: string | null;
        department?: string | null;
      }> = data.leads || [];

      const existingLeadIds = new Set(
        apiLinks.map((l: GeneratedLink) => Number(l.lead_id)),
      );
      const placeholderLinks: GeneratedLink[] = apiLeads
        .filter((lead) => !existingLeadIds.has(Number(lead.id)))
        .map((lead) => ({
          id: 0,
          lead_id: Number(lead.id),
          lead_username: lead.username || `Lead ${lead.id}`,
          lead_profile_pic: undefined,
          token: "",
          created_at: "",
          last_accessed_at: undefined,
          lead_department: lead.department || "General",
          url: "",
        }));

      setGeneratedLinks([...apiLinks, ...placeholderLinks]);
      const grouped = ((data.leadFiles || []) as LeadUploadedFile[]).reduce(
        (acc, file) => {
          if (!acc[file.lead_id]) {
            acc[file.lead_id] = [];
          }
          acc[file.lead_id].push(file);
          return acc;
        },
        {} as Record<number, LeadUploadedFile[]>,
      );
      setLeadUploads(grouped);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load lead links",
      );
    } finally {
      setIsLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && isAdminView) {
      fetchLinks();
    }
  }, [isAdminView, status]);

  useEffect(() => {
    if (
      departmentFilter !== "All" &&
      !groupedDepartments.includes(departmentFilter)
    ) {
      setDepartmentFilter("All");
    }
  }, [departmentFilter, groupedDepartments]);

  const handleGenerateLink = async () => {
    setLinkLoading(true);
    setLinkError("");
    setLinkMessage("");

    try {
      const response = await fetch("/api/lead-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ department: selectedDepartment }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate lead link");
      }

      setLinkValue(data.link?.url || "");
      toast.success(
        data.link?.reused
          ? "Existing link reused for this lead."
          : "New secure link generated.",
      );
      await fetchLinks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate link",
      );
    } finally {
      setLinkLoading(false);
    }
  };

  const handleGenerateForLead = async (leadId: number) => {
    setGeneratingLeadId(leadId);
    setLinkError("");
    setLinkMessage("");

    try {
      const response = await fetch("/api/lead-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ leadId, department: selectedDepartment }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate lead link");
      }

      setLinkValue(data.link?.url || "");
      toast.success(
        data.link?.reused
          ? "Existing link reused for this lead."
          : "New secure link generated.",
      );
      await fetchLinks();
    } catch (error) {
      setLinkError(
        error instanceof Error ? error.message : "Failed to generate link",
      );
    } finally {
      setGeneratingLeadId(null);
    }
  };

  const handleCopyLink = async (value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Link copied to clipboard.");
    } catch {
      setLinkError("Failed to copy link.");
    }
  };

  const handleDeleteLead = async (entry: GeneratedLink): Promise<void> => {
    setDeleteLoading(true);
    setLinkError("");
    try {
      const response = await fetch(`/api/lead-links?leadId=${entry.lead_id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete lead.");
      }
      setPendingDelete(null);
      await fetchLinks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete lead.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRefresh = () => {
    setLinkValue("");
    setLinkMessage("");
    setLinkError("");
  };

  // Avoid flicker/noise before session is resolved and hide this widget for non-admin roles.
  if (status !== "authenticated" || !isAdminView) {
    return null;
  }

  return (
    <section
      className={`link-section ${compact ? "compact" : ""}`}
      aria-label="Implementation link generator"
    >
      <style jsx>{`
        .link-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          // width: min(860px, 100%);
          width: auto;
          background: var(--background-plain);
        }

        .link-section.compact {
          gap: 6px;
        }

        .link-section.compact .link-label {
          padding: 6px 10px;
          font-size: 11px;
        }

        .link-section.compact .link-input {
          padding: 6px 8px;
          font-size: 12px;
        }

        .link-section.compact .generate-btn {
          height: 32px;
          padding: 0 10px;
          font-size: 11px;
        }

        .lead-row {
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          justify-content: center;
        }

        .link-row {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          justify-content: center;
        }

        .lead-input {
          height: 36px;
          border: 1.5px solid var(--background-plain);
          border-radius: 8px;
          padding: 0 12px;
          outline: none;
          width: 20%;
          min-width: 180px;
          color: #2c4a3a;
          background: #ffffff;
        }

        .custom-input {
          min-width: 200px;
        }

        .lead-input:focus {
          border-color: #4a9e7f;
          box-shadow: 0 0 0 3px rgba(74, 158, 127, 0.12);
        }

        .generate-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 36px;
          border: none;
          border-radius: 8px;
          padding: 0 14px;
          // background: linear-gradient(90deg, #3d8f6e 0%, #55b38a 100%);
          background: var(--primary);
          color: #ffffff;
          font-size: 12px;
          // font-weight: 700;
          font-weight: bold;
          letter-spacing: 0.4px;
          cursor: pointer;
          transition: 0.2s;
        }

        .generate-btn:hover {
          filter: brightness(0.9);
        }

        .generate-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-content,
        .status-content {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .spin {
          animation: spin 0.9s linear infinite;
        }

        .link-combined {
          display: flex;
          align-items: center;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 3px 10px rgba(141, 191, 132, 0.35);
          width: 100%;
        }

        .link-label {
          // background: linear-gradient(90deg, #a8c8a0 0%, #8dbf84 100%);
          background: var(--primary);
          color: #ffffff;
          padding: 8px 18px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          white-space: nowrap;
          user-select: none;
        }

        .link-input {
          padding: 8px 10px;
          border: none;
          border-top: 1.5px solid #a8dfc5;
          border-right: 1.5px solid #a8dfc5;
          border-bottom: 1.5px solid #a8dfc5;
          font-size: 12px;
          color: #2c4a3a;
          background: #ffffff;
          outline: none;
          min-width: 100%;
          transition: border-color 0.2s;
        }

        .link-input:focus {
          border-color: #4a9e7f;
        }

        .refresh-btn {
          background: transparent;
          color: #4a9e7f;
          border: none;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.4s ease;
          padding: 0;
        }

        .refresh-btn:hover {
          transform: rotate(180deg);
        }

        .copy-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          border-radius: 6px;
          background: #e8f4ef;
          color: #1f5e54;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 10px;
          cursor: pointer;
        }

        .link-status {
          font-size: 12px;
          margin-top: 2px;
        }

        .link-status.ok {
          color: #1c7355;
        }

        .link-status.error {
          color: #b53b3b;
        }

        .link-hint {
          font-size: 11.5px;
          color: #7aa898;
          letter-spacing: 0.3px;
        }

        .department-picker {
          width: max-content
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          justify-content: start;
          gap: 10px;
          flex-wrap: wrap;
          padding: 6px 10px 2px;
          margin-bottom: -1.2rem;
        }

        .department-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #4a7060;
        }

        .department-select {
          min-width: 180px;
          height: 34px;
          border: 1px solid #c9e5d8;
          border-radius: 8px;
          padding: 0 10px;
          background: #ffffff;
          color: #2c4a3a;
          font-size: 12px;
        }

        .generated-list {
          width: 100%;
          // background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--background-plain);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .generated-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .generated-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding: 8px;
          border: 1px solid var(--background);
          border-radius: 10px;
          background: var(--background-plain);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          // color: #3b5c50;
        }

        .filter-label {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          font-size: 10px;
        }

        .filter-select {
          height: 32px;
          border: 1px solid #c9e5d8;
          border-radius: 6px;
          padding: 0 8px;
          font-size: 11px;
          background: #ffffff;
          color: #2c4a3a;
        }

        .view-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .view-toggle-btn {
          border: 1px solid #c9e5d8;
          border-radius: 6px;
          background: #ffffff;
          color: #2f6f59;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 10px;
          cursor: pointer;
        }

        .view-toggle-btn.active {
          background: #2f6f59;
          border-color: #2f6f59;
          color: #ffffff;
        }

        .generated-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
          padding: 8px;
        }

        .generated-card {
          border: 1px solid var(--background);
          border-radius: 10px;
          padding: 10px;
          background: var(--background-plain);
          display: flex;
          flex-direction: column;
          text: var(--foreground);
          gap: 8px;
        }

        .generated-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          color: var(--foreground);
        }

        .generated-card-meta {
          font-size: 11px;
          color: #426457;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .delete-btn {
          border: 1px solid #f4c7c7;
          border-radius: 6px;
          background: #fff1f1;
          color: #b42318;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 10px;
          cursor: pointer;
        }

        .empty-state {
          font-size: 11px;
          color: #6b8e7f;
          font-style: italic;
          padding: 12px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 50;
        }

        .modal-card {
          width: min(420px, 92vw);
          border-radius: 12px;
          border: 1px solid #dcefe7;
          background: #ffffff;
          padding: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }

        .modal-title {
          font-size: 14px;
          font-weight: 700;
          color: #2c4a3a;
        }

        .modal-body {
          margin-top: 8px;
          font-size: 12px;
          color: #4a7060;
        }

        .modal-actions {
          margin-top: 16px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .modal-btn {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid;
          cursor: pointer;
        }

        .modal-btn.cancel {
          background: #ffffff;
          border-color: #d0d5dd;
          color: #344054;
        }

        .modal-btn.delete {
          background: #b42318;
          border-color: #b42318;
          color: #ffffff;
        }

        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .department-section {
          border: 1px solid var(--background-plain);
          border-radius: 10px;
          overflow: hidden;
          background: var(--card);
        }

        .department-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-bottom: 1px solid var(--background-plain);
          background-color: var(--background-plain);
        }

        .department-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid;
        }

        .department-meta {
          font-size: 11px;
          // color: #3b5c50;
        }

        .department-links {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .department-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          border-radius: 999px;
          padding: 2px 8px;
          border: 1px solid;
          margin-left: 6px;
        }

        .generated-item {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid var(--background);
          border-radius: 8px;
          padding: 8px 10px;
          background: var(--background-plain);
        }

        .generated-meta {
          font-size: 12px;
          color: #426457;
        }

        .generated-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .view-btn {
          border: 1px solid #c9e5d8;
          border-radius: 6px;
          background: #f3fbf7;
          color: #2f6f59;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 10px;
          cursor: pointer;
        }

        .uploads-panel {
          width: 100%;
          border-top: 1px solid #e3f2eb;
          padding-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .uploads-empty {
          font-size: 11px;
          color: #6b8e7f;
          font-style: italic;
        }

        .uploads-item {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
          color: #315848;
          border: 1px solid #e7f4ee;
          border-radius: 6px;
          padding: 6px 8px;
          background: #fdfefe;
        }

        .loading-state {
          width: 100%;
          padding: 14px;
          border: 1px dashed var(--background);
          border-radius: 10px;
          background: var(--background-plain);
          color: #426457;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .lead-row,
          .link-row {
            flex-direction: column;
            align-items: stretch;
          }

          .lead-input,
          .generate-btn,
          .link-input {
            width: 100%;
          }
        }
      `}</style>

      <div className="lead-row">
        <div className="link-row">
          <div className="link-combined">
            {/*<span className="link-label">LINK</span>*/}
            <input
              type="text"
              className="link-input"
              placeholder="Generated lead link appears here..."
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="generate-btn"
            onClick={handleGenerateLink}
            disabled={!canGenerate}
          >
            {linkLoading ? (
              "Generating..."
            ) : (
              <span className="btn-content">
                <IconPlus size={14} /> Generate Lead Link
              </span>
            )}
          </button>

          <div className="department-picker">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Select Department</Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuGroup>
                  {/* Retrieve from database, map onto DropDownMenuItem */}
                  {}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button
            className="refresh-btn"
            type="button"
            onClick={handleRefresh}
            title="Refresh"
          >
            <IconRefresh size={18} />
          </button>
          <button
            className="copy-btn"
            type="button"
            onClick={() => handleCopyLink(linkValue)}
            disabled={!linkValue}
          >
            <IconCopy size={14} /> Copy
          </button>
        </div>
      </div>

      {linkMessage ? (
        <span className="link-status ok">{linkMessage}</span>
      ) : null}
      {linkError ? (
        <span className="link-status error">{linkError}</span>
      ) : null}

      <span className="link-hint">
        Generate a link for Implementation Levels
      </span>

      {isLoadingLinks && generatedLinks.length === 0 ? (
        <div className="loading-state">
          <IconLoader2 size={14} className="spin" /> Loading lead links...
        </div>
      ) : generatedLinks.length > 0 ? (
        <div className="generated-list bg-(--muted-card)">
          <div className="generated-title">Generated Links by Department</div>
          <div className="generated-controls">
            <div className="filter-group">
              <span className="filter-label">Department</span>
              <select
                className="filter-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                {departmentFilterOptions.map((department) => (
                  <option key={department} value={department}>
                    {department === "All" ? "All Departments" : department}
                  </option>
                ))}
              </select>
            </div>
            <div className="view-toggle">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                List View
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                Grid View
              </button>
            </div>
          </div>
          {viewMode === "list" ? (
            filteredDepartments.length === 0 ? (
              <div className="empty-state">
                No leads found for this department.
              </div>
            ) : (
              filteredDepartments.map((department) => {
                const theme = getDepartmentTheme(department);
                const entries = groupedLinks[department] || [];
                if (entries.length === 0) return null;
                return (
                  <div className="department-section" key={department}>
                    <div className="department-header">
                      <span
                        className="department-badge"
                        style={{
                          color: theme.color.text,
                          borderColor: theme.color.border,
                          background: "#ffffff",
                        }}
                      >
                        {department}
                      </span>
                      <span className="department-meta font-bold text-primary">
                        {entries.length} lead{entries.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="department-links">
                      {entries.map((entry) => {
                        const entryTheme = getDepartmentTheme(
                          entry.lead_department || department,
                        );
                        return (
                          <div
                            className="generated-item"
                            key={`list-${entry.url || `lead-${entry.lead_id}`}-${entry.id}`}
                          >
                            <div className="generated-meta">
                              <div className="flex items-center gap-2">
                                {entry.lead_profile_pic ? (
                                  <img
                                    src={entry.lead_profile_pic}
                                    alt={entry.lead_username || "Lead"}
                                    className="w-7 h-7 rounded-full object-cover border border-white shadow-sm"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] font-bold">
                                    {(entry.lead_username || "U")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <strong>
                                  {entry.lead_username || "Unclaimed lead"}
                                </strong>
                              </div>
                              <span
                                className="department-chip"
                                style={{
                                  background: entryTheme.color.bg,
                                  color: entryTheme.color.text,
                                  borderColor: entryTheme.color.border,
                                }}
                              >
                                {entry.lead_department || department}
                              </span>{" "}
                              | {new Date(entry.created_at).toLocaleString()}
                              {entry.last_accessed_at
                                ? ` | Last used: ${new Date(entry.last_accessed_at).toLocaleString()}`
                                : " | Not used yet"}
                            </div>
                            <div className="generated-actions">
                              <button
                                type="button"
                                className="view-btn"
                                onClick={() =>
                                  setExpandedLeadId((prev) =>
                                    prev === entry.lead_id
                                      ? null
                                      : entry.lead_id,
                                  )
                                }
                              >
                                {expandedLeadId === entry.lead_id ? (
                                  <span className="flex gap-1 items-center">
                                    <IconEyeOff size={14} /> Hide Uploaded Files
                                  </span>
                                ) : (
                                  <span className="flex gap-1 items-center">
                                    <IconEye size={14} /> View Uploaded Files
                                  </span>
                                )}
                              </button>
                              {entry.url ? (
                                <button
                                  type="button"
                                  className="copy-btn"
                                  onClick={() => handleCopyLink(entry.url)}
                                >
                                  <IconCopy size={14} /> Copy Link
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="generate-btn"
                                  onClick={() =>
                                    handleGenerateForLead(entry.lead_id)
                                  }
                                  disabled={generatingLeadId === entry.lead_id}
                                >
                                  {generatingLeadId === entry.lead_id ? (
                                    <span className="btn-content">
                                      <IconLoader2 size={14} className="spin" />
                                      Generating...
                                    </span>
                                  ) : (
                                    <span className="btn-content">
                                      <IconPlus size={14} /> Generate link
                                    </span>
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                className="delete-btn flex gap-1"
                                onClick={() => setPendingDelete(entry)}
                              >
                                <IconTrash size={14} /> Delete Lead
                              </button>
                            </div>

                            {expandedLeadId === entry.lead_id ? (
                              <div className="uploads-panel">
                                {(leadUploads[entry.lead_id] || []).length ===
                                0 ? (
                                  <div className="uploads-empty">
                                    No files uploaded by this lead yet.
                                  </div>
                                ) : (
                                  (leadUploads[entry.lead_id] || []).map(
                                    (file) => (
                                      <div
                                        className="uploads-item"
                                        key={file.id}
                                      >
                                        <span>{file.file_name}</span>
                                        <span>
                                          {file.row_count} rows |{" "}
                                          {new Date(
                                            file.uploaded_at,
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                    ),
                                  )
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )
          ) : filteredLinks.length === 0 ? (
            <div className="empty-state">
              No leads found for this department.
            </div>
          ) : (
            <div className="generated-grid">
              {filteredLinks.map((entry) => {
                const entryTheme = getDepartmentTheme(
                  entry.lead_department || "General",
                );
                return (
                  <div
                    className="generated-card"
                    key={`grid-${entry.url || `lead-${entry.lead_id}`}-${entry.id}`}
                  >
                    <div className="generated-card-head">
                      <div className="flex items-center gap-2 min-w-0">
                        {entry.lead_profile_pic ? (
                          <img
                            src={entry.lead_profile_pic}
                            alt={entry.lead_username || "Lead"}
                            className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(entry.lead_username || "U")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                        <strong className="truncate">
                          {entry.lead_username || "Unclaimed lead"}
                        </strong>
                      </div>
                      <span
                        className="department-chip"
                        style={{
                          background: entryTheme.color.bg,
                          color: entryTheme.color.text,
                          borderColor: entryTheme.color.border,
                        }}
                      >
                        {entry.lead_department || "General"}
                      </span>
                    </div>
                    <div className="generated-card-meta">
                      <div>{new Date(entry.created_at).toLocaleString()}</div>
                      <div>
                        {entry.last_accessed_at
                          ? `Last used: ${new Date(entry.last_accessed_at).toLocaleString()}`
                          : "Not used yet"}
                      </div>
                    </div>
                    <div className="generated-actions">
                      <button
                        type="button"
                        className="view-btn"
                        onClick={() =>
                          setExpandedLeadId((prev) =>
                            prev === entry.lead_id ? null : entry.lead_id,
                          )
                        }
                      >
                        {expandedLeadId === entry.lead_id
                          ? "Hide Uploaded Files"
                          : "View Uploaded Files"}
                      </button>
                      {entry.url ? (
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => handleCopyLink(entry.url)}
                        >
                          <IconCopy size={14} /> Copy Link
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="generate-btn"
                          onClick={() => handleGenerateForLead(entry.lead_id)}
                          disabled={generatingLeadId === entry.lead_id}
                        >
                          {generatingLeadId === entry.lead_id ? (
                            <span className="btn-content">
                              <IconLoader2 size={14} className="spin" />
                              Generating...
                            </span>
                          ) : (
                            <span className="btn-content">
                              <IconPlus size={14} /> Generate link
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => setPendingDelete(entry)}
                      >
                        <IconTrash size={14} /> Delete Lead
                      </button>
                    </div>

                    {expandedLeadId === entry.lead_id ? (
                      <div className="uploads-panel">
                        {(leadUploads[entry.lead_id] || []).length === 0 ? (
                          <div className="uploads-empty">
                            No files uploaded by this lead yet.
                          </div>
                        ) : (
                          (leadUploads[entry.lead_id] || []).map((file) => (
                            <div className="uploads-item" key={file.id}>
                              <span>{file.file_name}</span>
                              <span>
                                {file.row_count} rows |{" "}
                                {new Date(file.uploaded_at).toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Confirm lead deletion</h3>
            <p className="modal-body">
              Delete{" "}
              <strong>{pendingDelete.lead_username || "Unclaimed lead"}</strong>
              {pendingDelete.lead_department
                ? ` (${pendingDelete.lead_department})`
                : ""}
              ? This removes the lead account and access link.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn cancel"
                onClick={() => setPendingDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn delete"
                onClick={() => {
                  void handleDeleteLead(pendingDelete);
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete lead"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
