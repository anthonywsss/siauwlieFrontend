"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import API from "@/lib/api";
import { PreviewIcon, CloseIcon } from "./icons";
import { cn } from "@/lib/utils";
import { Dialog } from "@headlessui/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RawUnfin = {
  asset_id?: string;
  client_id?: number;
  photo?: string;
  timestamp?: string;
  user_id?: number;
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

export default function UnfinDelivery() {
  const [data, setData] = useState<RawUnfin[]>([]);
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
    const [image, setImage] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = async () => {
      try {
      const res = await API.get("/movements/unfinished");
      const item = res.data?.data?.[0]; 

        if (item) {
          setImage(item.photo); 
          setIsOpen(true);
        }
      }catch (err) {
        console.error("Failed to fetch image:", err);
      } 
    };


  useEffect(() => {
    const fetchDisposals = async () => {
      try {
        const res = await API.get("/movements/unfinished"); 
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
            <TableHead className="min-w-[155px] xl:pl-7.5">Asset ID</TableHead>
            <TableHead>Client ID</TableHead>
            <TableHead>Photo</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} className="border-[#eee] dark:border-dark-3">
              <TableCell className="min-w-[20px] xl:pl-3">
                <h5 className="text-dark dark:text-white">{item.asset_id}</h5>
              </TableCell>
        
              <TableCell>
                <h5 className="text-dark dark:text-white">{item.client_id}</h5>
              </TableCell>
        
              <TableCell>
                <button
                  onClick={handleClick}
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-2"
                >
                  <PreviewIcon />
                  <span>Pratinjau</span>
                </button>
                {/* Modal */}
                <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
                  <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                  <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="bg-white p-4 rounded-lg shadow-lg relative">
                      <Dialog.Title className="text-lg font-semibold mb-2">Pratinjau Gambar</Dialog.Title>
                      {image ? (
                      <img src={image} alt="Preview" className="max-w-[500px] rounded-md border" />
                      ) : (
                      <p className="text-sm text-gray-500">Tidak ada gambar</p>
                      )}
                      <a
                        onClick={() => setIsOpen(false)}
                        className="absolute top-2 right-2"
                      >
                        <CloseIcon />
                      </a>
                    </Dialog.Panel>
                  </div>
                </Dialog>
              </TableCell>

        
              <TableCell>
                <p className="text-dark dark:text-white">
                  {item.timestamp ? dayjs(item.timestamp).format("MMM DD, YYYY") : "-"}
                </p>
              </TableCell>

              <TableCell>
                <h5 className="text-dark dark:text-white">{item.user_id}</h5>
              </TableCell>
        
              <TableCell>
                <a href="">
                  <button className="flex items-center justify-center w-fit px-4 py-2 text-md font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg active:bg-purple-600 hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple mb-6 mt-6">
                    Cek Riwayat
                  </button>
                </a>
              </TableCell>
            </TableRow>
          ))}
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