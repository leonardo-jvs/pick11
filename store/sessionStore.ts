"use client";

import { create } from "zustand";
import { Room } from "@/types/room";
import { Team } from "@/types/team";
import { Match } from "@/types/match";
import { DraftState } from "@/types/draft";

import { Boost } from "@/types/team";

interface SessionState {
  room: Room | null;
  selfParticipantId: string | null;
  draftState: DraftState | null;
  teams: Team[];
  schedule: { round: number; homeId: string; awayId: string }[];
  matches: Match[];
  currentRound: number;
  /** Boost escolhido na Pré-Partida para a próxima simulação (consumido e resetado após a partida) */
  pendingBoost: Boost;
  /** Quantas vezes cada boost já foi usado nesta temporada (limites em BOOST_USES) */
  boostUsage: Partial<Record<Boost, number>>;

  setRoom: (room: Room) => void;
  updateParticipant: (participantId: string, patch: Partial<Room["participants"][number]>) => void;
  addParticipant: (participant: Room["participants"][number]) => void;
  setSelfParticipantId: (id: string) => void;
  setDraftState: (state: DraftState) => void;
  setTeams: (teams: Team[]) => void;
  updateTeam: (teamId: string, patch: Partial<Team>) => void;
  setSchedule: (schedule: { round: number; homeId: string; awayId: string }[]) => void;
  addMatches: (matches: Match[]) => void;
  setCurrentRound: (round: number) => void;
  setPendingBoost: (boost: Boost) => void;
  recordBoostUse: (boost: Boost) => void;
  reset: () => void;

  userTeam: () => Team | null;
}

const initialState = {
  room: null,
  selfParticipantId: null,
  draftState: null,
  teams: [],
  schedule: [],
  matches: [],
  currentRound: 1,
  pendingBoost: "Nenhum" as Boost,
  boostUsage: {},
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
  setTeams: (teams) => set({ teams }),
  updateTeam: (teamId, patch) =>
    set((state) => ({
      teams: state.teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t)),
    })),
  setSchedule: (schedule) => set({ schedule }),
  addMatches: (matches) => set((state) => ({ matches: [...state.matches, ...matches] })),
  setCurrentRound: (round) => set({ currentRound: round }),
  setPendingBoost: (boost) => set({ pendingBoost: boost }),
  recordBoostUse: (boost) =>
    set((state) => ({ boostUsage: { ...state.boostUsage, [boost]: (state.boostUsage[boost] ?? 0) + 1 } })),
  reset: () => set({ ...initialState }),

  userTeam: () => {
    const { teams, room, selfParticipantId } = get();
    const self = room?.participants.find((p) => p.id === selfParticipantId);
    if (!self) return null;
    return teams.find((t) => t.ownerId === self.id) ?? null;
  },
}));
