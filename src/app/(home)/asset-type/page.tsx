import AssetTypeList from "@/components/Tables/itemtype.client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asset Type",
};

export default function Home() {
  return (
    <div className="space-y-6">
      <AssetTypeList />
    </div>
  );
}