"use client";

import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import dayjs from "dayjs";
import Link from "next/link";

type RawUnfin = {
  asset_id?: string;
  client_id?: number;
  photo?: string;
  timestamp?: string;
  user_id?: number;
};

export default function UnfinDetailClient({ assetId }: { assetId: string }) {
  const [item, setItem] = useState<RawUnfin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let mounted = true;
    const fetchAndFind = async () => {
      setLoading(true);
      try {
        const res = await API.get("/movements/unfinished");
        const items: RawUnfin[] = res.data?.data ?? [];
        const found = items.find((it) => String(it.asset_id) === String(assetId));
        if (!mounted) return;
        if (found) {
          setItem(found);
          setError(null);
        } else {
          setItem(null);
          setError("Data tidak ditemukan untuk Asset ID tersebut.");
        }
      } catch (err: any) {
        console.error("Error fetching unfinished deliveries:", err);
        setError(err?.message ?? "Gagal mengambil data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAndFind();
    return () => {
      mounted = false;
    };
  }, [assetId]);

  return (
    <div className="p-6 bg-white rounded shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Detail Pengiriman Belum Tuntas</h2>
        <Link href="/"><button className="text-sm px-3 py-1 rounded border">Kembali</button></Link>
      </div>

      {loading ? (
        <div>Memuat...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : item ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-2 text-sm text-gray-500">Asset ID</div>
            <div className="mb-3 font-medium">{item.asset_id}</div>

            <div className="mb-2 text-sm text-gray-500">Client ID</div>
            <div className="mb-3">{item.client_id}</div>

            <div className="mb-2 text-sm text-gray-500">User ID</div>
            <div className="mb-3">{item.user_id}</div>

            <div className="mb-2 text-sm text-gray-500">Timestamp</div>
            <div className="mb-3">{item.timestamp ? dayjs(item.timestamp).format("YYYY-MM-DD HH:mm") : "-"}</div>
          </div>

          <div>
            <div className="mb-2 text-sm text-gray-500">Foto / QR</div>
            {item.photo ? (
              <img src={item.photo} alt="Foto" className="max-w-full rounded border" />
            ) : (
              <div className="text-sm text-gray-500">Tidak ada gambar</div>
            )}

            <div className="mt-4">
              {/* Example action: open Postman-like path in a new tab (for debugging) */}
              <p className="text-sm text-gray-500">Endpoint (yang dipanggil dengan axios):</p>
              <code className="block break-all mt-1 bg-gray-100 p-2 rounded">GET /movements/unfinished</code>
              <p className="text-xs text-gray-500 mt-2">
                (Sama seperti koleksi Postman Anda — gunakan akses token di header Authorization bila perlu.)
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
