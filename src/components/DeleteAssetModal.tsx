"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";

type RawAsset = {
  id: string | number;
  qr_code: string;
  status: string | null;
  current_client: number;
  photo: string;
  asset_type_id: number;
  [k: string]: any;
};

type Props = {
  open: boolean;
  AllAsset?: RawAsset;
  onClose: () => void;
  onDeleted?: () => void;
};

export default function DeleteAssetModal({ open, AllAsset, onClose, onDeleted }: Props) {
  const { signOut } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
      setReason("");
    }
  }, [open]);

  if (!open) return null;

  async function handleDelete(e?: React.FormEvent) {
    e?.preventDefault?.();
    
    if (!AllAsset) return;
    
    const id = String(AllAsset?.id);
    if (!id) {
      setError("Missing asset id");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log("Deleting asset with ID:", id);
      await API.delete(`/asset/${id}`, {
        data: { reason }
      });
      setShowInfo(true);
    } catch (err: any) {
      console.error("delete asset error:", err);
      if (err?.response?.status === 401) {
        signOut();
        try {
          window.location.href = "/auth/sign-in";
        } catch {}
        return;
      }
      setError(err?.response?.data?.meta?.message ?? err?.message ?? "Gagal menghapus asset");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="w-full md:w-[520px] max-h-[95vh] overflow-auto rounded-t-lg md:rounded-lg bg-white p-5 md:p-6">
     
        <form onSubmit={handleDelete} className="space-y-4">
          {showInfo ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold">Asset Deleted</h3>
                <button onClick={onClose} aria-label="Close" className="text-gray-600">✕</button>
              </div>
              <p className="text-sm text-gray-700"> Asset has been successfully <span className="text-red-500 font-semibold">deleted</span>.</p>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    onDeleted?.();
                    window.location.reload();
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
          <>
          <div>
            <h3 className="mb-3 text-2xl font-semibold">Delete Asset</h3>
            <p className="text-sm text-gray-700">Are you sure you want to delete this asset? This action can not be undone.</p>
          </div>
          <div>
                <label className="block text-sm font-medium mb-1">Reason for Deletion</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                  placeholder="Enter reason (e.g., Rejected Item)"
                  disabled={submitting}
                />
              </div>

          {error && <div className="text-red-600">{error}</div>}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              {submitting ? "Menghapus..." : "Delete Type"}
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
            </>
            )}
        </form>
      </div>
    </div>
  );
}
