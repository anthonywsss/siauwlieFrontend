"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Item = {
  id: string;
  reason?: string;
  timestamp?: string;
  disposedBy?: string | number;
  assetType?: string;
  status?: string | null;
  clientName?: string;
  clientId?: string | number;
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
    for (
      let i = Math.max(current + delta + 1, (pages[pages.length - 1] as number) + 1);
      i <= total;
      i++
    )
      pages.push(i);
  }

  return Array.from(new Set(pages));
}

export default function DisposalItemsClient() {
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [goto, setGoto] = useState<string>("");

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const controller = new AbortController();

    fetch(`/api/items?page=${page}&perPage=${perPage}`, {
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
  }, [page, perPage]);

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
      {/* Simple header showing total only (removed filters/add button) */}
      <div className="mb-4 flex items-center justify-between">
        <div />
        <div className="text-sm text-gray-500">{loading ? "Loading..." : `${total} items`}</div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] [&>th]:py-4 [&>th]:text-base">
              <TableHead className="min-w-[140px]">Container ID</TableHead>
              <TableHead className="min-w-[400px]">Reason</TableHead>
              <TableHead className="min-w-[200px]">Timestamp</TableHead>
              <TableHead className="min-w-[160px]">Disposed By</TableHead>
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
                // Fallbacks: if API doesn't have reason/timestamp/disposedBy, try other fields
                const displayReason = item.reason ?? item.assetType ?? item.status ?? "-";
                const displayTimestamp = item.timestamp ?? (item as any).createdAt ?? "-";
                const displayDisposedBy = item.disposedBy ?? item.clientName ?? "-";

                return (
                  <TableRow key={item.id} className="border-t">
                    <TableCell className="py-6">
                      <h5 className="text-dark text-lg font-medium">{item.id}</h5>
                    </TableCell>

                    <TableCell>
                      <p className="text-dark">{displayReason}</p>
                    </TableCell>

                    <TableCell>
                      <p className="text-dark font-medium">{displayTimestamp}</p>
                    </TableCell>

                    <TableCell>
                      <p className="font-semibold text-dark">{displayDisposedBy}</p>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list (cards) - simplified */}
      <div className="md:hidden">
        {loading
          ? Array.from({ length: perPage }).map((_, i) => (
              <div key={`skeleton-card-${i}`} className="animate-pulse border rounded p-3 mb-3 bg-gray-50" />
            ))
          : items.map((item) => {
              const displayReason = item.reason ?? item.assetType ?? item.status ?? "-";
              const displayTimestamp = item.timestamp ?? (item as any).createdAt ?? "-";
              const displayDisposedBy = item.disposedBy ?? item.clientName ?? "-";

              return (
                <div key={item.id} className="border rounded-lg p-3 mb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-gray-500">Container ID</div>
                      <div className="text-lg font-medium">{item.id}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Disposed By</div>
                      <div className="mt-1 font-medium">{displayDisposedBy}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm text-gray-500">Reason</div>
                    <div className="font-medium">{displayReason}</div>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm text-gray-500">Timestamp</div>
                    <div className="font-medium">{displayTimestamp}</div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Pagination controls */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
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
                onClick={() => goToPageNumber(p)}
                className={cn("rounded border px-3 py-1 min-w-[36px] md:min-w-[40px]", {
                  "ring-2 ring-blue-400 bg-white": p === page,
                })}
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
            {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
          </div>
        </div>
      </div>
    </div>
  );
}
