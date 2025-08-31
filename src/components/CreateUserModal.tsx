"use client";

import React, { useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void; // callback
};

export default function CreateUserModal({ open, onClose, onCreated }: Props) {
  const { signOut } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState("driver");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username || !password || !fullName) {
      setError("Username, password and full name are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        username,
        password,
        full_name: fullName,
        employee_id: employeeId,
        role,
        photo: "",
      };
      await API.post("/users", payload);
      if ((window as any).showToast) (window as any).showToast("User created");
      onCreated?.();

      // reset & close
      setUsername("");
      setPassword("");
      setFullName("");
      setEmployeeId("");
      setRole("driver");
      onClose();
    } catch (err: any) {
      console.error("create user error:", err);
      if (err?.response?.status === 401) {
        signOut();
        window.location.href = "/auth/sign-in";
        return;
      }
      setError(err?.response?.data?.meta?.message ?? err?.message ?? "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-lg">
        <h3 className="text-2xl font-semibold mb-4">Add New User</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Fullname</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Employee ID</label>
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded border px-3 py-2">
              <option value="admin">admin</option>
              <option value="supervisor">supervisor</option>
              <option value="driver">driver</option>
            </select>
          </div>

          {error && <div className="text-red-600">{error}</div>}

          <div className="flex items-center gap-3 mt-4">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
              {submitting ? "Creating..." : "Submit"}
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
