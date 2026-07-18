"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { fetchRoom, updateOwnParticipant, leaveRoom, closeRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { startDraftOnServer } from "@/services/draftSyncService";
import { toast } from "@/store/toastStore";
import { TeamTactics } from "@/types/team";

type SheetKind = "formation" | "attack" | "defense" | null;

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);

  const [openSheet, setOpenSheet] = useState<SheetKind>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [reconnecting, setReconnecting] = useState(true);
  const [clubNameDraft, setClubNameDraft] = useState("");
  const hasStartedRef = useRef(false);

  const self = room?.participants.find((p) => p.id === selfParticipantId) ?? null;
  const isSolo = room ? room.maxPlayers === 1 : false;
  const isHost = !!room && !!self && room.hostId === self.id;

  // Reconexão: se a store estiver vazia (aba nova, F5, voltou depois de fechar
  // o navegador), busca a sala e o usuário direto do Supabase — a sessão
  // anônima persistida é o que permite achar automaticamente qual equipe é a
  // sua, sem precisar digitar nada de novo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await ensureAnonymousSession();
        if (!room || room.id !== params.roomId) {
          const freshRoom = await fetchRoom(params.roomId);
          if (cancelled) return;
          if (!freshRoom) {
            toast.urgent("Essa sala não existe mais.");
            router.push(ROUTES.roomHub);
            return;
          }
          const mine = freshRoom.participants.find((p) => p.id === user.id);
          if (!mine) {
            toast.urgent("Você não faz parte dessa sala.");
            router.push(ROUTES.roomHub);
            return;
          }
          setRoom(freshRoom);
          setSelfParticipantId(user.id);
        }
      } catch (e) {
        toast.urgent(e instanceof Error ? e.message : "Não foi possível conectar.");
      } finally {
        if (!cancelled) setReconnecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId]);

  // Sincronização em tempo real: qualquer mudança na sala (alguém entrou,
  // saiu, ficou pronto) chega pra todo mundo automaticamente.
  useRoomRealtime(room?.id ?? null);
  const onlineUserIds = useRoomPresence(room?.id ?? null, self?.id ?? null);

  useEffect(() => {
    setClubNameDraft(self?.clubName ?? "");
  }, [self?.clubName]);

  // Depois de "Nova Liga"/"Nova Copa", a sala volta pro Lobby mas cada
  // participante pode ainda estar marcado como "pronto" da competição
  // anterior (só a própria linha de cada um pode ser alterada, por RLS — ver
  // services/competitionSyncService.ts). Sem isso, o Draft podia começar de
  // novo sozinho, com gente que nunca confirmou presença na nova competição.
  // A checagem roda só UMA VEZ, no carregamento — nunca de novo depois disso,
  // senão desmarcaria o usuário assim que ele clicasse em "Estou pronto" normalmente.
  const initialReadinessCheckedRef = useRef(false);
  useEffect(() => {
    if (!room || !self || initialReadinessCheckedRef.current) return;
    initialReadinessCheckedRef.current = true;
    if (room.status === "lobby" && self.isReady) {
      updateOwnParticipant(room.id, self.id, { isReady: false }).catch(() => {});
    }
  }, [room, self]);

  // Início automático quando todos ficarem prontos — só o HOST escreve o
  // estado inicial do Draft no servidor (senão todo mundo tentaria criar o
  // mesmo draft ao mesmo tempo). Os demais participantes reagem à mudança de
  // room.status, que chega via Realtime pra todo mundo igual.
  //
  // IMPORTANTE: a pausa cosmética fica DENTRO da função assíncrona (await),
  // nunca como um setTimeout agendado pelo próprio efeito. `room.participants`
  // é uma referência NOVA a cada evento do Realtime (mesmo que o conteúdo não
  // mude de verdade), então esse efeito re-executa com frequência — se a
  // pausa fosse um setTimeout do efeito, o cleanup (`clearTimeout`) cancelaria
  // silenciosamente o início do draft sempre que outro evento chegasse antes
  // dos 1.6s acabarem, e o guard `hasStartedRef` impediria qualquer nova
  // tentativa. Era exatamente isso que fazia o clique do host "não fazer
  // nada" — a corrida cancelava o início antes dele completar.
  useEffect(() => {
    if (!room || !self || hasStartedRef.current) return;

    if (room.status === "drafting") {
      // Já começou (por mim mesmo ou por outro cliente que viu primeiro) — só navega.
      hasStartedRef.current = true;
      router.push(ROUTES.draft(room.id));
      return;
    }

    if (!isHost) return;
    const everyoneReady = room.participants.every((p) => p.isReady);
    const enoughPlayers = room.participants.length >= room.minPlayers;
    if (!everyoneReady || !enoughPlayers) return;

    // Trava IMEDIATAMENTE — a partir daqui, nada mais pode cancelar essa
    // tentativa, mesmo que o efeito re-execute de novo por causa de outro
    // evento do Realtime chegando no meio do caminho.
    hasStartedRef.current = true;
    setIsStarting(true);
    toast.success("Todos prontos! Iniciando o draft...");

    (async () => {
      await new Promise((r) => setTimeout(r, 1600));
      try {
        await startDraftOnServer(room);
        router.push(ROUTES.draft(room.id));
      } catch (e) {
        toast.urgent(e instanceof Error ? e.message : "Não foi possível iniciar o draft.");
        hasStartedRef.current = false;
        setIsStarting(false);
      }
    })();
    // Sem cleanup que cancele — de propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.participants, room?.status]);

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

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

  async function handleToggleReady() {
    if (!room || !self) return;
    try {
      await updateOwnParticipant(room.id, self.id, { isReady: !self.isReady });
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível atualizar.");
    }
  }

  async function handleClubNameBlur() {
    if (!room || !self || clubNameDraft.trim() === self.clubName) return;
    try {
      await updateOwnParticipant(room.id, self.id, { clubName: clubNameDraft.trim() || self.clubName });
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível atualizar o nome do clube.");
    }
  }

  async function updateTactics(patch: Partial<TeamTactics>) {
    if (!room || !self) return;
    try {
      await updateOwnParticipant(room.id, self.id, { tactics: { ...self.tactics, ...patch } });
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível atualizar a tática.");
    }
  }

  async function handleLeave() {
    if (!room || !self) return;
    setIsLeaving(true);
    try {
      await leaveRoom(room.id, self.id);
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível sair da sala.");
    } finally {
      router.push(ROUTES.roomHub);
    }
  }

  async function handleCloseRoom() {
    if (!room) return;
    setIsLeaving(true);
    try {
      await closeRoom(room.id);
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível fechar a sala.");
    } finally {
      router.push(ROUTES.roomHub);
    }
  }

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
          value={clubNameDraft}
          disabled={self.isReady}
          onChange={(e) => setClubNameDraft(e.target.value)}
          onBlur={handleClubNameBlur}
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
          <ParticipantList participants={room.participants} selfId={self.id} hostId={room.hostId} onlineUserIds={onlineUserIds} />
        </Card>
      )}

      <Button
        variant={self.isReady ? "secondary" : "primary"}
        size="lg"
        fullWidth
        isLoading={isStarting}
        onClick={handleToggleReady}
      >
        {isStarting ? "Iniciando..." : self.isReady ? "Cancelar pronto" : "Estou pronto"}
      </Button>

      {!isSolo && isHost && (
        <button
          onClick={handleCloseRoom}
          disabled={isLeaving}
          className="mt-3 w-full text-center font-sans text-xs text-danger/80 transition-colors hover:text-danger"
        >
          Fechar sala para todos
        </button>
      )}

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
          {isHost && room.participants.length > 1
            ? "Você é o administrador — ao sair, a administração passa automaticamente para outro jogador da sala."
            : "Você vai perder essa sala e precisará criar ou entrar em outra para jogar."}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setLeaveModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" fullWidth isLoading={isLeaving} onClick={handleLeave}>
            Sair
          </Button>
        </div>
      </Modal>
    </Screen>
  );
}
