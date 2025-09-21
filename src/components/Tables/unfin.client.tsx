"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { safeGet } from "@/lib/fetcher";
import { PreviewIcon, CloseIcon } from "./icons";
import { cn } from "@/lib/utils";
import { Dialog } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModalWatch } from "@/components/ModalContext";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RawUnfin = {
  asset_id?: string;
  client_id?: number;
  photo?: string | null;
  timestamp?: string | null;
  user_id?: number;
  quantity?: number | null;
  notes?: string | null;
};

function generatePages(current: number, total: number) {
  const delta = 1;
  const range: number[] = [];
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++)
    range.push(i);

  const pages: (number | string)[] = [];
  if (1 < current - delta - 1) {
    pages.push(1);
    if (2 < current - delta) pages.push("...");
  } else {
    for (let i = 1; i < Math.max(1, current - delta); i++) pages.push(i);
  }

  pages.push(...range);

  if (current + delta + 1 < total) {
    pages.push("...");
    pages.push(total);
  } else {
    for (let i = Math.max(current + delta + 1, (pages[pages.length - 1] as number) + 1); i <= total; i++)
      pages.push(i);
  }

  return Array.from(new Set(pages));
}

export default function UnfinDelivery() {
  const router = useRouter();
  const [data, setData] = useState<RawUnfin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // pagination & search
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [goto, setGoto] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  // data state
  const [total, setTotal] = useState<number>(0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pages = useMemo(() => generatePages(page, totalPages), [page, totalPages]);

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
  

  useEffect(() => {
    let mounted = true;
    const fetchUnfinished = async () => {
    setLoading(true);
      try {
        const res = await safeGet<{ data: RawUnfin[]; meta?: { total?: number } }>("/movements/unfinished");
        const items: RawUnfin[] = res?.data ?? [];
        if (!mounted) return;
        setData(items);
        const metaTotal = res?.meta?.total;
        setTotal(typeof metaTotal === "number" ? metaTotal : items.length);
      } catch (err) {
        console.error("Error fetching unfinished deliveries:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
  
    fetchUnfinished();
    return () => {
      mounted = false;
    };
  }, [perPage, page, query]);

  const openPreview = (photo?: string | null) => {
    const src = buildImageSrc(photo);
    setPreviewSrc(src);
    setIsOpen(true);
  };


  const goToDetail = (assetId?: string) => {
    if (!assetId) return;
    router.push(`/unfinished/${encodeURIComponent(String(assetId))}`);
  };

  function goToPageNumber(n: number | string) {
    if (typeof n === "number") setPage(Math.max(1, Math.min(totalPages, n)));
  }

  function handleGotoSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(goto, 10);
    if (!isNaN(n)) {
      setPage(Math.max(1, Math.min(totalPages, n)));
      setGoto("");
    }
  }

  const visible = data.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      {/* Desktop Table*/}
      <div className="hidden md:block rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
        <div className="flex items-center justify-between w-full md:w-auto mb-5">
          <h1 className="text-[26px] font-bold leading-[30px] text-dark">
            Pengiriman Belum Tuntas
          </h1>
          <div className="text-sm text-gray-500">
            {loading ? "Loading..." : `${total} unfinished deliveries`}
          </div>
        </div>

        
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
              <TableHead className="min-w-[155px] xl:pl-7.5">Asset ID</TableHead>
              <TableHead>Client ID</TableHead>
              <TableHead>Foto</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>


          <TableBody>
            {visible.map((item, index) => (
              <TableRow key={index} className="border-[#eee] dark:border-dark-3">
                <TableCell className="min-w-[20px] xl:pl-3">
                  <h5 className="text-dark dark:text-white">{item.asset_id}</h5>
                </TableCell>

                <TableCell>
                  <h5 className="text-dark dark:text-white">{item.client_id}</h5>
                </TableCell>

                <TableCell>
                  <div className="w-28 flex-shrink-0">
                    {item.photo ? (
                      <img
                        src={buildImageSrc(item.photo) || ""}
                        alt={`photo-${item.asset_id}`}
                        className="w-24 h-24 object-cover rounded border cursor-pointer"
                        onClick={() => openPreview(item.photo)}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-50 border rounded flex items-center justify-center text-xs text-gray-400">
                        No Photo
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <p className="text-dark dark:text-white">
                    {item.timestamp ? dayjs(item.timestamp).format("MMM DD, YYYY") : "-"}
                  </p>
                </TableCell>

                <TableCell>
                  <h5 className="text-dark dark:text-white">{item.user_id}</h5>
                </TableCell>

                <TableCell>
                  {/* Link to detail page */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => goToDetail(item.asset_id)}
                      className="flex items-center justify-center w-fit px-4 py-2 text-md font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg active:bg-purple-600 hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple"
                    >
                      Cek Riwayat
                    </button>
                    {/* small preview icon duplicate for quick access */}
                    <button
                      onClick={() => openPreview(item.photo)}
                      className="px-3 py-1 rounded border text-sm"
                      aria-label={`Preview photo for ${item.asset_id}`}
                    >
                      Pratinjau
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-500">Baris per halaman</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border px-3 py-1.5"
            >
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <form onSubmit={handleGotoSubmit} className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Pindah ke halaman</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={goto}
                onChange={(e) => setGoto(e.target.value)}
                className="w-16 rounded border px-2 py-1"
              />
              <button type="submit" className="rounded border px-3 py-1">
                kirim
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded border px-3 py-1 disabled:opacity-50">
          &lt;
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="px-2">
              …
            </span>
          ) : (
            <button
              key={p}
                  onClick={() => goToPageNumber(p)}
                  className={cn("rounded border px-3 py-1 min-w-[36px] md:min-w-[40px]", { "ring-2 ring-blue-400 bg-white": p === page })}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded border px-3 py-1 disabled:opacity-50">
          &gt;
        </button>

        <div className="ml-3 text-sm text-gray-500">
              {total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} dari {total}
            </div>
        </div>
      </div>
      </div>
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: perPage }).map((_, i) => (
              <div key={`skeleton-card-${i}`} className="animate-pulse border rounded-lg p-3 mb-0 bg-gray-50" />
            ))
          : visible.map((item, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 bg-white dark:bg-gray-dark dark:border-dark-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">Asset ID</div>
                    <div className="text-sm font-medium text-dark dark:text-white truncate">{item.asset_id}</div>

                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500">Client ID</div>
                        <div className="text-sm text-dark dark:text-white">{item.client_id}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">User ID</div>
                        <div className="text-sm text-dark dark:text-white">{item.user_id}</div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="text-xs text-gray-500">Timestamp</div>
                      <div className="text-sm text-dark dark:text-white">{item.timestamp ? dayjs(item.timestamp).format("MMM DD, YYYY HH:mm") : "-"}</div>
                    </div>
                  </div>

                  <div className="w-28 flex-shrink-0">
                    {item.photo ? (
                      <img
                        src={buildImageSrc(item.photo) || ""}
                        alt={`photo-${item.asset_id}`}
                        className="w-24 h-24 object-cover rounded border cursor-pointer"
                        onClick={() => openPreview(item.photo)}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-50 border rounded flex items-center justify-center text-xs text-gray-400">
                        No Photo
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => goToDetail(item.asset_id)}
                    className="flex-1 px-3 py-2 rounded bg-primary text-white font-bold text-sm"
                  >
                    Cek Riwayat
                  </button>

                  <button
                    onClick={() => openPreview(item.photo)}
                    className="px-3 py-2 rounded border text-sm"
                  >
                    <div className="inline-flex items-center gap-2">
                      <PreviewIcon />
                      <span>Pratinjau</span>
                    </div>
                  </button>
                </div>
              </div>
            ))}
      </div>
      <PreviewModal 
        open={isOpen} 
        src={previewSrc} 
        onClose={() => {
          setIsOpen(false);
          setPreviewSrc(null);
        }} 
      />
    </>
  );
}

function PreviewModal({ open, src, onClose }: { open: boolean; src: string | null; onClose: () => void }) {
  useModalWatch(open);

  if (!open) return null;

  return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 !mt-0"
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
