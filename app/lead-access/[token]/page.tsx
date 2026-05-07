"use client";

import { signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { departmentOptions } from "@/lib/leadDepartments";

export default function LeadAccessPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = useMemo(() => String(params?.token || ""), [params]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [valid, setValid] = useState(false);
  const [leadUsername, setLeadUsername] = useState("");
  const [needsUsername, setNeedsUsername] = useState(false);
  const [needsDepartment, setNeedsDepartment] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("General");
  const [error, setError] = useState("");

  useEffect(() => {
    const validateToken = async () => {
      if (!token) return;

      try {
        const response = await fetch(`/api/lead-links/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data?.error || "Invalid or expired link");
          setValid(false);
        } else {
          setLeadUsername(data.leadUsername || "");
          setNeedsUsername(Boolean(data.needsUsername));
          setNeedsDepartment(Boolean(data.needsDepartment));
          setDepartmentInput(data.department || "General");
          setValid(Boolean(data.valid));
        }
      } catch {
        setError("Failed to validate link.");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (needsUsername && !usernameInput.trim()) {
      setError("Please enter your username.");
      return;
    }

    if (needsDepartment && !departmentInput.trim()) {
      setError("Please select your department.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const verifyResponse = await fetch(`/api/lead-links/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(needsUsername ? { username: usernameInput.trim() } : {}),
          ...(needsDepartment ? { department: departmentInput.trim() } : {}),
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        setError(verifyData?.error || "Access denied");
        return;
      }

      const signInResult = await signIn("credentials", {
        redirect: false,
        token,
      });

      if (signInResult?.error) {
        setError("Authentication failed. Please contact an administrator.");
        return;
      }

      router.replace("/dashboard/annual-investment-plan");
    } catch {
      setError("Unable to process your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lead-access-root">
      <style jsx>{`
        .lead-access-root {
          width: min(480px, 92vw);
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(74, 158, 127, 0.2);
          border: 1px solid #d6f0e4;
          padding: 28px 24px;
          font-family: "Lato", sans-serif;
          margin-top: 14rem;
        }

        h1 {
          font-family: "Cinzel", serif;
          color: #2c4a3a;
          font-size: 1.2rem;
          margin-bottom: 10px;
          letter-spacing: 0.3px;
        }

        p {
          color: #4a7060;
          font-size: 0.95rem;
          margin-bottom: 18px;
        }

        .username-chip {
          display: inline-block;
          background: #e7f6ef;
          color: #1f5e54;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 14px;
        }

        .field-label {
          display: block;
          margin-bottom: 6px;
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #5a8070;
          font-weight: 700;
        }

        input {
          width: 100%;
          height: 42px;
          border: 1.5px solid #b9decf;
          border-radius: 8px;
          padding: 0 12px;
          outline: none;
          font-size: 0.95rem;
          margin-bottom: 14px;
          color: #1a3d2e;
          background: #f8fdfb;
        }

        input:focus {
          border-color: #4a9e7f;
          box-shadow: 0 0 0 3px rgba(74, 158, 127, 0.15);
          background: #ffffff;
        }

        .btn {
          width: 100%;
          height: 42px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(90deg, #3d8f6e 0%, #55b38a 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          letter-spacing: 0.04em;
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .error {
          color: #b63b3b;
          background: #fef0f0;
          border: 1px solid #f6d3d3;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 14px;
          font-size: 0.88rem;
        }
      `}</style>

      {loading ? (
        <>
          <h1>Checking Link Access</h1>
          <p>Please wait while we validate your secure token.</p>
        </>
      ) : !valid ? (
        <>
          <h1>Invalid Link</h1>
          <p>{error || "This lead access link is invalid or expired."}</p>
        </>
      ) : (
        <>
          <h1>Lead Access Portal</h1>
          <p>
            {needsUsername
              ? "Enter your username and department to continue to your assigned workspace."
              : needsDepartment
                ? "Select your department to continue to your assigned workspace."
                : "Click continue to enter your assigned workspace."}
          </p>
          {leadUsername ? (
            <div className="username-chip">Lead: {leadUsername}</div>
          ) : null}

          {error ? <div className="error">{error}</div> : null}

          <form onSubmit={handleSubmit}>
            {needsUsername ? (
              <>
                <label className="field-label" htmlFor="lead-username">
                  Username
                </label>
                <input
                  id="lead-username"
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your username"
                />
              </>
            ) : null}
            {needsDepartment ? (
              <>
                <label className="field-label" htmlFor="lead-department">
                  Department
                </label>
                <select
                  id="lead-department"
                  value={departmentInput}
                  onChange={(e) => setDepartmentInput(e.target.value)}
                >
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "Verifying..." : "Continue"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
