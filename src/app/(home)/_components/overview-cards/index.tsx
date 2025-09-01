"use client";

import React, { useEffect, useState } from "react";
import { compactFormat } from "@/lib/format-number";
import { OverviewCard } from "./card";
import * as icons from "./icons";
import { getOverviewData } from "@/lib/fetch/overview";

type OverviewShape = {
  inbound_at_factory: { value?: number; count?: number; growthRate?: number; [k: string]: any };
  outbound_to_client: { value?: number; count?: number; growthRate?: number; [k: string]: any };
  inbound_at_client: { value?: number; count?: number; growthRate?: number; [k: string]: any };
  outbound_to_factory: { value?: number; count?: number; growthRate?: number; [k: string]: any };
};

export default function OverviewCardsGroup() {
  const [data, setData] = useState<OverviewShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getOverviewData()
      .then((d) => {
        if (!mounted) return;
        setData(d as OverviewShape);
      })
      .catch((err) => {
        console.error("Failed to fetch overview:", err);
        if (!mounted) return;
        setError(err?.message ?? "Failed to fetch overview");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
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
          value: compactFormat(inbound_at_factory?.value ?? 0),
          growthRate: inbound_at_factory?.growthRate ?? 0, // ✅ fix
        }}
        Icon={icons.Factory}
      />

      <OverviewCard
        label="Delivery to Client"
        data={{
          ...outbound_to_client,
          value: "$" + compactFormat(outbound_to_client?.value ?? 0),
          growthRate: outbound_to_client?.growthRate ?? 0, // ✅ fix
        }}
        Icon={icons.Product}
      />

      <OverviewCard
        label="On Client"
        data={{
          ...inbound_at_client,
          value: compactFormat(inbound_at_client?.value ?? 0),
          growthRate: inbound_at_client?.growthRate ?? 0, // ✅ fix
        }}
        Icon={icons.Users}
      />

      <OverviewCard
        label="Delivery to Factory"
        data={{
          ...outbound_to_factory,
          value: compactFormat(outbound_to_factory?.value ?? 0),
          growthRate: outbound_to_factory?.growthRate ?? 0, // ✅ fix
        }}
        Icon={icons.Profit}
      />
    </div>
  );
}
