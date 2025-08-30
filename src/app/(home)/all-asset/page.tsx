import AllItemsClient from "@/components/Tables/allitems.client";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Asset",
};

export default function Home() {
  return (
    <div className="space-y-6">

      <AllItemsClient />
    </div>
  );
}
