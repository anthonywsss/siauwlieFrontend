"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";

type Props = {
  open: boolean;
  userData?: Record<string, any> | null; // raw user object from API
  onClose: () => void;
  onUpdated?: () => void;
};

export default function EditUserModal({ open, userData, onClose, onUpdated }: Props) {
  const { signOut } = useAuth();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      setFullName(userData.full_name ?? userData.name ?? "");
      setRole(userData.role ?? "");
      setPassword("");
    } else {
      setFullName("");
      setRole("");
      setPassword("");
    }
  }, [userData]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userData) return;

    setSubmitting(true);
    try {
      const id = userData.user_id ?? userData.id;
      const payload: Record<string, any> = {
        full_name: fullName,
        role,
      };
      // only send password if user changed it
      if (password) payload.password = password;

      await API.put(`/users/${id}`, payload);

      if ((window as any).showToast) (window as any).showToast("User updated");
      onUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("update user error:", err);
      if (err?.response?.status === 401) {
        signOut();
        window.location.href = "/auth/sign-in";
        return;
      }
      setError(err?.response?.data?.meta?.message ?? err?.message ?? "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-lg">
        <h3 className="text-2xl font-semibold mb-4">Edit User</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fullname</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password (leave empty to keep)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded border px-3 py-2">
              <option value="">— select role —</option>
              <option value="admin">admin</option>
              <option value="supervisor">supervisor</option>
              <option value="driver">driver</option>
            </select>
          </div>

          {error && <div className="text-red-600">{error}</div>}

          <div className="flex items-center gap-3 mt-4">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
              {submitting ? "Saving..." : "Submit"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
