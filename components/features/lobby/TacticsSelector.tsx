"use client";

import { ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function TacticsRow({
  label,
  value,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between rounded-card border border-border-subtle bg-surface px-4 py-3.5 transition-colors",
        !disabled && "hover:border-border-strong hover:bg-surface-hover",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span className="font-sans text-sm text-text-secondary">{label}</span>
      <span className="flex items-center gap-1.5 font-mono text-sm font-semibold text-text-primary">
        {value}
        {disabled ? <Lock size={13} className="text-text-tertiary" /> : <ChevronRight size={15} className="text-text-tertiary" />}
      </span>
    </button>
  );
}

export function OptionGrid<T extends string>({
  options,
  selected,
  onSelect,
  columns = 3,
}: {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  columns?: number;
}) {
  return (
    <div className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={cn(
            "rounded-card border px-3 py-3 font-mono text-sm transition-colors",
            selected === opt
              ? "border-gold bg-gold/10 text-gold"
              : "border-border-subtle bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
