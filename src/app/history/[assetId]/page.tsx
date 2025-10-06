"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import API from "@/lib/api";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { CloseIcon } from "@/components/Tables/icons";
import { useModalWatch } from "@/components/ModalContext";


dayjs.locale("id");
type History = {
  accuracy: number;            
  asset_id: string;            
  client_id: number;           
  latitude: number;         
  longitude: number;           
  movement_type: string;       
  notes: string;             
  photo: string;              
  quantity: number;          
  timestamp: string;           
  user_id: number;             
};

export default function Page() {
  const params = useParams() as { assetId?: string };
  const assetId = params?.assetId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<History[]>([]);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true); // mark page as ready after hydration
  }, []);

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

  const openPreview = (photo?: string | null) => {
    const src = buildImageSrc(photo);
    setPreviewSrc(src);
    setIsOpen(true);
  };
  
  //prefetch reduce load time
  useEffect(() => {
    router.prefetch(`/history/${assetId}`);
  }, [assetId]);


  // Close preview on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setPreviewSrc(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

 const mapped = record.map((u, index) => ({
    id: String(u.asset_id ?? u.user_id ?? index),
    clientId: u.client_id ?? "-",
    userId: u.user_id ?? "-",
    timestamp: u.timestamp ?? "-",
    photo: u.photo ?? null,
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
        const detailRes = await API.get(`/movements/history/${encodeURIComponent(assetId)}`);
        const payload = detailRes?.data?.data; 
        if (Array.isArray(payload)) {
          setRecord(payload); 
        } else {
          setRecord([]);
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

  function movementTypeToStatus(m?: string | null) {
    if (!m) return "Unknown";
    const s = (m + "").toLowerCase();
    if (s.includes("inbound_at_client")) return "Di Klien";
    if (s.includes("outbound_to_client")) return "Pengiriman ke Klien";
    if (s.includes("inbound_at_factory")) return "Di Pabrik";
    if (s.includes("outbound_to_factory")) return "Pengiriman ke Pabrik";
    if (s.includes("return")) return "-";
    return m;
  }
  
    return (
      <div className="relative z-0 p-4 sm:p-7.5 bg-white min-h-[60vh] rounded-[10px] border border-stroke shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
        <div className="max-w-[1100px] mx-auto">
          {/* Title + actions */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-bold leading-[30px] text-dark dark:text-white">
                Riwayat Pergerakan <span className="text-gray-600">[{assetId ?? "—"}]</span>
              </h1>
              <p className="mt-1 text-sm text-gray-500"> Catatan pergerakan detail aset ini</p>
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
            <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-700 rounded">Riwayat tidak tersedia.</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto rounded-md border border-stroke dark:border-dark-3">
                  <table className="min-w-full table-fixed">
                    <thead>
                      <tr className="bg-[#F7F9FC] dark:bg-dark-2">
                        {["User", "Status", "Klien", "Waktu Pencatatan", "Foto", "Catatan", "Lokasi", "Kuantitas"].map((h) => (
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
                        const clientLabel = clients[String(rec.client_id)]?.name?.trim() || rec.client_id || "-";
                        return (
                          <tr key={i} className="bg-white dark:bg-gray-dark border-t border-stroke dark:border-dark-3">
                            <td className="px-6 py-4 text-dark dark:text-white">{userLabel}</td>
                            <td className="px-6 py-4 text-dark dark:text-white">{movementTypeToStatus(rec.movement_type)}</td>
                            <td className="px-6 py-4 text-dark dark:text-white">{clientLabel}</td>
                            <td className="px-6 py-4 text-dark dark:text-white">
                              {rec.timestamp ? dayjs(rec.timestamp).format("DD MMM, YYYY - HH:mm") : "-"}
                            </td>
                            <td className="px-6 py-4 text-dark dark:text-white">
                              {rec.photo ? (
                                <img
                                  src={buildImageSrc(rec.photo) || ""}
                                  alt={`photo-${rec.asset_id}`}
                                  className="w-[140px] h-[96px] object-cover rounded cursor-pointer border"
                                  onClick={() => openPreview(rec.photo)}
                                />
                              ) : (
                                <div className="text-gray-400">Foto tidak tersedia</div>
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
                      <div className="flex items-center justify-between mt-3 grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-500">
                            Klien
                          </div>
                          <div className="text-sm text-dark dark:text-white">
                            {clientLabel}
                          </div>
                        </div>
                        <div className="text-right ">
                          <div className="text-xs text-gray-500">
                            Waktu Pencatatan
                          </div>
                          <div className="text-sm text-dark dark:text-white">
                            {rec.timestamp ? dayjs(rec.timestamp).format("DD MMM, YYYY - HH:mm") : "-"}
                          </div>``
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-gray-500">
                          Foto
                        </div>
                        {rec.photo ? (
                          <img
                            src={buildImageSrc(rec.photo) || ""}
                            alt={`photo-${rec.asset_id}`}
                            className="mt-2 w-full h-44 object-cover rounded cursor-pointer border"
                            onClick={() => openPreview(rec.photo)}
                          />
                        ) : ( 
                          <div className="text-gray-400 mt-2">Foto tidak tersedia</div> )}
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
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition whitespace-nowrap" >
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
          onClose={() => {
            setIsOpen(false);
            setPreviewSrc(null);
          }} 
        />
      </div>

    );
}

function PreviewModal({ open, src, onClose }: { open: boolean; src: string | null; onClose: () => void }) {
  useModalWatch(open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-w-[98vw] max-h-[96vh] overflow-auto bg-white rounded shadow-lg p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border text-sm inline-flex items-center gap-2"
          >
            <CloseIcon />
            Close
          </button>
        </div>

        <div className="mt-3">
          {src ? (
            <img src={src} alt="preview" className="max-w-full max-h-[80vh] object-contain mx-auto" />
          ) : (
            <div className="p-8 text-center text-gray-500">Tidak ada gambar tersedia untuk item ini.</div>
          )}
        </div>
      </div>
    </div>
  );
}
