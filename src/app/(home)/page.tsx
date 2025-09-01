import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import OverviewCardsGroup from "./_components/overview-cards";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Container Monitoring",
};

export default function Home() {
  return (
    <div>
      <Breadcrumb pageName="Container Monitoring" />
        <OverviewCardsGroup />
    </div>
  );
}
