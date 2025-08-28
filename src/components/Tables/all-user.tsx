"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TrashIcon, AddIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PreviewIcon } from "./icons";

type Item = {
  id: string;
  name: string;
  address: string;
  personInCharge: string;
  phone: string;
  description: string;
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

export default function AllItemsClient() {
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
      {/* Header */}
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            placeholder="Search name / id / address / person / phone"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded border px-3 py-2 w-full md:w-96"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="text-sm text-gray-500 ml-auto md:ml-0">{loading ? "Loading..." : `${total} items`}</div>
          <button
            className="inline-flex items-center h-10 px-4 py-2 text-sm font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple w-full md:w-auto justify-center"
            type="button"
            onClick={() => {
              /* open add client modal (left as TODO) */
            }}
          >
            <AddIcon />
            <span className="ml-2">Add New Client</span>
          </button>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] [&>th]:py-4 [&>th]:text-base">
              <TableHead className="min-w-[80px]">ID</TableHead>
              <TableHead className="min-w-[180px]">Name</TableHead>
              <TableHead className="min-w-[240px]">Address</TableHead>
              <TableHead className="min-w-[160px]">Person in Charge</TableHead>
              <TableHead className="min-w-[140px]">Phone</TableHead>
              <TableHead className="min-w-[240px]">Description</TableHead>
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
                  <TableCell className="py-6 h-8 bg-gray-100" />
                  <TableCell className="py-6 h-8 bg-gray-100" />
                </TableRow>
              ))
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="border-t">
                  <TableCell className="py-6">
                    <h5 className="text-dark text-lg font-medium">{item.id}</h5>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark font-medium">{item.name}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark">{item.address}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark">{item.personInCharge}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark font-medium">{item.phone}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark truncate max-w-[420px]">{item.description}</p>
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
                    <div className="text-sm text-gray-500">ID</div>
                    <div className="text-lg font-medium">{item.id}</div>
                    <div className="text-sm text-gray-500 mt-1">Name</div>
                    <div className="font-medium">{item.name}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Person</div>
                    <div className="mt-1 font-medium">{item.personInCharge}</div>
                    <div className="text-sm text-gray-500 mt-2">Phone</div>
                    <div className="font-medium">{item.phone}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm text-gray-500">Address</div>
                  <div className="font-medium">{item.address}</div>
                  <div className="mt-2 text-sm text-gray-500">Description</div>
                  <div className="">{item.description}</div>

                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-md text-sm">History</button>
                    <button className="p-2 border rounded-md" aria-label="Edit">Edit</button>
                    <button className="p-2 border rounded-md text-red-600" aria-label="Delete">Delete</button>
                  </div>
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
            {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
          </div>
        </div>
      </div>
    </div>
  );
}
