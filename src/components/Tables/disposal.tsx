"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import API from "@/lib/api";
import { safeGet } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RawDisposal = {
  id?: number | string;
  asset_id?: string;
  disposed_at?: string;
  disposed_by?: string;
  reason?: string;
};

export type datas = {
  id?: number | string;
  asset_id?: string;
  disposed_at?: string;
  disposed_by?: string;
  reason?: string;
  raw?: RawDisposal;
};


export default function DisposalHistory() {
  const [data, setData] = useState<RawDisposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  
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
 
        const queryString = new URLSearchParams(params).toString();
  
        const res = await safeGet<{ data: RawDisposal[]; meta?: { total?: number } }>(
          `/disposal-history?${queryString}`
        );
        if (!mounted) return;
  
        if (res === null) {
          setError("Failed to fetch assets");
          setData([]);
          setTotal(0);
        } else {
          setData(Array.isArray(res.data) ? res.data : []);
          setTotal(res.meta?.total ?? 0); // backend should return total count
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
  }, [page, perPage, refreshKey]);
  return (
    <>
      {/* Total */}
      <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
       <div className="mb-4 flex justify-end">
        <div className="text-sm text-gray-500">
          {loading ? "Loading..." : `${total} disposed assets`}
        </div>
      </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

        {/* Desktop Table */}
        <div className="hidden md:block rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
          <h1 className="text-[26px] font-bold leading-[30px] text-dark mb-5"> Disposal History </h1>

          <Table>
            <TableHeader>
              <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
                <TableHead className="min-w-[155px] xl:pl-7.5">Container ID</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Recorded At</TableHead>
                <TableHead>Disposed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    No data available.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => (
                  <TableRow key={index} className="border-[#eee] dark:border-dark-3">
                    <TableCell className="min-w-[155px] xl:pl-7.5">
                      <h5 className="text-dark">{item.asset_id ?? "-"}</h5>
                    </TableCell>
                    <TableCell>
                      <h5 className="text-dark">{item.reason ?? "-"}</h5>
                    </TableCell>
                    <TableCell>
                      <p className="text-dark">
                        {item.disposed_at
                          ? dayjs(item.disposed_at).format("MMM DD, YYYY - HH:mm")
                          : "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <h5 className="text-gray-7">{item.disposed_by ?? "-"}</h5>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

          </Table>
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
                    of {total}
                  </div>
                </div>
        </div>
        {/* Mobile List Cards */}
        <div className="md:hidden">
          {loading
            ? Array.from({ length: perPage }).map((_, i) => (
                <div key={`skeleton-card-${i}`} className="animate-pulse border rounded-lg p-3 mb-3 bg-gray-50" />
              ))
            : data.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 mb-3 bg-white dark:bg-gray-dark dark:border-dark-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 dark:text-gray-300">Container ID</div>
                      <div className="text-base font-medium text-dark">{item.asset_id ?? "-"}</div>

                      <div className="text-sm text-gray-500 dark:text-gray-300 mt-2">Reason</div>
                      <div className="text-base text-dark">{item.reason ?? "-"}</div>

                      <div className="text-sm text-gray-500 dark:text-gray-300 mt-2">Recorded At</div>
                      <div className="text-base text-dark">
                        {item.disposed_at ? dayjs(item.disposed_at).format("MMM DD, YYYY - HH:mm") : "-"}
                      </div>

                      <div className="text-sm text-gray-500 dark:text-gray-300 mt-2">Disposed By</div>
                      <div className="text-base text-dark">{item.disposed_by ?? "-"}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <a href="#">
                      <button className="bg-primary text-white px-3 py-1 rounded-md mt-2 text-sm">
                        View History
                      </button>
                    </a>
                  </div>
                </div>
              ))}
        </div>

      </div>
    </>
  );
}
