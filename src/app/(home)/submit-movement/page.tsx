import { InvoiceTable } from "@/components/Tables/invoice-table";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit Movement",
};

export default function Home() {
  return (
    <div className="space-y-6">

      <InvoiceTable />
    </div>
  );
}