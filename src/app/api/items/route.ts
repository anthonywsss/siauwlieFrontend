// app/api/items/route.ts
import { NextResponse } from "next/server";

type Item = {
  id: string;
  qrUrl: string;
  status: string | null;
  clientName: string;
  clientId: string | number;
  photoUrl: string;
  assetType: string;
};

// Example source data generator (keep your real data source here)
const STATUSES = ["At Warehouse", "Pending", "Missing", "In Transit", "Available"];
const ASSET_TYPES = ["Container", "Pallet", "Machine", "Crate", "Box"];

function makeSampleItems(count = 200): Item[] {
  const items: Item[] = [];
  for (let i = 1; i <= count; i++) {
    const status = STATUSES[(i + 1) % STATUSES.length];
    items.push({
      id: `ITEM-${i.toString().padStart(4, "0")}`,
      qrUrl: `https://example.com/qr/${i}`,
      status: i % 17 === 0 ? null : status, // some nulls (treated as In Transit in client)
      clientName: `Client ${((i % 12) + 1)}`,
      clientId: i % 50,
      photoUrl: `https://example.com/photo/${i}`,
      assetType: ASSET_TYPES[i % ASSET_TYPES.length],
    });
  }
  return items;
}

const allItems = makeSampleItems();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.max(1, Number(url.searchParams.get("perPage") ?? 10));
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  // read status and assetType param from querystring
  const statusParamRaw = url.searchParams.get("status") ?? "";
  const statusParam = statusParamRaw.trim().toLowerCase();
  const assetParamRaw = url.searchParams.get("assetType") ?? "";
  const assetParam = assetParamRaw.trim().toLowerCase();

  // start with text query filtering if provided
  let filtered: Item[] = q
    ? allItems.filter(
        (it) =>
          it.id.toLowerCase().includes(q) ||
          it.clientName.toLowerCase().includes(q) ||
          it.assetType.toLowerCase().includes(q)
      )
    : allItems.slice();

  // Apply assetType filtering if provided and not "all"
  if (assetParam && assetParam !== "all") {
    filtered = filtered.filter((it) => (it.assetType ?? "").toLowerCase() === assetParam);
  }

  // Apply status filtering only when provided and not "all"
  if (statusParam && statusParam !== "all") {
    // support "available", "pending", "missing", "in_transit" (or "intransit")
    if (statusParam === "available") {
      filtered = filtered.filter(
        (it) =>
          !!it.status &&
          /available|at\s*warehouse|warehouse/i.test(it.status)
      );
    } else if (statusParam === "pending") {
      filtered = filtered.filter((it) => !!it.status && /pending/i.test(it.status));
    } else if (statusParam === "missing") {
      filtered = filtered.filter((it) => !!it.status && /(missing|lost)/i.test(it.status));
    } else if (statusParam === "in_transit" || statusParam === "intransit" || statusParam === "in-transit") {
      // In Transit should match explicit "In Transit" statuses OR items with null/empty/unknown status
      filtered = filtered.filter(
        (it) =>
          !it.status ||
          /^unknown$/i.test(it.status) ||
          /in\s*transit/i.test(it.status)
      );
    } else {
      // generic fallback: substring match
      filtered = filtered.filter(
        (it) => !!it.status && it.status.toLowerCase().includes(statusParam)
      );
    }
  }

  const total = filtered.length;
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  return NextResponse.json({ items: pageItems, total }, { status: 200 });
}
