import AllItemsClient from "@/components/Tables/audit-log";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log Audit",
};

export default function Home() {
  return (
    <div className="space-y-6">
      <AllItemsClient />
    </div>
  );
}