"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { TrashIcon, AddIcon } from "@/assets/icons"; // swap to your icon path
import { cn } from "@/lib/utils";
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
  qrUrl: string;
  status: string | null;
  clientName: string;
  clientId: string | number;
  photoUrl: string;
  assetType: string;
};

function generatePages(current: number, total: number) {
  const delta = 1;
  const range = [];
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

export default function AllItemsClient() {
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

    const controller = new AbortController();
    // include status only if set (not "all")
    const statusParam = statusFilter && statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : "";
    const assetParam = assetFilter && assetFilter !== "all" ? `&assetType=${encodeURIComponent(assetFilter)}` : "";

    fetch(`/api/items?page=${page}&perPage=${perPage}&q=${encodeURIComponent(query)}${statusParam}${assetParam}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("fetch items error:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
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

  // status options - changed "Unknown" -> "In Transit"
  const STATUS_OPTIONS: { label: string; value: string }[] = [
    { label: "All", value: "all" },
    { label: "Available / Warehouse", value: "available" },
    { label: "Pending", value: "pending" },
    { label: "Missing / Lost", value: "missing" },
    { label: "In Transit", value: "in_transit" },
  ];

  // asset type options (adjust to match your backend values)
  const ASSET_TYPE_OPTIONS: { label: string; value: string }[] = [
    { label: "All", value: "all" },
    { label: "Container", value: "Container" },
    { label: "Pallet", value: "Pallet" },
    { label: "Machine", value: "Machine" },
    { label: "Crate", value: "Crate" },
    { label: "Box", value: "Box" },
  ];

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark sm:p-7.5">
      {/* Header: LEFT = Filters + Search | RIGHT = Add + Total */}
      <div className="mb-4 flex items-center justify-between gap-4">
        {/* LEFT: filters + search */}
        <div className="flex items-center gap-3">
          {/* Status Filter dropdown */}
          <div ref={statusRef} className="relative">
            <button
              type="button"
              onClick={() => setStatusOpen((s) => !s)}
              className="inline-flex items-center h-10 px-3 py-2 text-sm font-medium rounded border bg-white"
              aria-haspopup="true"
              aria-expanded={statusOpen}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5h18M7 12h10M10 19h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="truncate">
                {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "Filter"}
              </span>
              <svg className="w-3 h-3 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {statusOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded border bg-white shadow-lg z-50">
                <ul className="py-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-gray-100",
                          { "font-semibold": statusFilter === opt.value }
                        )}
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setPage(1);
                          setStatusOpen(false);
                        }}
                        type="button"
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t px-3 py-2 text-right">
                  <button
                    className="text-sm underline"
                    type="button"
                    onClick={() => {
                      setStatusFilter("all");
                      setPage(1);
                      setStatusOpen(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Asset Type Filter dropdown */}
          <div ref={assetRef} className="relative">
            <button
              type="button"
              onClick={() => setAssetOpen((s) => !s)}
              className="inline-flex items-center h-10 px-3 py-2 text-sm font-medium rounded border bg-white"
              aria-haspopup="true"
              aria-expanded={assetOpen}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="truncate">{ASSET_TYPE_OPTIONS.find((o) => o.value === assetFilter)?.label ?? "Asset Type"}</span>
              <svg className="w-3 h-3 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {assetOpen && (
              <div className="absolute left-0 mt-2 w-48 rounded border bg-white shadow-lg z-50">
                <ul className="py-1">
                  {ASSET_TYPE_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-gray-100",
                          { "font-semibold": assetFilter === opt.value }
                        )}
                        onClick={() => {
                          setAssetFilter(opt.value);
                          setPage(1);
                          setAssetOpen(false);
                        }}
                        type="button"
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t px-3 py-2 text-right">
                  <button
                    className="text-sm underline"
                    type="button"
                    onClick={() => {
                      setAssetFilter("all");
                      setPage(1);
                      setAssetOpen(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search input */}
          <input
            placeholder="Search id / client / type"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded border px-3 py-2"
          />
        </div>

        {/* RIGHT: add + total */}
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center h-10 px-4 py-2 text-sm font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple"
            type="button"
            onClick={() => {
              /* open modal / navigate to add form */
            }}
          >
            <AddIcon />
            <span className="ml-2">Add New Categories</span>
          </button>

          <div className="text-sm text-gray-500">{loading ? "Loading..." : `${total} items`}</div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] [&>th]:py-4 [&>th]:text-base">
            <TableHead className="min-w-[110px]">Id</TableHead>
            <TableHead className="min-w-[120px]">QR Code</TableHead>
            <TableHead className="min-w-[150px]">Status</TableHead>
            <TableHead className="min-w-[200px]">Client Name</TableHead>
            <TableHead className="min-w-[120px]">Client ID</TableHead>
            <TableHead className="min-w-[120px]">Photo</TableHead>
            <TableHead className="min-w-[140px]">Asset Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            // simple loading rows
            Array.from({ length: perPage }).map((_, i) => (
              <TableRow key={`skeleton-${i}`} className="animate-pulse">
                <TableCell className="py-6 h-8 bg-gray-100" />
                <TableCell className="py-6 h-8 bg-gray-100" />
                <TableCell className="py-6 h-8 bg-gray-100" />
                <TableCell className="py-6 h-8 bg-gray-100" />
                <TableCell className="py-6 h-8 bg-gray-100" />
                <TableCell className="py-6 h-8 bg-gray-100" />
                <TableCell className="py-6 h-8 bg-gray-100" />
                <TableCell className="py-6 h-8 bg-gray-100" />
              </TableRow>
            ))
          ) : (
            items.map((item) => {
              // status styling — include In Transit / Unknown / null in this bucket
              const statusClass = cn(
                "max-w-fit rounded-full px-3.5 py-1 text-sm font-medium",
                {
                  "bg-[#DFF7E0] text-[#2E8A2E]": /warehouse|at warehouse|available/i.test(item.status ?? ""),
                  "bg-[#FFA70B]/[0.08] text-[#FFA70B]": /pending/i.test(item.status ?? ""),
                  "bg-[#D34053]/[0.08] text-[#D34053]": /missing|lost|unpaid|error/i.test(item.status ?? ""),
                  // treat In Transit or missing/unknown/null as in-transit bucket style
                  "bg-[#F3F4F6] text-[#374151]": /in\s*transit|unknown/i.test(item.status ?? "") || !item.status,
                }
              );

              // display "In Transit" when status explicitly says "In Transit" or is null/unknown
              const displayStatus =
                item.status && /in\s*transit/i.test(item.status)
                  ? "In Transit"
                  : !item.status || /^unknown$/i.test(item.status)
                  ? "In Transit"
                  : item.status;

              return (
                <TableRow key={item.id} className="border-t">
                  <TableCell className="py-6">
                    <h5 className="text-dark text-lg font-medium">{item.id}</h5>
                  </TableCell>

                  <TableCell>
                    <a href={item.qrUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-2">
                      <PreviewIcon />
                      <span>Preview</span>
                    </a>
                  </TableCell>

                  <TableCell>
                    <div className={statusClass}>{displayStatus}</div>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark">{item.clientName}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark font-medium">{item.clientId}</p>
                  </TableCell>

                  <TableCell>
                    <a href={item.photoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-2">
                      <PreviewIcon />
                      <span>Preview</span>
                    </a>
                  </TableCell>

                  <TableCell>
                    <p className="font-semibold text-dark">{item.assetType}</p>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="bg-blue-500 text-white px-4 py-2 rounded-md">View History</button>
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

      {/* Pagination controls (unchanged) */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Row per page</span>
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
            <span className="text-sm text-gray-500">Go to</span>
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

        <div className="flex items-center gap-2">
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
                className={cn("rounded border px-3 py-1 min-w-[40px]", { "ring-2 ring-blue-400 bg-white": p === page })}
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
            {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
          </div>
        </div>
      </div>
    </div>
  );
}
