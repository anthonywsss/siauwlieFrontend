import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import SearchBar from "@/components/Search/SearchBar";
import { InvoiceTable } from "@/components/Tables/invoice-table";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tables",
};

export default function Home() {
  return (
    <div className="space-y-6">
      <Breadcrumb pageName="Tables" />

      <SearchBar />

      <InvoiceTable />
    </div>
  );
}
