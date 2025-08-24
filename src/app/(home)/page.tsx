import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import SearchBar from "@/components/Search/SearchBar";
import { InvoiceTable } from "@/components/Tables/invoice-table";
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
      <SearchBar />

      <Suspense fallback={<OverviewCardsSkeleton />}>
        <OverviewCardsGroup />
      </Suspense>
    </div>
  );
}
