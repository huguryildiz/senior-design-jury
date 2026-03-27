// src/admin/overview/KpiCard.jsx
// Tremor-inspired KPI card — responsive: compact on mobile, spacious on desktop.

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

function ProgressRing({ pct, color, size, strokeWidth }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-[stroke-dashoffset] duration-500 ease-out" />
    </svg>
  );
}

function ringColor(pct) {
  if (pct === 0) return "var(--color-muted-foreground)";
  if (pct <= 33) return "#f97316";
  if (pct <= 66) return "#eab308";
  if (pct < 100) return "#84cc16";
  return "#22c55e";
}

export default function KpiCard({
  value,
  label,
  sub,
  metaLines,
  ring,
  icon,
  tooltip,
  className,
}) {
  const color = ring ? ringColor(ring.pct) : null;

  return (
    <div
      className={cn(
        "stat-card relative flex items-center justify-between rounded-xl border border-border bg-card shadow-sm",
        "gap-2 p-3 sm:gap-4 sm:p-5",
        className
      )}
      data-testid="kpi-card"
    >
      {/* Left: text */}
      <div className="min-w-0 flex-1">
        <div className="stat-card-value text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
          {value}
        </div>
        <div className="mt-0.5 flex items-center gap-1 sm:mt-1">
          <span className="stat-card-label text-xs font-medium text-muted-foreground sm:text-sm">
            {label}
          </span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex text-muted-foreground/50 hover:text-muted-foreground" aria-label="More information">
                    <Info className="size-3 sm:size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {sub && (
          <div className="stat-card-sub mt-0.5 text-[10px] text-muted-foreground/60 sm:text-xs">
            {sub}
          </div>
        )}
        {Array.isArray(metaLines) && metaLines.length > 0 && (
          <div className="stat-card-meta mt-1 flex flex-wrap gap-x-2 gap-y-0.5 sm:mt-2 sm:gap-x-3">
            {metaLines.map((line, i) => (
              <span key={`${i}-${line}`} className="stat-card-meta-line text-[10px] text-muted-foreground/60 sm:text-xs">
                {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: ring or icon */}
      {ring ? (
        <div className="stat-ring relative flex shrink-0 items-center justify-center">
          {/* Small ring on mobile, larger on desktop */}
          <div className="sm:hidden">
            <ProgressRing pct={ring.pct} color={color} size={40} strokeWidth={4} />
          </div>
          <div className="hidden sm:block">
            <ProgressRing pct={ring.pct} color={color} size={56} strokeWidth={5} />
          </div>
          <span className="absolute text-[10px] font-semibold tabular-nums text-foreground sm:text-sm">
            {ring.pct}%
          </span>
        </div>
      ) : icon ? (
        <div className="stat-icon-circle flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:size-11 sm:rounded-xl">
          {icon}
        </div>
      ) : null}
    </div>
  );
}
