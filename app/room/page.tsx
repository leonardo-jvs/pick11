"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PlusCircle, KeyRound, ArrowLeft } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function RoomHubPage() {
  const router = useRouter();

  return (
    <Screen withField center>
      <button
        onClick={() => router.push(ROUTES.menu)}
        className="mb-8 flex items-center gap-1.5 self-start font-sans text-xs text-text-tertiary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Voltar ao menu
      </button>

      <div className="mb-10 flex flex-col items-center gap-1">
        <h1 className="font-display text-4xl tracking-wide text-text-primary">MULTIPLAYER</h1>
        <p className="font-sans text-xs text-text-tertiary">De 2 a 20 jogadores por sala</p>
      </div>

      <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="visible" className="flex w-full flex-col gap-3">
        <motion.div variants={staggerItem}>
          <Card interactive glow="gold" onClick={() => router.push(ROUTES.roomCreate)} className="flex items-center gap-4 py-6">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-card bg-gold/15 text-gold">
              <PlusCircle size={24} />
            </div>
            <div>
              <h3 className="font-sans text-base font-semibold text-text-primary">Criar Sala</h3>
              <p className="font-sans text-xs text-text-tertiary">Comece uma sala e convide outros jogadores</p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card interactive onClick={() => router.push(ROUTES.roomJoin)} className="flex items-center gap-4 py-6">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-card bg-teal/15 text-teal">
              <KeyRound size={24} />
            </div>
            <div>
              <h3 className="font-sans text-base font-semibold text-text-primary">Entrar em Sala</h3>
              <p className="font-sans text-xs text-text-tertiary">Use o código de uma sala existente</p>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Screen>
  );
}
