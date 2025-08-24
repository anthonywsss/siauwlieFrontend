import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import SearchBar from "@/components/Search/SearchBar";
import { AllItemsTable } from "@/components/Tables/allitems";
import AllItemsClient from "@/components/Tables/allitems.client";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Asset",
};

export default function Home() {
  return (
    <div className="space-y-6">
      <Breadcrumb pageName="All Asset" />

      <AllItemsClient />
    </div>
  );
}
