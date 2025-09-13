"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TrashIcon, AddIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import CreateAssetTypeModal from "@/components/CreateAssetTypeModal";
import EditAssetTypeModal from "@/components/EditAssetTypeModal";
import DeleteAssetTypeModal from "@/components/DeleteAssetTypeModal";

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

function generatePages(current: number, total: number) {
  const delta = 1;
  const range: number[] = [];
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) range.push(i);

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
    for (let i = Math.max(current + delta + 1, (pages[pages.length - 1] as number) + 1); i <= total; i++) pages.push(i);
  }

  return Array.from(new Set(pages));
}

export default function AssetTypeList() {
  const { signOut } = useAuth();
  const router = useRouter();

  // pagination & search
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [goto, setGoto] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  // data state
  const [allTypes, setAllTypes] = useState<RawAssetType[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRaw, setEditingRaw] = useState<RawAssetType | null>(null);
  const [deletingRaw, setDeletingRaw] = useState<RawAssetType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pages = useMemo(() => generatePages(page, totalPages), [page, totalPages]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await API.get("/asset-type");
        const types: RawAssetType[] = res?.data?.data ?? res?.data ?? [];
        if (!mounted) return;
        setAllTypes(Array.isArray(types) ? types : []);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          signOut();
          try {
            router.push("/auth/sign-in");
          } catch {}
          return;
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refreshKey, signOut, router]);

  // filter + paginate
  useEffect(() => {
    const q = query.trim().toLowerCase();
    const filtered = allTypes.filter((t) => {
      if (!q) return true;
      const fields = [String(t.id ?? ""), String(t.name ?? ""), String(t.description ?? "")];
      return fields.some((f) => f.toLowerCase().includes(q));
    });

    const totalCount = filtered.length;
    setTotal(totalCount);
    const validPage = Math.max(1, Math.min(Math.max(1, Math.ceil(totalCount / perPage)), page));
    if (validPage !== page) setPage(validPage);
    const start = (validPage - 1) * perPage;
    const pageSlice = filtered.slice(start, start + perPage);

    const mapped: Item[] = pageSlice.map((t) => ({
      id: String(t.id ?? Math.random().toString(36).slice(2, 9)),
      name: t.name ?? "-",
      description: t.description ?? "-",
      createdAt: t.created_at ?? "-",
      raw: t,
    }));

    setItems(mapped);
  }, [allTypes, query, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [perPage, query]);

  // pagination helpers
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

  // Delete asset type
  async function handleDelete(rawId?: number | string) {
    if (!rawId) return;
    if (!confirm("Hapus asset ini? Aksi ini tidak bisa diulang")) return;

    setActionLoading(String(rawId));
    try {
      await API.delete(`/asset-type/${rawId}`);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error("delete asset type error:", err);
      if (err?.response?.status === 401) {
        signOut();
        try {
          router.push("/auth/sign-in");
        } catch {}
        return;
      }
      alert(err?.response?.data?.meta?.message ?? err?.message ?? "Gagal menghapus asset");
    } finally {
      setActionLoading(null);
    }
  }

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
            placeholder="Search ID/ Name/ Description"
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
            <span className="ml-2">Add Asset Type</span>
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] [&>th]:py-4 [&>th]:text-base">
              <TableHead className="min-w-[140px]">ID</TableHead>
              <TableHead className="min-w-[220px]">Name</TableHead>
              <TableHead className="min-w-[320px]">Description</TableHead>
              <TableHead className="min-w-[200px]">Date Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                  Type not available
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
                    <div className="text-sm text-gray-500">Tanggal Ditambahkan</div>
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
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-500">Row per page</span>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="rounded border px-3 py-1.5"
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <form onSubmit={handleGotoSubmit} className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Go to page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={goto}
              onChange={(e) => setGoto(e.target.value)}
              className="w-16 rounded border px-2 py-1"
            />
            <button type="submit" className="rounded border px-3 py-1">
              Go
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
            {total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
          </div>
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

      <DeleteAssetTypeModal
        open={!!deletingRaw}
        assetType={deletingRaw ?? undefined}
        onClose={() => setDeletingRaw(null)}
        onDeleted={() => {
          setDeletingRaw(null);
          setRefreshKey((k) => k + 1);
        }}
      />


    </div>
  );
}
