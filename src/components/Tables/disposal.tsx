"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import API from "@/lib/api";
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

export default function DisposalHistory() {
  const [data, setData] = useState<RawDisposal[]>([]);
  const [loading, setLoading] = useState(true);

  // pagination & search
    const [perPage, setPerPage] = useState<number>(10);
    const [page, setPage] = useState<number>(1);
    const [goto, setGoto] = useState<string>("");
    const [query, setQuery] = useState<string>("");

    //data state
    const [total, setTotal] = useState<number>(0);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const pages = useMemo(() => generatePages(page, totalPages), [page, totalPages]);

  useEffect(() => {
    const fetchDisposals = async () => {
      try {
        const res = await API.get("/disposal-history"); 
        setData(res.data?.data ?? []);
      } catch (err) {
        console.error("Error fetching disposals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDisposals();
  }, []);

  
    useEffect(() => {
      setPage(1);
    }, [perPage, query]);
  
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
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
            <TableHead className="min-w-[155px] xl:pl-7.5">Container ID</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Disposed by</TableHead>
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
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={index} className="border-[#eee] dark:border-dark-3">
                <TableCell className="min-w-[155px] xl:pl-7.5">
                  <h5 className="text-dark dark:text-white">{item.asset_id ?? "-"}</h5>
                </TableCell>

                <TableCell>
                  <h5 className="text-dark dark:text-white">{item.reason ?? "-"}</h5>
                </TableCell>

                <TableCell>
                  <p className="text-dark dark:text-white">
                    {item.disposed_at ? dayjs(item.disposed_at).format("MMM DD, YYYY") : "-"}
                  </p>
                </TableCell>

                <TableCell>
                  <h5 className="text-gray-7 dark:text-white">{item.disposed_by ?? "-"}</h5>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
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
    </div>
  );
}
