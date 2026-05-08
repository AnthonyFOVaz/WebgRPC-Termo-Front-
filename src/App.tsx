import { useEffect, useRef, useState } from "react";
import { Home } from "./components/Home";
import { Lobby } from "./components/Lobby";
import { Match } from "./components/Match";
import { termoClient } from "./lib/client";
import {
  clearActiveMatch,
  clearMatchState,
  getClientSessionId,
  loadActiveMatch,
  matchIdFromLocation,
  saveActiveMatch,
  setHomeUrl,
  setMatchUrl,
} from "./lib/session";

type Phase =
  | { name: "home" }
  | { name: "lobby"; playerName: string }
  | { name: "match"; playerName: string; opponentName: string; idJogador: string; idPartida: string; tokenJogador: string }
  | { name: "spectator"; idPartida: string };

// First render decides if this tab owns the match or only has a public URL.
// Same URL + saved token = player reconnect. URL without token = spectator.
function initialPhase(): Phase {
  const matchId = matchIdFromLocation();
  const saved = loadActiveMatch();
  if (matchId && saved?.idPartida === matchId) {
    return { name: "match", ...saved };
  }
  if (matchId) return { name: "spectator", idPartida: matchId };
  return { name: "home" };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>(() => initialPhase());
  const [savedName, setSavedName] = useState<string>(() => localStorage.getItem("termoo-name") ?? "");
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const onlineAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let stopped = false;
    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    async function watchOnline() {
      while (!stopped) {
        const controller = new AbortController();
        onlineAbortRef.current = controller;

        try {
          for await (const status of termoClient.monitorarOnline({}, { signal: controller.signal })) {
            setOnlineCount(status.pessoasOnline);
          }
        } catch (err) {
          if (!stopped) {
            console.error("Falha no contador online:", err);
            setOnlineCount(null);
            await wait(2000);
          }
        }
      }
    }

    watchOnline();

    return () => {
      stopped = true;
      onlineAbortRef.current?.abort();
    };
  }, []);

  // Keep browser back/forward aligned with /partida/{idPartida}.
  useEffect(() => {
    const onPopState = () => {
      const matchId = matchIdFromLocation();
      const saved = loadActiveMatch();
      if (matchId && saved?.idPartida === matchId) setPhase({ name: "match", ...saved });
      else if (matchId) setPhase({ name: "spectator", idPartida: matchId });
      else setPhase({ name: "home" });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const startQuick = async (name: string) => {
    try { localStorage.setItem("termoo-name", name); } catch {}
    setSavedName(name);
    clearActiveMatch();
    setHomeUrl();
    setPhase({ name: "lobby", playerName: name });

    try {
      // Conectar blocks until backend finds an opponent. clientSessionId prevents self-match.
      const lobby = await termoClient.conectar({ nome: name, clientSessionId: getClientSessionId() });
      const activeMatch = {
        playerName: name,
        opponentName: lobby.nomeOponente,
        idJogador: lobby.idJogador,
        idPartida: lobby.idPartida,
        tokenJogador: lobby.tokenJogador,
      };
      const match = { name: "match", ...activeMatch } as const;

      // Only idPartida goes to URL. tokenJogador stays in sessionStorage.
      saveActiveMatch(activeMatch);
      clearMatchState(lobby.idPartida);
      setMatchUrl(lobby.idPartida);
      setPhase(match);
    } catch (err) {
      console.error("Falha no lobby:", err);
      alert("Falha ao conectar ao servidor. Verifique o backend e o Envoy.");
      setPhase({ name: "home" });
    }
  };

  const goHome = () => {
    if (phase.name === "match") clearMatchState(phase.idPartida);
    clearActiveMatch();
    setHomeUrl();
    setPhase({ name: "home" });
  };
  const playAgain = () => {
    if (phase.name === "match") clearMatchState(phase.idPartida);
    clearActiveMatch();
    setHomeUrl();
    if (savedName) startQuick(savedName);
    else goHome();
  };

  return (
    <div className="app">
      {phase.name === "home" && <Home onStart={startQuick} defaultName={savedName} onlineCount={onlineCount} />}
      {phase.name === "lobby" && <Lobby playerName={phase.playerName} onlineCount={onlineCount} />}
      {phase.name === "match" && (
        <Match
          key={phase.idPartida}
          idJogador={phase.idJogador}
          idPartida={phase.idPartida}
          tokenJogador={phase.tokenJogador}
          playerName={phase.playerName}
          opponentName={phase.opponentName}
          spectator={false}
          onLeave={goHome}
          onPlayAgain={playAgain}
        />
      )}
      {phase.name === "spectator" && (
        <Match
          key={`spectator-${phase.idPartida}`}
          idJogador=""
          idPartida={phase.idPartida}
          tokenJogador=""
          playerName="Jogador 1"
          opponentName="Jogador 2"
          spectator
          onLeave={goHome}
          onPlayAgain={playAgain}
        />
      )}
    </div>
  );
}
