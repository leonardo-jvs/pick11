"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Shield, HeartPulse, BedDouble, Check, Lock } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/ui/Timer";
import { PitchView } from "@/components/features/pre-match/PitchView";
import { ROUTES } from "@/constants/routes";
import { SELECTABLE_BOOSTS, BOOST_USES, BOOST_POSITION_TARGETS, BOOST_OVERALL_BONUS, PRE_MATCH_CONFIG, LEAGUE_CONFIG } from "@/constants/game";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings } from "@/services/leagueService";
import { Boost } from "@/types/team";
import { Position } from "@/types/player";
import { cn, getPhysicalColorClass } from "@/lib/utils";

const ALL_POSITIONS: Position[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

const BOOST_ICON: Record<Boost, React.ReactNode> = {
  Nenhum: <Zap size={16} />,
  Bicho: <Zap size={16} />,
  "Jogo importante": <Shield size={16} />,
  "Recuperação rápida": <HeartPulse size={16} />,
  "Poupar elenco": <BedDouble size={16} />,
};

const BOOST_DESCRIPTION: Record<Boost, string> = {
  Nenhum: "Joga sem nenhum bônus especial.",
  Bicho: "+3 Overall para atacantes e meias. Ideal para jogos equilibrados.",
  "Jogo importante": "+3 Overall para defensores. Ideal contra times fortes.",
  "Recuperação rápida": "Recupera ~25% do físico dos titulares antes da partida.",
  "Poupar elenco":
    "Os titulares são poupados nesta rodada. Todos os jogadores da equipe entram em campo com -3 de Overall, reduzindo significativamente as chances de vitória. Em compensação, todo o elenco titular retorna com 100% de físico para a próxima rodada.",
};

export default function PreMatchPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const teams = useSessionStore((s) => s.teams);
  const schedule = useSessionStore((s) => s.schedule);
  const matches = useSessionStore((s) => s.matches);
  const currentRound = useSessionStore((s) => s.currentRound);
  const boostUsage = useSessionStore((s) => s.boostUsage);
  const setPendingBoost = useSessionStore((s) => s.setPendingBoost);
  const recordBoostUse = useSessionStore((s) => s.recordBoostUse);
  const userTeam = useSessionStore((s) => s.userTeam());

  // Uma vez escolhido, o bônus trava — nenhuma troca depois disso (item 5 da Sprint 6)
  const [lockedBoost, setLockedBoost] = useState<Boost | null>(null);
  const [starting, setStarting] = useState(false);

  if (!room || !userTeam || teams.length === 0) {
    return (
      <Screen center>
        <p className="mb-4 font-sans text-sm text-text-secondary">Nenhuma liga em andamento.</p>
        <button onClick={() => router.push(ROUTES.roomHub)} className="font-sans text-sm text-gold">
          Voltar ao menu multiplayer
        </button>
      </Screen>
    );
  }

  const fixture = schedule.find((f) => f.round === currentRound && (f.homeId === userTeam.id || f.awayId === userTeam.id));
  const opponent = fixture ? teams.find((t) => t.id === (fixture.homeId === userTeam.id ? fixture.awayId : fixture.homeId)) : null;
  const isHome = fixture?.homeId === userTeam.id;
  const standings = computeStandings(teams, matches, userTeam.id);
  const position = standings.findIndex((s) => s.teamId === userTeam.id) + 1;

  const activeBoost = lockedBoost ?? "Nenhum";
  const isPouparElenco = activeBoost === "Poupar elenco";
  const boostedPositions: Position[] | undefined = isPouparElenco
    ? ALL_POSITIONS
    : (BOOST_POSITION_TARGETS[activeBoost] as Position[] | undefined);
  const boostDelta = isPouparElenco ? -BOOST_OVERALL_BONUS : BOOST_OVERALL_BONUS;

  function isBoostDisabled(boost: Boost) {
    if (lockedBoost !== null) return true; // travado após a primeira escolha
    const limit = BOOST_USES[boost];
    if (limit === null) return false;
    return (boostUsage[boost] ?? 0) >= limit;
  }

  function boostUsesLabel(boost: Boost) {
    const limit = BOOST_USES[boost];
    if (limit === null) return null;
    const used = boostUsage[boost] ?? 0;
    return `${Math.max(0, limit - used)}/${limit} usos`;
  }

  // Clique aplica o bônus imediatamente — sem confirmação, sem poder trocar depois
  function handleSelectBoost(boost: Boost) {
    if (lockedBoost !== null) return;
    setLockedBoost(boost);
  }

  function handleStart() {
    if (starting || !room) return;
    setStarting(true);
    // Se o tempo esgotar sem escolha, a partida começa normalmente sem bônus — não existe opção "Nenhum" pra clicar
    const boost = lockedBoost ?? "Nenhum";
    if (boost !== "Nenhum") recordBoostUse(boost);
    setPendingBoost(boost);
    router.push(ROUTES.simulation(room.id, currentRound));
  }

  function handleTimeout() {
    handleStart();
  }

  return (
    <Screen withField center>
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-sans text-xs text-text-tertiary">
              Rodada {currentRound} de {LEAGUE_CONFIG.TOTAL_ROUNDS}
            </p>
            <h1 className="font-display text-2xl tracking-wide text-text-primary">
              {userTeam.clubName} <span className="text-text-tertiary">{isHome ? "🏠" : "✈️"}</span> {opponent?.clubName ?? "—"}
            </h1>
          </div>
          <Timer seconds={PRE_MATCH_CONFIG.TIMER_SECONDS} resetKey={currentRound} onComplete={handleTimeout} size={64} />
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="rounded-card border border-border-subtle bg-surface p-2.5 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">Rodada</p>
            <p className="font-display text-lg text-text-primary">{currentRound}</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-2.5 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">Classificação</p>
            <p className="font-display text-lg text-teal-bright">{position}º</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-2.5 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">Físico</p>
            <p className={cn("font-display text-lg", getPhysicalColorClass(userTeam.physical))}>{userTeam.physical}%</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-2.5 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">Overall</p>
            <p className="font-display text-lg text-gold">{userTeam.overall}</p>
          </div>
        </div>

        <p className="mb-1.5 font-sans text-xs text-text-tertiary">Escalação titular</p>
        <div className="mb-4">
          <PitchView players={userTeam.starters} boostedPositions={boostedPositions} boostDelta={boostDelta} />
        </div>

        <div className="mb-1.5 flex items-center gap-1.5">
          <p className="font-sans text-xs text-text-tertiary">Escolha um bônus (opcional)</p>
          {lockedBoost !== null && <Lock size={11} className="text-text-tertiary" />}
        </div>
        <div className="mb-4 space-y-2">
          {SELECTABLE_BOOSTS.map((boost) => {
            const disabled = isBoostDisabled(boost);
            const usesLabel = boostUsesLabel(boost);
            const selected = lockedBoost === boost;
            return (
              <button
                key={boost}
                type="button"
                disabled={disabled && !selected}
                onClick={() => handleSelectBoost(boost)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-card border px-3 py-2.5 text-left transition-colors",
                  selected ? "border-gold bg-gold/10" : "border-border-subtle bg-surface hover:border-border-strong",
                  disabled && !selected && "cursor-not-allowed opacity-40",
                  lockedBoost !== null && !selected && "cursor-not-allowed"
                )}
              >
                <span className={cn("mt-0.5", selected ? "text-gold" : "text-text-tertiary")}>{BOOST_ICON[boost]}</span>
                <span className="flex-1">
                  <span className="flex items-center justify-between">
                    <span className={cn("font-sans text-sm font-semibold", selected ? "text-gold" : "text-text-primary")}>{boost}</span>
                    {usesLabel && <span className="font-mono text-[10px] text-text-tertiary">{usesLabel}</span>}
                  </span>
                  <span className="mt-0.5 block font-sans text-[11px] leading-snug text-text-tertiary">{BOOST_DESCRIPTION[boost]}</span>
                </span>
                {selected && <Check size={16} className="mt-0.5 shrink-0 text-gold" />}
              </button>
            );
          })}
        </div>

        <Button fullWidth size="lg" isLoading={starting} onClick={handleStart}>
          Iniciar partida
        </Button>
      </div>
    </Screen>
  );
}
