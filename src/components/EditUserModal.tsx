"use client";

import React, { useEffect, useState } from "react";
import { safeGet, safePut } from "@/lib/fetcher";
import { useAuth } from "@/components/Auth/auth-context";
import { useModalWatch } from "@/components/ModalContext";

type Props = {
  open: boolean;
  userData?: Record<string, any> | null;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function EditUserModal({ open, userData, onClose, onUpdated }: Props) {
  useModalWatch(open); 
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

  // fetch roles once, fallback to observed roles from Postman
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await safeGet<{ data: string[] }>("/roles");
        const list: string[] = res?.data ?? [];
        if (!mounted) return;
        if (Array.isArray(list) && list.length > 0) {
          setRoles(list);
        } else {
          throw new Error("no roles from server");
        }
      } catch {
        setRoles(["driver", "supervisor", "security"]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (userData) {
      setUsername(userData.username ?? "");
      setFullName(userData.full_name ?? "");
      setEmployeeId(userData.employee_id ?? "");
      // make sure role preselect picks server value or falls back to first role
      setRole(userData.role ?? (roles.length ? roles[0] : ""));
    } else {
      setUsername("");
      setFullName("");
      setEmployeeId("");
      setRole(roles.length ? roles[0] : "");
    }
    // reset password fields whenever userData changes or modal opens
    setPassword("");
    setConfirmPassword("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, roles]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userData) return;
    setError(null);
    setSubmitting(true);

    try {
      const id = userData.user_id ?? userData.id;
      if (!id) {
        setError("Missing user id");
        setSubmitting(false);
        return;
      }

      // basic validation for password if provided
      if (password) {
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setSubmitting(false);
          return;
        }
      }

      const payload: Record<string, any> = {
        username: username.trim(),
        full_name: fullName.trim(),
        employee_id: employeeId.trim(),
        role: role.trim(),
      };

      // only include password if user provided one
      if (password) payload.password = password;

      const result = await safePut(`/users/${id}`, payload);
      
      // If result is null, it means we were unauthorized and handled by the safePut function
      if (result === null) {
        setSubmitting(false);
        return;
      }
      
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="w-full md:w-[640px] max-h-[95vh] overflow-auto rounded-t-lg md:rounded-lg bg-white p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">Edit User</h3>
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
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded border px-3 py-2">
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">New Password (leave blank to keep current)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          {error && <div className="text-red-600">{error}</div>}

          <div className="flex items-center gap-3 mt-2">
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
