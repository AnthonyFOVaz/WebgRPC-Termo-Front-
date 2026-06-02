import type { Guess, ColorStatus } from "../lib/types";

const KEY_ROWS: string[][] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
];

const RANK: Record<ColorStatus, number> = { miss: 0, present: 1, hit: 2 };

export function deriveKeyStatus(guesses: Guess[]): Record<string, ColorStatus> {
  const map: Record<string, ColorStatus> = {};
  for (const g of guesses) {
    for (let i = 0; i < 5; i++) {
      const ch = g.word[i];
      if (!ch) continue;
      const s = g.colors[i];
      if (!s) continue;
      if (!map[ch] || RANK[s] > RANK[map[ch]]) map[ch] = s;
    }
  }
  return map;
}

interface Props {
  onKey: (k: string) => void;
  statusMap: Record<string, ColorStatus>;
  disabled?: boolean;
}

export function Keyboard({ onKey, statusMap, disabled = false }: Props) {
  return (
    <div className={"kb " + (disabled ? "kb-disabled" : "")}>
      {KEY_ROWS.map((row, ri) => (
        <div key={ri} className="kb-row">
          {row.map(k => {
            const wide = k === "ENTER" || k === "DEL";
            const st = statusMap[k] ?? "";
            return (
              <button
                key={k}
                className={`kb-key ${wide ? "kb-wide" : ""} ${st ? "kb-" + st : ""}`}
                onClick={() => !disabled && onKey(k)}
                disabled={disabled}
                title={k === "DEL" ? "Apagar" : k === "ENTER" ? "Enviar" : k}
              >
                {k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
