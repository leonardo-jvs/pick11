import { Player } from "./player";
import { TeamTactics } from "./team";

export interface DraftTurn {
  index: number;
  participantId: string;
  requiredPicks: number; // 2 na maioria das rodadas; a última rodada de cada participante pode pedir só 1
}

export interface DraftPick {
  turnIndex: number;
  slotId: string; // slot da formação que este jogador preencheu
  participantId: string;
  player: Player;
  isAutoPick: boolean;
}

export interface DraftState {
  roomId: string;
  /** Ordem dos participantes HUMANOS no snake draft — bots não participam */
  order: string[];
  /** Tática de cada participante, travada desde o Lobby — usada para calcular compatibilidade e sortear candidatos */
  participantTactics: Record<string, TeamTactics>;
  /** Sequência completa de rodadas de escolha (snake), já pré-calculada */
  turns: DraftTurn[];
  currentTurnIndex: number;
  pool: Player[]; // jogadores ainda disponíveis
  candidates: Player[]; // 6 jogadores oferecidos na rodada atual
  picks: DraftPick[];
  /** Slots já preenchidos por participante: participantId -> slotId -> jogador */
  filledSlots: Record<string, Record<string, Player>>;
  timerSeconds: number;
  isComplete: boolean;
}
