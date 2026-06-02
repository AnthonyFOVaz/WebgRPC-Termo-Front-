import type { Guess } from "./types";

const CLIENT_SESSION_KEY = "termoo-client-session";
const ACTIVE_MATCH_KEY = "termoo-active-match";
const MATCH_STATE_PREFIX = "termoo-match-state:";
const MATCH_PATH_PREFIX = "/partida/";

// Session model:
// - sessionStorage survives F5 in the same tab, but is not shared as a public URL.
// - idPartida goes in the URL so refresh/share works.
// - tokenJogador stays only here; whoever opens the URL without it becomes spectator.
export interface ActiveMatchSession {
  idPartida: string;
  idJogador: string;
  tokenJogador: string;
  playerName: string;
  opponentName: string;
}

export interface StoredMatchState {
  youGuesses: Guess[];
  oppGuesses: Guess[];
  current: string;
  outcome: "win" | "lose" | "draw" | null;
  answer: string;
  youSolved: boolean;
  youOut: boolean;
}

// client_session_id is not auth. It only lets backend identify repeated lobby calls
// from the same tab and avoid "player vs himself" after a quick refresh.
function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures; live play still works without reload restore.
  }
}

export function getClientSessionId() {
  try {
    const existing = sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (existing) return existing;
    const next = randomId();
    sessionStorage.setItem(CLIENT_SESSION_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

export function saveActiveMatch(match: ActiveMatchSession) {
  writeJson(ACTIVE_MATCH_KEY, match);
}

export function loadActiveMatch() {
  return readJson<ActiveMatchSession>(ACTIVE_MATCH_KEY);
}

export function clearActiveMatch() {
  try {
    sessionStorage.removeItem(ACTIVE_MATCH_KEY);
  } catch {}
}

export function saveMatchState(idPartida: string, state: StoredMatchState) {
  writeJson(MATCH_STATE_PREFIX + idPartida, state);
}

export function loadMatchState(idPartida: string) {
  return readJson<StoredMatchState>(MATCH_STATE_PREFIX + idPartida);
}

export function clearMatchState(idPartida: string) {
  try {
    sessionStorage.removeItem(MATCH_STATE_PREFIX + idPartida);
  } catch {}
}

export function matchIdFromLocation() {
  const path = window.location.pathname;
  if (!path.startsWith(MATCH_PATH_PREFIX)) return "";
  return decodeURIComponent(path.slice(MATCH_PATH_PREFIX.length).split("/")[0] ?? "");
}

export function setMatchUrl(idPartida: string) {
  // URL contains only the public match id. Never append tokenJogador here.
  const path = `${MATCH_PATH_PREFIX}${encodeURIComponent(idPartida)}`;
  window.history.replaceState(null, "", path);
}

export function setHomeUrl() {
  window.history.replaceState(null, "", "/");
}
