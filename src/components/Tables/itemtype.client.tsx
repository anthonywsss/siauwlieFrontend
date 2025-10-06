"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TrashIcon, AddIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import CreateAssetTypeModal from "@/components/CreateAssetTypeModal";
import EditAssetTypeModal from "@/components/EditAssetTypeModal";
import DeleteConfirmModal from "@/components/ConfirmDeletion";
import { safeGet } from "@/lib/fetcher";

import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RawAssetType = {
  id?: number | string;
  name?: string;
  description?: string;
  created_at?: string;
  [k: string]: any;
};

type Item = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  raw?: RawAssetType;
};

export default function AssetTypeList() {
  const { signOut } = useAuth();
  const router = useRouter();

  // these are pagination states
    const [page, setPage] = useState(1);        // current page
    const [perPage, setPerPage] = useState(10); // rows per page
    const [total, setTotal] = useState(0);      // total items (from backend)
    const totalPages = Math.ceil(total / perPage);
  
    function getPages(current: number, totalPages: number): (number | string)[] {
    const delta = 2; // how many pages before/after current
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;
  
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
          range.push(i);
        }
      }
  
      for (let i of range) {
        if (l) {
          if (Number(i) - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (Number(i) - l > 2) {
            rangeWithDots.push("...");
          }
        }
        rangeWithDots.push(i);
        l = Number(i);
      }
  
      return rangeWithDots;
    }
  
    const pages = getPages(page, totalPages);
    const [data, setData] = useState<RawAssetType[]>([])  
    const [query, setQuery] = useState<string>("");
  

  // data state
  const [allTypes, setAllTypes] = useState<RawAssetType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRaw, setEditingRaw] = useState<RawAssetType | null>(null);
  const [deletingRaw, setDeletingRaw] = useState<RawAssetType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
