"use client";

import React, { useEffect, useState } from "react";
import { compactFormat } from "@/lib/format-number";
import { OverviewCard } from "./card";
import * as icons from "./icons";
import { safeGet } from "@/lib/fetcher";

type AssetSummaryItem = {
  count: number;
  percentage: number;
};

type OverviewShape = {
  inbound_at_factory: AssetSummaryItem;
  outbound_to_client: AssetSummaryItem;
  inbound_at_client: AssetSummaryItem;
  outbound_to_factory: AssetSummaryItem;
};

export default function OverviewCardsGroup() {
  const [data, setData] = useState<OverviewShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await safeGet<{ data: OverviewShape }>("/assets/summary");
        if (!mounted) return;
        if (res?.data) {
          setData(res.data);
        }
      } catch (err: any) {
        if (!mounted) return;
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="py-8">Loading overview...</div>;
  if (error) return <div className="py-8 text-red-500">Error: {error}</div>;
  if (!data) return <div className="py-8">No overview data.</div>;

  const { inbound_at_factory, outbound_to_client, inbound_at_client, outbound_to_factory } = data;

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      <OverviewCard
        label="At Factory"
        data={{
          ...inbound_at_factory,
          value: compactFormat(inbound_at_factory.count),
          growthRate: inbound_at_factory.percentage,
        }}
        Icon={icons.Factory}
      />

      <OverviewCard
        label="Delivery to Client"
        data={{
          ...outbound_to_client,
          value: compactFormat(outbound_to_client.count),
          growthRate: outbound_to_client.percentage,
        }}
        Icon={icons.Product}
      />

      <OverviewCard
        label="On Client"
        data={{
          ...inbound_at_client,
          value: compactFormat(inbound_at_client.count),
          growthRate: inbound_at_client.percentage,
        }}
        Icon={icons.Users}
      />

      <OverviewCard
        label="Delivery to Factory"
        data={{
          ...outbound_to_factory,
          value: compactFormat(outbound_to_factory.count),
          growthRate: outbound_to_factory.percentage,
        }}
        Icon={icons.Profit}
      />
    </div>
  );
}
