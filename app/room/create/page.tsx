"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Trophy, Swords } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Badge";
import { ROUTES } from "@/constants/routes";
import { ROOM_CONFIG } from "@/constants/game";
import { FANTASY_CLUB_NAME_SUGGESTIONS } from "@/mocks/clubs";
import { createRoom } from "@/services/roomService";
import { useSessionStore } from "@/store/sessionStore";
import { DraftMode, GameMode } from "@/types/room";
import { determineCupTier } from "@/services/cupService";
import { cn } from "@/lib/utils";

export default function CreateRoomPage() {
  const router = useRouter();
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);

  const [playerName, setPlayerName] = useState("");
  const [clubName, setClubName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [draftMode, setDraftMode] = useState<DraftMode>("visible");
  const [gameMode, setGameMode] = useState<GameMode>("league");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!playerName.trim()) {
      setError("Digite seu nome para continuar");
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      const room = await createRoom(playerName.trim(), clubName.trim(), maxPlayers, draftMode, gameMode);
      setRoom(room);
      setSelfParticipantId(room.hostId);
      router.push(ROUTES.lobby(room.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a sala.");
      setIsCreating(false);
    }
  }

  return (
    <Screen>
      <button
        onClick={() => router.push(ROUTES.roomHub)}
        className="mb-6 flex items-center gap-1.5 font-sans text-xs text-text-tertiary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      <h1 className="mb-1 font-display text-3xl tracking-wide text-text-primary">CRIAR SALA</h1>
      <p className="mb-6 font-sans text-sm text-text-tertiary">Defina os detalhes da sua sala multiplayer</p>

      <Card className="flex flex-col gap-5">
        <Input
          label="Seu nome"
          placeholder="Ex: Rafael"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          error={error ?? undefined}
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label="Nome do seu clube"
            placeholder="Ex: Fúria Negra FC"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {FANTASY_CLUB_NAME_SUGGESTIONS.slice(0, 4).map((name) => (
              <button key={name} onClick={() => setClubName(name)} type="button">
                <Tag className="cursor-pointer transition-colors hover:border-gold hover:text-gold">{name}</Tag>
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Máximo de jogadores"
          value={maxPlayers}
          min={ROOM_CONFIG.MIN_PLAYERS}
          max={ROOM_CONFIG.MAX_PLAYERS}
          onChange={setMaxPlayers}
        />

        <div>
          <p className="mb-1.5 font-sans text-sm text-text-secondary">Modo de jogo</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGameMode("league")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-card border px-3 py-3 text-center transition-colors",
                gameMode === "league" ? "border-gold bg-gold/10" : "border-border-subtle bg-surface hover:border-border-strong"
              )}
            >
              <Trophy size={18} className={gameMode === "league" ? "text-gold" : "text-text-tertiary"} />
              <span className={cn("font-sans text-xs font-semibold", gameMode === "league" ? "text-gold" : "text-text-primary")}>
                Liga
              </span>
              <span className="font-sans text-[10px] leading-snug text-text-tertiary">Temporada completa, 38 rodadas, turno e returno.</span>
            </button>
            <button
              type="button"
              onClick={() => setGameMode("cup")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-card border px-3 py-3 text-center transition-colors",
                gameMode === "cup" ? "border-teal bg-teal/10" : "border-border-subtle bg-surface hover:border-border-strong"
              )}
            >
              <Swords size={18} className={gameMode === "cup" ? "text-teal-bright" : "text-text-tertiary"} />
              <span className={cn("font-sans text-xs font-semibold", gameMode === "cup" ? "text-teal-bright" : "text-text-primary")}>
                Copa
              </span>
              <span className="font-sans text-[10px] leading-snug text-text-tertiary">Grupos + mata-mata, rápida e direta.</span>
            </button>
          </div>
          {gameMode === "cup" && (
            <p className="mt-2 font-mono text-[10px] text-text-tertiary">
              {(() => {
                const tier = determineCupTier(maxPlayers);
                return `${tier.totalTeams} equipes · ${tier.groupCount} grupos de 4 · mata-mata a partir das ${
                  tier.firstKnockoutPhase === "semifinal" ? "semifinais" : "quartas de final"
                }`;
              })()}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 font-sans text-sm text-text-secondary">Modo do Draft</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDraftMode("visible")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-card border px-3 py-3 text-center transition-colors",
                draftMode === "visible" ? "border-gold bg-gold/10" : "border-border-subtle bg-surface hover:border-border-strong"
              )}
            >
              <Eye size={18} className={draftMode === "visible" ? "text-gold" : "text-text-tertiary"} />
              <span className={cn("font-sans text-xs font-semibold", draftMode === "visible" ? "text-gold" : "text-text-primary")}>
                Over Visível
              </span>
              <span className="font-sans text-[10px] leading-snug text-text-tertiary">Overall de todos os jogadores sempre à vista.</span>
            </button>
            <button
              type="button"
              onClick={() => setDraftMode("hidden")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-card border px-3 py-3 text-center transition-colors",
                draftMode === "hidden" ? "border-gold bg-gold/10" : "border-border-subtle bg-surface hover:border-border-strong"
              )}
            >
              <EyeOff size={18} className={draftMode === "hidden" ? "text-gold" : "text-text-tertiary"} />
              <span className={cn("font-sans text-xs font-semibold", draftMode === "hidden" ? "text-gold" : "text-text-primary")}>
                Over Oculto
              </span>
              <span className="font-sans text-[10px] leading-snug text-text-tertiary">
                Overall escondido no Draft — decida pelo conhecimento de futebol.
              </span>
            </button>
          </div>
        </div>

        <Button variant="primary" size="lg" fullWidth isLoading={isCreating} onClick={handleCreate}>
          Criar Sala
        </Button>
      </Card>
    </Screen>
  );
}
