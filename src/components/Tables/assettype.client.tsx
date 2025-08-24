// src/components/Tables/assettype.client.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TrashIcon } from "@/assets/icons"; // swap to your icon path
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
  status: string;
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

export default function AssetTypeClient() {
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [goto, setGoto] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const controller = new AbortController();
    fetch(`/api/items?page=${page}&perPage=${perPage}&q=${encodeURIComponent(query)}`, {
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
  }, [page, perPage, query]);

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

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark sm:p-7.5">
      {/* optional top controls */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            placeholder="Search id / client / type"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="rounded border px-3 py-2"
          />
        </div>
        <div className="text-sm text-gray-500">{loading ? "Loading..." : `${total} items`}</div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] [&>th]:py-4 [&>th]:text-base">
            <TableHead className="min-w-[110px]">Id</TableHead>
            <TableHead className="min-w-[150px]">Asset Name</TableHead>
            <TableHead className="min-w-[200px]">Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              </TableRow>
            ))
          ) : (
            items.map((item) => {
              const statusClass = cn(
                "max-w-fit rounded-full px-3.5 py-1 text-sm font-medium",
                {
                  "bg-[#DFF7E0] text-[#2E8A2E]": /warehouse|at warehouse|available/i.test(item.status),
                  "bg-[#FFA70B]/[0.08] text-[#FFA70B]": /pending/i.test(item.status),
                  "bg-[#D34053]/[0.08] text-[#D34053]": /missing|lost|unpaid|error/i.test(item.status),
                  "bg-[#F3F4F6] text-[#374151]": item.status === "Unknown",
                }
              );

              return (
                <TableRow key={item.id} className="border-t">
                  <TableCell className="py-6">
                    <h5 className="text-dark text-lg font-medium">{item.id}</h5>
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
                        {/* pencil svg */}
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

      {/* Pagination controls */}
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