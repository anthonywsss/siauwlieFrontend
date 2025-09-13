"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { TrashIcon, AddIcon } from "@/assets/icons"; // swap to your icon path
import { cn } from "@/lib/utils";
import { safeGet } from "@/lib/fetcher";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PreviewIcon } from "./icons"; // or adjust

type Item = {
  id: string;
  usn: string;
  fullname: string;
  role: string | null;
};

function generatePages(current: number, total: number) {
  const delta = 1;
  const range = [] as number[];
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

export default function AllClient() {
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [goto, setGoto] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // New filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusOpen, setStatusOpen] = useState<boolean>(false);
  const statusRef = useRef<HTMLDivElement | null>(null);

  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [assetOpen, setAssetOpen] = useState<boolean>(false);
  const assetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // close dropdowns on outside click
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
      if (assetRef.current && !assetRef.current.contains(e.target as Node)) {
        setAssetOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const statusParam = statusFilter && statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : "";
    const assetParam = assetFilter && assetFilter !== "all" ? `&assetType=${encodeURIComponent(assetFilter)}` : "";

    (async () => {
      try {
        const absoluteUrl = `${window.location.origin}/api/items?page=${page}&perPage=${perPage}&q=${encodeURIComponent(query)}${statusParam}${assetParam}`;
        const data = await safeGet<{ items: Item[]; total: number }>(absoluteUrl);
        if (!mounted) return;
        if (data) {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (err) {
        console.error("fetch items error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [page, perPage, query, statusFilter, assetFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pages = useMemo(() => generatePages(page, totalPages), [page, totalPages]);

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

  const ASSET_TYPE_OPTIONS: { label: string; value: string }[] = [
    { label: "All User", value: "all" },
    { label: "Supervisor", value: "supervisor" },
    { label: "Driver", value: "driver" },
    { label: "Security", value: "security" },
  ];

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark sm:p-7.5">
      {/* Header: stack on mobile, row on md+ */}
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* LEFT: filters + search */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">

            {/* Search input */}
            <div className="w-full md:w-auto">
              <input
                placeholder="Search id / user"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded border px-3 py-2 w-full"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: add + total */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            className="inline-flex items-center h-10 px-4 py-2 text-sm font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple w-full md:w-auto justify-center"
            type="button"
            onClick={() => {
              /* open modal / navigate to add form */
            }}
          >
            <AddIcon />
            <span className="ml-2">Add New User</span>
          </button>

          <div className="text-sm text-gray-500 ml-auto md:ml-0">{loading ? "Loading..." : `${total} items`}</div>
        </div>
      </div>

      {/* Desktop table (hidden on small screens) */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] [&>th]:py-4 [&>th]:text-base">
              <TableHead className="min-w-[110px]">ID Karyawan</TableHead>
              <TableHead className="min-w-[200px]">Username</TableHead>
              <TableHead className="min-w-[120px]">Nama Lengkap</TableHead>
              <TableHead className="min-w-[120px]">Peran</TableHead>
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
            ) : (
              items.map((item) => {
                const classRole = cn(
                  "max-w-fit rounded-full px-3.5 py-1 text-sm font-medium",
                  {
                    "bg-[#DFF7E0] text-[#2E8A2E]": /warehouse|at warehouse|available/i.test(item.role ?? ""),
                    "bg-[#FFA70B]/[0.08] text-[#FFA70B]": /pending/i.test(item.role ?? ""),
                    "bg-[#D34053]/[0.08] text-[#D34053]": /missing|lost|unpaid|error/i.test(item.role ?? ""),
                    "bg-[#F3F4F6] text-[#374151]": /in\s*transit|unknown/i.test(item.role ?? "") || !item.role,
                  }
                );

                const displayRole =
                  item.role && /in\s*transit/i.test(item.role)
                    ? "In Transit"
                    : !item.role || /^unknown$/i.test(item.role)
                    ? "In Transit"
                    : item.role;

                return (
                  <TableRow key={item.id} className="border-t">
                    <TableCell className="py-6">
                      <h5 className="text-dark text-lg font-medium">{item.id}</h5>
                    </TableCell>

                    <TableCell className="py-6">
                      <h5 className="text-dark text-lg font-medium">{item.usn}</h5>
                    </TableCell>

                    <TableCell className="py-6">
                      <h5 className="text-dark text-lg font-medium">{item.fullname}</h5>
                    </TableCell>

                    <TableCell className="py-6">
                      <span className={classRole}>{displayRole}</span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button className="p-2 hover:text-primary" aria-label="Edit">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button className="p-2 hover:text-red-600" aria-label="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list (cards) - shown on small screens */}
      <div className="md:hidden">
        {loading
          ? Array.from({ length: perPage }).map((_, i) => (
              <div key={`skeleton-card-${i}`} className="animate-pulse border rounded p-3 mb-3 bg-gray-50" />
            ))
          : items.map((item) => {
              const classRole = cn(
                "inline-block rounded-full px-3 py-1 text-sm font-medium",
                {
                  "bg-[#DFF7E0] text-[#2E8A2E]": /warehouse|at warehouse|available/i.test(item.role ?? ""),
                  "bg-[#FFA70B]/[0.08] text-[#FFA70B]": /pending/i.test(item.role ?? ""),
                  "bg-[#D34053]/[0.08] text-[#D34053]": /missing|lost|unpaid|error/i.test(item.role ?? ""),
                  "bg-[#F3F4F6] text-[#374151]": /in\s*transit|unknown/i.test(item.role ?? "") || !item.role,
                }
              );

              const displayRole =
                item.role && /in\s*transit/i.test(item.role)
                  ? "In Transit"
                  : !item.role || /^unknown$/i.test(item.role)
                  ? "In Transit"
                  : item.role;

              return (
                <div key={item.id} className="border rounded-lg p-3 mb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-gray-500">Id Karyawan</div>
                      <div className="text-lg font-medium">{item.id}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Status</div>
                      <div className="mt-1"> <span className={classRole}>{displayRole}</span> </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-sm text-gray-500">Klien</div>
                      <div className="font-medium">{item.usn}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Tipe</div>
                      <div className="font-medium">{item.fullname}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex gap-2 mt-2">
                      <button className="p-2 border rounded-md" aria-label="Edit">Edit</button>
                      <button className="p-2 border rounded-md text-red-600" aria-label="Delete">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Pagination controls (responsive) */}
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
            {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} dari {total}
          </div>
        </div>
      </div>
    </div>
  );
}