import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import OverviewCardsGroup from "./_components/overview-cards";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monitoring Kontainer",
};

export default function Home() {
  return (
    <div>
      <Breadcrumb pageName="Monitoring Kontainer" />
        <OverviewCardsGroup />
    </div>
  );
}
