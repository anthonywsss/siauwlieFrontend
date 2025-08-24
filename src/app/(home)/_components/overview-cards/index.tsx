import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import * as icons from "./icons";

export async function OverviewCardsGroup() {
  const { inbound_at_factory, outbound_to_client, inbound_at_client, outbound_to_factory } = await getOverviewData();

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      <OverviewCard
        label="At Factory"
        data={{
          ... inbound_at_factory,
          value: compactFormat(inbound_at_factory.value),
        }}
        Icon={icons.Factory}
      />

      <OverviewCard
        label="Delivery to Client"
        data={{
          ...outbound_to_client,
          value: "$" + compactFormat(outbound_to_client.value),
        }}
        Icon={icons.Product}
      />

      <OverviewCard
        label="On Client"
        data={{
          ...inbound_at_client,
          value: compactFormat(inbound_at_client.value),
        }}
        Icon={icons.Users}
      />

      <OverviewCard
        label="Delivery to Factory"
        data={{
          ...outbound_to_factory,
          value: compactFormat(outbound_to_factory.value),
        }}
        Icon={icons.Profit}
      />
    </div>
  );
}
