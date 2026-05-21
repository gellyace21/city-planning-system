"use client";

import React, { useEffect, useState } from "react";

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
  const [activeTab, setActiveTab] = useState<
    "manage" | "register" | "archived"
  >("manage");
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
      <div className="h-[60vh] w-[60vw] mx-auto max-w-5xl bg-white border border-gray-200 rounded-sm shadow-sm">
        {/* Tabs */}
        <div className="flex items-center border-b border-gray-200 px-4 py-2 gap-1">
          <button
            onClick={() => setActiveTab("manage")}
            className={`text-xs font-bold px-4 py-1.5 ${activeTab === "manage" ? "bg-emerald-700" : "bg-emerald-600"} text-white`}
          >
            MANAGE STAFF
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`text-xs font-bold px-4 py-1.5 ${activeTab === "register" ? "bg-sky-600" : "bg-sky-500"} text-white`}
          >
            REGISTER REQUEST
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`text-xs font-bold px-4 py-1.5 ${activeTab === "archived" ? "bg-gray-500" : "bg-gray-400"} text-white`}
          >
            ARCHIVED STAFF
          </button>
        </div>

        {/* Controls bar — shown on manage & archived tabs */}
        {activeTab !== "register" && (
          <div className="px-6 py-4 flex items-center">
            {/* Centered search */}
            <div className="flex-1 flex justify-center">
              <div className="w-2/3 flex">
                <input
                  type="text"
                  placeholder="Search Name, Position"
                  className="w-full border border-gray-300 rounded-l px-3 py-2 text-sm focus:outline-none"
                />
                <button className="bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-2 rounded-r text-sm">
                  🔍
                </button>
              </div>
            </div>
            {/* Right actions */}
            <div className="flex items-center gap-5">
              <button
                onClick={() => setActiveTab("register")}
                className="text-xs font-semibold flex items-center gap-1.5 text-gray-700"
              >
                ADD STAFF
                <span className="bg-emerald-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-base leading-none">
                  +
                </span>
              </button>
              <span className="text-sm text-gray-600 cursor-pointer select-none">
                Sort by ⤓
              </span>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <label>SELECT ALL</label>
                <input type="checkbox" className="w-4 h-4" />
                <button className="bg-red-500 text-white text-xs px-3 py-1 rounded ml-1">
                  ARCHIVE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-6 mb-2 px-4 py-2 rounded text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* ── MANAGE STAFF TAB ── */}
        {activeTab === "manage" && (
          <div className="px-6 pb-10">
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
            )}
          </div>
        )}

        {/* ── REGISTER REQUEST TAB ── */}
        {activeTab === "register" && (
          <div className="px-6 py-6">
            <h2 className="text-sm font-bold text-gray-800 mb-4">
              Register New Staff
            </h2>
            <form
              onSubmit={(e) => {
                void createAdmin(e);
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                required
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                className="px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                required
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Temporary password"
                type="password"
                className="px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                required
              />
              <input
                value={profilePic}
                onChange={(e) => setProfilePic(e.target.value)}
                placeholder="Profile photo URL (optional)"
                className="px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 col-span-1">
                <input
                  type="checkbox"
                  checked={isSuperadmin}
                  onChange={(e) => setIsSuperadmin(e.target.checked)}
                />
                Create as Super Admin
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("manage")}
                  className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── ARCHIVED STAFF TAB ── */}
        {activeTab === "archived" && (
          <div className="px-6 pb-10">
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
