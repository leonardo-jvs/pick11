"use client";

import { cn } from "@/lib/utils";

export function Slider({
  value,
  min,
  max,
  onChange,
  label,
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs font-medium text-text-secondary">{label}</span>
          <span className="font-mono text-sm font-semibold text-gold">{value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-pill bg-surface-elevated accent-gold"
        style={{
          background: `linear-gradient(to right, #E3B34F ${percent}%, #1B2420 ${percent}%)`,
        }}
      />
      <div className="flex justify-between font-mono text-[11px] text-text-tertiary">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
