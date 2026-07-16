"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TacticsRow, OptionGrid } from "@/components/features/lobby/TacticsSelector";
import { ParticipantList } from "@/components/features/lobby/ParticipantList";
import { ROUTES } from "@/constants/routes";
import { FORMATIONS, PLAY_STYLES } from "@/constants/game";
import { useSessionStore } from "@/store/sessionStore";
import { generateMockJoiningParticipant } from "@/services/roomService";
import { initDraft } from "@/services/draftService";
import { toast } from "@/store/toastStore";

type SheetKind = "formation" | "attack" | "defense" | null;

export default function LobbyPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const updateParticipant = useSessionStore((s) => s.updateParticipant);
  const addParticipant = useSessionStore((s) => s.addParticipant);
  const setDraftState = useSessionStore((s) => s.setDraftState);

  const [openSheet, setOpenSheet] = useState<SheetKind>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const hasStartedRef = useRef(false);

  const self = room?.participants.find((p) => p.id === selfParticipantId) ?? null;
  const isSolo = room ? room.maxPlayers === 1 : false;

  // Simula outros jogadores entrando na sala (mock de multiplayer real)
  useEffect(() => {
    if (!room || isSolo) return;
    if (room.participants.length >= room.maxPlayers) return;

    const interval = setInterval(() => {
      const current = useSessionStore.getState().room;
      if (!current || current.participants.length >= current.maxPlayers) return;
      const participant = generateMockJoiningParticipant(current.participants.map((p) => p.name));
      if (!participant) return;
      addParticipant(participant);
      toast.info(`${participant.name} entrou na sala`);
    }, 2600);

    return () => clearInterval(interval);
  }, [room, isSolo, addParticipant]);

  // Simula outros participantes ficando prontos aos poucos
  useEffect(() => {
    if (!room || isSolo) return;

    const interval = setInterval(() => {
      const current = useSessionStore.getState().room;
      if (!current) return;
      const notReady = current.participants.filter((p) => p.id !== selfParticipantId && !p.isReady);
      if (notReady.length === 0) return;
      const target = notReady[Math.floor(Math.random() * notReady.length)];
      updateParticipant(target.id, { isReady: true });
      toast.success(`${target.name} ficou pronto`);
    }, 2200);

    return () => clearInterval(interval);
  }, [room, isSolo, selfParticipantId, updateParticipant]);

  // Início automático quando todos ficarem prontos
  useEffect(() => {
    if (!room || !self || hasStartedRef.current) return;
    const everyoneReady = room.participants.every((p) => p.isReady);
    const enoughPlayers = room.participants.length >= room.minPlayers;
    if (!everyoneReady || !enoughPlayers) return;

    hasStartedRef.current = true;
    setIsStarting(true);
    toast.success("Todos prontos! Iniciando o draft...");

    const t = setTimeout(async () => {
      const humans = room.participants.filter((p) => p.isHuman);
      const draftState = await initDraft(room.id, humans);
      setDraftState(draftState);
      router.push(ROUTES.draft(room.id));
    }, 1600);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.participants]);

  if (!room || !self) {
    return (
      <Screen center>
        <p className="mb-4 font-sans text-sm text-text-secondary">Nenhuma sala ativa.</p>
        <button onClick={() => router.push(ROUTES.roomHub)} className="font-sans text-sm text-gold">
          Voltar ao multiplayer
        </button>
      </Screen>
    );
  }

  const updateTactics = (patch: Partial<typeof self.tactics>) => {
    updateParticipant(self.id, { tactics: { ...self.tactics, ...patch } });
  };

  return (
    <Screen>
      <button
        onClick={() => setLeaveModalOpen(true)}
        className="mb-6 flex items-center gap-1.5 font-sans text-xs text-text-tertiary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Sair da sala
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-text-primary">LOBBY</h1>
          {!isSolo && (
            <button
              onClick={() => {
                navigator.clipboard?.writeText(room.code);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 1500);
              }}
              className="mt-1 flex items-center gap-1.5 font-mono text-sm text-teal-bright"
            >
              {room.code}
              {codeCopied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
        </div>
        {!isSolo && (
          <span className="rounded-pill border border-border-subtle bg-surface px-3 py-1 font-mono text-xs text-text-secondary">
            {room.participants.length}/{room.maxPlayers}
          </span>
        )}
      </div>

      <div className="mb-5">
        <Input
          label="Nome do seu clube"
          value={self.clubName}
          disabled={self.isReady}
          onChange={(e) => updateParticipant(self.id, { clubName: e.target.value })}
        />
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Tática</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-2">
          <TacticsRow
            label="Formação"
            value={self.tactics.formation}
            disabled={self.isReady}
            onClick={() => setOpenSheet("formation")}
          />
          <TacticsRow
            label="Estilo de ataque"
            value={self.tactics.attackStyle}
            disabled={self.isReady}
            onClick={() => setOpenSheet("attack")}
          />
          <TacticsRow
            label="Defesa"
            value={self.tactics.defenseStyle}
            disabled={self.isReady}
            onClick={() => setOpenSheet("defense")}
          />
        </div>
      </Card>

      {!isSolo && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>
              Participantes ({room.participants.length}/{room.maxPlayers})
            </CardTitle>
          </CardHeader>
          <ParticipantList participants={room.participants} selfId={self.id} hostId={room.participants[0]?.id ?? ""} />
        </Card>
      )}

      <Button
        variant={self.isReady ? "secondary" : "primary"}
        size="lg"
        fullWidth
        isLoading={isStarting}
        onClick={() => updateParticipant(self.id, { isReady: !self.isReady })}
      >
        {isStarting ? "Iniciando..." : self.isReady ? "Cancelar pronto" : "Estou pronto"}
      </Button>

      {!isSolo && (
        <p className="mt-4 text-center font-sans text-xs text-text-tertiary">
          {room.participants.every((p) => p.isReady)
            ? "Todos prontos — começando..."
            : "O draft começa automaticamente quando todos ficarem prontos."}
        </p>
      )}

      {/* Sheets de seleção tática */}
      <BottomSheet isOpen={openSheet === "formation"} onClose={() => setOpenSheet(null)} title="Escolher formação">
        <OptionGrid
          options={FORMATIONS}
          selected={self.tactics.formation}
          onSelect={(v) => {
            updateTactics({ formation: v });
            setOpenSheet(null);
          }}
        />
      </BottomSheet>

      <BottomSheet isOpen={openSheet === "attack"} onClose={() => setOpenSheet(null)} title="Estilo de ataque">
        <OptionGrid
          options={PLAY_STYLES.attack}
          selected={self.tactics.attackStyle}
          onSelect={(v) => {
            updateTactics({ attackStyle: v });
            setOpenSheet(null);
          }}
          columns={2}
        />
      </BottomSheet>

      <BottomSheet isOpen={openSheet === "defense"} onClose={() => setOpenSheet(null)} title="Estilo de defesa">
        <OptionGrid
          options={PLAY_STYLES.defense}
          selected={self.tactics.defenseStyle}
          onSelect={(v) => {
            updateTactics({ defenseStyle: v });
            setOpenSheet(null);
          }}
          columns={2}
        />
      </BottomSheet>

      <Modal isOpen={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} title="Sair da sala?">
        <p className="mb-5 font-sans text-sm text-text-secondary">
          Você vai perder essa sala e precisará criar ou entrar em outra para jogar.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setLeaveModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" fullWidth onClick={() => router.push(ROUTES.roomHub)}>
            Sair
          </Button>
        </div>
      </Modal>
    </Screen>
  );
}
