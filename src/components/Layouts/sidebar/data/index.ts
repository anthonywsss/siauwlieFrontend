import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "Main Menu",
    items: [
      {
        title: "Dashboard",
        icon: Icons.Squares2X2Icon,
        items: [
          {
            title: "Container Monitoring",
            url: "/",
          },
        ],
      },
    ],
  },
  {
    label: "Assets",
    items: [
      {
        title: "All Asset",
        url: "/all-asset",
        icon: Icons.ArchiveBoxIcon,
        items: [],
      },
      {
        title: "Submit Movement",
        url: "/submit-movement",
        icon: Icons.ArrowUpOnSquareStackIcon,
        items: [],
      },
      {
        title: "Unfinished Delivery",
        url: "/unfin-delivery",
        icon: Icons.TruckIcon,
        items: [],
      },
      {
        title: "Disposal History",
        url: "/disposal-history",
        icon: Icons.TrashIcon,
        items: [],
      },
      {
        title: "Asset Type", 
        url: "/asset-type",
        icon: Icons.TagIcon,
        items: [],
      },
    ],
  },
  {
    label: "Client",
    items: [
      {
        title: "All Client",
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
        title: "All User",
        url: "/all-user",
        icon: Icons.UserGroupIcon,
        items: [],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Audit Trail",
        url: "/audit-log",
        icon: Icons.ClipboardDocumentListIcon,
        items: [],
      },
    ],
  },
];
