// Domain types used inside the UI (kept independent from generated proto types).

export type ColorStatus = "miss" | "present" | "hit";

export interface Guess {
  word: string;          // 5 letters uppercase, "" when masked
  colors: ColorStatus[]; // length 5
}

export const corNumeroParaStatus = (n: number): ColorStatus => {
  if (n === 2) return "hit";
  if (n === 1) return "present";
  return "miss";
};

export const corNumerosParaStatus = (cores: number[] | readonly number[]): ColorStatus[] => {
  const out: ColorStatus[] = [];
  for (let i = 0; i < 5; i++) out.push(corNumeroParaStatus(cores[i] ?? 0));
  return out;
};
