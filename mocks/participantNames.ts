export const PARTICIPANT_NAME_POOL = [
  "João",
  "Marina",
  "Rafael",
  "Beatriz",
  "Lucas",
  "Camila",
  "Pedro",
  "Larissa",
  "Gustavo",
  "Fernanda",
  "Thiago",
  "Juliana",
  "Bruno",
  "Amanda",
  "Diego",
  "Patrícia",
  "Felipe",
  "Carolina",
  "André",
  "Vanessa",
] as const;

export function pickRandomNames(count: number, exclude: string[] = []): string[] {
  const available = PARTICIPANT_NAME_POOL.filter((n) => !exclude.includes(n));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
