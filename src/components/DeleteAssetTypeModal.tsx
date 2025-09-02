"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";

type RawAssetType = {
  id?: number | string;
  name?: string;
  description?: string;
  created_at?: string;
  [k: string]: any;
};

type Props = {
  open: boolean;
  assetType?: RawAssetType | undefined | null;
  onClose: () => void;
  onDeleted?: () => void;
};

export default function DeleteAssetTypeModal({ open, assetType, onClose, onDeleted }: Props) {
  const { signOut } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleDelete(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!assetType) return;
    const id = assetType.id ?? (assetType as any).rawId;
    if (!id) {
      setError("Missing asset id");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await API.delete(`/asset-type/${id}`);
      onDeleted?.();
      onClose();
    } catch (err: any) {
      console.error("delete asset type error:", err);
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">Hapus Tipe Asset</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-600">✕</button>
        </div>

        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <p className="text-sm text-gray-700">Apakah Anda yakin ingin menghapus tipe asset ini? Aksi ini tidak bisa dibatalkan.</p>

            <div className="mt-3 text-sm text-gray-800">
              <div><strong>ID:</strong> {String(assetType?.id ?? "—")}</div>
              <div className="mt-1"><strong>Nama:</strong> {assetType?.name ?? "—"}</div>
              <div className="mt-1"><strong>Deskripsi:</strong> {assetType?.description ?? "—"}</div>
            </div>
          </div>

          {error && <div className="text-red-600">{error}</div>}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              {submitting ? "Menghapus..." : "Ya, Hapus"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={submitting}
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
