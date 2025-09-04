"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";

type RawClient = {
  id?: number;
  name?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  description?: string;
  created_at?: string;
  [k: string]: any;
};

type Props = {
  open: boolean;
  client?: RawClient | undefined | null;
  onClose: () => void;
  onDeleted?: () => void;
};

export default function DeleteClientModal({ open, client, onClose, onDeleted }: Props) {
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

  async function handleDelete(e: React.FormEvent) {
    e?.preventDefault?.();
    if (!client) return;

    setSubmitting(true);
    setError(null);

    try {
      const id = client.id ?? client.id;
      if (!id) {
        setError("Missing user id");
        setSubmitting(false);
        return;
      }

      await API.delete(`/clients/${id}`);

      setShowInfo(true);
    } catch (err: any) {
      console.error("delete client error:", err);
      if (err?.response?.status === 401) {
        signOut();
        window.location.href = "/auth/sign-in";
        return;
      } 
      setError(err?.response?.data?.meta?.message ?? err?.message ?? "Gagal menghapus klien");
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
                <h3 className="text-2xl font-semibold">Client Deleted</h3>
                <button
                 onClick={() => {
                    onDeleted?.();
                    setShowInfo(false);
                    onClose();
                }}
                >✕</button>
              </div>
              <p className="text-sm text-gray-700"> Client {client?.name ?? "—"} has been successfully <span className="text-red-500 font-semibold">deleted</span>.</p>

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
                        <h3 className="mb-3 text-2xl font-semibold">Delete Client</h3>
                        <p className="text-sm text-gray-700">Are you sure you want to delete <span className="text-red-400">{client?.name ?? "—"}</span>? This action can not be undone.</p>
                    </div>
                    {error && <div className="text-red-600">{error}</div>}
                    <div className="flex items-center gap-3 mt-2">
                        <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-red-600 text-white rounded"
                        >
                        {submitting ? "Menghapus..." : "Delete Client"}
                        </button>
                        <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border rounded"
                        disabled={submitting}
                        >
                        Cancel
                        </button>
                    </div>
                </form>
        )}
      </div>
    </div>
  );
}
