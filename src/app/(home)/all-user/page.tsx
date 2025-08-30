import AllItemsClient from "@/components/Tables/all-user";

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