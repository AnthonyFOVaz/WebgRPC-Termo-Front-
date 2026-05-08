import { useEffect, useRef, useState } from "react";
import { Board } from "./Board";
import { Keyboard, deriveKeyStatus } from "./Keyboard";
import { EndCard } from "./EndCard";
import { termoClient } from "../lib/client";
import { corNumerosParaStatus, type Guess } from "../lib/types";
import { TipoEvento } from "../gen/termo_pb";
import { loadMatchState, saveMatchState } from "../lib/session";

const WORD_LEN = 5;
const MAX_ATTEMPTS = 6;

interface Props {
  idJogador: string;
  idPartida: string;
  tokenJogador: string;
  playerName: string;
  opponentName: string;
  spectator?: boolean;
  onLeave: () => void;
  onPlayAgain: () => void;
}

type Outcome = "win" | "lose" | "draw" | "watch" | null;

export function Match({
  idJogador,
  idPartida,
  tokenJogador,
  playerName,
  opponentName,
  spectator = false,
  onLeave,
  onPlayAgain,
}: Props) {
  const initialState = !spectator ? loadMatchState(idPartida) : null;
  const [youGuesses, setYouGuesses] = useState<Guess[]>(initialState?.youGuesses ?? []);
  const [oppGuesses, setOppGuesses] = useState<Guess[]>(initialState?.oppGuesses ?? []);
  const [current, setCurrent] = useState(initialState?.current ?? "");
  const [shaking, setShaking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(initialState?.outcome ?? null);
  const [answer, setAnswer] = useState(initialState?.answer ?? "");
  const [youSolved, setYouSolved] = useState(initialState?.youSolved ?? false);
  const [youOut, setYouOut] = useState(initialState?.youOut ?? false);
  const [spectatorNames, setSpectatorNames] = useState({ left: "Jogador 1", right: "Jogador 2" });
  const spectatorIdsRef = useRef<string[]>([]);
  const sendingRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  // Spectators never get input. Players also stop after finishing their own board.
  const stopInput = spectator || !!outcome || youSolved || youOut;

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1400);
  };

  const spectatorSideFor = (playerId: string, name: string) => {
    const ids = spectatorIdsRef.current;
    if (playerId && !ids.includes(playerId) && ids.length < 2) {
      ids.push(playerId);
      const side = ids.length === 1 ? "left" : "right";
      setSpectatorNames(prev => ({ ...prev, [side]: name || `Jogador ${ids.length}` }));
    }
    return ids.indexOf(playerId) === 0 ? "left" : "right";
  };

  // Local snapshot is only for F5 in same tab. Backend remains source of truth.
  useEffect(() => {
    if (spectator) return;
    saveMatchState(idPartida, {
      youGuesses,
      oppGuesses,
      current,
      outcome: outcome === "watch" ? null : outcome,
      answer,
      youSolved,
      youOut,
    });
  }, [spectator, idPartida, youGuesses, oppGuesses, current, outcome, answer, youSolved, youOut]);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        // For players, backend must validate idJogador + tokenJogador.
        // For spectators, assistir=true means read-only stream by URL.
        const stream = termoClient.monitorarPartida(
          { idJogador, idPartida, tokenJogador, assistir: spectator },
          { signal: ac.signal },
        );

        for await (const ev of stream) {
          if (ev.tipo === TipoEvento.ESPECTADOR_JOGOU) {
            // Spectator receives only colors and player names, never guessed words.
            const colors = corNumerosParaStatus(ev.coresOponente);
            const side = spectatorSideFor(ev.idJogador, ev.nomeJogador);
            if (side === "left") setYouGuesses(g => [...g, { word: "", colors }]);
            else setOppGuesses(g => [...g, { word: "", colors }]);
          } else if (ev.tipo === TipoEvento.OPONENTE_JOGOU) {
            const colors = corNumerosParaStatus(ev.coresOponente);
            setOppGuesses(g => [...g, { word: "", colors }]);
          } else if (ev.tipo === TipoEvento.OPONENTE_VENCEU) {
            showToast("Oponente acertou");
          } else if (ev.tipo === TipoEvento.OPONENTE_ESGOTOU) {
            showToast("Oponente esgotou tentativas");
          } else if (ev.tipo === TipoEvento.PARTIDA_ENCERRADA) {
            setAnswer(ev.palavraSecreta);
            if (spectator) setOutcome("watch");
            else if (ev.empate) setOutcome("draw");
            else if (ev.voceVenceu) setOutcome("win");
            else setOutcome("lose");
          }
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          console.error("stream error", err);
          showToast("Partida indisponivel");
        }
      }
    })();

    return () => ac.abort();
  }, [idJogador, idPartida, tokenJogador, spectator]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (stopInput) return;
      if (e.key === "Enter") submit();
      else if (e.key === "Backspace") setCurrent(c => c.slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key)) {
        const k = e.key.toUpperCase();
        setCurrent(c => (c.length < WORD_LEN ? c + k : c));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const submit = async () => {
    if (sendingRef.current || stopInput) return;
    if (current.length !== WORD_LEN) {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 500);
      showToast("Faltam letras");
      return;
    }

    sendingRef.current = true;
    const word = current.toUpperCase();

    try {
      // tokenJogador is what prevents a shared URL from controlling a player.
      const resp = await termoClient.enviarPalavra({
        idJogador,
        idPartida,
        palavraChutada: word,
        tokenJogador,
      });

      if (resp.palavraInvalida) {
        setShaking(true);
        window.setTimeout(() => setShaking(false), 500);
        showToast("Palavra nao existe");
        return;
      }

      const colors = corNumerosParaStatus(resp.cores);
      setYouGuesses(g => [...g, { word, colors }]);
      setCurrent("");
      if (resp.acertou) setYouSolved(true);
      else if (resp.tentativasRestantes === 0) setYouOut(true);
    } catch (err) {
      console.error(err);
      showToast("Erro ao enviar");
    } finally {
      sendingRef.current = false;
    }
  };

  const handleKey = (k: string) => {
    if (stopInput) return;
    if (k === "ENTER") submit();
    else if (k === "DEL" || k === "BACKSPACE") setCurrent(c => c.slice(0, -1));
    else if (/^[A-Z]$/.test(k)) setCurrent(c => (c.length < WORD_LEN ? c + k : c));
  };

  const youKeyStatus = deriveKeyStatus(youGuesses);
  const leftName = spectator ? spectatorNames.left : (playerName || "Voce");
  const rightName = spectator ? spectatorNames.right : opponentName;

  return (
    <div className="match">
      <Header opponentName={rightName} onLeave={onLeave} idPartida={idPartida} spectator={spectator} />

      <div className="boards">
        <div className="board-col">
          <div className="board-label">
            <div className="board-name">{leftName}</div>
            <div className="board-meta">
              {youGuesses.length}/{MAX_ATTEMPTS}{!spectator && youSolved && " OK"}{!spectator && youOut && !youSolved && " fim"}
            </div>
          </div>
          <Board guesses={youGuesses} current={spectator ? "" : current} masked={spectator} shaking={!spectator && shaking} />
        </div>

        <div className="board-divider">
          <div className="divider-line"></div>
          <div className="divider-x">vs</div>
          <div className="divider-line"></div>
        </div>

        <div className="board-col">
          <div className="board-label">
            <div className="board-name">{rightName}</div>
            <div className="board-meta">{oppGuesses.length}/{MAX_ATTEMPTS}</div>
          </div>
          <Board guesses={oppGuesses} masked />
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {outcome ? (
        <EndCard
          outcome={outcome}
          answer={answer}
          youAttempts={youGuesses.length}
          oppAttempts={oppGuesses.length}
          onPlayAgain={onPlayAgain}
        />
      ) : spectator ? (
        <div className="waiting-bar">Assistindo partida em tempo real</div>
      ) : (
        <Keyboard onKey={handleKey} statusMap={youKeyStatus} disabled={stopInput} />
      )}

      {stopInput && !outcome && !spectator && (
        <div className="waiting-bar">
          {youSolved
            ? "Voce acertou. Aguardando o adversario."
            : youOut
              ? "Suas tentativas acabaram. Aguardando o adversario."
              : ""}
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  opponentName: string;
  onLeave: () => void;
  idPartida: string;
  spectator: boolean;
}

function Header({ opponentName, onLeave, idPartida, spectator }: HeaderProps) {
  const shortCode = idPartida.slice(0, 5).toUpperCase();
  return (
    <div className="match-header">
      <div className="brand">
        <span className="brand-l brand-hit">T</span>
        <span className="brand-l brand-present">E</span>
        <span className="brand-l">R</span>
        <span className="brand-l brand-hit">M</span>
        <span className="brand-l">O</span>
        <span className="brand-mode">2P</span>
      </div>
      <div className="match-info">
        <div className="info-chip"><span className="dot dot-live"></span>{spectator ? "assistindo" : "partida ao vivo"}</div>
        <div className="info-chip">sala <strong>#{shortCode}</strong></div>
        <div className="info-chip">vs <strong>{opponentName}</strong></div>
        <button className="leave-btn" onClick={onLeave} title="Sair da sala">
          <span className="leave-icon">x</span>
          <span className="leave-label">Sair</span>
        </button>
      </div>
    </div>
  );
}
