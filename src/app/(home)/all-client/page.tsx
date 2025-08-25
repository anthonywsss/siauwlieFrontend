import SearchBar from "@/components/Search/SearchBar";
import { AllItemsTable } from "@/components/Tables/allitems";
import AllClient from "@/components/Tables/allclient.client";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Client",
};

export default function Home() {
  return (
    <div className="space-y-6">

      <AllClient />
    </div>
  );
}
