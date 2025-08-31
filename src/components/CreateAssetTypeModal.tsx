"use client";

import React, { useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateAssetTypeModal({ open, onClose, onCreated }: Props) {
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Asset name required");
      return;
    }

    setSubmitting(true);
    try {
      // IMPORTANT: use singular /asset-type as in your Postman collection
      const payload = {
        name: name.trim(),
        description: description.trim(),
      };

      await API.post("/asset-type", payload);

      onCreated?.();
      // reset fields
      setName("");
      setDescription("");
      onClose();
    } catch (err: any) {
      console.error("create asset type error:", err);
      if (err?.response?.status === 401) {
        signOut();
        // mirror other modals' behavior
        window.location.href = "/auth/sign-in";
        return;
      }
      setError(err?.response?.data?.meta?.message ?? err?.message ?? "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="w-full md:w-[640px] max-h-[95vh] overflow-auto rounded-t-lg md:rounded-lg bg-white p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">Add New Asset Type</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border px-3 py-2" />
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
