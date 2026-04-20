"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseAIPExcel } from "@/lib/aipExport";
import {
  fetchLeadUploadedFilesAction,
  uploadLeadAipFileAction,
} from "@/lib/services/projectMonitoringActions";

type UploadedLeadFile = {
  id: number;
  file_name: string;
  uploaded_at: string;
  row_count: number;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function LeadWorkspacePortal(): React.JSX.Element {
  const router = useRouter();

  const [projectDate, setProjectDate] = useState<string>("");
  const [projectSector, setProjectSector] = useState<string>("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedLeadFile[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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

  const fileNameDisplay = useMemo(() => {
    if (stagedFiles.length === 0) return "No File Chosen";
    if (stagedFiles.length === 1) return stagedFiles[0].name;
    return `${stagedFiles.length} files selected`;
  }, [stagedFiles]);

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
        "File upload complete. Click an uploaded file to edit it as a table.",
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
          margin-top: 0;
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

        .file-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: #e8f8f2;
          border: 1px solid #b2dece;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition:
            transform 0.14s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .file-item:hover,
        .file-item:focus-visible {
          transform: translateY(-1px);
          border-color: #2a7a5a;
          box-shadow: 0 8px 20px rgba(42, 122, 90, 0.16);
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

        .file-item:hover .edit-hint,
        .file-item:focus-visible .edit-hint {
          opacity: 1;
          transform: translateX(0);
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
              {uploadedFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className="file-item"
                  onClick={() => openTableEditor(file.id)}
                  title="Open and edit this file as a table"
                >
                  <div className="file-icon">AIP</div>
                  <div className="file-info">
                    <div className="file-info-name">{file.file_name}</div>
                    <div className="file-info-meta">
                      {file.row_count} rows •{" "}
                      {new Date(file.uploaded_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="edit-hint">Click to edit as table</span>
                </button>
              ))}
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
      </main>
    </div>
  );
}
