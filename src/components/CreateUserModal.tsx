"use client";

import React, { useEffect, useState } from "react";
import { safeGet, safePost } from "@/lib/fetcher";
import { useAuth } from "@/components/Auth/auth-context";
import { useModalWatch } from "@/components/ModalContext";


type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateUserModal({ open, onClose, onCreated }: Props) {
  const { signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await safeGet<{ data: string[] }>("/roles");
        const list: string[] = res?.data ?? [];
        if (!mounted) return;
        if (Array.isArray(list) && list.length > 0) {
          setRoles(list);
          setRole((prev) => prev || String(list[0] ?? ""));
        } else {
          throw new Error("no roles from server");
        }
      } catch {
        const fallback = ["driver", "supervisor", "security"];
        if (mounted) {
          setRoles(fallback);
          setRole((prev) => prev || fallback[0]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setUsername("");
      setFullName("");
      setEmployeeId("");
      setRole(roles.length ? roles[0] : "");
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [open]);

  useModalWatch(open);


  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const result = await safePost("/users", {
        username: username.trim(),
        full_name: fullName.trim(),
        employee_id: employeeId.trim(),
        role: role.trim(),
        password: password,
      });
      
      // If result is null, it means we were unauthorized and handled by the safePost function
      if (result === null) {
        return;
      }
      
      onCreated?.();
      // reset
      setUsername("");
      setFullName("");
      setEmployeeId("");
      setRole(roles.length ? roles[0] : "");
      setPassword("");
      setConfirmPassword("");
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
    <div className="fixed inset-0 z-99 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="z-99 w-full md:w-[640px] max-h-[95vh] overflow-auto rounded-t-lg md:rounded-lg bg-white p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">Add New User</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Employee ID</label>
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded border px-3 py-2 appearance-none"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          {error && <div className="text-red-600">{error}</div>}

          <div className="flex items-center gap-3 mt-2">
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
