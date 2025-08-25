import {DisposalHistory} from "@/components/Tables/disposal.client";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disposal History",
};

export default function Home() {
  return (
    <div className="space-y-6">

      <DisposalHistory />
    </div>
  );
}
