"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import API from "@/lib/api";
import dayjs from "dayjs";

type UnfinishedDetail = {
  asset_id?: string;
  client_id?: number;
  user_id?: number;
  timestamp?: string;
  photo?: string | null;
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
  const [record, setRecord] = useState<UnfinishedDetail | null>(null);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setError("Asset ID tidak ada pada URL");
      setLoading(false);
      return;
    }

    let mounted = true;
    async function load() {
      try {
        const detailRes = await API.get(`/movements/unfinished/detail/${encodeURIComponent(assetId)}`);
        const payload = detailRes?.data?.data;
        const rec: UnfinishedDetail | null = Array.isArray(payload) ? payload[0] ?? null : payload ?? null;

        if (!mounted) return;

        if (!rec) {
          setRecord(null);
          setError("Data tidak ditemukan untuk Asset ID tersebut.");
          setLoading(false);
          return;
        }
        setRecord(rec);

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

  const userLabel = record ? users[String(record.user_id)]?.full_name ?? record.user_id : "-";
  const clientLabel = record ? clients[String(record.client_id)]?.name ?? record.client_id : "-";
  const locationLabel = record?.latitude && record?.longitude ? `${record.latitude}, ${record.longitude}` : "-";

  function movementTypeToStatus(m?: string | null) {
    if (!m) return "Unknown";
    const s = (m + "").toLowerCase();
    if (s.includes("outbound")) return "Outbound";
    if (s.includes("inbound")) return "Inbound";
    if (s.includes("to_client")) return "To Client";
    if (s.includes("return")) return "Return";
    return m;
  }

  return (
    <div className="p-4 sm:p-7.5 bg-white min-h-[60vh] rounded-[10px] border border-stroke shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
      <div className="max-w-[1100px] mx-auto">
        {/* Title + actions */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold leading-[30px] text-dark dark:text-white">
              Unfinished Delivery Detail <span className="text-gray-600">[{assetId ?? "—"}]</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">Rincian pengiriman belum tuntas</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-fit px-4 py-2 text-md font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple"
            >
              Kembali
            </button>
            <button
              onClick={() => record?.photo && setPreviewSrc(record.photo)}
              disabled={!record?.photo}
              className="px-4 py-2 rounded-lg border text-sm bg-white hover:bg-gray-50 dark:bg-dark-2 dark:text-white"
            >
              Lihat Foto
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
        ) : !record ? (
          <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-700 rounded">Tidak ada data.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto rounded-md border border-stroke dark:border-dark-3">
                <table className="min-w-full table-fixed">
                  <thead>
                    <tr className="bg-[#F7F9FC] dark:bg-dark-2">
                      {["User", "Status", "Customer", "Waktu Pencatatan", "Foto", "Catatan", "Location", "Quantity"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-6 py-4 text-left text-base font-medium text-dark dark:text-white border-r"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white dark:bg-gray-dark border-t border-stroke dark:border-dark-3">
                      <td className="px-6 py-4 text-dark dark:text-white">{userLabel}</td>
                      <td className="px-6 py-4 text-dark dark:text-white">{movementTypeToStatus(record.movement_type)}</td>
                      <td className="px-6 py-4 text-dark dark:text-white">{clientLabel}</td>
                      <td className="px-6 py-4 text-dark dark:text-white">
                        {record.timestamp ? dayjs(record.timestamp).format("YYYY-MM-DD HH:mm:ss") : "-"}
                      </td>
                      <td className="px-6 py-4 text-dark dark:text-white">
                        {record.photo ? (
                          <img
                            src={record.photo}
                            alt={`photo-${record.asset_id}`}
                            className="w-[140px] h-[96px] object-cover rounded cursor-pointer border"
                            onClick={() => setPreviewSrc(record.photo!)}
                          />
                        ) : (
                          <div className="text-gray-400">Tidak ada foto</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-dark dark:text-white">{record.notes ?? "-"}</td>
                      <td className="px-6 py-4 text-dark dark:text-white">{locationLabel}</td>
                      <td className="px-6 py-4 text-dark dark:text-white">{record.quantity ?? "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lower details card */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-[#F7F9FC] dark:bg-dark-2 p-4 rounded border border-stroke dark:border-dark-3">
                  <div className="text-xs text-gray-500">Asset ID</div>
                  <div className="text-sm font-medium text-dark dark:text-white">{record.asset_id}</div>
                  <div className="mt-3 text-xs text-gray-500">Movement Type</div>
                  <div className="text-sm text-dark dark:text-white">{record.movement_type ?? "-"}</div>
                </div>

                <div className="bg-[#F7F9FC] dark:bg-dark-2 p-4 rounded border border-stroke dark:border-dark-3">
                  <div className="text-xs text-gray-500">Accuracy</div>
                  <div className="text-sm text-dark dark:text-white">{record.accuracy ?? "-"}</div>
                  <div className="mt-3 text-xs text-gray-500">Recorded by (ID)</div>
                  <div className="text-sm text-dark dark:text-white">{record.user_id ?? "-"}</div>
                </div>
              </div>
            </div>

            {/* Mobile stacked cards (unchanged layout, updated fonts/colors) */}
            <div className="md:hidden space-y-4">
              <div className="p-4 rounded-md border bg-white dark:bg-gray-dark dark:border-dark-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">User</div>
                    <div className="text-sm font-medium text-dark dark:text-white">{userLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="text-sm text-dark dark:text-white">{movementTypeToStatus(record.movement_type)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Customer</div>
                    <div className="text-sm text-dark dark:text-white">{clientLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Waktu</div>
                    <div className="text-sm text-dark dark:text-white">
                      {record.timestamp ? dayjs(record.timestamp).format("YYYY-MM-DD HH:mm") : "-"}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-gray-500">Foto</div>
                  {record.photo ? (
                    <img
                      src={record.photo}
                      alt={`photo-${record.asset_id}`}
                      className="mt-2 w-full h-44 object-cover rounded cursor-pointer border"
                      onClick={() => setPreviewSrc(record.photo!)}
                    />
                  ) : (
                    <div className="text-gray-400 mt-2">Tidak ada foto</div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-xs text-gray-500">Catatan</div>
                  <div className="text-sm text-dark dark:text-white">{record.notes ?? "-"}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Location</div>
                    <div className="text-sm text-dark dark:text-white">{locationLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Quantity</div>
                    <div className="text-sm text-dark dark:text-white">{record.quantity ?? "-"}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-md border bg-[#F7F9FC] dark:bg-dark-2 dark:border-dark-3 shadow-sm">
                <div className="text-xs text-gray-500">Asset ID</div>
                <div className="text-sm font-medium text-dark dark:text-white">{record.asset_id}</div>
                <div className="mt-3 text-xs text-gray-500">Accuracy</div>
                <div className="text-sm text-dark dark:text-white">{record.accuracy ?? "-"}</div>
              </div>
            </div>
          </>
        )}

        {/* Preview modal */}
        {previewSrc && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setPreviewSrc(null)}
          >
            <div
              className="max-w-[98vw] max-h-[96vh] overflow-auto bg-white dark:bg-gray-dark rounded shadow-lg p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end">
                <button
                  onClick={() => setPreviewSrc(null)}
                  className="px-3 py-1 rounded border text-sm"
                >
                  Close
                </button>
              </div>
              <img src={previewSrc} alt="preview" className="max-w-full max-h-[80vh] object-contain mt-3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
