"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

export default function CreateRoomPage() {
  const router = useRouter();
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);

  const [playerName, setPlayerName] = useState("");
  const [clubName, setClubName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!playerName.trim()) {
      setError("Digite seu nome para continuar");
      return;
    }
    setError(null);
    setIsCreating(true);
    const room = await createRoom(playerName.trim(), clubName.trim(), maxPlayers);
    setRoom(room);
    setSelfParticipantId(room.participants[0].id);
    router.push(ROUTES.lobby(room.id));
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

        <Button variant="primary" size="lg" fullWidth isLoading={isCreating} onClick={handleCreate}>
          Criar Sala
        </Button>
      </Card>
    </Screen>
  );
}
