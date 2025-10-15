"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import API from "@/lib/api";
import dayjs from "dayjs";
import { CloseIcon } from "@/components/Tables/icons";
import { useModalWatch } from "@/components/ModalContext";

type UnfinishedDetail = {
  asset_id?: string;
  client_id?: number;
  user_id?: number;
  timestamp?: string;
  photo?: string | null;
  photos?: string[] | null;
  notes?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  quantity?: number | null;
  movement_type?: string | null;
  accuracy?: number | string | null;
  [k: string]: any;
};

export default function Page() {
  const params = useParams() as { assetId?: string };
  const assetId = params?.assetId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<UnfinishedDetail[]>([]);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Normalize different photo formats (plain base64, data URL, or URL)
  function buildImageSrc(photo?: string | null): string | null {
    if (!photo) return null;
    const trimmed = photo.trim();
    if (/^data:image\//i.test(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    // Detect common base64 signatures
    const startsWith = (s: string) => trimmed.startsWith(s);
    let mime = "image/jpeg";
    if (startsWith("iVBORw0KGgo")) mime = "image/png";       // PNG
    else if (startsWith("/9j/")) mime = "image/jpeg";          // JPEG
    else if (startsWith("R0lGOD")) mime = "image/gif";         // GIF
    else if (startsWith("UklGR")) mime = "image/webp";         // WEBP

    return `data:${mime};base64,${trimmed}`;
  }

  const openPreview = (photo?: string | null, allPhotos?: (string | null)[] | null, startIndex: number = 0) => {
    if (allPhotos && allPhotos.length > 0) {
      // Multiple photos - show gallery
      const validPhotos = allPhotos.map(p => buildImageSrc(p)).filter(p => p !== null) as string[];
      setPreviewPhotos(validPhotos);
      setCurrentPhotoIndex(startIndex);
      setIsOpen(true);
    } else {
      // Single photo
      const src = buildImageSrc(photo);
      setPreviewSrc(src);
      setPreviewPhotos([]);
      setCurrentPhotoIndex(0);
      setIsOpen(true);
    }
  };

  // Close preview on Escape, navigate with arrow keys
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setPreviewSrc(null);
        setPreviewPhotos([]);
        setCurrentPhotoIndex(0);
      } else if (e.key === "ArrowLeft" && previewPhotos.length > 1) {
        setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : previewPhotos.length - 1));
      } else if (e.key === "ArrowRight" && previewPhotos.length > 1) {
        setCurrentPhotoIndex((prev) => (prev < previewPhotos.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, previewPhotos.length]);

  const mapped = record.map((u, index) => ({
    id: String(u.asset_id ?? u.user_id ?? index),
    clientId: u.client_id ?? "-",
    userId: u.user_id ?? "-",
    timestamp: u.timestamp ?? "-",
    photo: u.photo ?? null,
    photos: u.photos ?? null,
    notes: u.notes ?? "-",
    latitude: u.latitude ?? "-",
    longitude: u.longitude ?? "-",
    quantity: u.quantity ?? 0,
    movementType: u.movement_type ?? "-",
    accuracy: u.accuracy ?? "-",
    raw: u, 
}));

  useEffect(() => {
    if (!assetId) {
      setError("Asset ID tidak ada pada URL");
      setLoading(false);
      return;
    }

    let mounted = true;
    async function load() {
      try {
        if (!assetId) return;
        // Try detail endpoint first; if 403, fall back to list and filter by assetId
        try {
          const detailRes = await API.get(`/movements/unfinished/detail/${encodeURIComponent(assetId)}`);
          const payload = detailRes?.data?.data;
          if (Array.isArray(payload)) {
            setRecord(payload);
          } else if (payload) {
            setRecord([payload]);
          } else {
            setRecord([]);
          }
        } catch (e: any) {
          if (e?.response?.status === 403) {
            try {
              const fb = await API.get("/movements/unfinished");
              const list: any[] = fb?.data?.data ?? [];
              const filtered = list.filter((x: any) => String(x?.asset_id ?? "") === String(assetId));
              setRecord(filtered);
            } catch (e2) {
              throw e; // bubble up the original 403 if fallback fails
            }
          } else {
            throw e;
          }
        }

        if (!mounted) return;

        const [clientsRes, usersRes] = await Promise.allSettled([API.get("/clients"), API.get("/users")]);

        if (!mounted) return;

        if (clientsRes.status === "fulfilled") {
          const arr = clientsRes.value?.data?.data ?? [];
          const map: Record<string, any> = {};
          for (const c of arr) {
            const id = c.id ?? c.client_id ?? c.clientId;
            if (id != null) map[String(id)] = c;
          }
          setClients(map);
        }

        if (usersRes.status === "fulfilled") {
          const arr = usersRes.value?.data?.data ?? [];
          const map: Record<string, any> = {};
          for (const u of arr) {
            const id = u.user_id ?? u.id ?? u.userId;
            if (id != null) map[String(id)] = u;
          }
          setUsers(map);
        }

        setLoading(false);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.meta?.message ?? err?.message ?? "Gagal memuat data.");
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [assetId]);
  
  function getGoogleMapsLink(lat: number, lng: number) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

   //status
  function movementTypeToStatus(status?: string | null) {
  if (!status) return "Unknown";

  switch (status.toLowerCase()) {
    case "outbound_to_client":
      return "Pengiriman ke Klien";
    case "inbound_at_client":
      return "Di Klien";
    case "outbound_to_factory":
      return "Pengiriman ke pabrik";
    case "inbound_at_factory":
      return "Di pabrik";
    default:
      return "-";
  }
}

  
    return (
      <div className="relative z-0 p-4 sm:p-7.5 bg-white min-h-[60vh] rounded-[10px] border border-stroke shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
        <div className="max-w-[1100px] mx-auto">
          {/* Title + actions */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-bold leading-[30px] text-dark dark:text-white">
                Sedang Dikirim <span className="text-gray-600">[{assetId ?? "—"}]</span>
              </h1>
              <p className="mt-1 text-sm text-gray-500">Rincian pengiriman yang belum tuntas</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-fit px-4 py-2 text-md font-medium leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg hover:bg-purple-700"
              >
                Kembali
              </button>
            </div>
          </div>

          {/* Error / Loading */}
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-100 rounded w-1/3" />
              <div className="h-40 bg-gray-100 rounded" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded">{error}</div>
          ) : record.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-700 rounded">Tidak ada data.</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto rounded-md border border-stroke dark:border-dark-3">
                  <table className="min-w-full table-fixed">
                    <thead>
                      <tr className="bg-[#F7F9FC] dark:bg-dark-2">
                        {["Username", "Status", "Klien", "Waktu Pencatatan", "Foto", "Catatan", "Lokasi", "Kuantitas"].map((h) => (
                          <th
                            key={h}
                            className="px-6 py-4 text-left text-base font-medium text-dark dark:text-white border-r"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {record.map((rec, i) => {
                        const userLabel = users[String(rec.user_id)]?.full_name ?? rec.user_id;
                        const clientLabel = clients[String(rec.client_id)]?.name ?? rec.client_id;
                        return (
                          <tr key={i} className="bg-white dark:bg-gray-dark border-t border-stroke dark:border-dark-3">
                            <td className="px-6 py-4 text-dark dark:text-white">{userLabel}</td>
                            <td className="px-6 py-4 text-dark dark:text-white">{movementTypeToStatus(rec.movement_type)}</td>
                            <td className="px-6 py-4 text-dark dark:text-white">{clientLabel}</td>
                            <td className="px-6 py-4 text-dark dark:text-white">
                              {rec.timestamp ? dayjs(rec.timestamp).format("MMM DD, YYYY - HH:mm") : "-"}
                            </td>
                            <td className="px-6 py-4 text-dark dark:text-white">
                              {rec.photos && Array.isArray(rec.photos) && rec.photos.length > 0 ? (
                                <div className="flex gap-2 flex-wrap">
                                  {rec.photos.slice(0, 3).map((photo, photoIndex) => (
                                    <div key={photoIndex} className="relative group">
                                      <img
                                        src={buildImageSrc(photo) || ""}
                                        loading="lazy"
                                        alt={`photo-${rec.asset_id}-${photoIndex + 1}`}
                                        className="w-[140px] h-[96px] object-cover rounded cursor-pointer border hover:opacity-80 transition-opacity"
                                        onClick={() => openPreview(photo, rec.photos, photoIndex)}
                                      />
                                      <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                                        {photoIndex + 1}/{rec.photos?.length ?? 0}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : rec.photo ? (
                                <img
                                  src={buildImageSrc(rec.photo) || ""}
                                  alt={`photo-${rec.asset_id}`}
                                  className="w-[140px] h-[96px] object-cover rounded cursor-pointer border hover:opacity-80 transition-opacity"
                                  onClick={() => openPreview(rec.photo)}
                                />
                              ) : (
                                <div className="text-gray-400">Tidak ada foto</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-dark dark:text-white">{rec.notes ?? "-"}</td>
                            <td className="px-6 py-4 text-dark dark:text-white">
                              <button
                                onClick={() => window.open(
                                  getGoogleMapsLink(Number(rec.latitude), Number(rec.longitude)),
                                  "_blank"
                                )}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition whitespace-nowrap"
                              >
                                Buka Google Maps
                              </button>
                            </td>
                            <td className="px-6 py-4 text-dark dark:text-white">{rec.quantity ?? "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards (loop also here) */}
              <div className="md:hidden space-y-4">
                {record.map((rec, i) => {
                  const userLabel = users[String(rec.user_id)]?.full_name ?? rec.user_id;
                  const clientLabel = clients[String(rec.client_id)]?.name ?? rec.client_id;
                  return (
                    <div key={i} className="p-4 rounded-md border bg-white dark:border-dark-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500">User</div>
                          <div className="text-sm font-medium text-dark dark:text-white">{userLabel}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Status</div>
                          <div className="text-sm text-dark dark:text-white">{movementTypeToStatus(rec.movement_type)}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-500">
                            Klien
                          </div>
                          <div className="text-sm text-dark dark:text-white">
                            {clientLabel}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Waktu
                          </div>
                          <div className="text-sm text-dark dark:text-white whitespace-nowrap">
                            {rec.timestamp ? dayjs(rec.timestamp).format("MMM DD, YYYY - HH:mm") : "-"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-gray-500">
                          Foto
                        </div>
                        {rec.photos && Array.isArray(rec.photos) && rec.photos.length > 0 ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                                  {rec.photos.slice(0, 3).map((photo, photoIndex) => (
                                    <div key={photoIndex} className="relative group">
                                      <img
                                        src={buildImageSrc(photo) || ""}
                                        loading="lazy"
                                  alt={`photo-${rec.asset_id}-${photoIndex + 1}`}
                                  className="w-full h-32 object-cover rounded cursor-pointer border hover:opacity-80 transition-opacity"
                                  onClick={() => openPreview(photo, rec.photos, photoIndex)}
                                />
                                <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                                  {photoIndex + 1}/{rec.photos?.length ?? 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : rec.photo ? (
                          <img
                            src={buildImageSrc(rec.photo) || ""}
                            alt={`photo-${rec.asset_id}`}
                            className="mt-2 w-full h-44 object-cover rounded cursor-pointer border hover:opacity-80 transition-opacity"
                            onClick={() => openPreview(rec.photo)}
                          />
                        ) : ( 
                          <div className="text-gray-400 mt-2">Tidak ada foto</div> )}
                      </div>
                      <div className="mt-3"> 
                        <div className="text-xs text-gray-500">
                          Catatan 
                        </div>
                        <div className="text-sm text-dark dark:text-white">
                          {rec.notes ?? "-"}
                        </div> 
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3"> 
                        <div> 
                          <div className="text-xs text-gray-500">
                            Lokasi
                          </div> 
                          <div className="text-sm text-dark dark:text-white">
                            <button 
                              onClick={ () => window.open(getGoogleMapsLink(Number(rec.latitude), Number(rec.longitude)), "_blank")}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition whitespace-nowrap mt-1 mb-3" >
                                Buka Google Maps
                            </button>
                          </div>
                        </div>
                      </div>

                      <div> 
                        <div className="text-xs text-gray-500">
                          Kuantitas
                        </div>
                        <div className="text-sm text-dark dark:text-white">
                          {rec.quantity ?? "-"}
                        </div>
                      </div>
                      {/* Lower Mobile details card */}
                      {/*
                        <div className="p-4 rounded-md border bg-[#F7F9FC] dark:bg-dark-2 dark:border-dark-3 shadow-sm">
                          <div className="text-xs text-gray-500">Asset ID</div>
                          <div className="text-sm font-medium text-dark dark:text-white">{record.asset_id}</div>
                          <div className="mt-3 text-xs text-gray-500">Accuracy</div>
                          <div className="text-sm text-dark dark:text-white">{record.accuracy ?? "-"}</div>
                        </div> 
                      */}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <PreviewModal 
          open={isOpen} 
          src={previewSrc}
          photos={previewPhotos}
          currentIndex={currentPhotoIndex}
          onClose={() => {
            setIsOpen(false);
            setPreviewSrc(null);
            setPreviewPhotos([]);
            setCurrentPhotoIndex(0);
          }}
          onNavigate={(newIndex) => setCurrentPhotoIndex(newIndex)}
        />
      </div>

    );
}

function PreviewModal({ 
  open, 
  src, 
  photos = [],
  currentIndex = 0,
  onClose,
  onNavigate
}: { 
  open: boolean; 
  src: string | null; 
  photos?: string[];
  currentIndex?: number;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}) {
  useModalWatch(open);

  if (!open) return null;

  const hasMultiplePhotos = photos.length > 1;
  const displaySrc = photos.length > 0 ? photos[currentIndex] : src;

  const handlePrevious = () => {
    if (onNavigate && hasMultiplePhotos) {
      onNavigate(currentIndex > 0 ? currentIndex - 1 : photos.length - 1);
    }
  };

  const handleNext = () => {
    if (onNavigate && hasMultiplePhotos) {
      onNavigate(currentIndex < photos.length - 1 ? currentIndex + 1 : 0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-w-[98vw] max-h-[96vh] overflow-auto bg-white rounded shadow-lg p-3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          {hasMultiplePhotos && (
            <div className="text-sm font-medium text-gray-700">
              Foto {currentIndex + 1} dari {photos.length}
            </div>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border text-sm inline-flex items-center gap-2 ml-auto"
          >
            <CloseIcon />
            Tutup
          </button>
        </div>

        <div className="relative">
          {displaySrc ? (
            <img src={displaySrc} alt={`preview ${currentIndex + 1}`} className="max-w-full max-h-[80vh] object-contain mx-auto" />
          ) : (
            <div className="p-8 text-center text-gray-500">Tidak ada gambar tersedia untuk item ini.</div>
          )}

          {/* Navigation arrows for multiple photos */}
          {hasMultiplePhotos && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
                title="Foto sebelumnya (←)"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
                title="Foto selanjutnya (→)"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Thumbnail navigation for multiple photos */}
        {hasMultiplePhotos && (
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => onNavigate && onNavigate(index)}
                className={`w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                  index === currentIndex 
                    ? 'border-blue-500 ring-2 ring-blue-300' 
                    : 'border-gray-300 hover:border-blue-400'
                }`}
                title={`Foto ${index + 1}`}
              >
                <img 
                  src={photo} 
                  alt={`thumbnail ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
