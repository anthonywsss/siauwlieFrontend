"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useModalWatch } from "@/components/ModalContext";

type RawAsset = {
  id: string | number;
  qr_code?: string;
  status?: string | null;
  current_client?: number | null;
  photo?: string | null;
  asset_type_id?: number | null;
  [k: string]: any;
};

type Client = { id: number; name: string };
type AssetType = { id: number; name: string };

type Props = {
  open: boolean;
  assetType?: RawAsset | null;
  onClose: () => void;
  onUpdated?: () => void;
};

const STATUS_OPTIONS = [
  { value: "outbound_to_client", label: "In Transit to Customer" },
  { value: "inbound_at_client", label: "At Customer" },
  { value: "outbound_to_factory", label: "In Transit to Factory" },
  { value: "inbound_at_factory", label: "At Factory" },
];

export default function EditAssetModal({ open, assetType, onClose, onUpdated }: Props) {
  useModalWatch(open);
  const { signOut } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [assetTypeId, setAssetTypeId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setShowInfo(false);
      setSubmitting(false);
    }

    // populate form when modal opens or assetType changes
    if (assetType) {
      setQrCode(assetType.qr_code ?? "");
      setStatus(assetType.status ?? "");
      setClientId(typeof assetType.current_client === "number" ? assetType.current_client : null);
      setPhotoUrl(assetType.photo ?? null);
      setAssetTypeId(typeof assetType.asset_type_id === "number" ? assetType.asset_type_id : null);
    } else {
      setQrCode("");
      setStatus("");
      setClientId(null);
      setPhotoUrl(null);
      setAssetTypeId(null);
    }
  }, [open, assetType]);

  // fetch clients and types
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([API.get("/clients"), API.get("/asset-type")]);
        if (!mounted) return;
        setClients(Array.isArray(cRes?.data?.data) ? cRes.data.data : []);
        setAssetTypes(Array.isArray(tRes?.data?.data) ? tRes.data.data : []);
      } catch (err: any) {
        console.error("fetching clients/types error:", err);
        if (err?.response?.status === 401) {
          signOut();
          try { window.location.href = "/auth/sign-in" } catch {}
        }
      }
    })();
    return () => { mounted = false };
  }, []);

  if (!open) return null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!assetType?.id) {
      setError("Missing asset id");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const id = String(assetType.id);

      const payload: any = {
        qr_code: qrCode ?? "",
        status: status ?? null,
        current_client: clientId ?? null,
        asset_type_id: assetTypeId ?? null,
      };

      if (photoFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(photoFile);
        });
        payload.photo = base64;
      }

      await API.put(`/asset/${id}`, payload);

      setShowInfo(true);
      onUpdated?.();
    } catch (err: any) {
      console.error("update asset error:", err);
      if (err?.response?.status === 401) {
        signOut();
        try { window.location.href = "/auth/sign-in" } catch {}
        return;
      }
      setError(err?.response?.data?.meta?.message ?? err?.message ?? "Failed to update asset");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="w-full md:w-[640px] max-h-[95vh] overflow-auto rounded-t-lg md:rounded-lg bg-white p-5 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {showInfo ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold">Asset Updated</h3>
                <button onClick={onClose} aria-label="Close" className="text-gray-600">✕</button>
              </div>
              <p className="text-sm text-gray-700">Asset has been successfully <span className="text-green-600 font-semibold">updated</span>.</p>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
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
                <h3 className="mb-3 text-2xl font-semibold">Edit Asset</h3>
                <p className="text-sm text-gray-700">Update the asset details below. ID: <span className="font-mono">{String(assetType?.id ?? "-")}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">QR Code URL</label>
                <input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  placeholder="https://... or data:image/..."
                  disabled={submitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Asset Type</label>
                <select value={assetTypeId ?? ""}
                  onChange={(e) => setAssetTypeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border rounded p-2 text-sm" disabled={submitting}>
                  <option value="">-- Select type --</option>
                  {assetTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Photo (optional)</label>
                {photoUrl && (
                  <div className="mb-2">
                    <a href={photoUrl} target="_blank" rel="noreferrer" className="underline text-primary">View current photo</a>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} disabled={submitting} />
              </div>

              {error && <div className="text-red-600">{error}</div>}

              <div className="flex items-center gap-3 mt-2">
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white rounded">
                  {submitting ? "Updating..." : "Update Asset"}
                </button>

                <button type="button" onClick={onClose} className="px-4 py-2 border rounded" disabled={submitting}>
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
