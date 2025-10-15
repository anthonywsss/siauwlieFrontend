import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "Menu Utama",
    items: [
      {
        title: "Dashboard",
        icon: Icons.Squares2X2Icon,
        items: [
          {
            title: "Monitoring Kontainer",
            url: "/",
          },
        ],
      },
    ],
  },
  {
    label: "Aset",
    items: [
      {
        title: "Seluruh Aset",
        url: "/all-asset",
        icon: Icons.ArchiveBoxIcon,
        items: [],
      },
      {
        title: "Laporkan Pergerakan",
        url: "/submit-movement",
        icon: Icons.ArrowUpOnSquareStackIcon,
        items: [],
      },
      {
        title: "Sedang Dikirim",
        url: "/unfin-delivery",
        icon: Icons.TruckIcon,
        items: [],
      },
      {
        title: "Riwayat Pembuangan",
        url: "/disposal-history",
        icon: Icons.TrashIcon,
        items: [],
      },
      {
        title: "Tipe Aset", 
        url: "/asset-type",
        icon: Icons.TagIcon,
        items: [],
      },
    ],
  },
  {
    label: "Klien",
    items: [
      {
        title: "Seluruh Klien",
        url: "/all-client",
        icon: Icons.UsersIcon,
        items: [],
      },
    ],
  },
  {
    label: "User",
    items: [
      {
        title: "Seluruh User",
        url: "/all-user",
        icon: Icons.UserGroupIcon,
        items: [],
      },
    ],
  },
  {
    label: "Sistem",
    items: [
      {
        title: "Log Audit",
        url: "/audit-log",
        icon: Icons.ClipboardDocumentListIcon,
        items: [],
      },
    ],
  },
];
