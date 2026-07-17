"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { getSquadForParticipant, assignReservesToHumans, getDraftFillerNames } from "@/services/draftService";
import { generateBotSquads, generateSchedule } from "@/services/leagueService";
import { determineCupTier, initCupState } from "@/services/cupService";
import { computeTeamOverall, computeTeamCompatibilityStars } from "@/services/compatibilityService";
import { createFillerNameGuard } from "@/mocks/syntheticPlayers";
import { generateId } from "@/lib/delay";
import { Team } from "@/types/team";
import { cn } from "@/lib/utils";

const LEAGUE_STEPS = [
  "Montando os elencos...",
  "Distribuindo reservas...",
  "Calculando compatibilidades...",
  "Gerando calendário...",
  "Preparando estádio...",
];

const CUP_STEPS = [
  "Montando os elencos...",
  "Distribuindo reservas...",
  "Calculando compatibilidades...",
  "Sorteando os grupos...",
  "Preparando estádio...",
];

const STEP_DURATION_MS = 600; // 5 passos x 600ms ≈ 3s

export default function GeneratingLeaguePage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const draftState = useSessionStore((s) => s.draftState);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const setTeams = useSessionStore((s) => s.setTeams);
  const setSchedule = useSessionStore((s) => s.setSchedule);
  const setCurrentRound = useSessionStore((s) => s.setCurrentRound);
  const setCupState = useSessionStore((s) => s.setCupState);

  const isCup = room?.gameMode === "cup";
  const STEPS = isCup ? CUP_STEPS : LEAGUE_STEPS;

  const [stepIndex, setStepIndex] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!room || !draftState || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const humanParticipants = room.participants.filter((p) => draftState.order.includes(p.id));
      const clubNames = Object.fromEntries(humanParticipants.map((p) => [p.id, p.clubName]));

      // 1. Montando os elencos (titulares já vêm do draft)
      setStepIndex(0);
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));

      // 2. Distribuindo reservas (Copa não usa reservas — elenco de exatamente 11)
      setStepIndex(1);
      // Um único Set de nomes compartilhado entre reservas e bots — herda também
      // os nomes fictícios já usados durante o próprio Draft (rede de segurança
      // de escassez), garantindo que nenhum jogador repita nome em toda a liga.
      const usedNames = new Set([...createFillerNameGuard(), ...getDraftFillerNames()]);
      const { reserves, remainingPool } = isCup
        ? { reserves: {} as Record<string, ReturnType<typeof getSquadForParticipant>>, remainingPool: draftState.pool }
        : assignReservesToHumans(draftState.pool, draftState.order, clubNames, usedNames);
      const humanTeams: Team[] = humanParticipants.map((participant) => {
        const starters = getSquadForParticipant(draftState, participant.id);
        const participantReserves = isCup ? [] : reserves[participant.id] ?? [];
        const squad = [...starters, ...participantReserves];
        return {
          id: generateId("team"),
          ownerId: participant.id,
          ownerName: participant.name,
          clubName: participant.clubName,
          isHuman: true,
          tactics: participant.tactics,
          starters,
          reserves: participantReserves,
          squad,
          overall: computeTeamOverall(squad, participant.tactics),
          compatibilityStars: computeTeamCompatibilityStars(squad, participant.tactics),
          physical: 100,
        };
      });

      // Copa pode ter menos de 20 equipes no total (8/12/16/20, conforme a
      // quantidade de humanos) — Liga continua exatamente com 20, como sempre.
      const targetTotalTeams = isCup ? determineCupTier(humanTeams.length).totalTeams : undefined;
      const botTeams = await generateBotSquads(remainingPool, humanTeams.length, usedNames, targetTotalTeams, !isCup);
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));

      // 3. Calculando compatibilidades (overall final de cada time já aplicado acima)
      setStepIndex(2);
      const allTeams = [...humanTeams, ...botTeams];
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));

      // 4. Gerando calendário (Liga) ou sorteando os grupos (Copa)
      setStepIndex(3);
      if (isCup) {
        const cupState = initCupState(allTeams.map((t) => t.id), humanTeams.length);
        setCupState(cupState);
      } else {
        const schedule = generateSchedule(allTeams.map((t) => t.id));
        setSchedule(schedule);
      }
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));

      // 5. Preparando estádio
      setStepIndex(4);
      setTeams(allTeams);
      setCurrentRound(1);
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));

      router.push(ROUTES.preMatch(room.id, 1));
    })();
  }, [room, draftState, selfParticipantId, isCup, setTeams, setSchedule, setCupState, setCurrentRound, router]);

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <Screen center withField>
      <div className="w-full max-w-xs text-center">
        <p className="font-display text-2xl tracking-wide text-text-primary">{isCup ? "GERANDO COPA" : "GERANDO LIGA"}</p>
        <p className="mt-2 min-h-[20px] font-sans text-sm text-text-tertiary">{STEPS[stepIndex]}</p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-pill bg-surface-elevated">
          <div
            className="h-full rounded-pill bg-gold transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 rounded-full transition-colors duration-300",
                i <= stepIndex ? "bg-gold" : "bg-surface-elevated"
              )}
            />
          ))}
        </div>
      </div>
    </Screen>
  );
}
