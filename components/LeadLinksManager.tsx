"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type GeneratedLink = {
  id: number;
  lead_id: number;
  lead_username: string;
  token: string;
  created_at: string;
  last_accessed_at?: string;
  url: string;
};

type LeadUploadedFile = {
  id: number;
  lead_id: number;
  file_name: string;
  uploaded_at: string;
  row_count: number;
};

export default function LeadLinksManager(): React.JSX.Element | null {
  const { data: session, status } = useSession();
  const isAdminView = ["admin", "superadmin"].includes(
    session?.user?.role || "",
  );

  const [linkValue, setLinkValue] = useState("");
  const [leadUsername, setLeadUsername] = useState("");
  const [leadDepartment, setLeadDepartment] = useState("General");
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [leadUploads, setLeadUploads] = useState<Record<number, LeadUploadedFile[]>>({});
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const [linkError, setLinkError] = useState("");

  const fetchLinks = async () => {
    if (!isAdminView) return;

    try {
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
      setGeneratedLinks(data.links || []);
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
      setLinkError(
        error instanceof Error ? error.message : "Failed to load lead links",
      );
    }
  };

  useEffect(() => {
    if (status === "authenticated" && isAdminView) {
      fetchLinks();
    }
  }, [isAdminView, status]);

  const handleGenerateLink = async () => {
    if (!leadUsername.trim()) {
      setLinkError("Please enter the lead username first.");
      return;
    }

    setLinkLoading(true);
    setLinkError("");
    setLinkMessage("");

    try {
      const response = await fetch("/api/lead-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          leadUsername: leadUsername.trim(),
          department: leadDepartment.trim() || "General",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate lead link");
      }

      setLinkValue(data.link?.url || "");
      setLinkMessage(
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
      setLinkLoading(false);
    }
  };

  const handleCopyLink = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setLinkMessage("Link copied to clipboard.");
    } catch {
      setLinkError("Failed to copy link.");
    }
  };

  const handleRefresh = () => {
    setLinkValue("");
    setLeadUsername("");
    setLeadDepartment("General");
    setLinkMessage("");
    setLinkError("");
  };

  // Avoid flicker/noise before session is resolved and hide this widget for non-admin roles.
  if (status !== "authenticated" || !isAdminView) {
    return null;
  }

  return (
    <section
      className="link-section"
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
        }

        .lead-row {
          width: 100%;
          display: flex;
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
          border: 1.5px solid #a8dfc5;
          border-radius: 8px;
          padding: 0 12px;
          outline: none;
          width: min(280px, 100%);
          color: #2c4a3a;
          background: #ffffff;
        }

        .lead-input:focus {
          border-color: #4a9e7f;
          box-shadow: 0 0 0 3px rgba(74, 158, 127, 0.12);
        }

        .generate-btn {
          height: 36px;
          border: none;
          border-radius: 8px;
          padding: 0 14px;
          background: linear-gradient(90deg, #3d8f6e 0%, #55b38a 100%);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          cursor: pointer;
        }

        .generate-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .link-combined {
          display: flex;
          align-items: center;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 3px 10px rgba(141, 191, 132, 0.35);
        }

        .link-label {
          background: linear-gradient(90deg, #a8c8a0 0%, #8dbf84 100%);
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
          width: min(40rem, 76vw);
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

        .generated-list {
          width: min(860px, 100%);
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid #d6f0e4;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .generated-title {
          font-size: 12px;
          font-weight: 700;
          color: #2c4a3a;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .generated-item {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid #dcefe7;
          border-radius: 8px;
          padding: 8px 10px;
          background: #ffffff;
        }

        .generated-meta {
          font-size: 12px;
          color: #426457;
        }

        .generated-actions {
          display: flex;
          align-items: center;
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
        <input
          type="text"
          className="lead-input"
          placeholder="Lead username (e.g. lead1)"
          value={leadUsername}
          onChange={(e) => setLeadUsername(e.target.value)}
        />
        <input
          type="text"
          className="lead-input"
          placeholder="Department (e.g. Engineering)"
          value={leadDepartment}
          onChange={(e) => setLeadDepartment(e.target.value)}
        />
        <button
          type="button"
          className="generate-btn"
          onClick={handleGenerateLink}
          disabled={linkLoading || !isAdminView}
        >
          {linkLoading ? "Generating..." : "Generate Lead Link"}
        </button>
      </div>

      <div className="link-row">
        <div className="link-combined">
          <span className="link-label">LINK</span>
          <input
            type="text"
            className="link-input"
            placeholder="Generated lead link appears here..."
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
          />
        </div>

        <button
          className="refresh-btn"
          type="button"
          onClick={handleRefresh}
          title="Refresh"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        <button
          className="copy-btn"
          type="button"
          onClick={() => handleCopyLink(linkValue)}
          disabled={!linkValue}
        >
          Copy
        </button>
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

      {generatedLinks.length > 0 ? (
        <div className="generated-list">
          <div className="generated-title">Generated Links</div>
          {generatedLinks.map((entry) => (
            <div className="generated-item" key={entry.id}>
              <div className="generated-meta">
                <strong>{entry.lead_username}</strong> |{" "}
                {new Date(entry.created_at).toLocaleString()}
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
                      prev === entry.lead_id ? null : entry.lead_id,
                    )
                  }
                >
                  {expandedLeadId === entry.lead_id
                    ? "Hide Uploaded Files"
                    : "View Uploaded Files"}
                </button>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => handleCopyLink(entry.url)}
                >
                  Copy Link
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
          ))}
        </div>
      ) : null}
    </section>
  );
}
