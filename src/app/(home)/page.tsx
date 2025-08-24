import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { OverviewCardsGroup } from "./_components/overview-cards";
import { OverviewCardsSkeleton } from "./_components/overview-cards/skeleton";
import { Suspense } from "react";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Container Monitoring",
};

export default function Home() {
  return (
    <div>
      <Breadcrumb pageName="Container Monitoring" />

      { /* <Suspense fallback={<OverviewCardsSkeleton />}>} */}
        <OverviewCardsGroup />
      { /* </Suspense> */}
    </div>
  );
}
