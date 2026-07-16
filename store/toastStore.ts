"use client";

import { create } from "zustand";

export type ToastVariant = "info" | "success" | "urgent";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (message: string, variant?: ToastVariant, duration?: number) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, variant = "info", duration = 3200) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, duration }] }));
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Atalho para disparar toasts de fora de componentes React */
export const toast = {
  info: (message: string) => useToastStore.getState().push(message, "info"),
  success: (message: string) => useToastStore.getState().push(message, "success"),
  urgent: (message: string) => useToastStore.getState().push(message, "urgent"),
};
