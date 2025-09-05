"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useModalWatch } from "@/components/ModalContext";

type Props = {
  open: boolean;
  userData?: Record<string, any> | null;
  onClose: () => void;
  onDeleted?: () => void;
};

export default function DeleteUserModal({ open, userData, onClose, onDeleted }: Props) {
  useModalWatch(open);
  const { signOut } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleDelete(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!userData) return;
    setSubmitting(true);
    setError(null);

    try {
      const id = userData.user_id ?? userData.id;
      if (!id) {
        setError("Missing user id");
        setSubmitting(false);
        return;
      }

      await API.delete(`/users/${id}`);

      setShowInfo(true);
    } catch (err: any) {
      console.error("delete user error:", err);
      if (err?.response?.status === 401) {
        signOut();
        window.location.href = "/auth/sign-in";
        return;
      }
      setError(err?.response?.data?.meta?.message ?? err?.message ?? "Failed to delete user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="w-full md:w-[520px] max-h-[95vh] overflow-auto rounded-t-lg md:rounded-lg bg-white p-5 md:p-6">
        {showInfo ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold">User Deleted</h3>
              <button onClick={onClose} aria-label="Close" className="text-gray-600">✕</button>
            </div>
            <p className="text-sm text-gray-700"> {userData?.username ?? "—"} has been successfully <span className="text-red-500 font-semibold">deleted</span>.</p>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  onDeleted?.();
                  setShowInfo(false);
                  onClose();
                }}
                className="px-4 py-2 bg-gray-300 text-sm text-black rounded"
              >
                Okay
              </button>
            </div>

          </>
        ) : (
          <form onSubmit={handleDelete} className="space-y-4">
              <div>
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete this User?
                </p>

                <div className="mt-3 text-sm text-gray-800">
                  <div><strong>Username:</strong> {userData?.username ?? "—"}</div>
                  <div className="mt-1"><strong>Full name:</strong> {userData?.full_name ?? "—"}</div>
                </div>
              </div>

              {error && <div className="text-red-600">{error}</div>}

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  {submitting ? "Menghapus..." : "Yes, Delete"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded"
                  disabled={submitting}
                >
                  No
                </button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
}
