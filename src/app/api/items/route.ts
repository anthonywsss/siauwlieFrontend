// app/api/items/route.ts
import { NextResponse } from "next/server";

type Item = {
  id: string;
  qrUrl: string;
  status: string;
  clientName: string;
  clientId: string | number;
  photoUrl: string;
  assetType: string;
};

const STATUSES = ["At Warehouse", "Pending", "Missing", "In Transit", "Available"];
const ASSET_TYPES = ["Container", "Pallet", "Machine", "Crate", "Box"];

function makeItem(n: number): Item {
  return {
    id: `CONT${String(n).padStart(3, "0")}`,
    qrUrl: `/api/qr/${n}`,
    status: STATUSES[n % STATUSES.length],
    clientName: `Toko ${["Akiong", "Sari", "Maju"][n % 3]}`,
    clientId: 100 + (n % 10),
    photoUrl: `/images/item-${(n % 6) + 1}.jpg`,
    assetType: ASSET_TYPES[n % ASSET_TYPES.length],
  };
}

const TOTAL = 250; // total mock items

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.max(1, Number(url.searchParams.get("perPage") ?? 10));
  const q = (url.searchParams.get("q") ?? "").toLowerCase();

  // generate page items (deterministic)
  const allItems: Item[] = Array.from({ length: TOTAL }, (_, i) => makeItem(i + 1));

  // optional server-side filtering (search)
  const filtered = q
    ? allItems.filter(
        (it) =>
          it.id.toLowerCase().includes(q) ||
          it.clientName.toLowerCase().includes(q) ||
          it.assetType.toLowerCase().includes(q)
      )
    : allItems;

  const total = filtered.length;
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  return NextResponse.json({ items: pageItems, total }, { status: 200 });
}
