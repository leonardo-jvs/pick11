import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes condicionalmente e resolve conflitos de utilitários Tailwind.
 * Uso: cn("p-4 text-sm", condition && "text-gold", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Identificação visual rápida do desgaste físico do elenco: verde -> amarelo -> laranja -> vermelho */
export function getPhysicalColorClass(physical: number): string {
  if (physical >= 80) return "text-success";
  if (physical >= 60) return "text-warning";
  if (physical >= 40) return "text-orange";
  return "text-danger";
}
