"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { Modal } from "@/components/ui/Modal";
import { StandingsTable } from "@/components/features/league/StandingsTable";
import { ROUTES } from "@/constants/routes";
import { LEAGUE_CONFIG, LIVE_MATCH_CONFIG } from "@/constants/game";
import { useSessionStore } from "@/store/sessionStore";
import { simulateMatch, computeStandings } from "@/services/leagueService";
import { applyBoost } from "@/services/matchPrepService";
import { randomBetween } from "@/lib/delay";
import { Team, Boost } from "@/types/team";
import { Match } from "@/types/match";
import { cn } from "@/lib/utils";

const HOME_ADVANTAGE = 1;

interface Beat {
  minute: string;
  text: string;
  isGoal?: boolean;
}

const FILLERS = [
  "O jogo começa equilibrado.",
  "Grande defesa do goleiro!",
  "O adversário aumenta a pressão.",
  "Muita disputa no meio-campo.",
  "Boa troca de passes.",
  "A torcida pede mais intensidade.",
];

function buildBeats(match: Match): Beat[] {
  const beats: Beat[] = [{ minute: "0'", text: "A bola está rolando!" }];
  const sortedEvents = [...match.events].sort((a, b) => a.minute - b.minute);
  let homeScore = 0;
  let awayScore = 0;
  let lastMinute = 0;
  let fillerIdx = 0;

  for (const evt of sortedEvents) {
    if (evt.minute - lastMinute > 18 && fillerIdx < FILLERS.length) {
      const fillerMinute = lastMinute + Math.floor((evt.minute - lastMinute) / 2);
      beats.push({ minute: `${fillerMinute}'`, text: FILLERS[fillerIdx++ % FILLERS.length] });
    }
    if (evt.type === "goal") {
      if (evt.team === "home") homeScore++;
      else awayScore++;
      const teamName = evt.team === "home" ? match.homeTeamName : match.awayTeamName;
      beats.push({
        minute: `${evt.minute}'`,
        text: `⚽ GOOOOOOL!\n${evt.playerName}\n${teamName}\n${homeScore} x ${awayScore}`,
        isGoal: true,
      });
    } else if (evt.type === "yellow_card") {
      beats.push({ minute: `${evt.minute}'`, text: `🟨 Cartão amarelo para ${evt.playerName}` });
    } else if (evt.type === "red_card") {
      beats.push({ minute: `${evt.minute}'`, text: `🟥 Cartão vermelho para ${evt.playerName}!` });
    }
    lastMinute = evt.minute;
  }

  beats.push({ minute: "90'", text: "Fim de jogo." });
  return beats;
}

