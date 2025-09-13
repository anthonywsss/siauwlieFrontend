"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { TrashIcon, AddIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import CreateNewAsset from "@/components/CreateNewAsset";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import DeleteAssetModal from "@/components/DeleteAssetModal";
import EditAssetModal from "@/components/EditAssetModal";
import Link from "next/link";
import { useModalWatch } from "@/components/ModalContext";
import { safeGet } from "@/lib/fetcher";


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
  qr_code: string;
  status: string | null;
  current_client: number;
  photo: string;
  asset_type_id: number;
};

type RawAsset = {
  id: string;
  qr_code: string;
  status: string | null;
  current_client: number;
  photo: string;
  asset_type_id: number;
  [k: string]: any;
};

type RawClient = {
  id: number;
  name: string;
};

type AssetType = {
  id: number;
  name: string;
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

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusOpen, setStatusOpen] = useState<boolean>(false);
  const statusRef = useRef<HTMLDivElement | null>(null);
  
  const [assetFilter, setAssetFilter] = useState<number | "all">("all");
  const [assetOpen, setAssetOpen] = useState(false);
  const assetRef = useRef<HTMLDivElement | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRaw, setEditingRaw] = useState<RawAsset | null>(null);
  const [deletingRaw, setDeletingRaw] = useState<RawAsset | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [allAssets, setAllAssets] = useState<RawAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<RawAsset | null>(null);
  const [data, setData] = useState<RawAsset[]>([]);
  const [assetType, setAssetType] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  
  const [allClients, setAllClients] = useState<RawClient[]>([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'photo' | 'qr'>('photo');

  const { signOut } = useAuth();
  const router = useRouter();

  // Normalize
  function buildImageSrc(photo?: string | null): string | null {
    if (!photo) return null;
    const trimmed = photo.trim();
    if (/^data:image\//i.test(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const startsWith = (s: string) => trimmed.startsWith(s);
    let mime = "image/jpeg";
    if (startsWith("iVBORw0KGgo")) mime = "image/png";
    else if (startsWith("/9j/")) mime = "image/jpeg";
    else if (startsWith("R0lGOD")) mime = "image/gif";
    else if (startsWith("UklGR")) mime = "image/webp";
    return `data:${mime};base64,${trimmed}`;
  }

  // Handle QR
  function buildQRSrc(qrCode?: string | null): string | null {
    if (!qrCode) return null;
    const trimmed = qrCode.trim();
    
    // If complete URL return as is
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    
    // If base64 image data treat it as such
    if (/^data:image\//i.test(trimmed)) return trimmed;
    
    // If plain base64 == PNG
    if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length > 50) {
      return `data:image/png;base64,${trimmed}`;
    }
    
    // else, return as is
    return trimmed;
  }

  const openPreview = (src: string | null, type: 'photo' | 'qr') => {
    if (!src) return;
    setPreviewSrc(src);
    setPreviewType(type);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewSrc(null);
  };

  useEffect(() => {
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
    setError(null);

    const offset = Math.max(0, (page - 1) * perPage);

    (async () => {
      try {
        const params: Record<string, any> = {
          limit: perPage,
          offset,
        };

        if (query && query.trim() !== "") params.q = query.trim();
        if (statusFilter !== "all") params.status = statusFilter;
        if (assetFilter !== "all") params.asset_type_id = Number(assetFilter);

        const res = await safeGet<{ data: RawAsset[]; meta?: { total?: number } }>("/asset?" + new URLSearchParams(params as any).toString());
        if (!mounted) return;
        
        if (res === null) {
          // Handle error case
          setError("Failed to fetch assets");
          setData([]);
          setTotal(0);
        } else {
          const raw: RawAsset[] = res?.data ?? [];
          const metaTotal: number = Number(res?.meta?.total ?? raw.length ?? 0);
          
          setData(Array.isArray(raw) ? raw : []);
          setTotal(Number.isFinite(metaTotal) ? metaTotal : (Array.isArray(raw) ? raw.length : 0));
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

    return () => { mounted = false; };
  }, [perPage, page, query, statusFilter, assetFilter, refreshKey, signOut, router]);



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

  // open edit modal
  function handleEditOpen(raw?: RawAsset | null) {
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

  //status
  const STATUS_OPTIONS = [
    { value: "outbound_to_client", label: "Perjalanan ke pelanggan" },
    { value: "inbound_at_client", label: "Di pelanggan" },
    { value: "outbound_to_factory", label: "Perjalanan ke pabrik" },
    { value: "inbound_at_factory", label: "Di pabrik" },
  ];

  //renaming status
  const STATUS_LABELS: Record<string, string> = {
    outbound_to_client: "In Transit to Client",
    inbound_at_client: "At Customer",
    outbound_to_factory: "In Transit to Factory",
    inbound_at_factory: "At Factory",
  };

  // Normalize
  function normalizeStatus(s?: string | null): string | null {
    if (!s) return null;
    switch (s) {
      case "outbound_from_factory":
        return "outbound_to_client";
      case "outbound_from_client":
        return "outbound_to_factory";
      case "outbound_to_client":
      case "outbound_to_factory":
      case "inbound_at_client":
      case "inbound_at_factory":
        return s;
      default:
        return s;
    }
  }

  // fetch client
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await safeGet<{ data: RawClient[] }>("/clients");
        if (!mounted) return;
        
        if (res === null) {
          // Handle error case
          setError("Failed to fetch clients");
          setAllClients([]);
        } else {
          const clients = Array.isArray(res?.data) ? res.data : [];
          setAllClients(clients);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "Failed to fetch clients");
        setAllClients([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const [alltype, setAllType] = useState<AssetType[]>([]);

  //fetch asset type
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await safeGet<{ data: AssetType[] }>("/asset-type");
        if (!mounted) return;
        
        if (res === null) {
          // Handle error case
          setError("Failed to fetch asset types");
          setAllType([]);
        } else {
          const type: AssetType[] = res?.data ?? [];
          setAllType(Array.isArray(type) ? type : []);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "Failed to fetch asset types");
        setAllType([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  //store asset type
  const assetTypeMap = useMemo(() => {
  const map: Record<number, string> = {};
  alltype.forEach(t => { map[t.id] = t.name });
    return map;
  }, [alltype]);

  // dropdown asset type
  const ASSET_TYPE_OPTIONS = alltype.map(t => ({
    value: t.id,
    label: t.name,
  }));

    
  useEffect(() => {
    setPage(1);
  }, [perPage, query]);
    
  const visibleItems = data.filter(item =>
    (assetFilter === "all" ? true : item.asset_type_id === assetFilter) &&
    (statusFilter === "all" ? true : normalizeStatus(item.status) === statusFilter) &&
    (!query ? true : item.id.toString().includes(query))
  );

  // History Button
   const goToDetail = (assetId?: string) => {
    if (!assetId) return;
    router.push(`/history/${encodeURIComponent(String(assetId))}`);
  };


  const visible = data;

  function PreviewModal({ open, src, type, onClose }: { open: boolean; src: string | null; type: 'photo' | 'qr'; onClose: () => void }) {
    useModalWatch(open);

    if (!open || !src) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="max-w-[98vw] max-h-[96vh] overflow-auto bg-white rounded shadow-lg p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">
              {type === 'qr' ? 'QR Code Preview' : 'Photo Preview'}
            </h3>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded border text-sm inline-flex items-center gap-2 hover:bg-gray-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Close
            </button>
          </div>

          <div className="flex justify-center">
            <img 
              src={src} 
              alt={type === 'qr' ? 'QR Code' : 'Photo'} 
              className="max-w-full max-h-[80vh] object-contain"
              onError={(e) => {
                console.error('Image failed to load:', src);
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden p-8 text-center text-gray-500">
              <p>Failed to load {type === 'qr' ? 'QR code' : 'photo'}.</p>
              <p className="text-sm mt-2">The image may be corrupted or the URL is invalid.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark sm:p-7.5">
    {/* Desktop Table */}

      {/* Header: stack on mobile, row on md+ */}
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* LEFT: filters + search */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
            {/* Status Filter dropdown */}
            <div ref={statusRef} className="relative w-full md:w-auto">
              <button
                type="button"
                onClick={() => setStatusOpen((s) => !s)}
                className="inline-flex items-center h-10 w-full md:w-auto px-3 py-2 text-sm font-medium rounded border bg-white"
                aria-haspopup="true"
                aria-expanded={statusOpen}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 5h18M7 12h10M10 19h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span className="truncate">
                  {STATUS_LABELS[statusFilter] ?? "Status Filter"}
                </span>
                <svg className="w-3 h-3 ml-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              
              {statusOpen && (
                <div className="absolute left-0 mt-2 w-full md:w-56 rounded border bg-white shadow-lg z-50">
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
                          {STATUS_LABELS[opt.value] ?? opt.label}
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
            <div ref={assetRef} className="relative w-full md:w-auto">
              <button
                type="button"
                onClick={() => setAssetOpen((s) => !s)}
                className="inline-flex items-center h-10 w-full md:w-auto px-3 py-2 text-sm font-medium rounded border bg-white"
                aria-haspopup="true"
                aria-expanded={assetOpen}
              >
                <span className="truncate">
                  {ASSET_TYPE_OPTIONS.find((o) => o.value === assetFilter)?.label ?? "Asset Type Filter"}
                </span>
                <svg className="w-3 h-3 ml-2" viewBox="0 0 20 20" fill="none">
                  <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {assetOpen && (
                <div className="absolute left-0 mt-2 w-full md:w-56 rounded border bg-white shadow-lg z-50">
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
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input
                placeholder="Search ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 rounded border px-3 py-2 w-full md:w-96"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: add + total */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="text-sm text-gray-500 ml-auto md:ml-0">{loading ? "Loading..." : `${total} items`}</div>
          <button
            className="inline-flex items-center h-10 px-4 py-2 text-sm font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple w-full md:w-auto justify-center"
            type="button"
            onClick={handleCreateOpen}
            disabled={actionLoading !== null}
          >
            <AddIcon />
            <span className="ml-2">Add New Asset</span>
          </button>
        </div>
      </div>
      <div className="hidden md:block overflow-x-auto">
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
            {visibleItems.map((item, index) => {
               return (
                  <TableRow key={index} className="border-t">
                    
                    <TableCell>
                      <p className="text-dark">{item.id}</p>
                    </TableCell>

                    <TableCell>
                      {item.qr_code ? (
                        <button
                          onClick={() => openPreview(buildQRSrc(item.qr_code), 'qr')}
                          className="text-primary hover:underline inline-flex items-center gap-2"
                        >
                          <PreviewIcon />
                          <span>Preview QR</span>
                        </button>
                      ) : (
                        <span className="text-gray-400">No QR Code</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <p className="text-black">
                        {STATUS_LABELS[normalizeStatus(item.status) ?? ""] ?? "Unknown"}
                      </p>

                    </TableCell>

                    <TableCell>
                      <p className="text-dark">
                        {allClients.find((c) => c.id === item.current_client)?.name ?? "Unknown"}
                      </p>
                    </TableCell>

                    <TableCell>
                      <p className="text-dark">{item.current_client}</p>
                    </TableCell>

                    <TableCell>
                      {item.photo ? (
                        <button
                          onClick={() => openPreview(buildImageSrc(item.photo), 'photo')}
                          className="text-primary hover:underline inline-flex items-center gap-2"
                        >
                          <PreviewIcon />
                          <span>Preview Photo</span>
                        </button>
                      ) : (
                        <span className="text-gray-400">No Photo</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <p className="text-dark">
                        {assetTypeMap[item.asset_type_id] ?? "Unknown"}
                      </p>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {/* HISTORY BUTTON */}
                        <Link href={`/history/${item.id}`} passHref>
                          <button
                            type="button"
                            onClick={() => goToDetail(item.id)} 
                            className="flex items-center justify-center w-fit px-4 py-2 text-md font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg active:bg-purple-600 hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple">
                              History
                            </button>
                        </Link>
                       {/* EDIT BUTTON */}
                        <button
                          className="p-2 hover:text-primary"
                          aria-label="Edit"
                          onClick={() => handleEditOpen(item)}
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
                          onClick={() => setDeletingRaw(item)}
                          disabled={actionLoading !== null}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </TableCell>

                  </TableRow>
              );
            })}
             
          </TableBody>
        </Table>
      </div>

      {/* Mobile list Cards*/}
      <div className="md:hidden">
        {visible.map((item, index) => {
              return (
                <div key={index} className="border rounded-lg p-3 mb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-gray-500">Id</div>
                      <div className="text-lg font-medium">{item.id}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Status</div>
                      <div className="mt-1">
                        <p className="text-black">
                          {STATUS_LABELS[normalizeStatus(item.status) ?? ""] ?? "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-sm text-gray-500">Client</div>
                      <div className="font-medium">
                        {allClients.find((c) => c.id === item.current_client)?.name ?? "Unknown"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Type</div>
                      <div className="font-medium">{item.asset_type_id}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <div className="text-sm text-gray-500">QR Code</div>
                    {item.qr_code ? (
                      <button
                        onClick={() => openPreview(buildQRSrc(item.qr_code), 'qr')}
                        className="text-primary hover:underline inline-flex items-center gap-2 w-fit"
                      >
                        <PreviewIcon />
                        <span>Preview QR</span>
                      </button>
                    ) : (
                      <span className="text-gray-400">No QR Code</span>
                    )}

                    <div className="text-sm text-gray-500">Photo</div>
                    {item.photo ? (
                      <button
                        onClick={() => openPreview(buildImageSrc(item.photo), 'photo')}
                        className="text-primary hover:underline inline-flex items-center gap-2 w-fit"
                      >
                        <PreviewIcon />
                        <span>Preview Photo</span>
                      </button>
                    ) : (
                      <span className="text-gray-400">No Photo</span>
                    )}

                    <div className="flex gap-2 mt-2">
                      <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-md text-sm">History</button>
                      <button className="p-2 border rounded-md" aria-label="Edit" onClick={() => handleEditOpen(item)}>Edit</button>
                      <button className="p-2 border rounded-md text-red-600" aria-label="Delete" onClick={() => setDeletingRaw(item)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Pagination controls*/}
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

      {/* Modals */}
        <CreateNewAsset
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreatedOrUpdated}
        />
        
        <DeleteAssetModal
          open={!!deletingRaw}
          AllAsset={deletingRaw ?? undefined}
          onClose={() => setDeletingRaw(null)}
          onDeleted={() => {
            setDeletingRaw(null);
            setRefreshKey((k) => k + 1);
          }}
        />

        <EditAssetModal
          open={!!editingRaw}
          assetType={editingRaw ?? undefined}
          onClose={() => setEditingRaw(null)}
          onUpdated={() => {
            setEditingRaw(null);
            setRefreshKey((k) => k + 1);
          }}
        />

        <PreviewModal open={isPreviewOpen} src={previewSrc} type={previewType} onClose={closePreview} />
    </div>
  );
}
