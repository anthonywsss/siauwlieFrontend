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
            title: "Container",
            url: "/",
          },
        ],
      },
    ],
  },
  {
    label: "Container",
    items: [
      {
        title: "All Container",
        url: "/all-container",
        icon: Icons.GlobeIcon,
        items: [],
      },
      {
        title: "Container Validation",
        url: "/ContainerValidation",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Submit Movement",
        url: "/SubmitMovement",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Latest Movement",
        url: "/LatestMovement",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Search Container Movement History",
        url: "/SubmitMovementHistory",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Disposal History",
        url: "/DisposalHistory",
        icon: Icons.User,
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
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
  {
    label: "User",
    items: [
      {
        title: "All User",
        url: "/All User",
        icon: Icons.PieChart,
        items: [],
      },
    ],
  },
];