export default function SimulationPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const teams = useSessionStore((s) => s.teams);
  const schedule = useSessionStore((s) => s.schedule);
  const currentRound = useSessionStore((s) => s.currentRound);
  const pendingBoost = useSessionStore((s) => s.pendingBoost);
  const setPendingBoost = useSessionStore((s) => s.setPendingBoost);
  const addMatches = useSessionStore((s) => s.addMatches);
  const matches = useSessionStore((s) => s.matches);
  const updateTeam = useSessionStore((s) => s.updateTeam);
  const setCurrentRound = useSessionStore((s) => s.setCurrentRound);
  const userTeam = useSessionStore((s) => s.userTeam());

  const [beats, setBeats] = useState<Beat[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<"narration" | "stats">("narration");
  const [userMatch, setUserMatch] = useState<Match | null>(null);
  const [userBoost, setUserBoost] = useState<Boost>("Nenhum");
  const [opponentBoost, setOpponentBoost] = useState<Boost>("Nenhum");
  const [showStandings, setShowStandings] = useState(false);
  const startedRef = useRef(false);

  // 1. Computa toda a rodada (todos os jogos avançam juntos) assim que a tela monta
  useEffect(() => {
    if (!room || !userTeam || startedRef.current) return;
    startedRef.current = true;

    const fixtures = schedule.filter((f) => f.round === currentRound);
    const results: Match[] = [];
    const physicalPatches: { teamId: string; physical: number }[] = [];
    const capturedUserBoost = pendingBoost;

    for (const fixture of fixtures) {
      const home = teams.find((t) => t.id === fixture.homeId);
      const away = teams.find((t) => t.id === fixture.awayId);
      if (!home || !away) continue;

      const isUserHome = home.id === userTeam.id;
      const isUserAway = away.id === userTeam.id;
      const isUserMatch = isUserHome || isUserAway;

      const homeBoost: Boost = isUserHome ? capturedUserBoost : "Nenhum";
      const awayBoost: Boost = isUserAway ? capturedUserBoost : "Nenhum";
      const homeEff = applyBoost(home, homeBoost);
      const awayEff = applyBoost(away, awayBoost);

      const effectiveHome: Team = { ...home, squad: homeEff.squad, overall: homeEff.overall + HOME_ADVANTAGE };
      const effectiveAway: Team = { ...away, squad: awayEff.squad, overall: awayEff.overall };

      const match = simulateMatch(currentRound, effectiveHome, effectiveAway, isUserMatch);
      results.push(match);

      const homePhysicalAfter = homeEff.restoresFullPhysicalAfterMatch ? 100 : Math.max(45, homeEff.physical - randomBetween(3, 8));
      const awayPhysicalAfter = awayEff.restoresFullPhysicalAfterMatch ? 100 : Math.max(45, awayEff.physical - randomBetween(3, 8));
      physicalPatches.push({ teamId: home.id, physical: homePhysicalAfter });
      physicalPatches.push({ teamId: away.id, physical: awayPhysicalAfter });

      if (isUserMatch) {
        setUserMatch(match);
        setUserBoost(isUserHome ? homeBoost : awayBoost);
        setOpponentBoost(isUserHome ? awayBoost : homeBoost);
        setBeats(buildBeats(match));
      }
    }

    addMatches(results);
    physicalPatches.forEach((p) => updateTeam(p.teamId, { physical: p.physical }));
    setPendingBoost("Nenhum");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, userTeam]);

  // 2. Narra os acontecimentos progressivamente durante ~5s (timer invisível pro usuário)
  useEffect(() => {
    if (beats.length === 0 || phase !== "narration") return;
    if (visibleCount >= beats.length) {
      const toStats = setTimeout(() => setPhase("stats"), 400);
      return () => clearTimeout(toStats);
    }
    const interval = Math.max(350, Math.floor((LIVE_MATCH_CONFIG.NARRATION_SECONDS * 1000) / beats.length));
    const t = setTimeout(() => setVisibleCount((c) => c + 1), interval);
    return () => clearTimeout(t);
  }, [beats, visibleCount, phase]);

  // 3. Depois das estatísticas, avança sozinho pra próxima rodada (ou final da liga)
  useEffect(() => {
    if (phase !== "stats" || !room) return;
    const t = setTimeout(() => {
      setShowStandings(false);
      if (currentRound >= LEAGUE_CONFIG.TOTAL_ROUNDS) {
        router.push(ROUTES.leagueFinal(room.id));
      } else {
        setCurrentRound(currentRound + 1);
        router.push(ROUTES.preMatch(room.id, currentRound + 1));
      }
    }, LIVE_MATCH_CONFIG.STATS_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [phase, room, currentRound, setCurrentRound, router]);

  if (!room || !userTeam) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhuma liga em andamento.</p>
      </Screen>
    );
  }

  const isHome = userMatch?.homeTeamId === userTeam.id;
  const userScore = userMatch ? (isHome ? userMatch.homeScore : userMatch.awayScore) : 0;
  const opponentScore = userMatch ? (isHome ? userMatch.awayScore : userMatch.homeScore) : 0;
  const opponentName = userMatch ? (isHome ? userMatch.awayTeamName : userMatch.homeTeamName) : "—";

  return (
    <Screen center>
      <div className="w-full">
        {phase === "narration" || !userMatch ? (
          <div className="flex flex-col items-center">
            <p className="mb-1 font-sans text-xs text-text-tertiary">
              {userTeam.clubName} <span className="text-text-tertiary">x</span> {opponentName}
            </p>
            <div className="mb-4 flex size-2 items-center justify-center">
              <span className="size-2 animate-pulse rounded-full bg-danger" />
            </div>
            <div className="min-h-[220px] w-full space-y-3 overflow-hidden">
              {beats.slice(0, visibleCount).map((beat, i) => (
                <div
                  key={i}
                  className={cn(
                    "animate-fade-up rounded-card border px-3 py-2.5 text-center",
                    beat.isGoal ? "border-gold/50 bg-gold/10" : "border-border-subtle bg-surface"
                  )}
                >
                  <p className="font-mono text-[10px] text-text-tertiary">{beat.minute}</p>
                  {beat.text.split("\n").map((line, li) => (
                    <p
                      key={li}
                      className={cn(
                        "font-sans",
                        beat.isGoal && li === 0 ? "text-base font-bold text-gold" : "text-sm text-text-secondary",
                        beat.isGoal && li > 0 && "text-text-primary"
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-center font-sans text-xs text-text-tertiary">Rodada {currentRound} · Fim de jogo</p>

            <div className="mb-5 flex items-center justify-center gap-4 rounded-card border border-border-subtle bg-surface p-5">
              <div className="flex-1 text-center">
                <p className="truncate font-sans text-sm text-text-secondary">{userMatch.homeTeamName}</p>
              </div>
              <p className="font-display text-4xl text-text-primary">
                {userMatch.homeScore} <span className="text-text-tertiary">-</span> {userMatch.awayScore}
              </p>
              <div className="flex-1 text-center">
                <p className="truncate font-sans text-sm text-text-secondary">{userMatch.awayTeamName}</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 text-center font-mono text-[11px] text-text-tertiary">
              <div className="rounded-card border border-border-subtle bg-surface p-2">
                <p className="text-text-primary">{userMatch.stats.possession}%</p>
                <p>Posse</p>
              </div>
              <div className="rounded-card border border-border-subtle bg-surface p-2">
                <p className="text-text-primary">
                  {userMatch.stats.shots[0]}-{userMatch.stats.shots[1]}
                </p>
                <p>Finalizações</p>
              </div>
              <div className="rounded-card border border-border-subtle bg-surface p-2">
                <p className="truncate text-text-primary">{userMatch.manOfTheMatch}</p>
                <p>Destaque</p>
              </div>
            </div>

            <div className="mb-5 rounded-card border border-border-subtle bg-surface p-3">
              <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Bônus utilizado</p>
              <p className="font-sans text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{userMatch.homeTeamId === userTeam.id ? userTeam.clubName : opponentName}:</span>{" "}
                {isHome ? userBoost : opponentBoost}
                <span className="mx-2 text-text-tertiary">×</span>
                <span className="font-semibold text-text-primary">{userMatch.awayTeamId === userTeam.id ? userTeam.clubName : opponentName}:</span>{" "}
                {isHome ? opponentBoost : userBoost}
              </p>
            </div>

            <button
              onClick={() => setShowStandings(true)}
              className="block w-full text-center font-sans text-sm text-gold"
            >
              Ver classificação
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={showStandings} onClose={() => setShowStandings(false)} title="Classificação">
        <StandingsTable standings={computeStandings(teams, matches, userTeam.id)} />
      </Modal>
    </Screen>
  );
}
