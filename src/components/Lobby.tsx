import { useEffect, useState } from "react";

interface Props {
  playerName: string;
  onlineCount?: number | null;
}

export function Lobby({ playerName, onlineCount }: Props) {
  const [dots, setDots] = useState("");
  const onlineLabel =
    onlineCount == null
      ? "online conectando"
      : `${onlineCount} pessoa${onlineCount === 1 ? "" : "s"} online`;

  useEffect(() => {
    const id = setInterval(() => setDots(d => (d.length >= 3 ? "" : d + ".")), 380);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="lobby">
      <div className="lobby-card">
        <div className="lobby-logo">
          <span className="logo-l logo-hit">T</span>
          <span className="logo-l logo-present">E</span>
          <span className="logo-l">R</span>
          <span className="logo-l logo-hit">M</span>
          <span className="logo-l">O</span>
          <span className="logo-versus">vs</span>
        </div>
        <div className="lobby-spinner">
          <div className="pulse-ring"></div>
          <div className="pulse-ring pulse-ring-2"></div>
          <div className="pulse-dot"></div>
        </div>
        <div className="lobby-text">
          Procurando adversario<span className="lobby-dots">{dots}</span>
        </div>
        <div className="lobby-sub">Conectado - {onlineLabel} - 5 letras - 6 tentativas</div>
        <div className="lobby-players">
          <div className="lobby-player lobby-player-you">
            <div className="lobby-avatar">{(playerName || "VC").slice(0, 2).toUpperCase()}</div>
            <div className="lobby-name">{playerName || "Voce"}</div>
            <div className="lobby-status lobby-ready">pronto</div>
          </div>
          <div className="lobby-vs">x</div>
          <div className="lobby-player lobby-player-opp">
            <div className="lobby-avatar lobby-avatar-empty">?</div>
            <div className="lobby-name">-</div>
            <div className="lobby-status lobby-searching">procurando</div>
          </div>
        </div>
      </div>
    </div>
  );
}
