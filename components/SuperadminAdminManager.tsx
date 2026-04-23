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
      const data = (await response.json()) as { admins?: AdminRecord[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to load admin accounts.");
      }
      setAdmins(data.admins ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin accounts.");
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
      if (!response.ok) {
        throw new Error(data.error || "Failed to create account.");
      }
      setName("");
      setEmail("");
      setPassword("");
      setProfilePic("");
      setIsSuperadmin(false);
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
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
      if (!response.ok) {
        throw new Error(data.error || "Failed to update account.");
      }
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account.");
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
      if (!response.ok) {
        throw new Error(data.error || "Failed to update account.");
      }
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account.");
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
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account.");
      }
      setPendingDelete(null);
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Control Panel</h1>
        <p className="text-sm text-gray-500">
          Create and manage admin accounts with full authentication control.
        </p>
      </div>

      {error && (
        <div className="px-4 py-2 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={(event) => {
          void createAdmin(event);
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-gray-200 rounded-xl p-4"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
          className="px-3 py-2 rounded border border-gray-300 text-sm"
          required
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          type="email"
          className="px-3 py-2 rounded border border-gray-300 text-sm"
          required
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Temporary password"
          type="password"
          className="px-3 py-2 rounded border border-gray-300 text-sm"
          required
        />
        <input
          value={profilePic}
          onChange={(event) => setProfilePic(event.target.value)}
          placeholder="Profile photo URL (optional)"
          className="px-3 py-2 rounded border border-gray-300 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isSuperadmin}
            onChange={(event) => setIsSuperadmin(event.target.checked)}
          />
          Create as Super Admin
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
          >
            Create Account
          </button>
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Admin Accounts</h2>
          <button
            onClick={() => {
              void loadAdmins();
            }}
            className="text-sm text-sky-700 font-semibold"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-5 text-sm text-gray-500">Loading accounts...</p>
        ) : admins.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-500">No admin accounts found.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {admins.map((record) => (
              <div key={record.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{record.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {record.email} · {record.is_superadmin ? "Super Admin" : "Admin"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Created {new Date(record.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      void toggleRole(record);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200"
                  >
                    {record.is_superadmin ? "Set as Admin" : "Set as Super Admin"}
                  </button>
                  <button
                    onClick={() => {
                      void toggleStatus(record);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      record.is_active
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {record.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => {
                      setPendingDelete(record);
                    }}
                    disabled={record.is_superadmin}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Confirm account deletion</h3>
            <p className="mt-2 text-sm text-gray-600">
              Delete <span className="font-semibold">{pendingDelete.name}</span> ({pendingDelete.email})?
              This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleteLoading}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
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
      ) : null}
    </div>
  );
}
