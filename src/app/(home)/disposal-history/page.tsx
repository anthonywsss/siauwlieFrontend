import AllItemsClient from "@/components/Tables/disposal";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riwayat Pembuangan",
};

export default function Home() {
  return (
    <div className="space-y-6">
      <AllItemsClient />
    </div>
  );
}
