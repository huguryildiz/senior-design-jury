// src/admin/overview/KpiGrid.jsx
// Responsive 4 → 2 → 1 column grid for KPI cards.

import { cn } from "@/lib/utils";

export default function KpiGrid({ children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
