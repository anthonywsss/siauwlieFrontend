"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RawAudit = {
  id?: number | string;
  action?: string;
  created_at?: string;
  table_name?: string;
  record_id?: string | number;
  user_id?: string | number;
  new_value?: any;
  old_value?: any;
  [k: string]: any;
};

type Item = {
  id: string;
  action: string;
  tableName: string;
  recordId: string;
  userId: string;
  timestamp: string;
  raw?: RawAudit;
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

export default function AuditLog() {
  const { signOut } = useAuth();
  const router = useRouter();

  // pagination & search
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [goto, setGoto] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  // data state
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pages = useMemo(() => generatePages(page, totalPages), [page, totalPages]);
  
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const offset = Math.max(0, (page - 1) * perPage);

    (async () => {
      try {
        if (query && query.trim() !== "") {
          // 1) Find ID
          try {
            const idRes = await API.get("/audit-trail", {
              params: {
                limit: perPage,
                offset,
                id: query.trim(),
              },
            });

            const idRaw: RawAudit[] = idRes?.data?.data ?? idRes?.data ?? [];
            const idTotal: number = Number(idRes?.data?.meta?.total ?? idRaw.length ?? 0);

            if (!mounted) return;

            if (Array.isArray(idRaw) && idRaw.length > 0) {
              const mapped: Item[] = idRaw.map((r) => ({
                id: String(r.id ?? r.record_id ?? Math.random().toString(36).slice(2, 9)),
                action: String(r.action ?? "-"),
                tableName: String(r.table_name ?? r.table ?? "-"),
                recordId: String(r.record_id ?? r.recordId ?? "-"),
                userId: String(r.user_id ?? r.userId ?? "-"),
                timestamp: String(r.created_at ?? r.timestamp ?? "-"),
                raw: r,
              }));

              setItems(mapped);
              setTotal(Number.isFinite(idTotal) ? idTotal : mapped.length);
              return; // ID found ;0
            }

          } catch (idErr) {
          }

          const res = await API.get("/audit-trail", {
            params: {
              limit: perPage,
              offset,
              q: query.trim(),
            },
          });

          const rawData: RawAudit[] = res?.data?.data ?? res?.data ?? [];
          const metaTotal: number = Number(res?.data?.meta?.total ?? rawData.length ?? 0);

          if (!mounted) return;

          const mapped: Item[] = (Array.isArray(rawData) ? rawData : []).map((r) => ({
            id: String(r.id ?? r.record_id ?? Math.random().toString(36).slice(2, 9)),
            action: String(r.action ?? "-"),
            tableName: String(r.table_name ?? r.table ?? "-"),
            recordId: String(r.record_id ?? r.recordId ?? "-"),
            userId: String(r.user_id ?? r.userId ?? "-"),
            timestamp: String(r.created_at ?? r.timestamp ?? "-"),
            raw: r,
          }));

          setItems(mapped);
          setTotal(Number.isFinite(metaTotal) ? metaTotal : mapped.length);
          return;
        }

        const res = await API.get("/audit-trail", {
          params: {
            limit: perPage,
            offset,
          },
        });

        const rawData: RawAudit[] = res?.data?.data ?? res?.data ?? [];
        const metaTotal: number = Number(res?.data?.meta?.total ?? rawData.length ?? 0);

        if (!mounted) return;

        const mapped: Item[] = (Array.isArray(rawData) ? rawData : []).map((r) => ({
          id: String(r.id ?? r.record_id ?? Math.random().toString(36).slice(2, 9)),
          action: String(r.action ?? "-"),
          tableName: String(r.table_name ?? r.table ?? "-"),
          recordId: String(r.record_id ?? r.recordId ?? "-"),
          userId: String(r.user_id ?? r.userId ?? "-"),
          timestamp: String(r.created_at ?? r.timestamp ?? "-"),
          raw: r,
        }));

        setItems(mapped);
        setTotal(Number.isFinite(metaTotal) ? metaTotal : mapped.length);
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
  }, [perPage, page, query, refreshKey, signOut, router]);

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
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark sm:p-7.5">
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            placeholder="Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            className="h-10 rounded border px-3 py-2 w-full md:w-96"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="text-sm text-gray-500 ml-auto md:ml-0">{loading ? "Loading..." : `${total} records`}</div>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] [&>th]:py-4 [&>th]:text-base">
              <TableHead className="min-w-[120px]">ID</TableHead>
              <TableHead className="min-w-[160px]">Table</TableHead>
              <TableHead className="min-w-[140px]">Records ID</TableHead>
              <TableHead className="min-w-[140px]">Action</TableHead>
              <TableHead className="min-w-[140px]">User</TableHead>
              <TableHead className="min-w-[220px]">Timestamp</TableHead>
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
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Audit Logs not available.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={it.id} className="border-t">
                  <TableCell>
                    <p className="text-dark font-medium">{it.id}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark">{it.tableName}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark">{it.recordId}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark font-medium">{it.action}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-dark">{it.userId}</p>
                  </TableCell>

                  <TableCell>
                    {it.timestamp ? dayjs(it.timestamp).format("MMM DD, YYYY - hh:mm") : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {loading
          ? Array.from({ length: perPage }).map((_, i) => (
              <div key={`skeleton-card-${i}`} className="animate-pulse border rounded p-3 mb-3 bg-gray-50" />
            ))
          : items.map((it) => (
              <div key={it.id} className="border rounded-lg p-3 mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">Table</div>
                    <div className="text-lg font-medium">{it.tableName}</div>
                    <div className="text-sm text-gray-500 mt-1">Records ID</div>
                    <div className="font-medium">{it.recordId}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Action</div>
                    <div className="mt-1 font-medium">{it.action}</div>
                    <div className="text-sm text-gray-500 mt-2">User</div>
                    <div className="font-medium">{it.userId}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm text-gray-500">Timestamp</div>
                  <div className="font-medium truncate">
                    {it.timestamp ? dayjs(it.timestamp).format("MMM DD, YYYY - hh:mm") : "-"}
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
    </div>
  );
}
