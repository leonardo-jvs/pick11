import { initDraft, getCurrentTurn, confirmPick, resolveTimeout, getSquadForParticipant, getCandidateCards, isCandidateEligible } from "@/services/draftService";
import { DEFAULT_TACTICS, DRAFT_CONFIG } from "@/constants/game";
import { RoomParticipant } from "@/types/team";

async function runOnce(formations: string[]) {
  const participants: RoomParticipant[] = formations.map((f, i) => ({
    id: `p${i}`, name: `Coach${i}`, isHuman: true, isReady: true, clubName: `Club${i}`,
    tactics: { ...DEFAULT_TACTICS, formation: f as any },
  }));
  let state = await initDraft("room", participants);
  let guard = 0, zeroEligibleRounds = 0;
  while (!state.isComplete && guard < 3000) {
    guard++;
    const turn = getCurrentTurn(state)!;
    const cards = getCandidateCards(state);
    const eligible = cards.filter((c) => isCandidateEligible(state, turn.participantId, c));
    if (eligible.length === 0) zeroEligibleRounds++;
    const ids = eligible.slice(0, turn.requiredPicks).map((c) => c.id);
    if (ids.length < turn.requiredPicks) {
      state = resolveTimeout(state, ids).state;
    } else {
      const r = confirmPick(state, ids);
      state = r.error ? resolveTimeout(state, []).state : r.state;
    }
  }
  let shortfalls = 0;
  for (const p of participants) if (getSquadForParticipant(state, p.id).length !== 11) shortfalls++;
  return { zeroEligibleRounds, shortfalls, complete: state.isComplete };
}

async function main() {
  console.log("Timer:", DRAFT_CONFIG.PICK_TIMER_SECONDS, "s (esperado 15)\n");
  const scenarios: [string[], string][] = [
    [["4-3-3"], "1 jogador"],
    [["4-3-3", "4-4-2", "3-5-2"], "3 mistos"],
    [["4-3-3", "4-3-3", "5-3-2", "5-3-2", "4-4-2"], "5 caso adversário"],
    [["5-3-2", "5-3-2", "5-3-2", "4-4-2", "4-3-3"], "5 LAT-pesados"],
    [["3-5-2", "3-5-2", "3-5-2", "3-5-2"], "4x mesma formação"],
    [Array(8).fill("4-3-3"), "8x 4-3-3"],
    [Array(12).fill(0).map((_,i)=>["4-3-3","4-4-2","4-2-3-1","3-5-2","5-3-2"][i%5]), "12 jogadores variados"],
  ];
  let totalZero = 0, totalShortfall = 0, totalRuns = 0;
  for (const [formations, label] of scenarios) {
    let zeroSum = 0, shortSum = 0;
    for (let i = 0; i < 20; i++) {
      const r = await runOnce(formations);
      zeroSum += r.zeroEligibleRounds; shortSum += r.shortfalls; totalRuns++;
      totalZero += r.zeroEligibleRounds; totalShortfall += r.shortfalls;
    }
    console.log(`${label}: 20 execuções -> zeroEligible=${zeroSum} shortfalls=${shortSum}`);
  }
  console.log(`\n=== TOTAL: ${totalRuns} simulações completas, ${totalZero} rodadas com 0 elegíveis, ${totalShortfall} déficits de titular ===`);
}
main();
