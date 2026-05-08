import type { Guess, ColorStatus } from "../lib/types";

const WORD_LEN = 5;
const MAX_ATTEMPTS = 6;

interface TileProps {
  letter: string;
  status: ColorStatus | null;
  revealed: boolean;
  idx: number;
  animate: "pop" | "shake" | null;
}

function Tile({ letter, status, revealed, idx, animate }: TileProps) {
  const delay = `${idx * 280}ms`;
  const cls = [
    "tile",
    letter ? "tile-filled" : "",
    revealed ? `tile-reveal tile-${status}` : "",
    animate === "pop" && letter && !revealed ? "tile-pop" : "",
    animate === "shake" ? "tile-shake" : "",
  ].join(" ");
  return (
    <div className={cls} style={{ ["--delay" as any]: delay }}>
      <div className="tile-inner">
        <div className="tile-face tile-front">{letter}</div>
        <div className="tile-face tile-back">{letter}</div>
      </div>
    </div>
  );
}

interface Props {
  guesses: Guess[];
  current?: string;
  masked?: boolean;
  shaking?: boolean;
}

export function Board({ guesses, current = "", masked = false, shaking = false }: Props) {
  const rows = [];
  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const g = guesses[r];
    const isCurrent = r === guesses.length;
    const tiles = [];
    for (let c = 0; c < WORD_LEN; c++) {
      let letter = "";
      let status: ColorStatus | null = null;
      let revealed = false;
      if (g) {
        letter = masked ? "" : g.word[c] ?? "";
        status = g.colors[c] ?? null;
        revealed = true;
      } else if (isCurrent && !masked) {
        letter = current[c] ?? "";
      }
      tiles.push(
        <Tile
          key={c}
          letter={letter}
          status={status}
          revealed={revealed}
          idx={c}
          animate={
            isCurrent && shaking ? "shake" :
            isCurrent && !masked && current[c] ? "pop" : null
          }
        />
      );
    }
    rows.push(<div key={r} className={"row " + (isCurrent && shaking ? "row-shake" : "")}>{tiles}</div>);
  }
  return <div className="board">{rows}</div>;
}
