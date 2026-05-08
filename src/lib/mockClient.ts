import { Code, ConnectError } from "@connectrpc/connect";
import { TipoEvento } from "../gen/termo_pb";

type SignalOptions = { signal?: AbortSignal };

interface MatchMock {
  answer: string;
  playerId: string;
  token: string;
  opponentName: string;
  guesses: number;
}

const ANSWER = "TERMO";
const VALID_WORDS = new Set(["TERMO", "SAGAZ", "MUNDO", "PRAIA", "LIVRO", "VERDE", "CLARO", "FORTE"]);
const OPPONENT_GUESSES = ["CLARO", "MUNDO", "TERMO"];
const matches = new Map<string, MatchMock>();

// Development-only fake backend. It exists so the frontend can be tested
// before the Java service implements the contract in src/contracts/termo.proto.
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
    if (guess[i] === answer[i]) {
      result[i] = 2;
    } else {
      freq[answer[i]] = (freq[answer[i]] ?? 0) + 1;
    }
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

export const mockTermoClient = {
  async conectar(request: { nome?: string; clientSessionId?: string }) {
    await wait(650);
    const idPartida = id("match");
    const playerId = id("player");
    const token = id("token");

    matches.set(idPartida, {
      answer: ANSWER,
      playerId,
      token,
      opponentName: "Adversario",
      guesses: 0,
    });

    return {
      idJogador: playerId,
      idPartida,
      nomeOponente: "Adversario",
      tokenJogador: token,
    };
  },

  async enviarPalavra(request: {
    idPartida?: string;
    idJogador?: string;
    tokenJogador?: string;
    palavraChutada?: string;
  }) {
    const match = matches.get(request.idPartida || "");
    if (!match) throw new ConnectError("Partida nao encontrada", Code.NotFound);

    // Mock enforces the same rule expected from the real backend.
    if (request.idJogador !== match.playerId || request.tokenJogador !== match.token) {
      throw new ConnectError("Token de jogador invalido", Code.PermissionDenied);
    }

    const word = (request.palavraChutada || "").toUpperCase();
    if (!VALID_WORDS.has(word)) {
      return { cores: [], acertou: false, tentativasRestantes: 6 - match.guesses, palavraInvalida: true };
    }

    match.guesses++;
    const acertou = word === match.answer;

    return {
      cores: colorsFor(match.answer, word),
      acertou,
      tentativasRestantes: Math.max(0, 6 - match.guesses),
      palavraInvalida: false,
    };
  },

  async *monitorarPartida(request: { idPartida?: string; assistir?: boolean }, options?: SignalOptions) {
    const match = matches.get(request.idPartida || "");
    if (!match && !request.assistir) throw new ConnectError("Partida nao encontrada", Code.NotFound);

    const answer = match?.answer ?? "TERMO";
    const opponentName = match?.opponentName ?? "Jogador";
    const opponentId = id("opponent");

    for (let i = 0; i < OPPONENT_GUESSES.length; i++) {
      await wait(2800, options?.signal);
      const guess = OPPONENT_GUESSES[i];
      const tipo = request.assistir ? TipoEvento.ESPECTADOR_JOGOU : TipoEvento.OPONENTE_JOGOU;
      yield {
        tipo,
        mensagem: "",
        coresOponente: colorsFor(answer, guess),
        tentativaNumero: i + 1,
        empate: false,
        palavraSecreta: "",
        voceVenceu: false,
        idJogador: opponentId,
        nomeJogador: opponentName,
      };

      if (guess === answer) {
        await wait(250, options?.signal);
        yield {
          tipo: TipoEvento.PARTIDA_ENCERRADA,
          mensagem: "Partida encerrada",
          coresOponente: [],
          tentativaNumero: i + 1,
          empate: false,
          palavraSecreta: answer,
          voceVenceu: false,
          idJogador: opponentId,
          nomeJogador: opponentName,
        };
        return;
      }
    }
  },

  async *monitorarOnline(_request: Record<string, never>, options?: SignalOptions) {
    while (!options?.signal?.aborted) {
      yield { pessoasOnline: 1 + Math.floor(Math.random() * 12) };
      await wait(3000, options?.signal);
    }
  },
};
