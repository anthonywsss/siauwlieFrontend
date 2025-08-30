import { NextResponse } from "next/server";

type Item = {
  id: string;
  name: string;
  address: string;
  personInCharge: string;
  phone: string;
  description: string;

  qrUrl: string;
  status: string | null;
  clientName: string;
  clientId: string | number;
  photoUrl: string;
  assetType: string;
};

const STATUSES = ["At Warehouse", "Pending", "Missing", "In Transit", "Available"];
const ASSET_TYPES = ["Container", "Pallet", "Machine", "Crate", "Box"];

const NAMES = [
  "Toko Camar",
  "CV. Selaras",
  "PT. Makmur Jaya",
  "Warung Makan Sederhana",
  "Toko Sumber Rejeki",
  "Bengkel Utama",
  "Koperasi Sentosa",
  "Kedai Kopi Rindu",
  "Distributor Nusantara",
  "Toko Laris Manis",
  "Gudang Prima",
  "Pabrik Indah",
];

const ADDRESSES = [
  "Pasar Modern Blok A",
  "Jl. Merdeka No.12",
  "Komplek Perumahan B-5",
  "Gedung Ruko 3 Lt",
  "Jl. Sudirman Kav. 45",
  "Blok C Pasar Baru",
  "Kawasan Industri 2",
  "Jalan S. Parman No.8",
  "Perumahan Cendana 4",
  "Jl. Raya Bogor KM.20",
];

const PERSONS = [
  "Anthony",
  "Siti",
  "Budi",
  "Rina",
  "Agus",
  "Dewi",
  "Hendra",
  "Lina",
  "Wahyu",
  "Rizki",
];

const DESCRIPTIONS = [
  "Sebelah Toko Akiong",
  "Gudang belakang kantor",
  "Depan minimarket",
  "Lantai 2 gedung ruko",
  "Di samping pom bensin",
  "Area parkir utama",
  "Gedung A, lantai dasar",
  "Pojok pasar tradisional",
  "Samping ATM center",
  "Sebelah apotek sehat",
];

function makeSampleItems(count = 200): Item[] {
  const items: Item[] = [];
  for (let i = 1; i <= count; i++) {
    const name = NAMES[i % NAMES.length];
    const address = ADDRESSES[i % ADDRESSES.length];
    const personInCharge = PERSONS[i % PERSONS.length];
    const description = DESCRIPTIONS[i % DESCRIPTIONS.length];
    const status = STATUSES[(i + 1) % STATUSES.length];
    const assetType = ASSET_TYPES[i % ASSET_TYPES.length];

    const phoneSuffix = (100000000 + i).toString().slice(-9);
    const phone = `0896${phoneSuffix}`;

    items.push({
      id: `CLT-${i.toString().padStart(4, "0")}`,
      name: `${name}${Math.floor(i / NAMES.length) ? " " + Math.floor(i / NAMES.length) : ""}`,
      address,
      personInCharge,
      phone,
      description,

      qrUrl: `https://example.com/qr/${i}`,
      status: i % 17 === 0 ? null : status,
      clientName: name,
      clientId: i % 500,
      photoUrl: `https://example.com/photo/${i}`,
      assetType,
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

  const statusParamRaw = url.searchParams.get("status") ?? "";
  const statusParam = statusParamRaw.trim().toLowerCase();
  const assetParamRaw = url.searchParams.get("assetType") ?? "";
  const assetParam = assetParamRaw.trim().toLowerCase();


  let filtered: Item[] = q
    ? allItems.filter((it) => {
        const hay = (
          it.id +
          " " +
          it.name +
          " " +
          it.address +
          " " +
          it.personInCharge +
          " " +
          it.phone +
          " " +
          (it.description ?? "") +
          " " +
          (it.assetType ?? "") +
          " " +
          (it.status ?? "")
        ).toLowerCase();
        return hay.includes(q);
      })
    : allItems.slice();

  if (assetParam && assetParam !== "all") {
    filtered = filtered.filter((it) => (it.assetType ?? "").toLowerCase() === assetParam);
  }
  if (statusParam && statusParam !== "all") {
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
    } else if (
      statusParam === "in_transit" ||
      statusParam === "intransit" ||
      statusParam === "in-transit"
    ) {
      filtered = filtered.filter(
        (it) =>
          !it.status ||
          /^unknown$/i.test(it.status) ||
          /in\s*transit/i.test(it.status)
      );
    } else {
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
