import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import SearchBar from "@/components/Search/SearchBar";
import { InvoiceTable } from "@/components/Tables/invoice-table";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tables",
};

export default function Home() {
  return (
    <>
      <Breadcrumb pageName="Tables" />

      <div className="mt-4 mb-6">
        <SearchBar />
      </div>
        <InvoiceTable />
    </>
  );
}
