"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { parseAIPExcel } from "@/lib/aipExport";
import {
  deleteLeadUploadedFileAction,
  fetchLeadFileCommentsAction,
  fetchLeadUploadedFilesAction,
  submitLeadUploadAction,
  uploadLeadAipFileAction,
} from "@/lib/services/projectMonitoringActions";
import { getDepartmentTheme } from "@/lib/leadDepartments";
import { FileCommentEntry } from "@/components/project-monitoring/types";

type UploadedLeadFile = {
  id: number;
  file_name: string;
  uploaded_at: string;
  row_count: number;
  is_submitted: boolean;
  submitted_at?: string | null;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function LeadWorkspacePortal(): React.JSX.Element {
  const router = useRouter();
  const { data: session } = useSession();
  const departmentTheme = getDepartmentTheme(session?.user?.department);

  const [projectDate, setProjectDate] = useState<string>("");
  const [projectSector, setProjectSector] = useState<string>("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedLeadFile[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [submittingFileId, setSubmittingFileId] = useState<number | null>(null);
  const [fileComments, setFileComments] = useState<FileCommentEntry[]>([]);
  const [fileCommentTarget, setFileCommentTarget] =
    useState<UploadedLeadFile | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const files = await fetchLeadUploadedFilesAction();
        setUploadedFiles(files);
      } catch {
        setUploadedFiles([]);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const comments = await fetchLeadFileCommentsAction();
        setFileComments(comments);
      } catch {
        setFileComments([]);
      }
    })();
  }, []);

  const fileNameDisplay = useMemo(() => {
    if (stagedFiles.length === 0) return "No File Chosen";
    if (stagedFiles.length === 1) return stagedFiles[0].name;
    return `${stagedFiles.length} files selected`;
  }, [stagedFiles]);

  const fileCommentCountsById = useMemo(() => {
    return fileComments.reduce(
      (acc, comment) => {
        acc[comment.file_id] = (acc[comment.file_id] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );
  }, [fileComments]);

  const fileCommentThread = useMemo(() => {
    if (!fileCommentTarget) return [];
    return fileComments
      .filter((comment) => comment.file_id === fileCommentTarget.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [fileComments, fileCommentTarget]);

  const onUpload = async (): Promise<void> => {
    if (stagedFiles.length === 0) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      for (const file of stagedFiles) {
        const parsedRows = await parseAIPExcel(file);
        await uploadLeadAipFileAction(file.name, parsedRows);
      }

      const files = await fetchLeadUploadedFilesAction();
      setUploadedFiles(files);
      setStagedFiles([]);
      setSuccess(
        "File upload complete. Review the file and submit it when ready.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const openTableEditor = (fileId: number): void => {
    router.push(
      `/dashboard/annual-investment-plan?view=table&fileId=${fileId}`,
    );
  };

  const openFileComments = (file: UploadedLeadFile): void => {
    setFileCommentTarget(file);
  };

  const closeFileComments = (): void => {
    setFileCommentTarget(null);
  };

  const handleSubmitFile = async (fileId: number): Promise<void> => {
    if (
      !window.confirm(
        "Submit this file? After submission, it will be locked and visible to admins.",
      )
    ) {
      return;
    }
    setSubmittingFileId(fileId);
    setError("");
    setSuccess("");
    try {
      await submitLeadUploadAction(fileId);
      const files = await fetchLeadUploadedFilesAction();
      setUploadedFiles(files);
      setSuccess("File submitted. Admins can now review it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit file.");
    } finally {
      setSubmittingFileId(null);
    }
  };

  const handleDeleteFile = async (fileId: number): Promise<void> => {
    if (
      !window.confirm(
        "Delete this uploaded file and its rows? This cannot be undone.",
      )
    ) {
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      await deleteLeadUploadedFileAction(fileId);
      const files = await fetchLeadUploadedFilesAction();
      setUploadedFiles(files);
      const comments = await fetchLeadFileCommentsAction();
      setFileComments(comments);
      setSuccess("File deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="lead-portal-shell">
      <style jsx>{`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        .lead-portal-shell {
          width: 100%;
          min-height: 100vh;
          margin-top: 2rem;
          background: #e8f8f2;
          font-family: var(--font-sans), sans-serif;
        }

        .workspace-header {
          background: #2a7a5a;
          padding: 0 28px;
          height: 52px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        }

        .header-logo {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          border: 2px solid #34a475;
        }

        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-title {
          font-family: var(--font-montserrat), sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .workspace-main {
          max-width: 820px;
          margin: 44px auto;
          padding: 0 20px;
        }

        .page-title {
          font-family: var(--font-montserrat), sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #1a3a2a;
          text-align: center;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 28px;
        }

        .top-bar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 18px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }

        .field-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .field-group label {
          font-size: 14px;
          font-weight: 600;
          color: #1a3a2a;
        }

        .field-group input,
        .field-group select {
          height: 34px;
          padding: 0 10px;
          border: 1.5px solid #b2dece;
          border-radius: 6px;
          background: #ffffff;
          font-size: 14px;
          color: #1a3a2a;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .field-group input:focus,
        .field-group select:focus {
          border-color: #34a475;
          box-shadow: 0 0 0 3px rgba(52, 164, 117, 0.13);
        }

        .card {
          background: #ffffff;
          border: 1.5px solid #b2dece;
          border-radius: 12px;
          padding: 28px 30px;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px rgba(42, 122, 90, 0.1);
        }

        .card-label {
          font-size: 15px;
          font-weight: 600;
          color: #1a3a2a;
          margin-bottom: 16px;
        }

        .file-upload-row {
          display: flex;
          align-items: center;
          border: 1.5px solid #b2dece;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
        }

        .btn-choose {
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #2a7a5a;
          color: #ffffff;
          border: none;
          padding: 0 20px;
          height: 42px;
          font-family: var(--font-montserrat), sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .btn-choose:hover {
          background: #34a475;
        }

        .file-name-display {
          padding: 0 16px;
          font-size: 14px;
          color: #6b9e88;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .upload-action {
          display: flex;
          justify-content: flex-end;
          margin-top: 14px;
        }

        .btn-upload {
          background: #34a475;
          color: #ffffff;
          border: none;
          padding: 10px 30px;
          border-radius: 8px;
          font-family: var(--font-montserrat), sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          transition:
            background 0.2s,
            transform 0.1s;
        }

        .btn-upload:hover {
          background: #2a7a5a;
          transform: translateY(-1px);
        }

        .btn-upload:disabled {
          background: #b2dece;
          color: #6b9e88;
          cursor: not-allowed;
          transform: none;
        }

        .helper {
          font-size: 12px;
          margin-top: 10px;
        }

        .helper.error {
          color: #b42318;
        }

        .helper.success {
          color: #1d6e4b;
        }

        .uploaded-card {
          min-height: 140px;
        }

        .empty-state {
          text-align: center;
          padding: 36px 0 20px;
          color: #6b9e88;
          font-size: 14px;
          font-style: italic;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .department-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          border-radius: 999px;
          padding: 6px 14px;
          border: 1px solid;
          margin: -12px auto 24px;
          width: fit-content;
        }

        .file-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: #e8f8f2;
          border: 1px solid #b2dece;
          border-radius: 8px;
          transition:
            transform 0.14s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .file-item:hover {
          transform: translateY(-1px);
          border-color: #2a7a5a;
          box-shadow: 0 8px 20px rgba(42, 122, 90, 0.16);
        }

        .file-main {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          padding: 0;
        }

        .file-main:focus-visible {
          outline: none;
        }

        .file-icon {
          width: 32px;
          height: 32px;
          background: #2a7a5a;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-info-name {
          font-size: 14px;
          font-weight: 600;
          color: #1a3a2a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-info-meta {
          font-size: 12px;
          color: #6b9e88;
          margin-top: 2px;
        }

        .file-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .file-action-btn {
          border: 1px solid #cbe7db;
          border-radius: 999px;
          background: #ffffff;
          color: #2a7a5a;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 10px;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .file-action-btn:hover {
          background: #f1faf6;
        }

        .file-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f3f4f6;
        }

        .file-status {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
          border: 1px solid transparent;
        }

        .file-status.draft {
          background: #fff7ed;
          color: #9a3412;
          border-color: #fdba74;
        }

        .file-status.submitted {
          background: #e7f6ef;
          color: #1d6e4b;
          border-color: #a6d5c1;
        }

        .file-action-btn.danger {
          border-color: #f2b8b5;
          color: #b42318;
          background: #fff7f7;
        }

        .file-action-btn.danger:hover {
          background: #fdecec;
        }

        .edit-hint {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #9cd6be;
          background: #ffffff;
          color: #2a7a5a;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          opacity: 0;
          transform: translateX(-6px);
          transition:
            opacity 0.2s ease,
            transform 0.2s ease;
          white-space: nowrap;
        }

        .file-main:hover .edit-hint,
        .file-main:focus-visible .edit-hint {
          opacity: 1;
          transform: translateX(0);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 50;
        }

        .modal-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          max-width: 560px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-body {
          padding: 16px 20px;
        }

        .comment-thread {
          max-height: 260px;
          overflow: auto;
          border: 1px solid #f0f2f4;
          border-radius: 12px;
        }

        .comment-item {
          padding: 12px 14px;
          border-bottom: 1px solid #f0f2f4;
        }

        .comment-meta {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 6px;
        }

        .comment-text {
          font-size: 13px;
          color: #1f2937;
          white-space: pre-wrap;
        }

        .comment-empty {
          padding: 20px;
          text-align: center;
          font-size: 13px;
          color: #9ca3af;
        }

        @media (max-width: 640px) {
          .workspace-main {
            margin: 28px auto;
            padding: 0 14px;
          }

          .card {
            padding: 20px 16px;
          }

          .top-bar {
            justify-content: flex-start;
          }

          .workspace-header {
            padding: 0 12px;
          }

          .header-title {
            font-size: 11px;
          }
        }
      `}</style>

      <main className="workspace-main">
        <h1 className="page-title">Implementation Lead Portal</h1>
        <div
          className="department-pill"
          style={{
            background: departmentTheme.color.bg,
            color: departmentTheme.color.text,
            borderColor: departmentTheme.color.border,
          }}
        >
          {departmentTheme.label}
        </div>

        <div className="top-bar">
          <div className="field-group">
            <label htmlFor="project-date">Project Date</label>
            <input
              id="project-date"
              type="date"
              value={projectDate}
              onChange={(e) => setProjectDate(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="project-sector">Sector</label>
            <select
              id="project-sector"
              value={projectSector}
              onChange={(e) => setProjectSector(e.target.value)}
            >
              <option value="" disabled>
                Select project sector
              </option>
              <option value="Agriculture">Agriculture</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Health">Health</option>
              <option value="Education">Education</option>
              <option value="Environment">Environment</option>
              <option value="Social Services">Social Services</option>
              <option value="Trade & Industry">Trade &amp; Industry</option>
            </select>
          </div>
        </div>

        <section className="card">
          <div className="card-label">Project File</div>

          <div className="file-upload-row">
            <label className="btn-choose" htmlFor="actual-file-input">
              CHOOSE FILE
            </label>
            <span className="file-name-display">{fileNameDisplay}</span>
          </div>

          <input
            id="actual-file-input"
            type="file"
            multiple
            accept=".xlsx"
            hidden
            onChange={(e) => {
              setStagedFiles(Array.from(e.target.files ?? []));
              setSuccess("");
            }}
          />

          <div className="upload-action">
            <button
              type="button"
              className="btn-upload"
              disabled={uploading || stagedFiles.length === 0}
              onClick={() => {
                void onUpload();
              }}
            >
              {uploading ? "UPLOADING..." : "UPLOAD"}
            </button>
          </div>

          {error ? <p className="helper error">{error}</p> : null}
          {success ? <p className="helper success">{success}</p> : null}
        </section>

        <section className="card uploaded-card">
          <div className="card-label">Uploaded Files</div>

          {uploadedFiles.length === 0 ? (
            <div className="empty-state">No file uploaded yet</div>
          ) : (
            <div className="file-list">
              {uploadedFiles.map((file) => {
                const commentCount = fileCommentCountsById[file.id] ?? 0;
                const isSubmitted = Boolean(
                  file.is_submitted || file.submitted_at,
                );
                return (
                  <div key={file.id} className="file-item">
                    <button
                      type="button"
                      className="file-main"
                      onClick={() => openTableEditor(file.id)}
                      title="Open and edit this file as a table"
                    >
                      <div className="file-icon">AIP</div>
                      <div className="file-info">
                        <div className="file-info-name">{file.file_name}</div>
                        <div className="file-info-meta">
                          {file.row_count} rows •{" "}
                          {new Date(file.uploaded_at).toLocaleString()} •{" "}
                          <span
                            className={`file-status ${
                              isSubmitted ? "submitted" : "draft"
                            }`}
                          >
                            {isSubmitted ? "Submitted" : "Draft"}
                          </span>
                        </div>
                      </div>
                      <span className="edit-hint">
                        {isSubmitted
                          ? "View submitted file"
                          : "Click to edit before submitting"}
                      </span>
                    </button>
                    <div className="file-actions">
                      {!isSubmitted ? (
                        <button
                          type="button"
                          className="file-action-btn"
                          onClick={() => {
                            void handleSubmitFile(file.id);
                          }}
                          disabled={submittingFileId === file.id}
                        >
                          {submittingFileId === file.id
                            ? "Submitting..."
                            : "Submit"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="file-action-btn"
                        onClick={() => openFileComments(file)}
                      >
                        Comments{commentCount ? ` (${commentCount})` : ""}
                      </button>
                      <button
                        type="button"
                        className="file-action-btn danger"
                        onClick={() => {
                          void handleDeleteFile(file.id);
                        }}
                        disabled={isSubmitted}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {stagedFiles.length > 0 ? (
          <section className="card">
            <div className="card-label">Staged Files</div>
            <div className="file-list">
              {stagedFiles.map((file) => (
                <div
                  key={file.name + file.lastModified}
                  className="file-item"
                  aria-hidden
                >
                  <div className="file-icon">UP</div>
                  <div className="file-info">
                    <div className="file-info-name">{file.name}</div>
                    <div className="file-info-meta">
                      {formatSize(file.size)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {fileCommentTarget ? (
          <div className="modal-backdrop" onClick={closeFileComments}>
            <div
              className="modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h3 className="card-label">File Comments</h3>
                  <p className="file-info-meta">
                    {fileCommentTarget.file_name}
                  </p>
                </div>
                <button
                  type="button"
                  className="file-action-btn"
                  onClick={closeFileComments}
                >
                  Close
                </button>
              </div>
              <div className="modal-body">
                {fileCommentThread.length === 0 ? (
                  <div className="comment-empty">
                    No comments for this file yet.
                  </div>
                ) : (
                  <div className="comment-thread">
                    {fileCommentThread.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-meta">
                          {comment.created_by_name} ({comment.created_by_role})
                          · {new Date(comment.created_at).toLocaleString()}
                        </div>
                        <div className="comment-text">
                          {comment.comment_text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
