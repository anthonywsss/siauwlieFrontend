import AssetTypeTable from "@/components/Tables/assettype.client";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tables",
};

export default function Home() {
  return (
    <div className="space-y-6">

      <AssetTypeTable />
    </div>
  );
}
