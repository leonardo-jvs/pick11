"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Users, BookOpen, ChevronRight, Trophy, Swords } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ROUTES } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useSessionStore } from "@/store/sessionStore";
import { createRoom } from "@/services/roomService";
import { FANTASY_CLUB_NAME_SUGGESTIONS } from "@/mocks/clubs";
import { randomBetween } from "@/lib/delay";
import { GameMode } from "@/types/room";
import { determineCupTier } from "@/services/cupService";
import { toast } from "@/store/toastStore";
import { cn } from "@/lib/utils";

function MenuOption({
  icon,
  title,
  description,
  onClick,
  isLoading,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  isLoading?: boolean;
}) {
  return (
    <motion.div variants={staggerItem}>
      <Card interactive onClick={isLoading ? undefined : onClick} className="flex items-center gap-4 py-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-card bg-surface-elevated text-gold">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-sans text-[15px] font-semibold text-text-primary">{title}</h3>
          <p className="font-sans text-xs text-text-tertiary">{description}</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-text-tertiary" />
      </Card>
    </motion.div>
  );
}

export default function MenuPage() {
  const router = useRouter();
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const [isStartingSolo, setIsStartingSolo] = useState(false);
  const [showModeSheet, setShowModeSheet] = useState(false);

  async function startSingleplayer(mode: GameMode) {
    setShowModeSheet(false);
    setIsStartingSolo(true);
    const clubName = FANTASY_CLUB_NAME_SUGGESTIONS[randomBetween(0, FANTASY_CLUB_NAME_SUGGESTIONS.length - 1)];
    try {
      // Singleplayer reaproveita exatamente a mesma criação de sala do Multiplayer —
      // só com 1 jogador humano. O modo Copa usa a lógica de grupos/mata-mata já existente.
      const room = await createRoom("Você", clubName, 1, "visible", mode);
      setRoom(room);
      setSelfParticipantId(room.hostId);
      router.push(ROUTES.lobby(room.id));
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível criar a sala.");
      setIsStartingSolo(false);
    }
  }

  return (
    <Screen withField center>
      <div className="mb-10 flex flex-col items-center gap-1">
        <h1 className="font-display text-5xl tracking-wide text-gold">PICK11</h1>
        <p className="font-sans text-xs uppercase tracking-[0.15em] text-text-tertiary">Menu principal</p>
      </div>

      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col gap-3"
      >
        <MenuOption
          icon={<User size={22} />}
          title="Singleplayer"
          description="Você contra a IA — draft, liga e copa completos"
          onClick={() => setShowModeSheet(true)}
          isLoading={isStartingSolo}
        />
        <MenuOption
          icon={<Users size={22} />}
          title="Multiplayer"
          description="Crie ou entre em uma sala com outros jogadores"
          onClick={() => router.push(ROUTES.roomHub)}
        />
        <MenuOption
          icon={<BookOpen size={22} />}
          title="Como jogar"
          description="Entenda o draft, as táticas e a liga"
          onClick={() => router.push(ROUTES.howToPlay)}
        />
      </motion.div>

      {isStartingSolo && (
        <p className="mt-6 animate-fade-up font-sans text-xs text-text-tertiary">Preparando sua sala...</p>
      )}

      <BottomSheet isOpen={showModeSheet} onClose={() => setShowModeSheet(false)} title="Modo de jogo">
        <div className="grid grid-cols-2 gap-2 pb-2">
          <button
            type="button"
            onClick={() => startSingleplayer("league")}
            className="flex flex-col items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-3 py-4 text-center transition-colors hover:border-gold"
          >
            <Trophy size={20} className="text-gold" />
            <span className="font-sans text-sm font-semibold text-text-primary">Liga</span>
            <span className="font-sans text-[10px] leading-snug text-text-tertiary">Temporada completa, 38 rodadas.</span>
          </button>
          <button
            type="button"
            onClick={() => startSingleplayer("cup")}
            className="flex flex-col items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-3 py-4 text-center transition-colors hover:border-teal"
          >
            <Swords size={20} className="text-teal-bright" />
            <span className="font-sans text-sm font-semibold text-text-primary">Copa</span>
            <span className="font-sans text-[10px] leading-snug text-text-tertiary">
              {determineCupTier(1).totalTeams} equipes · grupos + mata-mata.
            </span>
          </button>
        </div>
      </BottomSheet>
    </Screen>
  );
}
