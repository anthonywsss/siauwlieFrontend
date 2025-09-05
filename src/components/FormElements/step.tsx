// components/FormElements/step.tsx
"use client";

import { ReactNode } from "react";

type StepProps = {
  children: ReactNode;
  isActive?: boolean; // optional for conditional rendering
};

export function Step({ children, isActive = true }: StepProps) {
  if (!isActive) return null; // hides inactive steps if you want that behavior
  return <div>{children}</div>;
}
