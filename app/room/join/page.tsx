"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { joinRoomByCode } from "@/services/roomService";
import { getCurrentUserId } from "@/lib/supabase/auth";
import { useSessionStore } from "@/store/sessionStore";

export default function JoinRoomPage() {
  const router = useRouter();
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);

  const [playerName, setPlayerName] = useState("");
  const [clubName, setClubName] = useState("");
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  async function handleJoin() {
    const nextErrors: typeof errors = {};
    if (!playerName.trim()) nextErrors.name = "Digite seu nome para continuar";
    if (!code.trim()) nextErrors.code = "Digite o código da sala";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setIsJoining(true);
    try {
      const room = await joinRoomByCode(code, playerName.trim(), clubName.trim());
      const myUserId = await getCurrentUserId();
      setRoom(room);
      setSelfParticipantId(myUserId ?? room.participants[room.participants.length - 1].id);
      router.push(ROUTES.lobby(room.id));
    } catch (e) {
      setErrors({ code: e instanceof Error ? e.message : "Não foi possível entrar na sala" });
      setIsJoining(false);
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

      <h1 className="mb-1 font-display text-3xl tracking-wide text-text-primary">ENTRAR EM SALA</h1>
      <p className="mb-6 font-sans text-sm text-text-tertiary">Peça o código para quem criou a sala</p>

      <Card className="flex flex-col gap-5">
        <Input
          label="Seu nome"
          placeholder="Ex: Marina"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          error={errors.name}
        />
        <Input
          label="Nome do seu clube"
          placeholder="Ex: Trovão Atlético"
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
        />
        <Input
          label="Código da sala"
          placeholder="EX: A7K2P"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          error={errors.code}
          maxLength={6}
          className="font-mono tracking-[0.3em]"
        />

        <Button variant="primary" size="lg" fullWidth isLoading={isJoining} onClick={handleJoin}>
          Entrar na Sala
        </Button>
      </Card>
    </Screen>
  );
}
