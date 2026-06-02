import { useEffect, useRef, useState } from "react";
import { Code, ConnectError } from "@connectrpc/connect";
import { Board } from "./Board";
import { Keyboard, deriveKeyStatus } from "./Keyboard";
import { EndCard } from "./EndCard";
import { termoClient } from "../lib/client";
import { corNumerosParaStatus, type Guess } from "../lib/types";
import { loadMatchState, saveMatchState } from "../lib/session";

const WORD_LEN = 5;
const MAX_ATTEMPTS = 6;
const BACKEND_TOKEN_HEADER = "x-jogdor-token";

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
type BackendSide = "j1" | "j2";

function guessRowsFromHistory(rows: readonly { cores: readonly number[] }[]): Guess[] {
  return rows.map((row) => ({ word: "", colors: corNumerosParaStatus(row.cores) }));
}

function colorsKey(cores: readonly number[]) {
  return Array.from(cores).join(",");
}

function lastColorsKey(rows: readonly { cores: readonly number[] }[]) {
  const last = rows[rows.length - 1];
  return last ? colorsKey(last.cores) : "";
}

function guessColorsKey(guess: Guess) {
  return guess.colors.map((status) => status === "hit" ? 2 : status === "present" ? 1 : 0).join(",");
}

function historyStartsWithGuesses(rows: readonly { cores: readonly number[] }[], guesses: readonly Guess[]) {
  if (guesses.length === 0 || rows.length < guesses.length) return false;
  return guesses.every((guess, index) => colorsKey(rows[index].cores) === guessColorsKey(guess));
}

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
  const [endSubtitle, setEndSubtitle] = useState<string | undefined>(undefined);
  const sendingRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const selfSideRef = useRef<BackendSide | null>(null);
  const pendingOwnColorsRef = useRef<string | null>(null);
  const youGuessesRef = useRef(youGuesses);
  const outcomeRef = useRef(outcome);
  const answerRef = useRef(answer);
  const youSolvedRef = useRef(youSolved);
  const youOutRef = useRef(youOut);

  // Spectators never get input. Players also stop after finishing their own board.
  const stopInput = spectator || !!outcome || youSolved || youOut;

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1400);
  };

  useEffect(() => { youGuessesRef.current = youGuesses; }, [youGuesses]);
  useEffect(() => { outcomeRef.current = outcome; }, [outcome]);
  useEffect(() => { answerRef.current = answer; }, [answer]);
  useEffect(() => { youSolvedRef.current = youSolved; }, [youSolved]);
  useEffect(() => { youOutRef.current = youOut; }, [youOut]);

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
        const stream = termoClient.assistirPartida({ idPartida }, { signal: ac.signal });

        for await (const state of stream) {
          const j1 = guessRowsFromHistory(state.historicoCoresJogador1);
          const j2 = guessRowsFromHistory(state.historicoCoresJogador2);

          if (spectator) {
            setSpectatorNames({ left: "Jogador 1", right: "Jogador 2" });
            setYouGuesses(j1);
            setOppGuesses(j2);
            if (state.finalizada && !outcomeRef.current) {
              setAnswer(state.palavraSecreta);
              setOutcome("watch");
            }
            continue;
          }

          let side = selfSideRef.current;
          const ownGuesses = youGuessesRef.current;
          if (!side && ownGuesses.length > 0) {
            const j1LooksOwn = historyStartsWithGuesses(state.historicoCoresJogador1, ownGuesses);
            const j2LooksOwn = historyStartsWithGuesses(state.historicoCoresJogador2, ownGuesses);
            if (j1LooksOwn && !j2LooksOwn) side = "j1";
            else if (j2LooksOwn && !j1LooksOwn) side = "j2";
            if (side) selfSideRef.current = side;
          }

          const pendingOwnColors = pendingOwnColorsRef.current;
          if (!side && pendingOwnColors) {
            const ownCount = ownGuesses.length;
            const j1Matches = lastColorsKey(state.historicoCoresJogador1) === pendingOwnColors;
            const j2Matches = lastColorsKey(state.historicoCoresJogador2) === pendingOwnColors;
            if (j1Matches && state.historicoCoresJogador1.length === ownCount) side = "j1";
            else if (j2Matches && state.historicoCoresJogador2.length === ownCount) side = "j2";
            else if (j1Matches && !j2Matches) side = "j1";
            else if (j2Matches && !j1Matches) side = "j2";
            if (side) {
              selfSideRef.current = side;
              pendingOwnColorsRef.current = null;
            }
          }

          if (side === "j1") setOppGuesses(j2);
          else if (side === "j2") setOppGuesses(j1);
          else {
            const ownCount = youGuessesRef.current.length;
            if (j1.length > ownCount) setOppGuesses(j1);
            else if (j2.length > ownCount) setOppGuesses(j2);
            else setOppGuesses(j1.length >= j2.length ? j1 : j2);
          }

          if (state.finalizada && !outcomeRef.current) {
            if (youSolvedRef.current) setOutcome("win");
            else if (youOutRef.current) setOutcome("draw");
            else setOutcome("lose");
            if (!answerRef.current) setAnswer(state.palavraSecreta);
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
  }, [idPartida, spectator]);

  // Eventos da partida (ex: oponente desconectou). Espectadores nao recebem.
  // Backend envia EventoPartida via stream MonitorarPartida; ao receber mensagem
  // de fim, fecha a partida no UI mostrando EndCard com o motivo.
  useEffect(() => {
    if (spectator) return;
    const ac = new AbortController();

    (async () => {
      try {
        const stream = termoClient.monitorarPartida(
          { idJogador, idPartida },
          { signal: ac.signal },
        );
        for await (const evento of stream) {
          if (!evento.mensagem) continue;
          if (outcomeRef.current) continue;
          if (evento.oponenteGanhou) {
            setYouSolved(true);
            setOutcome("win");
          } else if (youOutRef.current) {
            setOutcome("draw");
          } else {
            setOutcome("lose");
          }
          setEndSubtitle(evento.mensagem);
        }
      } catch (err) {
        if (!ac.signal.aborted) console.error("monitor stream error", err);
      }
    })();

    return () => ac.abort();
  }, [idJogador, idPartida, spectator]);

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
        idJogador1: idJogador,
        idPartida,
        palavraChutada: word,
      }, {
        headers: { [BACKEND_TOKEN_HEADER]: tokenJogador || idJogador },
      });

      const colors = corNumerosParaStatus(resp.cores);
      pendingOwnColorsRef.current = colorsKey(resp.cores);
      setYouGuesses(g => [...g, { word, colors }]);
      setCurrent("");
      if (resp.acertou) {
        setYouSolved(true);
        setAnswer(resp.palavraSecreta || word);
        setOutcome("win");
      } else if (resp.tentativasRestantes === 0) {
        setYouOut(true);
        if (resp.palavraSecreta) {
          setAnswer(resp.palavraSecreta);
          setOutcome("draw");
        }
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ConnectError && err.code === Code.InvalidArgument) {
        setShaking(true);
        window.setTimeout(() => setShaking(false), 500);
        showToast(err.message.toLowerCase().includes("inv") ? "Palavra nao existe" : "Jogada recusada");
      } else {
        showToast("Erro ao enviar");
      }
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
          customSubtitle={endSubtitle}
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
