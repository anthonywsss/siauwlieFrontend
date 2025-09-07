import React from "react";


type ShowcaseSectionProps = {
title?: React.ReactNode;
subtitle?: React.ReactNode;
children?: React.ReactNode;
className?: string;
};


export default function ShowcaseSection({
title,
subtitle,
children,
className = "",
}: ShowcaseSectionProps) {
return (
<section className={`py-8 sm:py-12 ${className}`}>
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
{(title || subtitle) && (
<div className="mb-6 text-center">
{title && (
<h2 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h2>
)}
{subtitle && (
<p className="mt-2 text-sm text-gray-600">{subtitle}</p>
)}
</div>
)}


<div className="rounded-lg bg-white/50 p-4 shadow-sm">
{children}
</div>
</div>
</section>
);
}