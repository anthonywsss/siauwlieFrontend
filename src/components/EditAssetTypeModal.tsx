"use client";

import React, { useEffect, useState } from "react";
import { safePut } from "@/lib/fetcher";
import { useAuth } from "@/components/Auth/auth-context";
import { useModalWatch } from "@/components/ModalContext";

type RawAssetType = {
  id?: number | string;
  name?: string;
  description?: string;
  created_at?: string;
  [k: string]: any;
};

type Props = {
  open: boolean;
  assetType?: RawAssetType;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function EditAssetTypeModal({ open, assetType, onClose, onUpdated }: Props) {
  useModalWatch(open); 
  const { signOut } = useAuth();
  const [name, setName] = useState(assetType?.name ?? "");
  const [description, setDescription] = useState(assetType?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // keep inputs in sync if assetType prop changes
  useEffect(() => {
    setName(assetType?.name ?? "");
    setDescription(assetType?.description ?? "");
    setError(null);
  }, [assetType, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!assetType?.id) {
      setError("Missing asset type id");
      return;
    }
    if (!name.trim()) {
      setError("Name required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
      };

      // Use PUT on /asset-type/:id (matches Postman)
      const result = await safePut(`/asset-type/${assetType.id}`, payload);
      
      // If result is null, it means we were unauthorized and handled by the safePut function
      if (result === null) {
        return;
      }

      onUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("update asset type error:", err);
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
          <h3 className="text-2xl font-semibold">Edit Tipe Aset</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nama</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          {error && <div className="text-red-600">{error}</div>}

          <div className="flex justify-end items-center gap-3 mt-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
              {submitting ? "Memperbarui..." : "Simpan"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
