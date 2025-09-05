import type { JSX } from "react";
import type { ComponentType } from "react";
import { ArrowDownRight, ArrowUpRight} from "lucide-react";


type PropsType = {
data: {
value: number | string;
growthRate: number;
};
label: string;
Icon: ComponentType<any>;
};


export function OverviewCard({ data, label, Icon }: PropsType) {
const growth = Math.round(data.growthRate);
const positive = growth >= 0;


return (
<article className="content-center h-35 group rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 dark:border-gray-800">
<div className="flex items-start justify-between gap-4">
<div className="flex-shrink-0">
  <div className="h-20 w-20 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 flex items-center justify-center transition-colors group-hover:bg-blue-100">
    <Icon className="h-14 w-14" />
  </div>
</div>


<div className="flex-1 min-w-0">
<dt className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">{label}</dt>
<dd className="mt-1 flex items-baseline gap-2">
<h3 className="text-4xl font-bold leading-none text-gray-900 dark:text-white truncate">{data.value}</h3>
<span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${positive ? "bg-green-50 text-green-700 ring-green-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
  {positive ? (
    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
  ) : (
    <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
  )}
  <span>{Math.abs(growth)}%</span>
</span>
</dd>
<p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Containers tracked</p>
</div>
</div>
</article>
);
}