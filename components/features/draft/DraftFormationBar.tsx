"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Formation, TeamTactics } from "@/types/team";
import { Player } from "@/types/player";
import { getFormationPanel } from "@/services/formationService";
import { toDraftPlayerCard } from "@/services/compatibilityService";

export function DraftFormationBar({
  tactics,
  filledSlots,
  overallPartial,
}: {
  tactics: TeamTactics;
  filledSlots: Record<string, Player>;
  overallPartial: number;
}) {
  const slots = getFormationPanel(tactics.formation, filledSlots);
  const filledCount = slots.filter((s) => s.player).length;

  return (
    <div className="shrink-0 rounded-lg border border-border-subtle bg-surface/95 px-3 py-2.5 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-sans text-[11px] uppercase tracking-wide text-text-tertiary">Sua escalação</span>
        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-text-tertiary">
          <span>
            <span aria-hidden>⚔️</span> Ataque <span className="text-text-primary">{tactics.attackStyle}</span>
          </span>
          <span>
            <span aria-hidden>🛡️</span> Defesa <span className="text-text-primary">{tactics.defenseStyle}</span>
          </span>
          <span>
            Formação <span className="text-text-primary">{tactics.formation}</span>
          </span>
          <span>
            Overall <span className="text-gold">{filledCount > 0 ? overallPartial : "—"}</span>
          </span>
          <span>
            Escolhidos <span className="text-teal-bright">{filledCount}/{slots.length}</span>
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <AnimatePresence initial={false}>
          {slots.map((slot) => (
            <motion.div
              key={slot.id}
              layout
              initial={slot.player ? { opacity: 0, scale: 0.7, y: 8 } : false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn(
                "flex w-[64px] shrink-0 flex-col items-center gap-0.5 rounded-md border px-1.5 py-2 text-center",
                slot.player
                  ? "border-teal-dim/40 bg-teal-dim/15 text-text-primary"
                  : "border-border-subtle bg-surface-elevated text-text-tertiary"
              )}
            >
              <span className="font-mono text-[9.5px] font-semibold leading-none">{slot.label}</span>
              {slot.player ? (
                <>
                  <span className="line-clamp-1 max-w-full font-sans text-[10.5px] font-medium leading-tight text-text-primary">
                    {slot.player.name}
                  </span>
                  <span className="font-mono text-xs font-bold leading-none text-gold">
                    {toDraftPlayerCard(slot.player, tactics).overallFinal}
                  </span>
                </>
              ) : (
                <span className="font-sans text-[10px] leading-tight text-text-tertiary">Vazio</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
