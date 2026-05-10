interface Props {
  outcome: "win" | "lose" | "draw" | "watch";
  answer: string;
  youAttempts: number;
  oppAttempts: number;
  onPlayAgain: () => void;
}

export function EndCard({ outcome, answer, youAttempts, oppAttempts, onPlayAgain }: Props) {
  const visibleAnswer = answer || "?????";
  const titles = {
    win: "Voce venceu",
    lose: "Voce perdeu",
    draw: "Empate",
    watch: "Partida encerrada",
  };
  const subs = {
    win: `Em ${youAttempts} ${youAttempts === 1 ? "tentativa" : "tentativas"}`,
    lose: `O adversario descobriu em ${oppAttempts} ${oppAttempts === 1 ? "tentativa" : "tentativas"}`,
    draw: "Nenhum jogador descobriu a palavra",
    watch: "Voce estava assistindo",
  } as const;

  return (
    <div className={"endcard endcard-" + outcome}>
      <div className="endcard-title">{titles[outcome]}</div>
      <div className="endcard-sub">{subs[outcome]}</div>
      <div className="endcard-answer">
        <div className="endcard-answer-label">{answer ? "a palavra era" : "palavra nao informada"}</div>
        <div className="endcard-answer-tiles">
          {visibleAnswer.split("").map((l, i) => (
            <div key={i} className="endcard-tile" style={{ animationDelay: `${i * 80}ms` }}>{l}</div>
          ))}
        </div>
      </div>
      <button className="endcard-btn" onClick={onPlayAgain}>Jogar agora</button>
    </div>
  );
}
