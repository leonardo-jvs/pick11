"use client";

import { create } from "zustand";
import { Room } from "@/types/room";
import { Team } from "@/types/team";
import { Match } from "@/types/match";
import { DraftState } from "@/types/draft";
import { CupState } from "@/types/cup";

interface SessionState {
  room: Room | null;
  selfParticipantId: string | null;
  draftState: DraftState | null;
  /** Trava de concorrência otimista do Draft sincronizado (Fase 2) — a versão atual conhecida no servidor */
  draftVersion: number;
  /** Quando o turno atual expira (ISO), vindo do servidor — a contagem regressiva é sempre calculada a partir daqui, nunca de um relógio local isolado */
  draftDeadline: string | null;
  teams: Team[];
  schedule: { round: number; homeId: string; awayId: string }[];
  matches: Match[];
  currentRound: number;
  /** Trava de concorrência otimista da competição sincronizada (Fase 3) */
  competitionVersion: number;
  /** Prazo da rodada atual (ISO), vindo do servidor */
  competitionDeadline: string | null;
  /** Quem já confirmou presença (e com qual bônus) na rodada atual */
  roundReadiness: Record<string, { ready: boolean; boost: string }>;
  /** Modo de jogo da sala — Liga (temporada completa) ou Copa (mata-mata curto) */
  gameMode: "league" | "cup";
  /** Só populado quando gameMode === "cup" */
  cupState: CupState | null;

  setRoom: (room: Room) => void;
  updateParticipant: (participantId: string, patch: Partial<Room["participants"][number]>) => void;
  addParticipant: (participant: Room["participants"][number]) => void;
  setSelfParticipantId: (id: string) => void;
  setDraftState: (state: DraftState) => void;
  setDraftSync: (version: number, deadline: string | null) => void;
  setTeams: (teams: Team[]) => void;
  updateTeam: (teamId: string, patch: Partial<Team>) => void;
  setSchedule: (schedule: { round: number; homeId: string; awayId: string }[]) => void;
  addMatches: (matches: Match[]) => void;
  setMatches: (matches: Match[]) => void;
  setCompetitionSync: (version: number, deadline: string | null, roundReadiness: Record<string, { ready: boolean; boost: string }>) => void;
  setCurrentRound: (round: number) => void;
  setGameMode: (mode: "league" | "cup") => void;
  setCupState: (cupState: CupState) => void;
  reset: () => void;

  userTeam: () => Team | null;
}

const initialState = {
  room: null,
  selfParticipantId: null,
  draftState: null,
  draftVersion: 0,
  draftDeadline: null as string | null,
  teams: [],
  schedule: [],
  matches: [],
  currentRound: 1,
  competitionVersion: 0,
  competitionDeadline: null as string | null,
  roundReadiness: {} as Record<string, { ready: boolean; boost: string }>,
  gameMode: "league" as const,
  cupState: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  setRoom: (room) => set({ room }),
  updateParticipant: (participantId, patch) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          participants: state.room.participants.map((p) => (p.id === participantId ? { ...p, ...patch } : p)),
        },
      };
    }),
  addParticipant: (participant) =>
    set((state) => {
      if (!state.room) return state;
      if (state.room.participants.length >= state.room.maxPlayers) return state;
      return { room: { ...state.room, participants: [...state.room.participants, participant] } };
    }),
  setSelfParticipantId: (id) => set({ selfParticipantId: id }),
  setDraftState: (draftState) => set({ draftState }),
  setDraftSync: (draftVersion, draftDeadline) => set({ draftVersion, draftDeadline }),
  setTeams: (teams) => set({ teams }),
  updateTeam: (teamId, patch) =>
    set((state) => ({
      teams: state.teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t)),
    })),
  setSchedule: (schedule) => set({ schedule }),
  addMatches: (matches) => set((state) => ({ matches: [...state.matches, ...matches] })),
  setMatches: (matches) => set({ matches }),
  setCompetitionSync: (competitionVersion, competitionDeadline, roundReadiness) => set({ competitionVersion, competitionDeadline, roundReadiness }),
  setCurrentRound: (round) => set({ currentRound: round }),
  setGameMode: (gameMode) => set({ gameMode }),
  setCupState: (cupState) => set({ cupState }),
  reset: () => set({ ...initialState }),

  userTeam: () => {
    const { teams, room, selfParticipantId } = get();
    const self = room?.participants.find((p) => p.id === selfParticipantId);
    if (!self) return null;
    return teams.find((t) => t.ownerId === self.id) ?? null;
  },
}));
