"use client";

import { ChevronUpIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import { useId, useState } from "react";

type PropsType = {
  label: string;
  items: { value: string; label: string }[];
  prefixIcon?: React.ReactNode;
  className?: string;
  required?: boolean;
  value?: string;                    // ✅ add value
  onChange?: (val: string) => void; // ✅ add onChange
  placeholder?: string;
  defaultValue?: string;
};

export function Select({
  items,
  label,
  defaultValue,
  placeholder,
  prefixIcon,
  className,
  value,
  onChange,
  required,
}: PropsType  & {prefixIcon?: React.ComponentType}) {
  const id = useId();
  const [isOptionSelected, setIsOptionSelected] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      <label htmlFor={id} className="block text-body-md font-medium text-dark dark:text-white">
        {label} {required && <span className="ml-1 text-red">*</span>}
      </label>

      <div className="relative">
        {prefixIcon && <div className="absolute left-4 top-1/2 -translate-y-1/2">{prefixIcon}</div>}

        <select
          id={id}
          value={value || defaultValue || ""}
          onChange={(e) => {
            setIsOptionSelected(true);
            onChange?.(e.target.value); // ✅ call parent handler
          }}
          required={required}
          className={cn(
            "w-full appearance-none rounded-lg border border-stroke bg-transparent px-5.5 py-3 outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary [&>option]:text-dark-5 dark:[&>option]:text-dark-6",
            isOptionSelected && "text-dark dark:text-white",
            prefixIcon && "pl-11.5"
          )}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

