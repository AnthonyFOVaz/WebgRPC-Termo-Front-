import { useEffect, useRef, useState } from "react";

interface Props {
  onStart: (name: string) => void;
  defaultName?: string;
  onlineCount?: number | null;
}

export function Home({ onStart, defaultName, onlineCount }: Props) {
  const [name, setName] = useState(defaultName ?? "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const onlineLabel =
    onlineCount == null
      ? "conectando"
      : `${onlineCount} pessoa${onlineCount === 1 ? "" : "s"} online`;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const n = name.trim();
    if (n.length < 2) return setError("Nome muito curto");
    if (n.length > 14) return setError("Maximo 14 caracteres");
    setError("");
    onStart(n);
  };

  return (
    <div className="home">
      <div className="home-card">
        <div className="home-brand">
          <span className="logo-l logo-hit">T</span>
          <span className="logo-l logo-present">E</span>
          <span className="logo-l">R</span>
          <span className="logo-l logo-hit">M</span>
          <span className="logo-l">O</span>
          <span className="logo-versus">2P</span>
        </div>
        <div className="home-tagline">Adivinhe a palavra antes do seu adversario</div>

        <div className="home-form">
          <label className="home-label">Seu nome</label>
          <input
            ref={inputRef}
            className={"home-input " + (error ? "home-input-error" : "")}
            placeholder="ex. fulano42"
            value={name}
            maxLength={14}
            onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
          {error && <div className="home-error">{error}</div>}

          <button className="home-btn" onClick={submit} disabled={name.trim().length < 2}>
            <span>Entrar na partida</span>
          </button>

          <div className="home-mode-row">
            <div className="home-mode-chip"><strong>5</strong> letras</div>
            <div className="home-mode-chip"><strong>6</strong> tentativas</div>
            <div className="home-mode-chip">jogo rapido</div>
          </div>
        </div>

        <div className="home-footer">
          <div className="home-stats">
            <span className="home-stat-dot"></span>
            <strong>{onlineLabel}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
