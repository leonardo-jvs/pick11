"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Trophy, ArrowDownCircle } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { useCompetitionRealtime } from "@/hooks/useCompetitionRealtime";
import { computeStandings } from "@/services/leagueService";
import { fetchRoom } from "@/services/roomService";
import { fetchCompetitionState, startLeagueKnockoutPhase } from "@/services/competitionSyncService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { toast } from "@/store/toastStore";
import { LEAGUE_KNOCKOUT_CONFIG } from "@/constants/game";
import { cn } from "@/lib/utils";

/**
 * Etapa intermediária entre o fim da 18ª rodada da Liga e o início do
 * mata-mata do modo Liga + Mata-Mata. Existe só pra tornar essa transição
 * robusta: enquanto o host não confirma "Iniciar Mata-Mata", nenhum
 * confronto eliminatório é gerado — elimina a corrida que antes travava
 * clientes em "Aguardando o resultado da rodada...".
 */
export default function LeagueTransitionPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const teams = useSessionStore((s) => s.teams);
  const matches = useSessionStore((s) => s.matches);
  const cupState = useSessionStore((s) => s.cupState);
  const [reconnecting, setReconnecting] = useState(true);
  const [starting, setStarting] = useState(false);

  const isHost = !!room && room.hostId === selfParticipantId;

  // Reconexão + carrega o estado da competição (mesmo padrão das outras telas).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await ensureAnonymousSession();
        let currentRoom = room;
        if (!currentRoom || currentRoom.id !== params.roomId) {
          const freshRoom = await fetchRoom(params.roomId);
          if (cancelled) return;
          if (!freshRoom) {
            toast.urgent("Essa sala não existe mais.");
            router.push(ROUTES.roomHub);
            return;
          }
          currentRoom = freshRoom;
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

  // Mantém a competição sincronizada em tempo real — é a ÚNICA fonte de
  // verdade sobre "o host já iniciou o mata-mata". Nenhum cliente navega por
  // conta própria: todos esperam essa mudança real vinda do banco.
  useCompetitionRealtime(room?.id ?? null);

  // Assim que o cupState aparecer (host confirmou), TODOS os participantes
  // — inclusive o próprio host — entram simultaneamente na fase eliminatória.
  useEffect(() => {
    if (!room || !cupState?.decisiveOrder) return;
    router.push(ROUTES.preMatch(room.id, 1));
  }, [room, cupState?.decisiveOrder, router]);

  async function handleStartKnockout() {
    if (!room || starting) return;
    setStarting(true);
    try {
      const snapshot = await fetchCompetitionState(room.id);
      if (!snapshot) {
        toast.urgent("Não foi possível carregar o estado da competição.");
        return;
      }
      const accepted = await startLeagueKnockoutPhase(room.id, snapshot);
      if (!accepted) {
        // Outra tentativa (própria ou de outra aba) já iniciou primeiro —
        // o Realtime traz o cupState novo e o efeito acima navega sozinho.
        toast.info("O mata-mata já está sendo iniciado.");
      }
      // Sucesso: não navega aqui — o efeito de Realtime acima cuida disso
      // pra TODOS os clientes ao mesmo tempo, inclusive o host.
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível iniciar o mata-mata.");
      setStarting(false);
    }
  }

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

  if (!room || teams.length === 0) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhuma Liga concluída ainda.</p>
      </Screen>
    );
  }

  const standings = computeStandings(teams, matches, teams[0]?.id ?? "");
  const qualified = standings.slice(0, LEAGUE_KNOCKOUT_CONFIG.QUALIFIERS);
  const relegationDuel = standings.slice(-LEAGUE_KNOCKOUT_CONFIG.RELEGATION_COUNT * 2);

  return (
    <Screen center>
      <div className="w-full">
        <div className="mb-6 text-center">
          <Trophy className="mx-auto mb-2 text-gold" size={32} />
          <h1 className="font-display text-2xl tracking-wide text-text-primary">Fim da fase de Liga</h1>
          <p className="mt-1 font-sans text-xs text-text-tertiary">18 rodadas concluídas — hora do mata-mata.</p>
        </div>

        <div className="mb-4 rounded-card border border-gold/30 bg-gold/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-wide text-gold">
            <Trophy size={12} /> Classificados
          </p>
          <div className="space-y-1.5">
            {qualified.map((row, i) => (
              <p key={row.teamId} className={cn("flex items-center justify-between font-sans text-sm", row.isUserTeam && "font-semibold text-gold")}>
                <span className="text-text-secondary">
                  {i + 1}º {row.teamName}
                </span>
                {row.isUserTeam && <span className="font-mono text-[10px] text-gold">Você</span>}
              </p>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-card border border-danger/30 bg-danger/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-wide text-danger">
            <ArrowDownCircle size={12} /> Disputa contra o Rebaixamento
          </p>
          <div className="space-y-1.5">
            {relegationDuel.map((row) => (
              <p key={row.teamId} className={cn("flex items-center justify-between font-sans text-sm", row.isUserTeam && "font-semibold text-danger")}>
                <span className="text-text-secondary">
                  {standings.findIndex((s) => s.teamId === row.teamId) + 1}º {row.teamName}
                </span>
                {row.isUserTeam && <span className="font-mono text-[10px] text-danger">Você</span>}
              </p>
            ))}
          </div>
        </div>

        {isHost ? (
          <Button fullWidth size="lg" isLoading={starting} onClick={handleStartKnockout}>
            Iniciar Mata-Mata
          </Button>
        ) : (
          <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
            <p className="font-sans text-xs text-text-secondary">Aguardando o host iniciar a fase eliminatória...</p>
          </div>
        )}
      </div>
    </Screen>
  );
}
