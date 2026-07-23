"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Star } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { fetchRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { toast } from "@/store/toastStore";
import { Match } from "@/types/match";

/**
 * Destaque do confronto — combina o desempenho do jogador nas DUAS partidas
 * (ida + volta): gols valem mais que assistências, que valem mais que ter
 * sido o destaque de uma partida individual. Pênaltis não contam pra essa
 * conta (não são gols "de partida" nas estatísticas, só o desempate).
 */
function computeX1Standout(legs: Match[]): string | null {
  const score = new Map<string, number>();
  const bump = (name: string | undefined, amount: number) => {
    if (!name) return;
    score.set(name, (score.get(name) ?? 0) + amount);
  };
  for (const match of legs) {
    for (const evt of match.events) {
      if (evt.type === "goal") {
        bump(evt.playerName, 3);
        bump(evt.secondaryPlayerName, 2);
      }
    }
    bump(match.manOfTheMatch, 1.5);
  }
  if (score.size === 0) return null;
  return [...score.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export default function X1FinalPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const teams = useSessionStore((s) => s.teams);
  const matches = useSessionStore((s) => s.matches);
  const cupState = useSessionStore((s) => s.cupState);
  const reset = useSessionStore((s) => s.reset);
  const [reconnecting, setReconnecting] = useState(true);

  // Reconexão: mesmo padrão já usado nas outras telas de encerramento — sem
  // isso, um F5 aqui deixava a store vazia e a tela sem nenhum dado pra mostrar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await ensureAnonymousSession();
        if (!room || room.id !== params.roomId) {
          const freshRoom = await fetchRoom(params.roomId);
          if (cancelled) return;
          if (freshRoom) {
            setRoom(freshRoom);
            setSelfParticipantId(user.id);
          }
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

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

  const leg1 = matches.find((m) => m.round === 1);
  const leg2 = matches.find((m) => m.round === 2);

  if (!room || teams.length < 2 || !leg1 || !leg2) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhum confronto X1 concluído ainda.</p>
      </Screen>
    );
  }

  const [teamA, teamB] = teams;
  const aggA = (leg1.homeTeamId === teamA.id ? leg1.homeScore : leg1.awayScore) + (leg2.homeTeamId === teamA.id ? leg2.homeScore : leg2.awayScore);
  const aggB = (leg1.homeTeamId === teamB.id ? leg1.homeScore : leg1.awayScore) + (leg2.homeTeamId === teamB.id ? leg2.homeScore : leg2.awayScore);

  // Se o agregado empatou, o servidor já resolveu nos pênaltis e anexou o
  // resultado a um único confronto do chaveamento (mesma estrutura de
  // qualquer mata-mata do jogo) — reaproveitado aqui só pra ler quem venceu.
  const penaltyDecider = cupState?.knockout[0];
  const decidedByPenalties = !!penaltyDecider?.wentToPenalties;
  const championId = decidedByPenalties ? penaltyDecider!.winnerId! : aggA > aggB ? teamA.id : teamB.id;
  const championTeam = teams.find((t) => t.id === championId)!;
  const runnerUpTeam = teams.find((t) => t.id !== championId)!;
  const championAgg = championId === teamA.id ? aggA : aggB;
  const runnerUpAgg = championId === teamA.id ? aggB : aggA;

  const standout = computeX1Standout([leg1, leg2]);

  function playAgain() {
    reset();
    router.push(ROUTES.menu);
  }

  return (
    <Screen center>
      <div className="w-full text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.6 }}>
          <Trophy className="mx-auto mb-3 text-gold" size={44} />
        </motion.div>
        <h1 className="font-display text-2xl tracking-wide text-text-primary">🏆 Campeão do X1</h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 rounded-card border border-gold/40 bg-gradient-to-b from-gold/15 via-surface to-surface p-6 shadow-glow-gold"
        >
          <p className="font-display text-2xl text-gold">{championTeam.clubName}</p>
          <p className="mt-3 font-display text-4xl text-text-primary">
            {championAgg} <span className="text-text-tertiary">x</span> {runnerUpAgg}
          </p>
          <p className="mt-1 font-sans text-sm text-text-tertiary">{runnerUpTeam.clubName}</p>
          {decidedByPenalties && penaltyDecider?.penaltyScore && (
            <p className="mt-2 font-mono text-xs text-teal-bright">
              Decidido nos pênaltis: {penaltyDecider.penaltyScore[0]} x {penaltyDecider.penaltyScore[1]}
            </p>
          )}
        </motion.div>

        {standout && (
          <div className="mt-4 rounded-card border border-border-subtle bg-surface p-4">
            <p className="mb-1 flex items-center justify-center gap-1 font-sans text-[10px] uppercase tracking-wide text-text-tertiary">
              <Star size={11} className="text-teal-bright" /> Destaque do confronto
            </p>
            <p className="font-display text-xl text-text-primary">{standout}</p>
          </div>
        )}

        <div className="mt-8">
          <Button fullWidth size="lg" onClick={playAgain}>
            Voltar ao Menu
          </Button>
        </div>
      </div>
    </Screen>
  );
}
