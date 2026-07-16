"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Formation } from "@/types/team";
import { Player } from "@/types/player";
import { getFormationPanel } from "@/services/formationService";

export function FormationPanel({
  formation,
  filledSlots,
  className,
}: {
  formation: Formation;
  filledSlots: Record<string, Player>;
  className?: string;
}) {
  const slots = getFormationPanel(formation, filledSlots);
  const filledCount = slots.filter((s) => s.player).length;

  return (
    <div className={cn("rounded-card border border-border-subtle bg-surface p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg tracking-wide text-text-primary">{formation}</p>
        <span className="font-mono text-xs text-text-tertiary">
          {filledCount}/{slots.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={cn(
              "flex items-center justify-between rounded-md border px-2.5 py-1.5 font-sans text-xs",
              slot.player ? "border-teal-dim/40 bg-teal-dim/10 text-text-primary" : "border-border-subtle text-text-tertiary"
            )}
          >
            <span className="flex items-center gap-1.5">
              {slot.player && <Check size={12} className="text-teal-bright" />}
              <span className="font-mono font-semibold">{slot.label}</span>
            </span>
            <span className="truncate">{slot.player ? slot.player.name : "vazio"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
