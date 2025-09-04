
import type { JSX, SVGProps } from "react";

type PropsType = {
  data: {
    value: number | string;
    growthRate: number;
  };
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

export function OverviewCard({ data, label, Icon }: PropsType) {

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <Icon />

      <div className="mt-6 flex items-end justify-between">
        <dl>
          <dt className="mb-1.5 text-heading-6 font-bold text-dark dark:text-white">
            {label}
          </dt>
          <dd className="text-lg font-medium text-dark-1">
            {data.value} Container
          </dd>
        </dl>
        <span className="text-sm font-medium text-green-600">
          {Math.round(data.growthRate)}%
        </span>
      </div>
    </div>
  );
}
