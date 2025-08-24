import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
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
    label: "Container Monitoring",
    items: [
      {
        title: "All Asset",
        url: "/all-asset",
        icon: Icons.GlobeIcon,
        items: [],
      },
      {
        title: "Submit Movement",
        url: "/SubmitMovement",
        icon: Icons.ChartIcon,
        items: [],
      },
      {
        title: "Unfinished Delivery",
        url: "/UnfinishedDelivery",
        icon: Icons.ChartIcon,
        items: [],
      },
      {
        title: "Disposal History",
        url: "/DisposalHistory",
        icon: Icons.ChartIcon,
        items: [],
      },
      {
        title: "Asset Categories",
        url: "/AssetCategories",
        icon: Icons.ChartIcon,
        items: [],
      },
    ],
  },
  {
    label: "Client",
    items: [
      {
        title: "All Client",
        url: "/AllClient",
        icon: Icons.User,
        items: [],
      },
    ],
  },
  {
    label: "User",
    items: [
      {
        title: "All User",
        url: "/AllUser",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Login/Sigin",
        url: "/auth/sign-in",
        icon: Icons.User,
        items: [],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Audit Trail",
        url: "/AuditTrail",
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
];