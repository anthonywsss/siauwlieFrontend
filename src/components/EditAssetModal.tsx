"use client";

import React, { useEffect, useState } from "react";
import { safeGet, safePut } from "@/lib/fetcher";
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
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [previewPhotoSrc, setPreviewPhotoSrc] = useState<string | null>(null);

  const [qrCode, setQrCode] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [assetTypeId, setAssetTypeId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);

  function buildImageSrc(photo?: string | null): string | null {
    if (!photo) return null;
    const trimmed = photo.trim();
    if (/^data:image\//i.test(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const startsWith = (s: string) => trimmed.startsWith(s);
    let mime = "image/jpeg";
    if (startsWith("iVBORw0KGgo")) mime = "image/png";
    else if (startsWith("/9j/")) mime = "image/jpeg";
    else if (startsWith("R0lGOD")) mime = "image/gif";
    else if (startsWith("UklGR")) mime = "image/webp";

    return `data:${mime};base64,${trimmed}`;
  }

  const openPhotoPreview = (src: string | null) => {
    if (!src) return;
    setPreviewPhotoSrc(buildImageSrc(src));
    setShowPhotoPreview(true);
  };

  const closePhotoPreview = () => {
    setShowPhotoPreview(false);
    setPreviewPhotoSrc(null);
  };

  useEffect(() => {
    if (!open) {
      setError(null);
      setShowInfo(false);
      setSubmitting(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    }

    if (assetType) {
      setQrCode(assetType.qr_code ?? "");
      setPhotoUrl(assetType.photo ?? null);
      setAssetTypeId(typeof assetType.asset_type_id === "number" ? assetType.asset_type_id : null);
    } else {
      setQrCode("");
      setPhotoUrl(null);
      setAssetTypeId(null);
    }
  }, [open, assetType]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  };

  // Clear photo selection
  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // fetch asset types
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tRes = await safeGet<{ data: AssetType[] }>("/asset-type");
        if (!mounted) return;
        setAssetTypes(Array.isArray(tRes?.data) ? tRes.data : []);
      } catch (err: any) {
        console.error("fetching asset types error:", err);
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

      const result = await safePut(`/asset/${id}`, payload);
      
      // If result is null, it means we were unauthorized and handled by the safePut function
      if (result === null) {
        setSubmitting(false);
        return;
      }

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
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl max-h-[95vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
          {showInfo ? (
            /* Success State */
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Asset Updated</h3>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Aset berhasil diperbarui.
              </p>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowInfo(false);
                    onClose();
                  }}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
                >
                  Oke
                </button>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <div className="flex flex-col max-h-[95vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Edit Aset</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ID: <span className="font-mono text-primary">{String(assetType?.id ?? "-")}</span>
                  </p>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Close"
                  disabled={submitting}
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* QR Code Field */}
                  {/* <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      QR Code URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                        placeholder="https://... or data:image/..."
                        disabled={submitting}
                      />
                    </div>
                  </div> */}
                  
                  {/* Asset Type Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tipe Aset
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <select 
                        value={assetTypeId ?? ""}
                        onChange={(e) => setAssetTypeId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 appearance-none"
                        disabled={submitting}
                      >
                        <option value="">Pilih Tipe Aset</option>
                        {assetTypes.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Photo Field */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Foto
                    </label>
                    
                    {/* Current Photo Thumbnail */}
                    {photoUrl && !photoPreview && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Foto Saat Ini:</p>
                        <div className="relative inline-block">
                          <img
                            src={buildImageSrc(photoUrl) || photoUrl}
                            alt="Current asset photo"
                            className="w-20 h-20 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-600 cursor-pointer hover:border-primary transition-colors"
                            onClick={() => openPhotoPreview(photoUrl)}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => openPhotoPreview(photoUrl)}
                            className="absolute inset-0 bg-black/0 hover:bg-black/20 rounded-xl transition-colors flex items-center justify-center"
                          >
                            <svg className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/*Photo Preview */}
                    {photoPreview && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">New photo:</p>
                        <div className="relative inline-block">
                          <img
                            src={photoPreview}
                            alt="New asset photo"
                            className="w-20 h-20 object-cover rounded-xl border-2 border-primary"
                          />
                          <button
                            type="button"
                            onClick={clearPhoto}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* File Input */}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        disabled={submitting}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary dark:hover:border-primary transition-colors cursor-pointer"
                      >
                        <div className="text-center">
                          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {photoFile ? 'Ganti Foto' : 'Unggah Foto Terbaru'}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-3 p-6 sm:p-8 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Memperbarui...</span>
                    </div>
                  ) : (
                    'Perbarui Aset'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo Preview Modal */}
      <PhotoPreviewModal 
        open={showPhotoPreview && !!previewPhotoSrc} 
        src={previewPhotoSrc} 
        onClose={closePhotoPreview} 
      />
    </>
  );
}

function PhotoPreviewModal({ open, src, onClose }: { open: boolean; src: string | null; onClose: () => void }) {
  useModalWatch(open);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-w-[95vw] max-h-[95vh] overflow-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Photo Preview</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-center">
          <img 
            src={src} 
            alt="Asset photo preview" 
            className="max-w-full max-h-[80vh] object-contain rounded-xl"
            onError={(e) => {
              console.error('Image failed to load:', src);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
}
