"use client";

import React, { useEffect, useState } from "react";
import LeadLinksManager from "@/components/LeadLinksManager";

type AdminRecord = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  profile_pic?: string;
  is_superadmin: boolean;
  created_at: string;
};

export default function SuperadminAdminManager(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"manage" | "archived">("manage");
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [profilePic, setProfilePic] = useState<string>("");
  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<AdminRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const loadAdmins = async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/superadmin/admins", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        admins?: AdminRecord[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Failed to load admin accounts.");
      setAdmins(data.admins ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load admin accounts.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdmins();
  }, []);

  const createAdmin = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/superadmin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          profile_pic: profilePic,
          is_superadmin: isSuperadmin,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error || "Failed to create account.");
      setName("");
      setEmail("");
      setPassword("");
      setProfilePic("");
      setIsSuperadmin(false);
      setActiveTab("manage");
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create account.",
      );
    }
  };

  const toggleStatus = async (record: AdminRecord): Promise<void> => {
    setError("");
    try {
      const response = await fetch("/api/superadmin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, is_active: !record.is_active }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error || "Failed to update account.");
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update account.",
      );
    }
  };

  const toggleRole = async (record: AdminRecord): Promise<void> => {
    setError("");
    try {
      const response = await fetch("/api/superadmin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          is_superadmin: !record.is_superadmin,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error || "Failed to update account.");
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update account.",
      );
    }
  };

  const deleteAdmin = async (record: AdminRecord): Promise<void> => {
    if (record.is_superadmin) {
      setError("Super admin accounts cannot be deleted.");
      return;
    }
    setError("");
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/superadmin/admins?id=${record.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error || "Failed to delete account.");
      setPendingDelete(null);
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete account.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeAdmins = admins.filter((a) => a.is_active);
  const archivedAdmins = admins.filter((a) => !a.is_active);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center gap-10 bg-emerald-50 py-10">
      <h1 className="text-primary text-3xl font-bold font-josefin">
        Welcome, Super Admin
      </h1>
      <div className="h-[75vh] w-[85vw] mx-auto max-w-7xl bg-white border border-gray-200 rounded-sm shadow-sm flex flex-col">
        {/* Tabs */}
        <div className="flex items-center border-b border-gray-200 px-4 py-2 gap-1">
          <button
            onClick={() => setActiveTab("manage")}
            className={`text-xs font-bold px-4 py-1.5 ${activeTab === "manage" ? "bg-emerald-700" : "bg-emerald-600"} text-white`}
          >
            MANAGE STAFF
          </button>

          <button
            onClick={() => setActiveTab("archived")}
            className={`text-xs font-bold px-4 py-1.5 ${activeTab === "archived" ? "bg-gray-500" : "bg-gray-400"} text-white`}
          >
            ARCHIVED STAFF
          </button>
        </div>

        {/* Controls bar — shown on manage & archived tabs */}

        {/* Error banner */}
        {error && (
          <div className="mx-6 mb-2 px-4 py-2 rounded text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* ── MANAGE STAFF TAB ── */}
        {activeTab === "manage" && (
          <div className="px-6 pb-6 overflow-y-auto flex-1">
            {loading ? (
              <p className="py-10 text-center text-sm text-gray-500">
                Loading...
              </p>
            ) : (
              <>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-t border-b">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Position</th>
                      <th className="py-3 px-4 font-semibold">Email/Contact</th>
                      <th className="py-3 px-4 font-semibold">Date Added</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeAdmins.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-gray-400"
                        >
                          No active staff found.
                        </td>
                      </tr>
                    ) : (
                      activeAdmins.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-4 px-4 text-xs font-bold uppercase text-gray-900">
                            {record.name}
                          </td>
                          <td className="py-4 px-4 text-xs text-gray-500">
                            {record.is_superadmin
                              ? "Full control of the system"
                              : "Admin"}
                          </td>
                          <td className="py-4 px-4 text-xs text-gray-500">
                            {record.email}
                          </td>
                          <td className="py-4 px-4 text-xs text-gray-500">
                            {new Date(record.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                              ACTIVE
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <input type="checkbox" className="w-4 h-4" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="mt-6">
                  <LeadLinksManager compact />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ARCHIVED STAFF TAB ── */}
        {activeTab === "archived" && (
          <div className="px-6 pb-10 overflow-y-auto flex-1">
            {loading ? (
              <p className="py-10 text-center text-sm text-gray-500">
                Loading...
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-t border-b">
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Position</th>
                    <th className="py-3 px-4 font-semibold">Email/Contact</th>
                    <th className="py-3 px-4 font-semibold">Date Added</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedAdmins.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-gray-400"
                      >
                        No archived staff found.
                      </td>
                    </tr>
                  ) : (
                    archivedAdmins.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4 text-xs font-bold uppercase text-gray-900">
                          {record.name}
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-500">
                          {record.is_superadmin
                            ? "Full control of the system"
                            : "Admin"}
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-500">
                          {record.email}
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-500">
                          {new Date(record.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">
                            ARCHIVED
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                void toggleRole(record);
                              }}
                              className="px-2 py-1 rounded text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200"
                            >
                              {record.is_superadmin
                                ? "Set Admin"
                                : "Set Super Admin"}
                            </button>
                            <button
                              onClick={() => {
                                void toggleStatus(record);
                              }}
                              className="px-2 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              Activate
                            </button>
                            <button
                              onClick={() => {
                                setPendingDelete(record);
                              }}
                              disabled={record.is_superadmin}
                              className="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white disabled:opacity-40"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">
              Confirm account deletion
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Delete <span className="font-semibold">{pendingDelete.name}</span>{" "}
              ({pendingDelete.email})? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleteLoading}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void deleteAdmin(pendingDelete);
                }}
                disabled={deleteLoading}
                className="px-3 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
