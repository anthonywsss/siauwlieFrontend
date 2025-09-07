import React from "react";
import { cn } from "@/lib/utils";


type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
variant?: "primary" | "secondary" | "ghost";
};


export default function Button({
children,
variant = "primary",
className = "",
...props
}: ButtonProps) {
const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2";


const variants: Record<string, string> = {
primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400",
ghost: "bg-transparent text-gray-900 hover:bg-gray-50 focus:ring-gray-300",
};


const classes = cn ? cn(base, variants[variant], className) : [base, variants[variant], className].filter(Boolean).join(" ");


return (
<button className={classes} {...props}>
{children}
</button>
);
}