useEffect(() => {
  let mounted = true;
  setLoading(true);
  setError(null);

  (async () => {
    try {
      const params: Record<string, any> = {
        limit: perPage,
        offset: (page - 1) * perPage,
      };

      if (query && query.trim() !== "") params.search = query.trim();

      const queryString = new URLSearchParams(params).toString();

      const res = await safeGet<{ data: RawAssetType[]; meta?: { total?: number } }>(
        `/asset-type?${queryString}`
      );
      if (!mounted) return;

      if (res === null) {
        setError("Failed to fetch assets");
        setData([]);
        setItems([]);
        setTotal(0);
      } else {
        setData(Array.isArray(res.data) ? res.data : []);
        const mapped = (res.data ?? []).map((raw) => ({
        id: String(raw.id ?? ""),
        name: raw.name ?? "",
        description: raw.description ?? "",
        createdAt: raw.created_at ?? "",
        raw,
      }));

      setItems(mapped);     
      setTotal(res.meta?.total ?? 0);
      }
    } catch (err: any) {
      if (!mounted) return;
      setError(err?.message ?? "Failed to fetch assets");
      setData([]);
      setTotal(0);
    } finally {
      if (mounted) setLoading(false);
    }
  })();

  return () => {
    mounted = false;
  };
}, [page, perPage, query, refreshKey]);

  // open edit modal
  function handleEditOpen(raw?: RawAssetType | null) {
    setEditingRaw(raw ?? null);
  }

  // open create modal
  function handleCreateOpen() {
    setShowCreateModal(true);
  }

  function handleCreatedOrUpdated() {
    setShowCreateModal(false);
    setEditingRaw(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark sm:p-7.5">
      {/* Header */}
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
         <div className="flex items-center gap-3 w-full md:w-auto">
              <input
                placeholder="Cari dengan ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 rounded border px-3 py-2 w-full md:w-96"
              />
            </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="text-sm text-gray-500 ml-auto md:ml-0">{loading ? "Loading..." : `${total} Asset Types`}</div>

          <button
            className="inline-flex items-center h-10 px-4 py-2 text-sm font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple w-full md:w-auto justify-center"
            type="button"
            onClick={handleCreateOpen}
            disabled={actionLoading !== null}
          >
            <AddIcon />
            <span className="ml-2">Tambahkan Tipe Aset Baru</span>
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] [&>th]:py-4 [&>th]:text-base">
              <TableHead className="min-w-[140px]">ID</TableHead>
              <TableHead className="min-w-[220px]">Nama</TableHead>
              <TableHead className="min-w-[320px]">Deskripsi</TableHead>
              <TableHead className="min-w-[200px]">Waktu</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: perPage }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="animate-pulse">
                  <TableCell className="py-6 h-8 bg-gray-100" />
                  <TableCell className="py-6 h-8 bg-gray-100" />
                  <TableCell className="py-6 h-8 bg-gray-100" />
                  <TableCell className="py-6 h-8 bg-gray-100" />
                  <TableCell className="py-6 h-8 bg-gray-100" />
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Tipe Aset tidak tersedia.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="border-t">
                  <TableCell>
                    <p className="text-dark font-medium">{item.id}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark">{item.name}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark truncate max-w-[420px]">{item.description}</p>
                  </TableCell>

                  <TableCell>
                    {item.createdAt ? dayjs(item.createdAt).format("MMM DD, YYYY - hh:mm") : "-"}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      {/* EDIT BUTTON */}
                      <button
                        className="p-2 hover:text-primary"
                        aria-label="Edit"
                        onClick={() => handleEditOpen(item.raw)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        className="p-2 hover:text-red-600 disabled:opacity-50"
                        aria-label="Delete"
                        onClick={() => setDeletingRaw(item.raw ?? { id: item.id })}
                        disabled={actionLoading !== null}
                      >
                        <TrashIcon />
                      </button>


                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list (cards) */}
      <div className="md:hidden">
        {loading
          ? Array.from({ length: perPage }).map((_, i) => (
              <div key={`skeleton-card-${i}`} className="animate-pulse border rounded p-3 mb-3 bg-gray-50" />
            ))
          : items.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">Nama</div>
                    <div className="text-lg font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500 mt-1">Deskripsi</div>
                    <div className="font-medium truncate">{item.description}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Waktu</div>
                    <div className="mt-1 font-medium">
                      {item.createdAt ? dayjs(item.createdAt).format("MMM DD, YYYY - HH:mm") : "-"}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-md text-sm" onClick={() => handleEditOpen(item.raw)}>
                    Edit
                  </button>
                  <button
                    className="p-2 border rounded-md text-red-600"
                    aria-label="Delete"
                    onClick={() => setDeletingRaw(item.raw ?? { id: item.id })}
                  >
                    Hapus
                  </button>

                </div>
              </div>
            ))}
      </div>

      {/* Pagination */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
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
                    onClick={() => setPage(Number(p))}
                    className={cn(
                      "rounded border px-3 py-1 min-w-[36px] md:min-w-[40px]",
                      { "ring-2 ring-blue-400 bg-white": p === page }
                    )}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
              )}
      
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                &gt;
              </button>
      
              <div className="ml-3 text-sm text-gray-500">
                {total === 0
                  ? "0"
                  : `${Math.min((page - 1) * perPage + 1, total)}–${Math.min(
                      page * perPage,
                      total
                    )}`}{" "}
                dari {total}
              </div>
            </div>

      {error && <div className="mt-3 text-red-600">{error}</div>}

      {/* Modals */}
      <CreateAssetTypeModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCreatedOrUpdated} />

      <EditAssetTypeModal
        open={!!editingRaw}
        assetType={editingRaw ?? undefined}
        onClose={() => setEditingRaw(null)}
        onUpdated={handleCreatedOrUpdated}
      />

      <DeleteConfirmModal
        open={!!deletingRaw}                      
        resourceName="Tipe Aset"                     
        resourceId={deletingRaw?.id}              
        resourceLabel={deletingRaw?.name}
        deleteUrl={`/asset-type/${deletingRaw?.id}`}
        onClose={() => setDeletingRaw(null)}      
        onDeleted={() => {
          setDeletingRaw(null);
          setRefreshKey((k) => k + 1);
        }}
      />


    </div>
  );
}
