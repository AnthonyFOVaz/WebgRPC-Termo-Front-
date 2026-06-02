import { Code, ConnectError } from "@connectrpc/connect";

type SignalOptions = { signal?: AbortSignal };

interface MatchMock {
  answer: string;
  playerId: string;
  opponentName: string;
  guesses: number;
  historyJ1: number[][];
  historyJ2: number[][];
  finalizada: boolean;
}

const ANSWER = "TERMO";
const VALID_WORDS = new Set(["TERMO", "SAGAZ", "MUNDO", "PRAIA", "LIVRO", "VERDE", "CLARO", "FORTE"]);
const OPPONENT_GUESSES = ["CLARO", "MUNDO", "TERMO"];
const matches = new Map<string, MatchMock>();

function id(prefix: string) {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")}`;
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    }, { once: true });
  });
}

function colorsFor(answer: string, guess: string) {
  const result = new Array(5).fill(0);
  const freq: Record<string, number> = {};

  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) result[i] = 2;
    else freq[answer[i]] = (freq[answer[i]] ?? 0) + 1;
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === 2) continue;
    const ch = guess[i];
    if ((freq[ch] ?? 0) > 0) {
      result[i] = 1;
      freq[ch]--;
    }
  }

  return result;
}

function spectatorState(match: MatchMock, idPartida: string) {
  return {
    idPartida,
    historicoCoresJogador1: match.historyJ1.map((cores) => ({ cores })),
    historicoCoresJogador2: match.historyJ2.map((cores) => ({ cores })),
    tentativasRestantesJogador1: Math.max(0, 6 - match.historyJ1.length),
    tentativasRestantesJogador2: Math.max(0, 6 - match.historyJ2.length),
    finalizada: match.finalizada,
    palavraSecreta: match.finalizada ? match.answer : "",
  };
}

export const mockTermoClient = {
  async conectar(request: { nome?: string }) {
    await wait(650);
    const idPartida = id("match");
    const playerId = id("player");

    matches.set(idPartida, {
      answer: ANSWER,
      playerId,
      opponentName: "Adversario",
      guesses: 0,
      historyJ1: [],
      historyJ2: [],
      finalizada: false,
    });

    return {
      idJogador1: playerId,
      nomeJogador1: request.nome || "Voce",
      idPartida,
      nomeOponente: "Adversario",
      idOponente: id("opponent"),
    };
  },

  async enviarPalavra(request: {
    idPartida?: string;
    idJogador1?: string;
    palavraChutada?: string;
  }) {
    const match = matches.get(request.idPartida || "");
    if (!match) throw new ConnectError("Partida nao encontrada", Code.NotFound);
    if (request.idJogador1 !== match.playerId) {
      throw new ConnectError("Token invalido", Code.Unauthenticated);
    }

    const word = (request.palavraChutada || "").toUpperCase();
    if (!VALID_WORDS.has(word)) throw new ConnectError("Palavra invalida.", Code.InvalidArgument);

    match.guesses++;
    const cores = colorsFor(match.answer, word);
    match.historyJ1.push(cores);
    const acertou = word === match.answer;
    if (acertou) match.finalizada = true;

    return {
      cores,
      acertou,
      tentativasRestantes: Math.max(0, 6 - match.guesses),
      palavraSecreta: acertou ? match.answer : "",
    };
  },

  async *assistirPartida(request: { idPartida?: string }, options?: SignalOptions) {
    const match = matches.get(request.idPartida || "");
    if (!match) throw new ConnectError("Partida nao encontrada", Code.NotFound);

    let opponentIndex = 0;
    while (!options?.signal?.aborted) {
      yield spectatorState(match, request.idPartida || "");
      if (match.finalizada) return;
      await wait(2200, options?.signal);

      if (opponentIndex < OPPONENT_GUESSES.length) {
        const guess = OPPONENT_GUESSES[opponentIndex++];
        match.historyJ2.push(colorsFor(match.answer, guess));
        if (guess === match.answer) match.finalizada = true;
      }
    }
  },

  async *jogadoresDisponiveis(_request: { lobbyAtivo?: boolean }, options?: SignalOptions) {
    while (!options?.signal?.aborted) {
      yield { quantidadeJogadores: 1 + Math.floor(Math.random() * 12) };
      await wait(3000, options?.signal);
    }
  },
};
